/**
 * Payroll week: Tuesday to Monday, on the ORGANISATION's wall clock
 * (Australia/Sydney by default), not the server's. The production server
 * runs in another timezone, so "today" and week boundaries must follow the
 * venue's local date or weeks close ~10 hours late.
 */
export interface PayrollWeek {
  start: Date;
  end: Date;
  startStr: string;
  endStr: string;
}

const TUESDAY = 2;

const ORG_TIMEZONE = process.env.TANDA_TIMEZONE ?? 'Australia/Sydney';

/**
 * A Date whose local Y/M/D/H/m fields mirror the organisation-timezone wall
 * clock right now. Only those fields are meaningful - never compare it with
 * absolute timestamps.
 */
export function nowInOrgTimezone(): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: ORG_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? '0');
  return new Date(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
  );
}

export function getPayrollWeek(reference: Date = nowInOrgTimezone()): PayrollWeek {
  const dow = reference.getDay(); // Sunday=0 ... Tuesday=2 ... Saturday=6
  const daysSinceTuesday = (dow - TUESDAY + 7) % 7;

  const start = new Date(reference);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - daysSinceTuesday);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return {
    start,
    end,
    startStr: toDateStr(start),
    endStr: toDateStr(end),
  };
}

/**
 * Same as getPayrollWeek, shifted by a number of whole weeks (negative = past,
 * positive = future) relative to the reference date (defaults to now).
 */
export function getPayrollWeekForOffset(
  weekOffset: number,
  reference: Date = nowInOrgTimezone(),
): PayrollWeek {
  const shifted = new Date(reference);
  shifted.setDate(shifted.getDate() + weekOffset * 7);
  return getPayrollWeek(shifted);
}

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
