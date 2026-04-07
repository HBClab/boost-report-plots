export type GroupName = 'Supervised' | 'Unsupervised';
export type HeatmapStatus = 'met' | 'not_met' | 'no_data';

export interface HrSessionRow {
  group: GroupName;
  subject: string;
  week: number;
  session: number;
  time_in_allowed_s: number;
  time_above_s: number;
  time_below_s: number;
  bounded_met: boolean;
}

export interface WeeklyGroupZoneSummary {
  group: GroupName;
  week: number;
  meanBelowS: number | null;
  meanInZoneS: number | null;
  meanAboveS: number | null;
  sessionCount: number;
}

export interface WeeklyGroupAdherenceSummary {
  group: GroupName;
  week: number;
  adherenceRate: number | null;
  subjectRateSd: number | null;
  lowerBound: number | null;
  upperBound: number | null;
  totalSessions: number;
}

export interface WeeklySubjectAdherenceSummary {
  group: GroupName;
  subject: string;
  week: number;
  totalSessions: number;
  metSessions: number;
  adherenceRatio: number | null;
  status: HeatmapStatus;
}

export interface AlignedSubjectRosterEntry {
  subject: string;
  rowIndex: number;
  hasSupervisedData: boolean;
  hasUnsupervisedData: boolean;
}

export interface CardLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DashboardData {
  rows: HrSessionRow[];
  zoneSummaries: WeeklyGroupZoneSummary[];
  adherenceSummaries: WeeklyGroupAdherenceSummary[];
  subjectSummaries: WeeklySubjectAdherenceSummary[];
  roster: AlignedSubjectRosterEntry[];
}
