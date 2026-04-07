// HR data transforms — adapted from plots/hr/src/transforms.ts
import type {
  HrAlignedSubjectRosterEntry,
  HrDashboardData,
  HrGroupName,
  HrSessionRow,
  HrWeeklyGroupAdherenceSummary,
  HrWeeklyGroupZoneSummary,
  HrWeeklySubjectAdherenceSummary,
} from './hr-types.js';

const GROUPS: HrGroupName[] = ['Supervised', 'Unsupervised'];
const WEEKS = [1, 2, 3, 4, 5, 6];
export const HEATMAP_ADHERENCE_THRESHOLD = 0.5;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function sampleSd(values: number[]): number | null {
  if (values.length <= 1) return null;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function parseBoolean(value: string): boolean {
  return value.toLowerCase() === 'true';
}

function parseNumber(value: string, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function parseSessionRows(records: Array<Record<string, string>>): HrSessionRow[] {
  const parsed = records
    .map((r) => ({
      group: r.group as HrGroupName,
      subject: r.subject,
      week: parseNumber(r.week),
      session: parseNumber(r.session),
      time_in_allowed_s: parseNumber(r.time_in_allowed_s),
      time_above_s: parseNumber(r.time_above_s),
      time_below_s: parseNumber(r.time_below_s),
      bounded_met: parseBoolean(r.bounded_met),
    }))
    .filter((row) => GROUPS.includes(row.group));

  const weekMapByGroup = new Map<HrGroupName, Map<number, number>>();
  for (const group of GROUPS) {
    const weeks = [...new Set(parsed.filter((r) => r.group === group).map((r) => r.week))]
      .sort((a, b) => a - b)
      .slice(0, 6);
    weekMapByGroup.set(group, new Map(weeks.map((w, i) => [w, i + 1])));
  }

  return parsed
    .map((row) => {
      const normalized = weekMapByGroup.get(row.group)?.get(row.week);
      if (!normalized) return null;
      return { ...row, week: normalized };
    })
    .filter((r): r is HrSessionRow => r != null)
    .filter((r) => r.week >= 1 && r.week <= 6);
}

export function buildWeeklyGroupZoneSummaries(rows: HrSessionRow[]): HrWeeklyGroupZoneSummary[] {
  return GROUPS.flatMap((group) =>
    WEEKS.map((week) => {
      const matches = rows.filter((r) => r.group === group && r.week === week);
      if (matches.length === 0) {
        return { group, week, meanBelowS: null, meanInZoneS: null, meanAboveS: null, sessionCount: 0 };
      }
      const n = matches.length;
      return {
        group, week,
        meanBelowS:  matches.reduce((s, r) => s + r.time_below_s, 0) / n,
        meanInZoneS: matches.reduce((s, r) => s + r.time_in_allowed_s, 0) / n,
        meanAboveS:  matches.reduce((s, r) => s + r.time_above_s, 0) / n,
        sessionCount: n,
      };
    })
  );
}

export function buildWeeklyGroupAdherenceSummaries(rows: HrSessionRow[]): HrWeeklyGroupAdherenceSummary[] {
  return GROUPS.flatMap((group) =>
    WEEKS.map((week) => {
      const matches = rows.filter((r) => r.group === group && r.week === week);
      if (matches.length === 0) {
        return { group, week, adherenceRate: null, subjectRateSd: null, lowerBound: null, upperBound: null, totalSessions: 0 };
      }
      const totalSessions = matches.length;
      const metSessions = matches.filter((r) => r.bounded_met).length;
      const adherenceRate = metSessions / totalSessions;
      const bySubject = new Map<string, HrSessionRow[]>();
      for (const r of matches) {
        const existing = bySubject.get(r.subject);
        if (existing) existing.push(r);
        else bySubject.set(r.subject, [r]);
      }
      const subjectRates = [...bySubject.values()].map((rs) => rs.filter((r) => r.bounded_met).length / rs.length);
      const subjectRateSd = sampleSd(subjectRates);
      return {
        group, week, adherenceRate, subjectRateSd, totalSessions,
        lowerBound: subjectRateSd == null ? adherenceRate : clamp(adherenceRate - subjectRateSd, 0, 1),
        upperBound: subjectRateSd == null ? adherenceRate : clamp(adherenceRate + subjectRateSd, 0, 1),
      };
    })
  );
}

export function buildWeeklySubjectAdherenceSummaries(rows: HrSessionRow[]): HrWeeklySubjectAdherenceSummary[] {
  const grouped = new Map<string, HrSessionRow[]>();
  for (const r of rows) {
    const key = `${r.group}|${r.subject}|${r.week}`;
    const existing = grouped.get(key);
    if (existing) existing.push(r);
    else grouped.set(key, [r]);
  }
  return [...grouped.entries()].map(([key, subjectRows]) => {
    const [group, subject, weekStr] = key.split('|');
    const totalSessions = subjectRows.length;
    const metSessions = subjectRows.filter((r) => r.bounded_met).length;
    const adherenceRatio = totalSessions > 0 ? metSessions / totalSessions : null;
    const status: HrWeeklySubjectAdherenceSummary['status'] =
      totalSessions > 0 && adherenceRatio != null
        ? adherenceRatio >= HEATMAP_ADHERENCE_THRESHOLD ? 'met' : 'not_met'
        : 'no_data';
    return { group: group as HrGroupName, subject, week: Number(weekStr), totalSessions, metSessions, adherenceRatio, status };
  });
}

export function buildAlignedSubjectRoster(rows: HrSessionRow[]): HrAlignedSubjectRosterEntry[] {
  const subjects = new Set(rows.map((r) => r.subject));
  return [...subjects].sort((a, b) => a.localeCompare(b)).map((subject, index) => ({
    subject, rowIndex: index,
    hasSupervisedData: rows.some((r) => r.subject === subject && r.group === 'Supervised'),
    hasUnsupervisedData: rows.some((r) => r.subject === subject && r.group === 'Unsupervised'),
  }));
}

export function buildHrDashboardData(records: Array<Record<string, string>>): HrDashboardData {
  const rows = parseSessionRows(records);
  return {
    rows,
    zoneSummaries: buildWeeklyGroupZoneSummaries(rows),
    adherenceSummaries: buildWeeklyGroupAdherenceSummaries(rows),
    subjectSummaries: buildWeeklySubjectAdherenceSummaries(rows),
    roster: buildAlignedSubjectRoster(rows),
  };
}
