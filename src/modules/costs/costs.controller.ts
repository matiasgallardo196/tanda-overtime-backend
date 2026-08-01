import { Body, Controller, Get, Put, Query } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CostsService } from './costs.service';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import {
  CostsSummaryQueryDto,
  WeekDetailQueryDto,
} from './dto/costs-query.dto';
import {
  BudgetConfigDto,
  CostsSummaryDto,
  WeekDetailDto,
} from './dto/costs-response.dto';

@ApiTags('costs')
@Controller('costs')
export class CostsController {
  constructor(private readonly costsService: CostsService) {}

  @Get('summary')
  @ApiOperation({
    summary:
      'Fiscal-year wage spend (no on-costs) per payroll week, department totals, and budget projection',
  })
  @ApiOkResponse({ type: CostsSummaryDto })
  getSummary(@Query() query: CostsSummaryQueryDto): Promise<CostsSummaryDto> {
    return this.costsService.getSummary(query.orgId);
  }

  @Get('week')
  @ApiOperation({
    summary:
      'Drill-down for one payroll week: actual vs roster cost, by department, employee and day',
  })
  @ApiOkResponse({ type: WeekDetailDto })
  getWeekDetail(@Query() query: WeekDetailQueryDto): Promise<WeekDetailDto> {
    return this.costsService.getWeekDetail(query.weekStart, query.orgId);
  }

  @Get('budget')
  @ApiOperation({ summary: 'Current budget configuration (null if not set yet)' })
  @ApiOkResponse({ type: BudgetConfigDto })
  getBudget(): Promise<BudgetConfigDto | null> {
    return this.costsService.getBudget();
  }

  @Put('budget')
  @ApiOperation({ summary: 'Set/replace the budget configuration' })
  @ApiOkResponse({ type: BudgetConfigDto })
  updateBudget(@Body() dto: UpdateBudgetDto): Promise<BudgetConfigDto> {
    return this.costsService.updateBudget(dto);
  }
}
