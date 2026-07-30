import { Injectable } from '@nestjs/common';
import { TandaService } from '../tanda/tanda.service';
import { Alert, AlertContentFilter } from './interfaces/alert.interface';
import { getYesterdayInTimezone } from './utils/timezone.util';

export interface ReportContent {
  subject: string;
  html: string;
  text: string;
  /**
   * Short one-liner summary for SMS. Trial Twilio accounts reject
   * multi-segment SMS (error 30044), and SMS is meant for a quick heads-up
   * anyway - the full detail already goes out via email/WhatsApp.
   */
  sms: string;
}

interface ReportSection {
  title: string;
  html: string;
  text: string;
  count: number;
}

@Injectable()
export class ReportBuilderService {
  constructor(private readonly tandaService: TandaService) {}

  async build(alert: Alert): Promise<ReportContent> {
    const sections: ReportSection[] = [];

    if (alert.overtime.enabled) {
      sections.push(await this.buildOvertimeSection(alert));
    }
    if (alert.clockCompliance.enabled) {
      sections.push(await this.buildClockComplianceSection(alert));
    }

    const subject = `${alert.name} - daily report`;
    const html = [
      `<h1>${escapeHtml(subject)}</h1>`,
      ...sections.map((s) => `<h2>${escapeHtml(s.title)}</h2>${s.html}`),
    ].join('\n');
    const text = sections.map((s) => `${s.title}\n${'-'.repeat(s.title.length)}\n${s.text}`).join(
      '\n\n',
    );
    const sms = `${alert.name}: ${sections.map((s) => `${s.count} - ${s.title}`).join('; ')}`;

    return { subject, html, text, sms };
  }

  private async getDepartmentMembership(): Promise<Map<number, Set<number>>> {
    const departments = await this.tandaService.getDepartments();
    const map = new Map<number, Set<number>>();
    for (const dept of departments) {
      const staff = (dept.staff as number[] | undefined) ?? [];
      for (const employeeId of staff) {
        if (!map.has(employeeId)) map.set(employeeId, new Set());
        map.get(employeeId)!.add(dept.id);
      }
    }
    return map;
  }

  private matchesEmployee(employeeId: number, filter: AlertContentFilter): boolean {
    if (filter.employeeIds === null) return true;
    return filter.employeeIds.includes(employeeId);
  }

  private matchesDepartmentViaMembership(
    employeeId: number,
    filter: AlertContentFilter,
    membership: Map<number, Set<number>>,
  ): boolean {
    if (filter.departmentIds === null) return true;
    const depts = membership.get(employeeId) ?? new Set<number>();
    return filter.departmentIds.some((d) => depts.has(d));
  }

  private matchesDepartmentDirect(departmentId: number, filter: AlertContentFilter): boolean {
    if (filter.departmentIds === null) return true;
    return filter.departmentIds.includes(departmentId);
  }

  private async buildOvertimeSection(alert: Alert): Promise<ReportSection> {
    const threshold = alert.overtime.thresholdHours;
    const title = `Overtime - projected over ${threshold}h this week`;

    const summaries = await this.tandaService.getOvertimeOverview(threshold, 0);
    const membership = await this.getDepartmentMembership();

    const overLimit = summaries.filter(
      (s) =>
        s.exceedsLimit &&
        this.matchesEmployee(s.employeeId, alert.overtime) &&
        this.matchesDepartmentViaMembership(s.employeeId, alert.overtime, membership),
    );

    if (overLimit.length === 0) {
      const msg = 'No employees are currently projected over the limit.';
      return { title, html: `<p>${msg}</p>`, text: msg, count: 0 };
    }

    const text = overLimit
      .map(
        (s) =>
          `- ${s.employeeName}: projected ${s.projectedTotalHours}h (+${s.exceedsByHours}h over ${threshold}h)`,
      )
      .join('\n');
    const html =
      '<ul>' +
      overLimit
        .map(
          (s) =>
            `<li>${escapeHtml(s.employeeName)}: projected <b>${s.projectedTotalHours}h</b> (+${s.exceedsByHours}h over ${threshold}h)</li>`,
        )
        .join('') +
      '</ul>';

    return { title, html, text, count: overLimit.length };
  }

  private async buildClockComplianceSection(alert: Alert): Promise<ReportSection> {
    const yesterday = getYesterdayInTimezone(alert.schedule.timezone);
    const title = `Clock compliance - ${yesterday}`;

    const entries = await this.tandaService.getClockCompliance(
      0,
      yesterday,
      alert.clockCompliance.toleranceMinutes,
    );

    const flagged = entries.filter(
      (e) =>
        e.flagged &&
        this.matchesEmployee(e.employeeId, alert.clockCompliance) &&
        this.matchesDepartmentDirect(e.departmentId, alert.clockCompliance),
    );

    if (flagged.length === 0) {
      const msg = 'No clock-in/out issues yesterday.';
      return { title, html: `<p>${msg}</p>`, text: msg, count: 0 };
    }

    const describe = (e: (typeof flagged)[number]) => {
      const parts: string[] = [];
      if (e.earlyClockInMinutes > 0) parts.push(`clocked in ${e.earlyClockInMinutes}m early`);
      if (e.lateClockOutMinutes > 0) {
        parts.push(`clocked out ${e.lateClockOutMinutes}m late${e.inProgress ? ' (still clocked in)' : ''}`);
      }
      return `${e.employeeName} (${e.departmentName}): ${parts.join(', ')}`;
    };

    const text = flagged.map((e) => `- ${describe(e)}`).join('\n');
    const html = '<ul>' + flagged.map((e) => `<li>${escapeHtml(describe(e))}</li>`).join('') + '</ul>';

    return { title, html, text, count: flagged.length };
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
