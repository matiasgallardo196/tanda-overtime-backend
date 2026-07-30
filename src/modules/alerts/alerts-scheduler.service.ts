import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AlertsRepository } from './alerts.repository';
import { ReportBuilderService } from './report-builder.service';
import { EmailSender } from './channels/email-sender.service';
import { TwilioSender } from './channels/twilio-sender.service';
import { Alert } from './interfaces/alert.interface';
import { getNowInTimezone } from './utils/timezone.util';

@Injectable()
export class AlertsSchedulerService {
  private readonly logger = new Logger(AlertsSchedulerService.name);

  constructor(
    private readonly repository: AlertsRepository,
    private readonly reportBuilder: ReportBuilderService,
    private readonly emailSender: EmailSender,
    private readonly twilioSender: TwilioSender,
  ) {}

  /** Runs every minute; each alert only fires once, at its configured HH:mm, on its configured days. */
  @Cron('0 * * * * *')
  async tick(): Promise<void> {
    const alerts = await this.repository.findAll();

    for (const alert of alerts) {
      if (!alert.enabled) continue;

      const { hhmm, dayOfWeek, dateStr } = getNowInTimezone(alert.schedule.timezone);
      if (alert.schedule.time !== hhmm) continue;
      if (!alert.schedule.daysOfWeek.includes(dayOfWeek)) continue;
      if (alert.lastSentDate === dateStr) continue; // already sent today

      try {
        await this.dispatch(alert);
        await this.repository.update(alert.id, { lastSentDate: dateStr });
        this.logger.log(`Sent alert "${alert.name}" (${alert.id})`);
      } catch (err) {
        this.logger.error(`Failed to send alert "${alert.name}" (${alert.id}): ${(err as Error).message}`);
      }
    }
  }

  /** Builds the report and sends it to every channel configured for the alert's recipient. */
  async dispatch(alert: Alert): Promise<void> {
    const report = await this.reportBuilder.build(alert);
    const combinedMessage = `${report.subject}\n\n${report.text}`;

    for (const channel of alert.recipient.channels) {
      if (channel.type === 'email') {
        await this.emailSender.send(channel.destination, report.subject, report.html, report.text);
      } else if (channel.type === 'whatsapp') {
        await this.twilioSender.sendWhatsapp(channel.destination, combinedMessage);
      } else if (channel.type === 'sms') {
        await this.twilioSender.sendSms(channel.destination, combinedMessage);
      }
    }
  }
}
