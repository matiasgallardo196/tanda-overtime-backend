import { BadRequestException, Injectable } from '@nestjs/common';
import { TandaService } from '../tanda/tanda.service';
import { BudgetRepository } from './budget.repository';
import { BudgetConfig } from './interfaces/budget.interface';
import {
  TandaShift,
  TandaUser,
  TandaDepartment,
} from '../tanda/interfaces/tanda-api.interfaces';
import {
  getPayrollWeek,
  nowInOrgTimezone,
  PayrollWeek,
} from '../tanda/utils/payroll-week.util';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import {
  BudgetTrackingDto,
  CostsSummaryDto,
  DailyCostDto,
  DepartmentCostDto,
  EmployeeCostDto,
  WeekDetailDto,
  WeeklyCostDto,
} from './dto/costs-response.dto';

/** Headroom below this fraction of the budget is flagged as "tight". */
const TIGHT_THRESHOLD_RATIO = 0.05;
/** How many recent complete weeks feed the run-rate average. */
const RUN_RATE_WEEKS = 4;

const CLOSED_WEEK_TTL_MS = 6 * 60 * 60 * 1000; // closed weeks barely change
const OPEN_WEEK_TTL_MS = 2 * 60 * 1000; // current week updates as people clock

interface CachedWeek {
  fetchedAt: number;
  shifts: TandaShift[];
}

interface AggregatedShift {
  userId: number;
  date: string;
  departmentId: number;
  hours: number;
  cost: number;
  /** True for leave entries (annual/sick leave) - costed but not worked. */
  isLeave: boolean;
}

@Injectable()
export class CostsService {
  private readonly weekCache = new Map<string, CachedWeek>();

  constructor(
    private readonly tandaService: TandaService,
    private readonly budgetRepository: BudgetRepository,
  ) {}

  // ---------- budget config ----------

  async getBudget(): Promise<BudgetConfig | null> {
    return this.budgetRepository.find();
  }

  async updateBudget(dto: UpdateBudgetDto): Promise<BudgetConfig> {
    if (dto.endDate <= dto.startDate) {
      throw new BadRequestException('endDate must be after startDate');
    }
    return this.budgetRepository.save({
      totalBudget: dto.totalBudget,
      startDate: dto.startDate,
      endDate: dto.endDate,
      updatedAt: new Date().toISOString(),
    });
  }

  // ---------- summary ----------

  async getSummary(orgId?: number): Promise<CostsSummaryDto> {
    const today = nowInOrgTimezone();
    const todayStr = toDateStr(today);
    const { fyStart, fyEnd } = fiscalYearFor(today);
    const budget = await this.budgetRepository.find();

    const departments = await this.tandaService.getDepartments(orgId);
    const deptName = new Map<number, string>(
      departments.map((d) => [d.id, d.name]),
    );

    // Enumerate payroll weeks from the one containing the FY start up to the
    // one containing today.
    const weekStarts = enumerateWeekStarts(fyStart, todayStr);

    const weeks: WeeklyCostDto[] = [];
    const deptTotals = new Map<string, { hours: number; cost: number }>();
    let fyToDateCost = 0;
    let fyToDateHours = 0;
    let fyToDateLeaveCost = 0;
    let spentInPeriod = 0;

    for (const week of weekStarts) {
      const shifts = await this.getWeekShifts(week, orgId);
      const rows = aggregateShifts(shifts);

      const byDept = new Map<string, { hours: number; cost: number }>();
      let weekHours = 0;
      let weekCost = 0;
      let weekLeaveCost = 0;
      let partial = false;

      for (const row of rows) {
        // FY attribution is by shift date: boundary weeks can straddle two
        // fiscal years (the FY starts July 1st, mid payroll week).
        if (row.date < fyStart || row.date > fyEnd) {
          partial = true;
          continue;
        }
        if (row.date > todayStr) continue;

        // Leave is tracked apart so "cost" matches Tanda's
        // "Timesheet Cost (exc. leave)" and roster comparisons stay
        // apples-to-apples (rosters never contain leave).
        if (row.isLeave) {
          weekLeaveCost += row.cost;
          fyToDateLeaveCost += row.cost;
          continue;
        }

        weekHours += row.hours;
        weekCost += row.cost;

        const name = deptName.get(row.departmentId) ?? `#${row.departmentId}`;
        const dept = byDept.get(name) ?? { hours: 0, cost: 0 };
        dept.hours += row.hours;
        dept.cost += row.cost;
        byDept.set(name, dept);

        const total = deptTotals.get(name) ?? { hours: 0, cost: 0 };
        total.hours += row.hours;
        total.cost += row.cost;
        deptTotals.set(name, total);

        if (budget && row.date >= budget.startDate && row.date <= budget.endDate) {
          spentInPeriod += row.cost;
        }
      }

      fyToDateCost += weekCost;
      fyToDateHours += weekHours;

      weeks.push({
        weekStart: week.startStr,
        weekEnd: week.endStr,
        hours: round2(weekHours),
        cost: round2(weekCost),
        leaveCost: round2(weekLeaveCost),
        complete: week.endStr < todayStr,
        partial,
        byDepartment: toDeptList(byDept),
      });
    }

    const tracking = budget
      ? buildTracking(budget, weeks, spentInPeriod, todayStr)
      : null;

    return {
      fyStart,
      fyEnd,
      today: todayStr,
      fyToDateCost: round2(fyToDateCost),
      fyToDateHours: round2(fyToDateHours),
      fyToDateLeaveCost: round2(fyToDateLeaveCost),
      weeks,
      departmentTotals: toDeptList(deptTotals),
      budget,
      tracking,
    };
  }

