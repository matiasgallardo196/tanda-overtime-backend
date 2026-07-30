import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { OrgIdQueryDto } from './org-id-query.dto';

export class ClockComplianceQueryDto extends OrgIdQueryDto {
  @ApiPropertyOptional({
    description:
      'Payroll week offset relative to the current week: 0 = current week, -1 = previous week, 1 = next week, etc. Ignored if `date` is provided.',
    example: 0,
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  weekOffset?: number = 0;

  @ApiPropertyOptional({
    description:
      'Restrict to a single day (yyyy-MM-dd) instead of the whole payroll week. When provided, weekOffset is ignored.',
    example: '2026-07-30',
  })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({
    description:
      'Minutes of tolerance before an early clock-in or late clock-out is flagged',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  toleranceMinutes?: number = 1;
}
