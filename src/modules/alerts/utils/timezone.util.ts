const WEEKDAY_TO_NUMBER: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export interface NowInTimezone {
  /** 24h "HH:mm" */
  hhmm: string;
  /** 0=Sunday .. 6=Saturday */
  dayOfWeek: number;
  /** yyyy-MM-dd */
  dateStr: string;
}

export function getNowInTimezone(timezone: string, reference: Date = new Date()): NowInTimezone {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    weekday: 'short',
  }).formatToParts(reference);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const year = get('year');
  const month = get('month');
  const day = get('day');
  const hour = get('hour');
  const minute = get('minute');
  const weekday = get('weekday');

  return {
    hhmm: `${hour}:${minute}`,
    dayOfWeek: WEEKDAY_TO_NUMBER[weekday] ?? 0,
    dateStr: `${year}-${month}-${day}`,
  };
}

/** yyyy-MM-dd for the calendar day before "now" in the given timezone. */
export function getYesterdayInTimezone(timezone: string, reference: Date = new Date()): string {
  const { dateStr } = getNowInTimezone(timezone, reference);
  const [y, m, d] = dateStr.split('-').map(Number);
  const asUtc = new Date(Date.UTC(y, m - 1, d));
  asUtc.setUTCDate(asUtc.getUTCDate() - 1);
  const yy = asUtc.getUTCFullYear();
  const mm = String(asUtc.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(asUtc.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}
