import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Matches } from 'class-validator';

export class CostsSummaryQueryDto {
  @ApiPropertyOptional({
    description: 'Override the default Tanda organisation for this request',
  })
  @IsOptional()
  @IsInt()
  orgId?: number;
}

export class WeekDetailQueryDto {
  @ApiPropertyOptional({
    description:
      'Tuesday that starts the payroll week (yyyy-MM-dd). Defaults to the current payroll week.',
    example: '2026-07-28',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'weekStart must be yyyy-MM-dd' })
  weekStart?: string;

  @ApiPropertyOptional({
    description: 'Override the default Tanda organisation for this request',
  })
  @IsOptional()
  @IsInt()
  orgId?: number;
}
