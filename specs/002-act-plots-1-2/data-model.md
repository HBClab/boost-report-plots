# Data Model: Accelerometer Activity Plots 1 & 2

**Branch**: `002-act-plots-1-2` | **Phase**: 1 | **Date**: 2026-04-02

---

## Source Schema (Read-Only)

All data is read from the `boost_actigraphy` PostgreSQL database. This feature performs no writes.

### `subjects`
| Column | Type | Notes |
|--------|------|-------|
| `subject_id` | bigint PK | Auto-generated |
| `subject_code` | text UNIQUE | BIDS format: `sub-NNNN`. Group: `sub-7%` = Observational, else Intervention |

### `sessions`
| Column | Type | Notes |
|--------|------|-------|
| `session_id` | bigint PK | |
| `subject_id` | bigint FK → subjects | |
| `session_number` | smallint | 1-indexed per subject. Plot 2 uses sessions 1–4 only |
| `session_date` | date | |

### `session_days`
| Column | Type | Notes |
|--------|------|-------|
| `session_day_id` | bigint PK | |
| `session_id` | bigint FK → sessions | |
| `day_date` | date | |
| `weekday` | text | Day name: 'Monday'–'Sunday'. Sat/Sun = Weekend, Mon–Fri = Weekday |
| `nonwear_minutes` | integer | Informational. No filtering applied by this feature |
| `sleep_minutes` | double precision | Maps to `sleep_min` in visual spec |
| `sedentary_minutes` | double precision | Maps to `sed_min` |
| `light_pa_minutes` | double precision | Maps to `light_min` |
| `moderate_pa_minutes` | double precision | Maps to `mod_min` |
| `vigorous_pa_minutes` | double precision | Maps to `vig_min` |
| `mvpa_minutes` | double precision | Used directly for Plot 2 MVPA panel |

---

## Derived Entities (Computed, Not Stored)

### `DayTypeAggregate` — Input to Plot 1

One row per group × day-type combination. Produced by the `/api/plot1/:group` server endpoint.

| Field | Type | Derivation |
|-------|------|------------|
| `day_type` | string | `'All Days'` \| `'Weekdays'` \| `'Weekends'` |
| `sleep_min` | number | `AVG(sleep_minutes)` over matching session_days rows |
| `sed_min` | number | `AVG(sedentary_minutes)` |
| `light_min` | number | `AVG(light_pa_minutes)` |
| `mod_min` | number | `AVG(moderate_pa_minutes)` |
| `vig_min` | number | `AVG(vigorous_pa_minutes)` |

**Day-type classification:**
```sql
CASE WHEN weekday IN ('Saturday', 'Sunday') THEN 'Weekends' ELSE 'Weekdays' END
```
"All Days" is a separate query over all weekdays without filtering.

**Group filter:**
- Intervention: `subject_code NOT LIKE 'sub-7%'`
- Observational: `subject_code LIKE 'sub-7%'`

**Normalization** (applied client-side before rendering):
```
proportion_k = raw_min_k / (sleep_min + sed_min + light_min + mod_min + vig_min)
```
Each row sums to 1.0 (100%). Row totals from the database are empirically ~1440 min due to GGIR's complete daily accounting.

---

### `ParticipantSessionSummary` — Input to Plot 2

One row per Intervention subject × session (sessions 1–4 only). Produced by the `/api/plot2` server endpoint.

| Field | Type | Derivation |
|-------|------|------------|
| `subject_code` | string | From `subjects.subject_code` |
| `session_number` | number | 1–4 |
| `avg_sed_min` | number | `AVG(sedentary_minutes)` over session_days for that subject × session |
| `avg_mvpa_min` | number | `AVG(mvpa_minutes)` over session_days |

**Sort key** (computed after retrieval, applied client-side):
```
delta_sed = avg_sed_min(last_session) − avg_sed_min(session_1)
```
Rows are sorted by `delta_sed` ascending (greatest decrease = most negative = top of chart).

**Missing sessions**: If a subject lacks data for a session number 1–4, the cell is rendered in neutral color `#E0E0E8`. The server returns only sessions with data; the client fills gaps.

---

## Column Mapping Reference

| Visual Spec Name | Database Column | Table |
|-----------------|----------------|-------|
| `sleep_min` | `sleep_minutes` | session_days |
| `sed_min` | `sedentary_minutes` | session_days |
| `light_min` | `light_pa_minutes` | session_days |
| `mod_min` | `moderate_pa_minutes` | session_days |
| `vig_min` | `vigorous_pa_minutes` | session_days |
| `mvpa_min` | `mvpa_minutes` | session_days |
| group | derived from `subject_code LIKE 'sub-7%'` | subjects |

---

## Data Scale Reference

From live database (2026-04-02):

| Group | Subjects | Sessions | Session-Days |
|-------|----------|----------|--------------|
| Intervention (`NOT sub-7%`) | 86 | 223 (sessions 1–8) | ~1,700 |
| Observational (`sub-7%`) | 249 | 286 (sessions 1–5) | ~2,100 |
| **Total** | **335** | **509** | **3,822** |

Plot 2 uses Intervention subjects only, sessions 1–4 (≤ 166 sessions after cap).