  // ---------- week drill-down ----------

  async getWeekDetail(
    weekStartStr: string | undefined,
    orgId?: number,
  ): Promise<WeekDetailDto> {
    const reference = weekStartStr ? parseDate(weekStartStr) : nowInOrgTimezone();
    const week = getPayrollWeek(reference);
    if (weekStartStr && week.startStr !== weekStartStr) {
      throw new BadRequestException(
        `weekStart must be a Tuesday (payroll week start); the week containing ${weekStartStr} starts on ${week.startStr}`,
      );
    }

    const [shifts, roster, users, departments] = await Promise.all([
      this.getWeekShifts(week, orgId),
      this.tandaService.getRosterOnWithCosts(week.startStr, orgId),
      this.tandaService.getUsers(orgId),
      this.tandaService.getDepartments(orgId),
    ]);

    const userName = new Map<number, string>(users.map((u: TandaUser) => [u.id, u.name]));
    const deptName = new Map<number, string>(
      departments.map((d: TandaDepartment) => [d.id, d.name]),
    );

    const rows = aggregateShifts(shifts);

    const actualByDept = new Map<string, { hours: number; cost: number }>();
    const byEmployee = new Map<number, { hours: number; cost: number }>();
    const byDay = new Map<string, { hours: number; cost: number }>();
    let actualHours = 0;
    let actualCost = 0;
    let leaveCost = 0;

    for (const row of rows) {
      if (row.isLeave) {
        leaveCost += row.cost;
        continue;
      }
      actualHours += row.hours;
      actualCost += row.cost;

      const dName = deptName.get(row.departmentId) ?? `#${row.departmentId}`;
      const dept = actualByDept.get(dName) ?? { hours: 0, cost: 0 };
      dept.hours += row.hours;
      dept.cost += row.cost;
      actualByDept.set(dName, dept);

      const emp = byEmployee.get(row.userId) ?? { hours: 0, cost: 0 };
      emp.hours += row.hours;
      emp.cost += row.cost;
      byEmployee.set(row.userId, emp);

      const day = byDay.get(row.date) ?? { hours: 0, cost: 0 };
      day.hours += row.hours;
      day.cost += row.cost;
      byDay.set(row.date, day);
    }

    // Roster (scheduled) side for the same week.
    const rosterByDept = new Map<string, { hours: number; cost: number }>();
    let rosterHours = 0;
    let rosterCost = 0;
    for (const day of roster.schedules) {
      for (const sch of day.schedules) {
        if (sch.start === null || sch.finish === null) continue;
        let unpaidMinutes = 0;
        for (const b of sch.breaks ?? []) {
          if (!b.paid) unpaidMinutes += b.length;
        }
        const hours = Math.max(0, (sch.finish - sch.start) / 3600 - unpaidMinutes / 60);
        const cost = typeof sch.cost === 'number' ? sch.cost : 0;
        rosterHours += hours;
        rosterCost += cost;

        const dName = deptName.get(sch.department_id) ?? `#${sch.department_id}`;
        const dept = rosterByDept.get(dName) ?? { hours: 0, cost: 0 };
        dept.hours += hours;
        dept.cost += cost;
        rosterByDept.set(dName, dept);
      }
    }

    const employees: EmployeeCostDto[] = Array.from(byEmployee, ([id, v]) => ({
      employeeId: id,
      employeeName: userName.get(id) ?? `#${id}`,
      hours: round2(v.hours),
      cost: round2(v.cost),
    })).sort((a, b) => b.cost - a.cost);

    const days: DailyCostDto[] = Array.from(byDay, ([date, v]) => ({
      date,
      hours: round2(v.hours),
      cost: round2(v.cost),
    })).sort((a, b) => a.date.localeCompare(b.date));

    return {
      weekStart: week.startStr,
      weekEnd: week.endStr,
      actualHours: round2(actualHours),
      actualCost: round2(actualCost),
      leaveCost: round2(leaveCost),
      rosterHours: round2(rosterHours),
      rosterCost: round2(rosterCost),
      actualByDepartment: toDeptList(actualByDept),
      rosterByDepartment: toDeptList(rosterByDept),
      byEmployee: employees,
      byDay: days,
    };
  }

  // ---------- helpers ----------

