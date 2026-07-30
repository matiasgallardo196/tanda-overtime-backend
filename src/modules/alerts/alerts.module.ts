import { Module } from '@nestjs/common';
import { TandaModule } from '../tanda/tanda.module';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';
import { AlertsRepository } from './alerts.repository';
import { AlertsSchedulerService } from './alerts-scheduler.service';
import { ReportBuilderService } from './report-builder.service';
import { EmailSender } from './channels/email-sender.service';
import { TwilioSender } from './channels/twilio-sender.service';

@Module({
  imports: [TandaModule],
  controllers: [AlertsController],
  providers: [
    AlertsService,
    AlertsRepository,
    AlertsSchedulerService,
    ReportBuilderService,
    EmailSender,
    TwilioSender,
  ],
})
export class AlertsModule {}
