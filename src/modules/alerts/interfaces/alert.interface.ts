export type AlertChannelType = 'email' | 'whatsapp' | 'sms';

export interface AlertChannel {
  type: AlertChannelType;
  /** Email address, or E.164 phone number for whatsapp/sms (e.g. +61412345678) */
  destination: string;
}

export interface AlertRecipient {
  name: string;
  channels: AlertChannel[];
}

export interface AlertSchedule {
  /** 24h "HH:mm" */
  time: string;
  /** IANA timezone, e.g. "Australia/Sydney" */
  timezone: string;
  /** 0=Sunday .. 6=Saturday */
  daysOfWeek: number[];
}

/**
 * departmentIds/employeeIds: `null` = no filter (everyone/every department).
 * An explicit array (including an empty one) restricts to exactly those IDs.
 */
export interface AlertContentFilter {
  departmentIds: number[] | null;
  employeeIds: number[] | null;
}

export interface OvertimeAlertContent extends AlertContentFilter {
  enabled: boolean;
  thresholdHours: number;
}

export interface ClockComplianceAlertContent extends AlertContentFilter {
  enabled: boolean;
  toleranceMinutes: number;
}

export interface Alert {
  id: string;
  name: string;
  enabled: boolean;
  schedule: AlertSchedule;
  overtime: OvertimeAlertContent;
  clockCompliance: ClockComplianceAlertContent;
  recipient: AlertRecipient;
  /** yyyy-MM-dd (in schedule.timezone) of the last successful send, to avoid double-sending within the same day. */
  lastSentDate: string | null;
  createdAt: string;
  updatedAt: string;
}
