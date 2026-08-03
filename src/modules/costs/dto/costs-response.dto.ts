import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DepartmentCostDto {
  @ApiProperty({ example: 'Bar' })
  department: string;

  @ApiProperty({ example: 73.5 })
  hours: number;

  @ApiProperty({ example: 2725.09 })
  cost: number;
}

export class WeeklyCostDto {
  @ApiProperty({ example: '2026-07-28', description: 'Tuesday that starts the payroll week' })
  weekStart: string;

  @ApiProperty({ example: '2026-08-03', description: 'Monday that ends the payroll week' })
  weekEnd: string;

  @ApiProperty({ example: 603.6 })
  hours: number;

  @ApiProperty({
    example: 22676.6,
    description:
      "Wage cost of worked shifts, no on-costs, excluding leave - matches Tanda's \"Timesheet Cost (exc. leave)\"",
  })
  cost: number;

  @ApiProperty({
    example: 1701.92,
    description: 'Cost of approved leave entries (annual/sick) in the week, tracked apart',
  })
  leaveCost: number;

  @ApiProperty({
    example: true,
    description: 'False while the week is still in progress (numbers will keep growing)',
  })
  complete: boolean;

  @ApiProperty({
    example: false,
    description:
      'True if part of the week falls outside the fiscal year or the budget period (boundary weeks)',
  })
  partial: boolean;

  @ApiProperty({ type: [DepartmentCostDto] })
  byDepartment: DepartmentCostDto[];
}

export class BudgetConfigDto {
  @ApiProperty({ example: 1169490 })
  totalBudget: number;

  @ApiProperty({ example: '2026-08-01' })
  startDate: string;

  @ApiProperty({ example: '2027-06-30' })
  endDate: string;

  @ApiProperty({ example: '2026-08-01T10:00:00.000Z' })
  updatedAt: string;
}

export class BudgetTrackingDto {
  @ApiProperty({ example: 1250.5, description: 'Wage cost of shifts dated inside the budget period so far' })
  spentInPeriod: number;

  @ApiProperty({ example: 1168239.5 })
  remainingBudget: number;

  @ApiProperty({ example: 333 })
  daysRemaining: number;

  @ApiProperty({ example: 47.57 })
  weeksRemaining: number;

  @ApiProperty({
    example: 24583.87,
    description: 'Remaining budget divided by remaining weeks: the weekly cap to stay on budget',
  })
  weeklyCapRemaining: number;

  @ApiProperty({
    example: 23977.12,
    description: 'Average weekly wage cost over the recent complete payroll weeks',
  })
  runRateWeekly: number;

  @ApiProperty({ example: 4, description: 'Number of complete weeks the run rate is based on' })
  runRateWeeksUsed: number;

  @ApiProperty({
    example: 1140625.85,
    description: 'spentInPeriod + runRateWeekly * weeksRemaining',
  })
  projectedTotal: number;

  @ApiProperty({
    example: 28864.15,
    description: 'totalBudget - projectedTotal. Negative = projected overrun',
  })
  headroom: number;

  @ApiProperty({ enum: ['under', 'tight', 'over'], example: 'tight' })
  status: 'under' | 'tight' | 'over';
}

export class CostsSummaryDto {
  @ApiProperty({ example: '2026-07-01' })
  fyStart: string;

  @ApiProperty({ example: '2027-06-30' })
  fyEnd: string;

  @ApiProperty({ example: '2026-08-01' })
  today: string;

  @ApiProperty({
    example: 104992.86,
    description: 'Wage cost of worked shifts (no on-costs, excluding leave) from fyStart to today',
  })
  fyToDateCost: number;

  @ApiProperty({ example: 2716.4 })
  fyToDateHours: number;

  @ApiProperty({ example: 3403.84, description: 'Cost of approved leave from fyStart to today' })
  fyToDateLeaveCost: number;

  @ApiProperty({ type: [WeeklyCostDto], description: 'Payroll weeks from the fiscal year start to the current week' })
  weeks: WeeklyCostDto[];

  @ApiProperty({ type: [DepartmentCostDto], description: 'FY-to-date totals per department' })
  departmentTotals: DepartmentCostDto[];

  @ApiPropertyOptional({ type: BudgetConfigDto, nullable: true })
  budget: BudgetConfigDto | null;

  @ApiPropertyOptional({
    type: BudgetTrackingDto,
    nullable: true,
    description: 'Null until a budget is configured',
  })
  tracking: BudgetTrackingDto | null;
}

export class EmployeeCostDto {
  @ApiProperty({ example: 1000001 })
  employeeId: number;

  @ApiProperty({ example: 'Jane Doe' })
  employeeName: string;

  @ApiProperty({ example: 38 })
  hours: number;

  @ApiProperty({ example: 1328.57 })
  cost: number;
}

export class DailyCostDto {
  @ApiProperty({ example: '2026-07-28' })
  date: string;

  @ApiProperty({ example: 81 })
  hours: number;

  @ApiProperty({ example: 3200.4 })
  cost: number;
}

export class WeekDetailDto {
  @ApiProperty({ example: '2026-07-28' })
  weekStart: string;

  @ApiProperty({ example: '2026-08-03' })
  weekEnd: string;

  @ApiProperty({ example: 603.6, description: 'Actual worked hours (timesheets)' })
  actualHours: number;

  @ApiProperty({
    example: 22676.6,
    description: 'Actual wage cost of worked shifts (timesheets), no on-costs, excluding leave',
  })
  actualCost: number;

  @ApiProperty({ example: 1701.92, description: 'Cost of approved leave entries in the week' })
  leaveCost: number;

  @ApiProperty({ example: 599, description: 'Scheduled hours in the roster for this week' })
  rosterHours: number;

  @ApiProperty({ example: 22892.1, description: 'Scheduled wage cost in the roster for this week' })
  rosterCost: number;

  @ApiProperty({ type: [DepartmentCostDto] })
  actualByDepartment: DepartmentCostDto[];

  @ApiProperty({ type: [DepartmentCostDto] })
  rosterByDepartment: DepartmentCostDto[];

  @ApiProperty({ type: [EmployeeCostDto], description: 'Actual cost per employee, highest first' })
  byEmployee: EmployeeCostDto[];

  @ApiProperty({ type: [DailyCostDto], description: 'Actual cost per day of the week' })
  byDay: DailyCostDto[];
}
