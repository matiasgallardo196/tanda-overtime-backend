import { Body, Controller, Delete, Get, HttpCode, Param, Post, Patch } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AlertsService } from './alerts.service';
import { CreateAlertDto } from './dto/create-alert.dto';
import { UpdateAlertDto } from './dto/update-alert.dto';
import { Alert } from './interfaces/alert.interface';
import { ReportContent } from './report-builder.service';

@ApiTags('alerts')
@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get()
  @ApiOperation({ summary: 'List all configured alerts/reports' })
  @ApiOkResponse({ description: 'Array of alert configs' })
  findAll(): Promise<Alert[]> {
    return this.alertsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single alert config' })
  findOne(@Param('id') id: string): Promise<Alert> {
    return this.alertsService.findOneOrThrow(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new alert/report (like adding a new alarm)' })
  create(@Body() dto: CreateAlertDto): Promise<Alert> {
    return this.alertsService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update an alert (e.g. toggle enabled, change schedule/content/recipient)',
  })
  update(@Param('id') id: string, @Body() dto: UpdateAlertDto): Promise<Alert> {
    return this.alertsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete an alert' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.alertsService.remove(id);
  }

  @Post(':id/test')
  @ApiOperation({ summary: 'Send this alert right now, to all its configured channels' })
  @ApiOkResponse({ description: '{ sent: true }' })
  async sendTest(@Param('id') id: string): Promise<{ sent: true }> {
    await this.alertsService.sendTest(id);
    return { sent: true };
  }

  @Get(':id/preview')
  @ApiOperation({ summary: 'Preview the report content without sending it' })
  @ApiOkResponse({ description: 'subject/html/text preview' })
  preview(@Param('id') id: string): Promise<ReportContent> {
    return this.alertsService.preview(id);
  }
}
