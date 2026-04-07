// HR-specific types for the merged BOOST dashboard
// CardLayout is shared from ./types.ts (uses {x, y, w, h})

export type HrGroupName = 'Supervised' | 'Unsupervised';
export type HrHeatmapStatus = 'met' | 'not_met' | 'no_data';

export interface HrSessionRow {
  group: HrGroupName;
  subject: string;
  week: number;
  session: number;
  time_in_allowed_s: number;
  time_above_s: number;
  time_below_s: number;
  bounded_met: boolean;
}

export interface HrWeeklyGroupZoneSummary {
  group: HrGroupName;
  week: number;
  meanBelowS: number | null;
  meanInZoneS: number | null;
  meanAboveS: number | null;
  sessionCount: number;
}

export interface HrWeeklyGroupAdherenceSummary {
  group: HrGroupName;
  week: number;
  adherenceRate: number | null;
  subjectRateSd: number | null;
  lowerBound: number | null;
  upperBound: number | null;
  totalSessions: number;
}

export interface HrWeeklySubjectAdherenceSummary {
  group: HrGroupName;
  subject: string;
  week: number;
  totalSessions: number;
  metSessions: number;
  adherenceRatio: number | null;
  status: HrHeatmapStatus;
}

export interface HrAlignedSubjectRosterEntry {
  subject: string;
  rowIndex: number;
  hasSupervisedData: boolean;
  hasUnsupervisedData: boolean;
}

export interface HrDashboardData {
  rows: HrSessionRow[];
  zoneSummaries: HrWeeklyGroupZoneSummary[];
  adherenceSummaries: HrWeeklyGroupAdherenceSummary[];
  subjectSummaries: HrWeeklySubjectAdherenceSummary[];
  roster: HrAlignedSubjectRosterEntry[];
}
