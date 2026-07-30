import * as dotenv from 'dotenv';

// The project's .env must win over any OS environment variable already
// present in the process (e.g. an old TANDA_API_TOKEN set with `setx` in a
// previous session, inherited by the shell before the last update).
dotenv.config({ override: true });

export interface AppConfig {
  port: number;
  /** Origins allowed to call this API (CORS). */
  corsOrigins: string[];
  tanda: {
    baseUrl: string;
    apiToken: string | undefined;
    defaultOrgId: number | undefined;
    /**
     * Employee IDs that have a contract but are paid overtime directly
     * instead of banking it as TOIL (time off in lieu) like the rest of the
     * contracted staff. For the casual/contract filter these should be
     * grouped with casuals, since that's who actually needs overtime
     * monitoring. Their contract badge still shows "Contract" (that's the
     * factual Tanda status) - only the filter grouping changes.
     */
    overtimePaidContractIds: number[];
  };
  resend: {
    apiKey: string | undefined;
    fromEmail: string | undefined;
  };
  twilio: {
    accountSid: string | undefined;
    authToken: string | undefined;
    whatsappFrom: string | undefined;
    smsFrom: string | undefined;
  };
}

export default (): AppConfig => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  corsOrigins: (process.env.CORS_ORIGIN ?? 'http://localhost:3001')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  tanda: {
    baseUrl: process.env.TANDA_BASE_URL ?? 'https://my.tanda.co',
    apiToken: process.env.TANDA_API_TOKEN,
    defaultOrgId: process.env.TANDA_DEFAULT_ORG_ID
      ? parseInt(process.env.TANDA_DEFAULT_ORG_ID, 10)
      : undefined,
    overtimePaidContractIds: (process.env.TANDA_OVERTIME_PAID_CONTRACT_IDS ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => parseInt(s, 10)),
  },
  resend: {
    apiKey: process.env.RESEND_API_KEY,
    fromEmail: process.env.REPORT_FROM_EMAIL,
  },
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    whatsappFrom: process.env.TWILIO_WHATSAPP_FROM,
    smsFrom: process.env.TWILIO_SMS_FROM,
  },
});
