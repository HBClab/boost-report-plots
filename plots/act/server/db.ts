import pg from 'pg';
import type { DayTypeAggregate, SessionEntry, SessionHourlyEnmo } from '../src/types.js';

const { Pool } = pg;

const dbUrl = process.env.ACTIGRAPHY_DB_URL;
if (!dbUrl) {
  throw new Error(
    'ACTIGRAPHY_DB_URL environment variable is not set.\n' +
    'Use dev.sh to start the server — it sets this automatically from the repo root.'
  );
}

const isVercel = process.env.VERCEL === '1' || process.env.VERCEL === 'true';

export const pool = new Pool({
  connectionString: dbUrl,
  // Serverless runtimes should keep per-instance connection counts low.
  max: isVercel ? 1 : 10,
  idleTimeoutMillis: 5_000,
  connectionTimeoutMillis: 10_000,
});

// Generic query helper
export async function query<T extends pg.QueryResultRow>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const result = await pool.query<T>(sql, params);
  return result.rows;
}

// ---------------------------------------------------------------------------
// Plot 1: day-type averages per group
// group filter: 'intervention' → NOT LIKE 'sub-7%', 'observational' → LIKE 'sub-7%'
// ---------------------------------------------------------------------------

// Wrap in subquery so ORDER BY can reference the CASE expression on day_type
// sessionFilter: optional parameterized clause e.g. 'AND se.session_number = $1'
const PLOT1_SQL = (groupFilter: string, sessionFilter: string) => `
  SELECT day_type, sleep_min, sed_min, light_min, mod_min, vig_min
  FROM (
    SELECT 'All Days' AS day_type,
           AVG(sd.sleep_minutes)         AS sleep_min,
           AVG(sd.sedentary_minutes)     AS sed_min,
           AVG(sd.light_pa_minutes)      AS light_min,
           AVG(sd.moderate_pa_minutes)   AS mod_min,
           AVG(sd.vigorous_pa_minutes)   AS vig_min
    FROM subjects s
    JOIN sessions se ON se.subject_id = s.subject_id
    JOIN session_days sd ON sd.session_id = se.session_id
    WHERE ${groupFilter} ${sessionFilter}
    UNION ALL
    SELECT
      CASE WHEN sd.weekday IN ('Saturday', 'Sunday') THEN 'Weekends' ELSE 'Weekdays' END,
      AVG(sd.sleep_minutes),
      AVG(sd.sedentary_minutes),
      AVG(sd.light_pa_minutes),
      AVG(sd.moderate_pa_minutes),
      AVG(sd.vigorous_pa_minutes)
    FROM subjects s
    JOIN sessions se ON se.subject_id = s.subject_id
    JOIN session_days sd ON sd.session_id = se.session_id
    WHERE ${groupFilter} ${sessionFilter}
    GROUP BY 1
  ) sub
  ORDER BY
    CASE day_type WHEN 'All Days' THEN 1 WHEN 'Weekdays' THEN 2 ELSE 3 END
`;

export async function plot1Query(
  group: 'intervention' | 'observational',
  sessionNumber?: number
): Promise<DayTypeAggregate[]> {
  const filter =
    group === 'observational'
      ? "s.subject_code LIKE 'sub-7%'"
      : "s.subject_code NOT LIKE 'sub-7%'";

  const sessionFilter = sessionNumber !== undefined ? 'AND se.session_number = $1' : '';
  const params = sessionNumber !== undefined ? [sessionNumber] : [];

  const rows = await query<{
    day_type: string;
    sleep_min: string;
    sed_min: string;
    light_min: string;
    mod_min: string;
    vig_min: string;
  }>(PLOT1_SQL(filter, sessionFilter), params);

  return rows.map((r) => ({
    day_type: r.day_type as 'All Days' | 'Weekdays' | 'Weekends',
    sleep_min: parseFloat(r.sleep_min),
    sed_min: parseFloat(r.sed_min),
    light_min: parseFloat(r.light_min),
    mod_min: parseFloat(r.mod_min),
    vig_min: parseFloat(r.vig_min),
  }));
}

// ---------------------------------------------------------------------------
// Plot 2: per-subject per-session averages (Intervention only, sessions 1–4)
// ---------------------------------------------------------------------------

const PLOT2_SQL = `
  SELECT
    s.subject_code,
    se.session_number,
    AVG(sd.sedentary_minutes) AS avg_sed_min,
    AVG(sd.mvpa_minutes)      AS avg_mvpa_min
  FROM subjects s
  JOIN sessions se ON se.subject_id = s.subject_id
  JOIN session_days sd ON sd.session_id = se.session_id
  WHERE s.subject_code NOT LIKE 'sub-7%'
    AND se.session_number <= 4
  GROUP BY s.subject_code, se.session_number
  ORDER BY s.subject_code, se.session_number
`;

type Plot2Row = {
  subject_code: string;
  session_number: string;
  avg_sed_min: string;
  avg_mvpa_min: string;
};

// ---------------------------------------------------------------------------
// Plot 3: hour-level ENMO per group per session (radial activity clock)
// ---------------------------------------------------------------------------

const PLOT3_SQL = `
  SELECT "group", session_number, hour, enmo_mean, enmo_sd, n_participants
  FROM session_hourly_enmo
  ORDER BY "group", session_number, hour
`;

export async function plot3Query(): Promise<SessionHourlyEnmo[]> {
  const rows = await query<{
    group: string;
    session_number: string;
    hour: string;
    enmo_mean: string;
    enmo_sd: string | null;
    n_participants: string;
  }>(PLOT3_SQL);

  return rows.map((r) => ({
    group: r.group as 'intervention' | 'observational',
    session_number: parseInt(r.session_number, 10),
    hour: parseInt(r.hour, 10),
    enmo_mean: parseFloat(r.enmo_mean) * 1000,
    enmo_sd: r.enmo_sd !== null ? parseFloat(r.enmo_sd) * 1000 : null,
    n_participants: parseInt(r.n_participants, 10),
  }));
}

export async function plot2Query(): Promise<
  { subject_code: string; sessions: SessionEntry[] }[]
> {
  const rows = await query<Plot2Row>(PLOT2_SQL);

  // Group by subject_code
  const map = new Map<string, SessionEntry[]>();
  for (const r of rows) {
    const entry: SessionEntry = {
      session_number: parseInt(r.session_number, 10),
      avg_sed_min: parseFloat(r.avg_sed_min),
      avg_mvpa_min: parseFloat(r.avg_mvpa_min),
    };
    const existing = map.get(r.subject_code);
    if (existing) {
      existing.push(entry);
    } else {
      map.set(r.subject_code, [entry]);
    }
  }

  return Array.from(map.entries()).map(([subject_code, sessions]) => ({
    subject_code,
    sessions,
  }));
}
