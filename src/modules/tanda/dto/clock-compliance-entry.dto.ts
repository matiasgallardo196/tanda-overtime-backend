import { ApiProperty } from '@nestjs/swagger';

export class ClockComplianceEntryDto {
  @ApiProperty({ example: 1000001 })
  employeeId!: number;

  @ApiProperty({ example: 'Jane Doe' })
  employeeName!: string;

  @ApiProperty({ example: 2000001 })
  departmentId!: number;

  @ApiProperty({ example: 'Bar' })
  departmentName!: string;

  @ApiProperty({ example: '2026-07-30' })
  date!: string;

  @ApiProperty({ example: '2026-07-30T00:00:00.000Z' })
  scheduledStart!: string;

  @ApiProperty({ example: '2026-07-30T09:00:00.000Z' })
  scheduledFinish!: string;

  @ApiProperty({ example: '2026-07-29T23:50:00.000Z' })
  actualStart!: string;

  @ApiProperty({ example: '2026-07-30T09:00:00.000Z', nullable: true })
  actualFinish!: string | null;

  @ApiProperty({
    example: 10,
    description: 'Minutes clocked in BEFORE the scheduled start (0 if on time or late - late arrivals are not flagged)',
  })
  earlyClockInMinutes!: number;

  @ApiProperty({
    example: 0,
    description: 'Minutes clocked out AFTER the scheduled finish (0 if on time or early - early departures are not flagged)',
  })
  lateClockOutMinutes!: number;

  @ApiProperty({ example: false, description: 'True if the employee is still clocked in (no finish time yet)' })
  inProgress!: boolean;

  @ApiProperty({
    example: true,
    description: 'True if earlyClockInMinutes or lateClockOutMinutes exceed the tolerance',
  })
  flagged!: boolean;
}
