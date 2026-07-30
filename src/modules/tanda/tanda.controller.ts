import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { TandaService } from './tanda.service';
import { OrgIdQueryDto } from './dto/org-id-query.dto';
import { GetShiftsQueryDto } from './dto/get-shifts-query.dto';
import { OvertimeQueryDto } from './dto/overtime-query.dto';
import { ClockComplianceQueryDto } from './dto/clock-compliance-query.dto';
import {
  OvertimeCheckResponseDto,
  OvertimeSummaryDto,
} from './dto/overtime-check-response.dto';
import { ClockComplianceEntryDto } from './dto/clock-compliance-entry.dto';
import {
  TandaDepartment,
  TandaRoster,
  TandaShift,
  TandaUser,
} from './interfaces/tanda-api.interfaces';

@ApiTags('tanda')
@Controller('tanda')
export class TandaController {
  constructor(private readonly tandaService: TandaService) {}

  @Get('employees')
  @ApiOperation({ summary: 'List of employees (GET /api/v2/users from Tanda)' })
  @ApiOkResponse({ description: 'Raw array of employees returned by Tanda' })
  getEmployees(@Query() query: OrgIdQueryDto): Promise<TandaUser[]> {
    return this.tandaService.getUsers(query.orgId);
  }

  @Get('employees/:id')
  @ApiOperation({ summary: 'Employee detail (GET /api/v2/users/{id})' })
  @ApiParam({ name: 'id', example: 1000001 })
  @ApiOkResponse({ description: 'Raw employee object returned by Tanda' })
  getEmployeeById(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: OrgIdQueryDto,
  ): Promise<TandaUser> {
    return this.tandaService.getUserById(id, query.orgId);
  }

  @Get('departments')
  @ApiOperation({ summary: 'List of departments/teams (GET /api/v2/departments from Tanda)' })
  @ApiOkResponse({ description: 'Raw array of departments returned by Tanda' })
  getDepartments(@Query() query: OrgIdQueryDto): Promise<TandaDepartment[]> {
    return this.tandaService.getDepartments(query.orgId);
  }

  @Get('roster/current')
  @ApiOperation({ summary: 'Current roster (GET /api/v2/rosters/current)' })
  @ApiOkResponse({ description: 'Raw roster object returned by Tanda' })
  getCurrentRoster(@Query() query: OrgIdQueryDto): Promise<TandaRoster> {
    return this.tandaService.getCurrentRoster(query.orgId);
  }

  @Get('shifts')
  @ApiOperation({
    summary: 'Shifts/timesheet within a date range (GET /api/v2/shifts?from=&to=)',
  })
  @ApiOkResponse({ description: 'Raw array of shifts returned by Tanda' })
  getShifts(@Query() query: GetShiftsQueryDto): Promise<TandaShift[]> {
    return this.tandaService.getShifts(query.from, query.to, query.orgId);
  }

  @Get('overtime-check')
  @ApiOperation({
    summary:
      'Worked/remaining hours summary for ALL employees in the selected payroll week, sorted from highest to lowest risk',
  })
  @ApiOkResponse({ type: [OvertimeSummaryDto] })
  getOvertimeOverview(
    @Query() query: OvertimeQueryDto,
  ): Promise<OvertimeSummaryDto[]> {
    return this.tandaService.getOvertimeOverview(
      query.weeklyLimitHours ?? 38,
      query.weekOffset ?? 0,
      query.orgId,
    );
  }

  @Get('employees/:id/overtime-check')
  @ApiOperation({
    summary:
      'Hours worked (Tue->now) + remaining rostered hours (now->Mon) vs. the weekly limit',
  })
  @ApiParam({ name: 'id', example: 1000001 })
  @ApiOkResponse({ type: OvertimeCheckResponseDto })
  getOvertimeCheck(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: OvertimeQueryDto,
  ): Promise<OvertimeCheckResponseDto> {
    return this.tandaService.getOvertimeCheck(
      id,
      query.weeklyLimitHours ?? 38,
      query.weekOffset ?? 0,
      query.orgId,
    );
  }

  @Get('clock-compliance')
  @ApiOperation({
    summary:
      'Shifts clocked in before the scheduled start or clocked out after the scheduled finish (unbudgeted extra time). Late arrivals and early departures are not flagged.',
  })
  @ApiOkResponse({ type: [ClockComplianceEntryDto] })
  getClockCompliance(
    @Query() query: ClockComplianceQueryDto,
  ): Promise<ClockComplianceEntryDto[]> {
    return this.tandaService.getClockCompliance(
      query.weekOffset ?? 0,
      query.date,
      query.toleranceMinutes ?? 1,
      query.orgId,
    );
  }
}
