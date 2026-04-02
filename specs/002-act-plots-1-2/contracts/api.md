# API Contract: Accelerometer Activity Plots 1 & 2

**Branch**: `002-act-plots-1-2` | **Phase**: 1 | **Date**: 2026-04-02

The local Node.js server exposes two JSON endpoints consumed by the D3 browser code. All access is read-only against `boost_actigraphy`.

---

## GET /api/plot1/:group

Returns day-type activity averages for a participant group. Used by the Plot 1 (stacked bar) renderer.

**Path parameter**: `group` — `"intervention"` or `"observational"` (case-insensitive)

**SQL filter applied**:
- `intervention`: `subject_code NOT LIKE 'sub-7%'`
- `observational`: `subject_code LIKE 'sub-7%'`

**Response** `200 OK`:
```json
{
  "group": "intervention",
  "rows": [
    {
      "day_type": "All Days",
      "sleep_min": 437.6,
      "sed_min": 771.7,
      "light_min": 148.6,
      "mod_min": 80.0,
      "vig_min": 2.2
    },
    {
      "day_type": "Weekdays",
      "sleep_min": 425.7,
      "sed_min": 788.4,
      "light_min": 143.8,
      "mod_min": 79.8,
      "vig_min": 2.4
    },
    {
      "day_type": "Weekends",
      "sleep_min": 468.1,
      "sed_min": 728.9,
      "light_min": 161.1,
      "mod_min": 80.6,
      "vig_min": 1.7
    }
  ]
}
```

**Notes**:
- `day_type` values are always exactly: `"All Days"`, `"Weekdays"`, `"Weekends"`.
- All minute values are raw averages (not yet normalized). The client normalizes each row to 100% before rendering.
- The server returns rows ordered: All Days, Weekdays, Weekends.
- If a group has no data for a day type (e.g., no weekend days in the dataset), that row is omitted.

**Error responses**:
- `400 Bad Request` — if `group` is not `"intervention"` or `"observational"`
- `500 Internal Server Error` — database connectivity failure

---

## GET /api/plot2

Returns per-subject per-session averages for Intervention participants only (sessions 1–4). Used by the Plot 2 (heatmap) renderer.

**Response** `200 OK`:
```json
{
  "group": "intervention",
  "subjects": [
    {
      "subject_code": "sub-8001",
      "sessions": [
        { "session_number": 1, "avg_sed_min": 820.3, "avg_mvpa_min": 45.2 },
        { "session_number": 2, "avg_sed_min": 750.1, "avg_mvpa_min": 68.4 },
        { "session_number": 3, "avg_sed_min": 710.5, "avg_mvpa_min": 80.0 }
      ]
    }
  ]
}
```

**Notes**:
- Only sessions 1–4 are returned; sessions 5+ are excluded server-side.
- Sessions without data for a given subject are not present in the `sessions` array — the client fills missing session slots with the neutral color.
- The `subjects` array is returned in database order; the client sorts by `delta_sed = avg_sed_min(last_session) − avg_sed_min(session_1)` ascending.
- Subjects with only one session appear with a single session entry; delta = 0.

**Error responses**:
- `500 Internal Server Error` — database connectivity failure

---

## GET /health

Health check endpoint. Returns `200 OK` with `{"status": "ok"}` when the server is running and can reach the database.

---

## Server Configuration

The server reads the database connection from the environment variable `ACTIGRAPHY_DB_URL` (same variable used by the existing Python importer). Default port: `3000`.

Example:
```
ACTIGRAPHY_DB_URL=postgresql://zak@/boost_actigraphy?host=/home/zak/work/hbc/boost/extras/report-2/.local&port=55432
```
