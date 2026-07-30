import { ApiProperty } from '@nestjs/swagger';

export class BreakdownEntryDto {
  @ApiProperty({ example: '2026-07-30' })
  date!: string;

  @ApiProperty({ example: '2026-07-30T08:35:00.000Z', nullable: true })
  start!: string | null;

  @ApiProperty({ example: '2026-07-30T18:00:00.000Z', nullable: true })
  finish!: string | null;

  @ApiProperty({ example: 30, description: 'Unpaid break minutes (paid breaks are not subtracted)' })
  unpaidBreakMinutes!: number;

  @ApiProperty({ example: 20, description: 'Paid break minutes (informational, not subtracted)' })
  paidBreakMinutes!: number;

  @ApiProperty({ example: 8.92, description: 'Hours counted for this shift' })
  hours!: number;

  @ApiProperty({ example: 'worked', enum: ['worked', 'remaining'] })
  type!: 'worked' | 'remaining';
}

export class PayrollWeekDto {
  @ApiProperty({ example: '2026-07-28' })
  start!: string;

  @ApiProperty({ example: '2026-08-03' })
  end!: string;
}

export type OvertimeStatus = 'ok' | 'warning' | 'exceeds';
export type EmploymentType = 'casual' | 'contract';

export class OvertimeSummaryDto {
  @ApiProperty({ example: 1000001 })
  employeeId!: number;

  @ApiProperty({ example: 'Jane Doe' })
  employeeName!: string;

  @ApiProperty({
    example: 'contract',
    enum: ['casual', 'contract'],
    description:
      'Factual Tanda status: contract: contracted_weekly_hours != null (has guaranteed hours). casual: no guaranteed hours.',
  })
  employmentType!: EmploymentType;

  @ApiProperty({
    example: 'casual',
    enum: ['casual', 'contract'],
    description:
      'Grouping used by the casual/contract filter. Normally equal to employmentType, except for employees configured via TANDA_OVERTIME_PAID_CONTRACT_IDS who have a contract but are paid overtime directly (no TOIL) and are therefore grouped with casuals.',
  })
  overtimeGroup!: EmploymentType;

  @ApiProperty({ type: PayrollWeekDto })
  payrollWeek!: PayrollWeekDto;

  @ApiProperty({ example: 26.83, description: 'Hours already worked (Tuesday -> now)' })
  workedHours!: number;

  @ApiProperty({ example: 13.5, description: 'Remaining rostered hours (now -> Monday)' })
  remainingRosteredHours!: number;

  @ApiProperty({ example: 40.33, description: 'workedHours + remainingRosteredHours' })
  projectedTotalHours!: number;

  @ApiProperty({ example: 38 })
  weeklyLimitHours!: number;

  @ApiProperty({ example: true })
  exceedsLimit!: boolean;

  @ApiProperty({ example: 2.33, description: 'How much over the limit (0 if not exceeding)' })
  exceedsByHours!: number;

  @ApiProperty({
    example: 'exceeds',
    enum: ['ok', 'warning', 'exceeds'],
    description:
      'ok: < 90% of the limit. warning: >= 90% and <= 100%. exceeds: > 100% projected.',
  })
  status!: OvertimeStatus;
}

export class OvertimeCheckResponseDto extends OvertimeSummaryDto {
  @ApiProperty({ type: [BreakdownEntryDto] })
  breakdown!: BreakdownEntryDto[];
}
