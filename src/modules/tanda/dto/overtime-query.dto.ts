import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { OrgIdQueryDto } from './org-id-query.dto';

export class OvertimeQueryDto extends OrgIdQueryDto {
  @ApiPropertyOptional({
    description: 'Weekly payroll hour limit to check against',
    example: 38,
    default: 38,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  weeklyLimitHours?: number = 38;

  @ApiPropertyOptional({
    description:
      'Payroll week offset relative to the current week: 0 = current week, -1 = previous week, 1 = next week, etc.',
    example: 0,
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  weekOffset?: number = 0;
}