  private async getWeekShifts(
    week: PayrollWeek,
    orgId?: number,
  ): Promise<TandaShift[]> {
    const todayStr = toDateStr(nowInOrgTimezone());
    const cacheKey = `${orgId ?? 'default'}:${week.startStr}`;
    const ttl = week.endStr < todayStr ? CLOSED_WEEK_TTL_MS : OPEN_WEEK_TTL_MS;

    const cached = this.weekCache.get(cacheKey);
    if (cached && Date.now() - cached.fetchedAt < ttl) {
      return cached.shifts;
    }

    const shifts = await this.tandaService.getShiftsWithCosts(
      week.startStr,
      week.endStr,
      orgId,
    );
    this.weekCache.set(cacheKey, { fetchedAt: Date.now(), shifts });
    return shifts;
  }
}

// ---------- pure helpers ----------

function aggregateShifts(shifts: TandaShift[]): AggregatedShift[] {
  const rows: AggregatedShift[] = [];
  for (const s of shifts) {
    let hours = 0;
    if (s.start !== null && s.finish !== null) {
      let unpaidMinutes = 0;
      for (const b of s.breaks ?? []) {
        if (!b.paid) unpaidMinutes += b.length;
      }
      hours = Math.max(0, (s.finish - s.start) / 3600 - unpaidMinutes / 60);
    }
    rows.push({
      userId: s.user_id,
      date: s.date,
      departmentId: s.department_id,
      hours,
      cost: typeof s.cost === 'number' ? s.cost : 0,
      // Approved leave comes back from /shifts as a costed entry with a
      // leave_request_id. Kept separate so "cost" matches Tanda's own
      // "Timesheet Cost (exc. leave)" metric.
      isLeave: s.leave_request_id != null,
    });
  }
  return rows;
}

function buildTracking(
  budget: BudgetConfig,
  weeks: WeeklyCostDto[],
  spentInPeriod: number,
  todayStr: string,
): BudgetTrackingDto {
  const daysRemaining = Math.max(
    0,
    diffDays(todayStr, budget.endDate), // from tomorrow through endDate
  );
  const weeksRemaining = daysRemaining / 7;

  // Run rate: average of the most recent complete, non-partial weeks.
  const completeWeeks = weeks.filter((w) => w.complete && !w.partial);
  const recent = completeWeeks.slice(-RUN_RATE_WEEKS);
  const runRateWeekly =
    recent.length > 0
      ? recent.reduce((sum, w) => sum + w.cost, 0) / recent.length
      : 0;

  const remainingBudget = budget.totalBudget - spentInPeriod;
  const weeklyCapRemaining =
    weeksRemaining > 0 ? remainingBudget / weeksRemaining : 0;
  const projectedTotal = spentInPeriod + runRateWeekly * weeksRemaining;
  const headroom = budget.totalBudget - projectedTotal;

  let status: BudgetTrackingDto['status'] = 'under';
  if (headroom < 0) status = 'over';
  else if (headroom < budget.totalBudget * TIGHT_THRESHOLD_RATIO)
    status = 'tight';

  return {
    spentInPeriod: round2(spentInPeriod),
    remainingBudget: round2(remainingBudget),
    daysRemaining,
    weeksRemaining: round2(weeksRemaining),
    weeklyCapRemaining: round2(weeklyCapRemaining),
    runRateWeekly: round2(runRateWeekly),
    runRateWeeksUsed: recent.length,
    projectedTotal: round2(projectedTotal),
    headroom: round2(headroom),
    status,
  };
}

/** Australian fiscal year: July 1st to June 30th. */
function fiscalYearFor(date: Date): { fyStart: string; fyEnd: string } {
  const year = date.getMonth() >= 6 ? date.getFullYear() : date.getFullYear() - 1;
  return { fyStart: `${year}-07-01`, fyEnd: `${year + 1}-06-30` };
}

/** Payroll weeks (Tue-Mon) covering [fromDate, toDate], as PayrollWeek objects. */
function enumerateWeekStarts(fromDate: string, toDate: string): PayrollWeek[] {
  const weeks: PayrollWeek[] = [];
  let cursor = getPayrollWeek(parseDate(fromDate));
  while (cursor.startStr <= toDate) {
    weeks.push(cursor);
    const next = new Date(cursor.start);
    next.setDate(next.getDate() + 7);
    cursor = getPayrollWeek(next);
  }
  return weeks;
}

function parseDate(str: string): Date {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Whole days from (exclusive) a to (inclusive) b. */
function diffDays(a: string, b: string): number {
  const ms = parseDate(b).getTime() - parseDate(a).getTime();
  return Math.round(ms / 86_400_000);
}

function toDeptList(
  map: Map<string, { hours: number; cost: number }>,
): DepartmentCostDto[] {
  return Array.from(map, ([department, v]) => ({
    department,
    hours: round2(v.hours),
    cost: round2(v.cost),
  })).sort((a, b) => b.cost - a.cost);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
