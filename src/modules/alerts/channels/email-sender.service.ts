import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { AppConfig } from '../../../config/configuration';

@Injectable()
export class EmailSender {
  private client: Resend | null = null;

  constructor(private readonly configService: ConfigService<AppConfig, true>) {}

  private getClient(): Resend {
    if (!this.client) {
      const apiKey = this.configService.get('resend.apiKey', { infer: true });
      if (!apiKey) {
        throw new Error(
          'RESEND_API_KEY is not configured. Add it to .env to send email alerts.',
        );
      }
      this.client = new Resend(apiKey);
    }
    return this.client;
  }

  async send(to: string, subject: string, html: string, text: string): Promise<void> {
    const from = this.configService.get('resend.fromEmail', { infer: true });
    if (!from) {
      throw new Error(
        'REPORT_FROM_EMAIL is not configured. Add it to .env to send email alerts.',
      );
    }
    const client = this.getClient();
    const { error } = await client.emails.send({ from, to, subject, html, text });
    if (error) {
      throw new Error(`Resend error: ${error.message}`);
    }
  }
}
