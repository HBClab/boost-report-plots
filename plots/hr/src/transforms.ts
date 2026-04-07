import type {
  AlignedSubjectRosterEntry,
  DashboardData,
  GroupName,
  HrSessionRow,
  WeeklyGroupAdherenceSummary,
  WeeklyGroupZoneSummary,
  WeeklySubjectAdherenceSummary
} from './types.js';

const GROUPS: GroupName[] = ['Supervised', 'Unsupervised'];
const WEEKS = [1, 2, 3, 4, 5, 6];
export const HEATMAP_ADHERENCE_THRESHOLD = 0.5;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function sampleSd(values: number[]): number | null {
  if (values.length <= 1) {
    return null;
  }

  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1);
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
    .map((record) => ({
      group: record.group as GroupName,
      subject: record.subject,
      week: parseNumber(record.week),
      session: parseNumber(record.session),
      time_in_allowed_s: parseNumber(record.time_in_allowed_s),
      time_above_s: parseNumber(record.time_above_s),
      time_below_s: parseNumber(record.time_below_s),
      bounded_met: parseBoolean(record.bounded_met)
    }))
    .filter((row) => GROUPS.includes(row.group));

  const weekMapByGroup = new Map<GroupName, Map<number, number>>();
  for (const group of GROUPS) {
    const weeks = [...new Set(parsed.filter((row) => row.group === group).map((row) => row.week))]
      .sort((a, b) => a - b)
      .slice(0, 6);
    weekMapByGroup.set(
      group,
      new Map(weeks.map((week, index) => [week, index + 1]))
    );
  }

  return parsed
    .map((row) => {
      const normalizedWeek = weekMapByGroup.get(row.group)?.get(row.week);
      if (!normalizedWeek) {
        return null;
      }
      return {
        ...row,
        week: normalizedWeek
      };
    })
    .filter((row): row is HrSessionRow => row != null)
    .filter((row) => row.week >= 1 && row.week <= 6);
}

export function buildWeeklyGroupZoneSummaries(rows: HrSessionRow[]): WeeklyGroupZoneSummary[] {
  return GROUPS.flatMap((group) =>
    WEEKS.map((week) => {
      const matches = rows.filter((row) => row.group === group && row.week === week);
      if (matches.length === 0) {
        return {
          group,
          week,
          meanBelowS: null,
          meanInZoneS: null,
          meanAboveS: null,
          sessionCount: 0
        };
      }

      const sessionCount = matches.length;
      return {
        group,
        week,
        meanBelowS: matches.reduce((sum, row) => sum + row.time_below_s, 0) / sessionCount,
        meanInZoneS: matches.reduce((sum, row) => sum + row.time_in_allowed_s, 0) / sessionCount,
        meanAboveS: matches.reduce((sum, row) => sum + row.time_above_s, 0) / sessionCount,
        sessionCount
      };
    })
  );
}

export function buildWeeklyGroupAdherenceSummaries(
  rows: HrSessionRow[]
): WeeklyGroupAdherenceSummary[] {
  return GROUPS.flatMap((group) =>
    WEEKS.map((week) => {
      const matches = rows.filter((row) => row.group === group && row.week === week);
      if (matches.length === 0) {
        return {
          group,
          week,
          adherenceRate: null,
          subjectRateSd: null,
          lowerBound: null,
          upperBound: null,
          totalSessions: 0
        };
      }

      const totalSessions = matches.length;
      const metSessions = matches.filter((row) => row.bounded_met).length;
      const adherenceRate = metSessions / totalSessions;

      const bySubject = new Map<string, HrSessionRow[]>();
      for (const row of matches) {
        const existing = bySubject.get(row.subject);
        if (existing) {
          existing.push(row);
        } else {
          bySubject.set(row.subject, [row]);
        }
      }

      const subjectRates = [...bySubject.values()].map((subjectRows) => {
        const met = subjectRows.filter((row) => row.bounded_met).length;
        return met / subjectRows.length;
      });
      const subjectRateSd = sampleSd(subjectRates);

      return {
        group,
        week,
        adherenceRate,
        subjectRateSd,
        lowerBound: subjectRateSd == null ? adherenceRate : clamp(adherenceRate - subjectRateSd, 0, 1),
        upperBound: subjectRateSd == null ? adherenceRate : clamp(adherenceRate + subjectRateSd, 0, 1),
        totalSessions
      };
    })
  );
}

export function buildWeeklySubjectAdherenceSummaries(
  rows: HrSessionRow[]
): WeeklySubjectAdherenceSummary[] {
  const grouped = new Map<string, HrSessionRow[]>();
  for (const row of rows) {
    const key = `${row.group}|${row.subject}|${row.week}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.push(row);
    } else {
      grouped.set(key, [row]);
    }
  }

  return [...grouped.entries()].map(([key, subjectRows]) => {
    const [group, subject, weekValue] = key.split('|');
    const totalSessions = subjectRows.length;
    const metSessions = subjectRows.filter((row) => row.bounded_met).length;
    const adherenceRatio = totalSessions > 0 ? metSessions / totalSessions : null;
    let status: WeeklySubjectAdherenceSummary['status'] = 'no_data';
    if (totalSessions > 0 && adherenceRatio != null) {
      status = adherenceRatio >= HEATMAP_ADHERENCE_THRESHOLD ? 'met' : 'not_met';
    }

    return {
      group: group as GroupName,
      subject,
      week: Number(weekValue),
      totalSessions,
      metSessions,
      adherenceRatio,
      status
    };
  });
}

export function buildAlignedSubjectRoster(rows: HrSessionRow[]): AlignedSubjectRosterEntry[] {
  const subjects = new Set(rows.map((row) => row.subject));
  return [...subjects]
    .sort((a, b) => a.localeCompare(b))
    .map((subject, index) => ({
      subject,
      rowIndex: index,
      hasSupervisedData: rows.some((row) => row.subject === subject && row.group === 'Supervised'),
      hasUnsupervisedData: rows.some(
        (row) => row.subject === subject && row.group === 'Unsupervised'
      )
    }));
}

export function buildDashboardData(records: Array<Record<string, string>>): DashboardData {
  const rows = parseSessionRows(records);
  return {
    rows,
    zoneSummaries: buildWeeklyGroupZoneSummaries(rows),
    adherenceSummaries: buildWeeklyGroupAdherenceSummaries(rows),
    subjectSummaries: buildWeeklySubjectAdherenceSummaries(rows),
    roster: buildAlignedSubjectRoster(rows)
  };
}
