export interface TandaBreak {
  start: number | null;
  finish: number | null;
  paid: boolean;
  paid_meal_break?: boolean;
  length: number; // minutes
}

export interface TandaShift {
  id: number;
  timesheet_id?: number;
  user_id: number;
  date: string;
  start: number | null;
  finish: number | null;
  break_length?: number;
  breaks: TandaBreak[];
  department_id: number;
  status?: string;
  /** Wage cost (no on-costs). Only present when requested with show_costs=true (requires the "cost" OAuth scope). */
  cost?: number | null;
  /** Set when the entry is approved leave (annual/sick), not a worked shift. */
  leave_request_id?: number | null;
  [key: string]: unknown;
}

export interface TandaRosterSchedule {
  id: number;
  roster_id: number;
  user_id: number;
  start: number | null;
  finish: number | null;
  breaks: TandaBreak[];
  automatic_break_length?: number;
  department_id: number;
  /** Wage cost (no on-costs). Only present when requested with show_costs=true (requires the "cost" OAuth scope). */
  cost?: number | null;
  [key: string]: unknown;
}

export interface TandaRosterDay {
  date: string;
  schedules: TandaRosterSchedule[];
}

export interface TandaRoster {
  id: number;
  schedules: TandaRosterDay[];
  start: string;
  finish: string;
  [key: string]: unknown;
}

export interface TandaDepartment {
  id: number;
  name: string;
  location_id?: number;
  [key: string]: unknown;
}

export interface TandaUser {
  id: number;
  name: string;
  email?: string;
  organisation?: string;
  organisation_id?: number;
  permissions?: string[];
  /** null = casual (no guaranteed hours). A number = has a contract (guaranteed weekly hours). */
  contracted_weekly_hours?: number | null;
  [key: string]: unknown;
}
