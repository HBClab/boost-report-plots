# Contract: GET /api/plot3

**Feature**: 003-act-time-series
**Server**: `plots/act/server/index.ts`
**Date**: 2026-04-03

---

## Endpoint

```
GET /api/plot3
```

No path parameters. No query parameters. Returns all rows from `session_hourly_enmo` for both groups, all sessions, all hours.

---

## Response Schema

```json
{
  "rows": [
    {
      "group": "intervention" | "observational",
      "session_number": 1 | 2 | 3 | 4,
      "hour": 0..23,
      "enmo_mean": number,
      "enmo_sd": number | null,
      "n_participants": number
    }
  ]
}
```

### Field definitions

| Field | Type | Notes |
|-------|------|-------|
| `group` | `"intervention"` \| `"observational"` | Participant group |
| `session_number` | integer 1–4 | Which intervention/observation session |
| `hour` | integer 0–23 | Clock hour (0 = midnight–1am) |
| `enmo_mean` | number | Mean ENMO in mg |
| `enmo_sd` | number \| null | Sample SD in mg; null when only 1 participant contributed |
| `n_participants` | integer | Participants contributing to this session/hour cell |

### Ordering

Rows are ordered by `group ASC, session_number ASC, hour ASC`. Client code must not depend on order — it should index by `(group, session_number, hour)`.

---

## Error Responses

| Status | Body | Condition |
|--------|------|-----------|
| 200 | `{ "rows": [...] }` | Success (may be empty array if table has no data) |
| 500 | `{ "error": "Database query failed", "detail": "..." }` | DB error |

---

## SQL Query (to be implemented in `plots/act/server/db.ts`)

```sql
SELECT "group", session_number, hour, enmo_mean, enmo_sd, n_participants
FROM session_hourly_enmo
ORDER BY "group", session_number, hour;
```

---

## Browser Consumption

The browser D3 code (`plots/act/src/plot3.ts`) fetches this endpoint on page load and:

1. Splits rows into `intervention` and `observational` groups.
2. Further splits the intervention rows by `session_number` to produce one line series per session.
3. The observational group is treated as a single series (all session rows aggregated client-side if multiple sessions exist, or taken as-is if stored as a single session in DB).
4. For each intervention session series, renders:
   - A radial line at `enmo_mean` per hour.
   - A filled ±1 SD polygon when `enmo_sd` is non-null.
5. Legend entries: one per intervention session with label `"Session {N} (n={n_participants})"` using the max N across hours for that session.

---

## TypeScript Types

```typescript
// In plots/act/server/db.ts or a shared types file

export interface SessionHourlyEnmo {
  group: 'intervention' | 'observational';
  session_number: number;
  hour: number;
  enmo_mean: number;
  enmo_sd: number | null;
  n_participants: number;
}

export interface Plot3Response {
  rows: SessionHourlyEnmo[];
}
```
