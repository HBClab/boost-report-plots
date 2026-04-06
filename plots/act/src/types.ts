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

// 003-act-time-series: Hour-level ENMO statistics per group per session
// Matches the API contract in specs/003-act-time-series/contracts/plot3-enmo-endpoint.md
export interface SessionHourlyEnmo {
  group: 'intervention' | 'observational';
  session_number: number; // 1–4
  hour: number;           // 0–23
  enmo_mean: number;      // mg
  enmo_sd: number | null; // mg; null when n_participants === 1
  n_participants: number;
}

export interface Plot3ApiResponse {
  rows: SessionHourlyEnmo[];
}
