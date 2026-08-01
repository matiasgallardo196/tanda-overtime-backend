import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsPositive, Matches } from 'class-validator';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export class UpdateBudgetDto {
  @ApiProperty({ example: 1169490, description: 'Total wage budget (no on-costs) for the period' })
  @IsNumber()
  @IsPositive()
  totalBudget: number;

  @ApiProperty({ example: '2026-08-01', description: 'First day the budget covers (yyyy-MM-dd)' })
  @Matches(DATE_RE, { message: 'startDate must be yyyy-MM-dd' })
  startDate: string;

  @ApiProperty({ example: '2027-06-30', description: 'Last day the budget covers (yyyy-MM-dd)' })
  @Matches(DATE_RE, { message: 'endDate must be yyyy-MM-dd' })
  endDate: string;
}
