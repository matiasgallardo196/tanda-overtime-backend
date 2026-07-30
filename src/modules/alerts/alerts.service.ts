import { BadGatewayException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AlertsRepository } from './alerts.repository';
import { AlertsSchedulerService } from './alerts-scheduler.service';
import { ReportBuilderService, ReportContent } from './report-builder.service';
import { CreateAlertDto } from './dto/create-alert.dto';
import { UpdateAlertDto } from './dto/update-alert.dto';
import { Alert } from './interfaces/alert.interface';

const DEFAULT_TIMEZONE = 'Australia/Sydney';

@Injectable()
export class AlertsService {
  constructor(
    private readonly repository: AlertsRepository,
    private readonly scheduler: AlertsSchedulerService,
    private readonly reportBuilder: ReportBuilderService,
  ) {}

  findAll(): Promise<Alert[]> {
    return this.repository.findAll();
  }

  async findOneOrThrow(id: string): Promise<Alert> {
    const alert = await this.repository.findById(id);
    if (!alert) throw new NotFoundException(`Alert ${id} not found`);
    return alert;
  }

  async create(dto: CreateAlertDto): Promise<Alert> {
    const now = new Date().toISOString();
    const alert: Alert = {
      id: randomUUID(),
      name: dto.name,
      enabled: dto.enabled ?? true,
      schedule: {
        time: dto.schedule.time,
        timezone: dto.schedule.timezone ?? DEFAULT_TIMEZONE,
        daysOfWeek: dto.schedule.daysOfWeek,
      },
      overtime: {
        enabled: dto.overtime.enabled,
        thresholdHours: dto.overtime.thresholdHours ?? 38,
        departmentIds: dto.overtime.departmentIds ?? null,
        employeeIds: dto.overtime.employeeIds ?? null,
      },
      clockCompliance: {
        enabled: dto.clockCompliance.enabled,
        toleranceMinutes: dto.clockCompliance.toleranceMinutes ?? 1,
        departmentIds: dto.clockCompliance.departmentIds ?? null,
        employeeIds: dto.clockCompliance.employeeIds ?? null,
      },
      recipient: dto.recipient,
      lastSentDate: null,
      createdAt: now,
      updatedAt: now,
    };
    return this.repository.create(alert);
  }

  async update(id: string, dto: UpdateAlertDto): Promise<Alert> {
    const existing = await this.findOneOrThrow(id);

    const patch: Partial<Alert> = {};
    if (dto.name !== undefined) patch.name = dto.name;
    if (dto.enabled !== undefined) patch.enabled = dto.enabled;
    if (dto.schedule !== undefined) {
      patch.schedule = {
        time: dto.schedule.time ?? existing.schedule.time,
        timezone: dto.schedule.timezone ?? existing.schedule.timezone,
        daysOfWeek: dto.schedule.daysOfWeek ?? existing.schedule.daysOfWeek,
      };
    }
    if (dto.overtime !== undefined) {
      patch.overtime = {
        enabled: dto.overtime.enabled ?? existing.overtime.enabled,
        thresholdHours: dto.overtime.thresholdHours ?? existing.overtime.thresholdHours,
        departmentIds:
          dto.overtime.departmentIds !== undefined
            ? dto.overtime.departmentIds
            : existing.overtime.departmentIds,
        employeeIds:
          dto.overtime.employeeIds !== undefined
            ? dto.overtime.employeeIds
            : existing.overtime.employeeIds,
      };
    }
    if (dto.clockCompliance !== undefined) {
      patch.clockCompliance = {
        enabled: dto.clockCompliance.enabled ?? existing.clockCompliance.enabled,
        toleranceMinutes:
          dto.clockCompliance.toleranceMinutes ?? existing.clockCompliance.toleranceMinutes,
        departmentIds:
          dto.clockCompliance.departmentIds !== undefined
            ? dto.clockCompliance.departmentIds
            : existing.clockCompliance.departmentIds,
        employeeIds:
          dto.clockCompliance.employeeIds !== undefined
            ? dto.clockCompliance.employeeIds
            : existing.clockCompliance.employeeIds,
      };
    }
    if (dto.recipient !== undefined) patch.recipient = dto.recipient;

    const updated = await this.repository.update(id, patch);
    return updated!;
  }

  async remove(id: string): Promise<void> {
    await this.findOneOrThrow(id);
    await this.repository.delete(id);
  }

  async sendTest(id: string): Promise<void> {
    const alert = await this.findOneOrThrow(id);
    try {
      await this.scheduler.dispatch(alert);
    } catch (err) {
      throw new BadGatewayException((err as Error).message);
    }
  }

  async preview(id: string): Promise<ReportContent> {
    const alert = await this.findOneOrThrow(id);
    return this.reportBuilder.build(alert);
  }
}
