// Types matching the API contract in specs/002-act-plots-1-2/contracts/api.md

export interface DayTypeAggregate {
  day_type: 'All Days' | 'Weekdays' | 'Weekends';
  sleep_min: number;
  sed_min: number;
  light_min: number;
  mod_min: number;
  vig_min: number;
}

export interface SessionEntry {
  session_number: number; // 1–4
  avg_sed_min: number;
  avg_mvpa_min: number;
}

export interface SubjectSessionData {
  subject_code: string;
  sessions: SessionEntry[];
}

export interface Plot1ApiResponse {
  group: 'intervention' | 'observational';
  rows: DayTypeAggregate[];
}

export interface Plot2ApiResponse {
  group: 'intervention';
  subjects: SubjectSessionData[];
}

// Canvas layout descriptor passed to each renderer
export interface CardLayout {
  x: number;
  y: number;
  w: number;
  h: number;
}
