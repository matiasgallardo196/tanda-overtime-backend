import { HttpService } from '@nestjs/axios';
import {
  BadGatewayException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { AppConfig } from '../../config/configuration';
import {
  TandaDepartment,
  TandaRoster,
  TandaRosterSchedule,
  TandaShift,
  TandaUser,
} from './interfaces/tanda-api.interfaces';
import {
  getPayrollWeekForOffset,
  PayrollWeek,
} from './utils/payroll-week.util';
import {
  BreakdownEntryDto,
  EmploymentType,
  OvertimeCheckResponseDto,
  OvertimeStatus,
  OvertimeSummaryDto,
} from './dto/overtime-check-response.dto';
import { ClockComplianceEntryDto } from './dto/clock-compliance-entry.dto';

const WARNING_THRESHOLD_RATIO = 0.9;

@Injectable()
export class TandaService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  private get baseUrl(): string {
    return this.configService.get('tanda.baseUrl', { infer: true });
  }

  private get token(): string {
    const token = this.configService.get('tanda.apiToken', { infer: true });
    if (!token) {
      throw new InternalServerErrorException(
        'TANDA_API_TOKEN is not configured. Fill in the .env file from .env.example.',
      );
    }
    return token;
  }

  private resolveOrgId(orgId?: number): number | undefined {
    return orgId ?? this.configService.get('tanda.defaultOrgId', { infer: true });
  }

  private get overtimePaidContractIds(): Set<number> {
    return new Set(
      this.configService.get('tanda.overtimePaidContractIds', { infer: true }),
    );
  }

  /**
   * Grouping used by the casual/contract filter: normally equal to the
   * factual employmentType, except for employees configured via
   * TANDA_OVERTIME_PAID_CONTRACT_IDS (contract but paid overtime directly,
   * no TOIL) who are grouped with casuals since they're the ones that
   * actually need overtime monitoring.
   */
  private getOvertimeGroup(
    userId: number,
    employmentType: EmploymentType,
  ): EmploymentType {
    return this.overtimePaidContractIds.has(userId) ? 'casual' : employmentType;
  }

  private buildHeaders(orgId?: number): Record<string, string> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.token}`,
    };
    const resolvedOrgId = this.resolveOrgId(orgId);
    if (resolvedOrgId) {
      headers['X-Organisation-Id'] = String(resolvedOrgId);
    }
    return headers;
  }

  private async get<T>(path: string, orgId?: number): Promise<T> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<T>(`${this.baseUrl}${path}`, {
          headers: this.buildHeaders(orgId),
        }),
      );
      return response.data;
    } catch (err) {
      const axiosErr = err as AxiosError;
      const status = axiosErr.response?.status;
      const data = axiosErr.response?.data;
      throw new BadGatewayException({
        message: `Error calling Tanda API (${path})`,
        tandaStatus: status,
        tandaResponse: data,
      });
    }
  }

  async getUsers(orgId?: number): Promise<TandaUser[]> {
    return this.get<TandaUser[]>('/api/v2/users', orgId);
  }

  async getUserById(userId: number, orgId?: number): Promise<TandaUser> {
    return this.get<TandaUser>(`/api/v2/users/${userId}`, orgId);
  }

  async getCurrentRoster(orgId?: number): Promise<TandaRoster> {
    return this.get<TandaRoster>('/api/v2/rosters/current', orgId);
  }

  /** Roster containing the given date (yyyy-MM-dd) - used to navigate to other payroll weeks. */
  async getRosterOn(date: string, orgId?: number): Promise<TandaRoster> {
    return this.get<TandaRoster>(`/api/v2/rosters/on/${date}`, orgId);
  }

  async getShifts(
    from: string,
    to: string,
    orgId?: number,
  ): Promise<TandaShift[]> {
    return this.get<TandaShift[]>(
      `/api/v2/shifts?from=${from}&to=${to}`,
      orgId,
    );
  }

  async getDepartments(orgId?: number): Promise<TandaDepartment[]> {
    return this.get<TandaDepartment[]>('/api/v2/departments', orgId);
  }

  /**
   * Worked shifts including their wage cost (no on-costs). Requires the
   * token to have the "cost" OAuth scope, otherwise Tanda omits the field.
   */
  async getShiftsWithCosts(
    from: string,
    to: string,
    orgId?: number,
  ): Promise<TandaShift[]> {
    return this.get<TandaShift[]>(
      `/api/v2/shifts?from=${from}&to=${to}&show_costs=true`,
      orgId,
    );
  }

  /** Roster containing the given date, with wage cost per schedule entry. */
  async getRosterOnWithCosts(
    date: string,
    orgId?: number,
  ): Promise<TandaRoster> {
    return this.get<TandaRoster>(
      `/api/v2/rosters/on/${date}?show_costs=true`,
      orgId,
    );
  }

  /**
   * Sums only UNPAID break minutes (breaks[].paid === false).
   * Paid breaks count as worked time and are not subtracted.
   */
  private static splitBreaks(
    breaks: { paid: boolean; length: number }[] | undefined,
  ): { paidMinutes: number; unpaidMinutes: number } {
    let paidMinutes = 0;
    let unpaidMinutes = 0;
    for (const b of breaks ?? []) {
      if (b.paid) paidMinutes += b.length;
      else unpaidMinutes += b.length;
    }
    return { paidMinutes, unpaidMinutes };
  }

  private static getEmploymentType(user: TandaUser): EmploymentType {
    return user.contracted_weekly_hours != null ? 'contract' : 'casual';
  }

  private static computeStatus(
    projectedTotalHours: number,
    weeklyLimitHours: number,
  ): OvertimeStatus {
    if (projectedTotalHours > weeklyLimitHours) return 'exceeds';
    if (projectedTotalHours >= weeklyLimitHours * WARNING_THRESHOLD_RATIO)
      return 'warning';
    return 'ok';
  }

  /**
   * Computes worked/remaining hours for ONE employee from already-fetched
   * shifts and roster (lets the bulk endpoint reuse the same 2 calls for
   * every employee instead of querying once per employee).
   */
  private computeOvertimeForUser(
    userId: number,
    userName: string,
    employmentType: EmploymentType,
    overtimeGroup: EmploymentType,
    shifts: TandaShift[],
    roster: TandaRoster,
    weeklyLimitHours: number,
    nowUnix: number,
    payrollWeek: PayrollWeek,
  ): OvertimeCheckResponseDto {
    const breakdown: BreakdownEntryDto[] = [];
    let workedSeconds = 0;

    for (const shift of shifts) {
      if (shift.user_id !== userId) continue;
      if (shift.start === null || shift.start > nowUnix) continue; // hasn't started yet -> counted by the roster

      const endUnix = shift.finish ?? nowUnix; // still clocked in -> up to now
      const { paidMinutes, unpaidMinutes } = TandaService.splitBreaks(
        shift.breaks,
      );
      const seconds = endUnix - shift.start - unpaidMinutes * 60;
      const hours = Math.max(0, seconds) / 3600;
      workedSeconds += Math.max(0, seconds);

      breakdown.push({
        date: shift.date,
        start: new Date(shift.start * 1000).toISOString(),
        finish: shift.finish ? new Date(shift.finish * 1000).toISOString() : null,
        unpaidBreakMinutes: unpaidMinutes,
        paidBreakMinutes: paidMinutes,
        hours: round2(hours),
        type: 'worked',
      });
    }

    let remainingSeconds = 0;
    for (const day of roster.schedules) {
      for (const sch of day.schedules) {
        if (sch.user_id !== userId) continue;
        if (sch.start === null || sch.finish === null) continue;
        if (sch.start <= nowUnix) continue; // already started or past -> counted by shifts

        const { paidMinutes, unpaidMinutes } = TandaService.splitBreaks(
          sch.breaks,
        );
        const seconds = sch.finish - sch.start - unpaidMinutes * 60;
        const hours = Math.max(0, seconds) / 3600;
        remainingSeconds += Math.max(0, seconds);

        breakdown.push({
          date: day.date,
          start: new Date(sch.start * 1000).toISOString(),
          finish: new Date(sch.finish * 1000).toISOString(),
          unpaidBreakMinutes: unpaidMinutes,
          paidBreakMinutes: paidMinutes,
          hours: round2(hours),
          type: 'remaining',
        });
      }
    }

    const workedHours = round2(workedSeconds / 3600);
    const remainingRosteredHours = round2(remainingSeconds / 3600);
    const projectedTotalHours = round2(workedHours + remainingRosteredHours);
    const exceedsLimit = projectedTotalHours > weeklyLimitHours;
    const exceedsByHours = exceedsLimit
      ? round2(projectedTotalHours - weeklyLimitHours)
      : 0;
    const status = TandaService.computeStatus(
      projectedTotalHours,
      weeklyLimitHours,
    );

    breakdown.sort((a, b) => (a.start ?? '').localeCompare(b.start ?? ''));

    return {
      employeeId: userId,
      employeeName: userName,
      employmentType,
      overtimeGroup,
      payrollWeek: { start: payrollWeek.startStr, end: payrollWeek.endStr },
      workedHours,
      remainingRosteredHours,
      projectedTotalHours,
      weeklyLimitHours,
      exceedsLimit,
      exceedsByHours,
      status,
      breakdown,
    };
  }

  async getOvertimeCheck(
    userId: number,
    weeklyLimitHours: number,
    weekOffset = 0,
    orgId?: number,
  ): Promise<OvertimeCheckResponseDto> {
    const payrollWeek = getPayrollWeekForOffset(weekOffset);
    const nowUnix = Math.floor(Date.now() / 1000);

    const [user, shifts, roster] = await Promise.all([
      this.getUserById(userId, orgId),
      this.getShifts(payrollWeek.startStr, payrollWeek.endStr, orgId),
      this.getRosterOn(payrollWeek.startStr, orgId),
    ]);

    const employmentType = TandaService.getEmploymentType(user);
    return this.computeOvertimeForUser(
      userId,
      user.name,
      employmentType,
      this.getOvertimeGroup(userId, employmentType),
      shifts,
      roster,
      weeklyLimitHours,
      nowUnix,
      payrollWeek,
    );
  }

  /**
   * Summary for EVERY employee that appears in the roster and/or shifts of
   * the selected payroll week. Only 3 calls to Tanda (users, shifts, roster)
   * no matter how many employees there are.
   */
  async getOvertimeOverview(
    weeklyLimitHours: number,
    weekOffset = 0,
    orgId?: number,
  ): Promise<OvertimeSummaryDto[]> {
    const payrollWeek = getPayrollWeekForOffset(weekOffset);
    const nowUnix = Math.floor(Date.now() / 1000);

    const [users, shifts, roster] = await Promise.all([
      this.getUsers(orgId),
      this.getShifts(payrollWeek.startStr, payrollWeek.endStr, orgId),
      this.getRosterOn(payrollWeek.startStr, orgId),
    ]);

    const usersById = new Map(users.map((u) => [u.id, u]));

    const userIds = new Set<number>();
    for (const shift of shifts) userIds.add(shift.user_id);
    for (const day of roster.schedules) {
      for (const sch of day.schedules) userIds.add(sch.user_id);
    }

    const summaries = Array.from(userIds).map((userId) => {
      const user = usersById.get(userId);
      const employmentType = user ? TandaService.getEmploymentType(user) : 'casual';
      const { breakdown, ...summary } = this.computeOvertimeForUser(
        userId,
        user?.name ?? `user_id ${userId}`,
        employmentType,
        this.getOvertimeGroup(userId, employmentType),
        shifts,
        roster,
        weeklyLimitHours,
        nowUnix,
        payrollWeek,
      );
      return summary;
    });

    summaries.sort((a, b) => b.projectedTotalHours - a.projectedTotalHours);
    return summaries;
  }

  /**
   * Flags shifts where the actual clock-in was BEFORE the scheduled start, or
   * the actual clock-out was AFTER the scheduled finish (both are unbudgeted
   * extra time). Late arrivals and early departures are intentionally NOT
   * flagged - they don't cost extra, they're a separate concern.
   *
   * Each roster schedule entry is matched to an actual shift by
   * (employee, date, department); entries with no matching actual shift yet
   * (not clocked in) are skipped - this view is about schedule deviation, not
   * attendance/no-shows.
   */
  async getClockCompliance(
    weekOffset: number,
    date: string | undefined,
    toleranceMinutes: number,
    orgId?: number,
  ): Promise<ClockComplianceEntryDto[]> {
    const nowUnix = Math.floor(Date.now() / 1000);

    let fromStr: string;
    let toStr: string;
    let rosterLookupDate: string;
    if (date) {
      fromStr = date;
      toStr = date;
      rosterLookupDate = date;
    } else {
      const payrollWeek = getPayrollWeekForOffset(weekOffset);
      fromStr = payrollWeek.startStr;
      toStr = payrollWeek.endStr;
      rosterLookupDate = payrollWeek.startStr;
    }

    const [users, departments, shifts, roster] = await Promise.all([
      this.getUsers(orgId),
      this.getDepartments(orgId),
      this.getShifts(fromStr, toStr, orgId),
      this.getRosterOn(rosterLookupDate, orgId),
    ]);

    const nameById = new Map(users.map((u) => [u.id, u.name]));
    const deptNameById = new Map(departments.map((d) => [d.id, d.name]));

    // Group actual shifts by (employee, date, department), sorted
    // chronologically so split/multiple same-day shifts pair up correctly.
    const shiftsByKey = new Map<string, TandaShift[]>();
    for (const shift of shifts) {
      if (shift.start === null) continue; // not clocked in yet -> nothing to compare
      const key = `${shift.user_id}|${shift.date}|${shift.department_id}`;
      const arr = shiftsByKey.get(key) ?? [];
      arr.push(shift);
      shiftsByKey.set(key, arr);
    }
    for (const arr of shiftsByKey.values()) {
      arr.sort((a, b) => (a.start ?? 0) - (b.start ?? 0));
    }

    // Group roster entries the same way, ALSO sorted chronologically. Tanda
    // doesn't guarantee day.schedules comes back in start-time order, so
    // without this a split shift (e.g. 11:30-14:00 + 17:00-21:00 same day,
    // same department) could get paired with the wrong actual shift if the
    // roster array happened to list the later one first.
    const rosterEntriesByKey = new Map<
      string,
      { schedule: TandaRosterSchedule; date: string }[]
    >();
    for (const day of roster.schedules) {
      if (date && day.date !== date) continue;
      for (const sch of day.schedules as TandaRosterSchedule[]) {
        if (sch.start === null || sch.finish === null) continue;
        const key = `${sch.user_id}|${day.date}|${sch.department_id}`;
        const arr = rosterEntriesByKey.get(key) ?? [];
        arr.push({ schedule: sch, date: day.date });
        rosterEntriesByKey.set(key, arr);
      }
    }
    for (const arr of rosterEntriesByKey.values()) {
      arr.sort((a, b) => (a.schedule.start ?? 0) - (b.schedule.start ?? 0));
    }

    const results: ClockComplianceEntryDto[] = [];

    for (const [key, rosterEntries] of rosterEntriesByKey) {
      const matchedShifts = shiftsByKey.get(key) ?? [];
      const pairCount = Math.min(rosterEntries.length, matchedShifts.length);

      for (let i = 0; i < pairCount; i++) {
        const { schedule: sch, date: schDate } = rosterEntries[i];
        const matchedShift = matchedShifts[i];

        const earlyClockInMinutes = Math.max(
          0,
          Math.round((sch.start! - matchedShift.start!) / 60),
        );

        let lateClockOutMinutes = 0;
        let inProgress = false;
        if (matchedShift.finish !== null) {
          lateClockOutMinutes = Math.max(
            0,
            Math.round((matchedShift.finish - sch.finish!) / 60),
          );
        } else {
          inProgress = true;
          if (nowUnix > sch.finish!) {
            lateClockOutMinutes = Math.round((nowUnix - sch.finish!) / 60);
          }
        }

        const flagged =
          earlyClockInMinutes > toleranceMinutes ||
          lateClockOutMinutes > toleranceMinutes;

        results.push({
          employeeId: sch.user_id,
          employeeName: nameById.get(sch.user_id) ?? `user_id ${sch.user_id}`,
          departmentId: sch.department_id,
          departmentName:
            deptNameById.get(sch.department_id) ?? `Department ${sch.department_id}`,
          date: schDate,
          scheduledStart: new Date(sch.start! * 1000).toISOString(),
          scheduledFinish: new Date(sch.finish! * 1000).toISOString(),
          actualStart: new Date(matchedShift.start! * 1000).toISOString(),
          actualFinish: matchedShift.finish
            ? new Date(matchedShift.finish * 1000).toISOString()
            : null,
          earlyClockInMinutes,
          lateClockOutMinutes,
          inProgress,
          flagged,
        });
      }
    }

    results.sort((a, b) => {
      if (a.flagged !== b.flagged) return a.flagged ? -1 : 1;
      return (
        a.date.localeCompare(b.date) ||
        a.scheduledStart.localeCompare(b.scheduledStart)
      );
    });

    return results;
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
