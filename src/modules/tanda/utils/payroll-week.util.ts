/**
 * Payroll week: Tuesday to Monday. Returns the range (yyyy-MM-dd, server local
 * time) that contains the given date.
 */
export interface PayrollWeek {
  start: Date;
  end: Date;
  startStr: string;
  endStr: string;
}

const TUESDAY = 2;

export function getPayrollWeek(reference: Date = new Date()): PayrollWeek {
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
  reference: Date = new Date(),
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
