import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Twilio from 'twilio';
import { AppConfig } from '../../../config/configuration';

@Injectable()
export class TwilioSender {
  private client: Twilio.Twilio | null = null;

  constructor(private readonly configService: ConfigService<AppConfig, true>) {}

  private getClient(): Twilio.Twilio {
    if (!this.client) {
      const sid = this.configService.get('twilio.accountSid', { infer: true });
      const authToken = this.configService.get('twilio.authToken', { infer: true });
      if (!sid || !authToken) {
        throw new Error(
          'TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN are not configured. Add them to .env to send WhatsApp/SMS alerts.',
        );
      }
      this.client = Twilio(sid, authToken);
    }
    return this.client;
  }

  /** `to` is an E.164 phone number, e.g. +61412345678 (no "whatsapp:" prefix needed). */
  async sendWhatsapp(to: string, body: string): Promise<void> {
    const from = this.configService.get('twilio.whatsappFrom', { infer: true });
    if (!from) {
      throw new Error(
        'TWILIO_WHATSAPP_FROM is not configured. Add it to .env to send WhatsApp alerts.',
      );
    }
    await this.getClient().messages.create({
      from: `whatsapp:${from}`,
      to: `whatsapp:${to}`,
      body,
    });
  }

  /** `to` is an E.164 phone number, e.g. +61412345678. */
  async sendSms(to: string, body: string): Promise<void> {
    const from = this.configService.get('twilio.smsFrom', { infer: true });
    if (!from) {
      throw new Error('TWILIO_SMS_FROM is not configured. Add it to .env to send SMS alerts.');
    }
    await this.getClient().messages.create({ from, to, body });
  }
}
