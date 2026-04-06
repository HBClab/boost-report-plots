# Quickstart: 003-act-time-series

**Purpose**: Get from zero to a rendered Plot 3 with per-session intervention lines.

---

## Prerequisites

- Dev shell active: `nix develop` from repo root
- PostgreSQL running with `ACTIGRAPHY_DB_URL` set
- GGIR source files accessible at `/mnt/lss/...` (or a local fixture copy for development)

---

## Step 1: Apply the schema migration

The new `session_hourly_enmo` table is additive. Apply it once:

```bash
psql "$ACTIGRAPHY_DB_URL" -f src/act/schema.sql
```

Verify the table exists:
```bash
psql "$ACTIGRAPHY_DB_URL" -c "\d session_hourly_enmo"
```

---

## Step 2: Run the importer with hourly ENMO aggregation

```bash
python -m src.cli.import_actigraphy --hourly-enmo
```

This reads GGIR epoch CSV files from the path pattern in FR-008, extracts ENMO per hour per participant, and writes aggregated rows to `session_hourly_enmo`.

Expected output (approximately):
```
Processing intervention session 1: 178 participants
Processing intervention session 2: 162 participants
...
Wrote 192 rows to session_hourly_enmo
```

To re-import a specific session (idempotent):
```bash
python -m src.cli.import_actigraphy --hourly-enmo --session 1 --group intervention
```

---

## Step 3: Verify the data

```bash
psql "$ACTIGRAPHY_DB_URL" -c "
  SELECT \"group\", session_number, COUNT(*) as hours,
         ROUND(AVG(enmo_mean)::numeric, 2) as avg_enmo_mean
  FROM session_hourly_enmo
  GROUP BY \"group\", session_number
  ORDER BY \"group\", session_number;
"
```

Expected: 24 rows per `(group, session_number)` combination (one per hour). `avg_enmo_mean` should be in the range 20–80 mg for typical actigraphy data.

---

## Step 4: Start the plot server and verify the endpoint

```bash
cd plots/act && pnpm dev
```

In another terminal:
```bash
curl -s http://localhost:3000/api/plot3 | python3 -m json.tool | head -40
```

Expected: JSON with a `rows` array containing objects with `group`, `session_number`, `hour`, `enmo_mean`, `enmo_sd`, `n_participants`.

---

## Step 5: Visual verification (validation evidence)

1. Open `http://localhost:3000` in a browser.
2. Navigate to Plot 3 (Radial Activity Clock card).
3. Confirm:
   - Four intervention lines visible, each in a distinct teal shade.
   - One observational line in orange (`#DE7833`).
   - SD shading visible around each intervention line (except sessions/hours with N=1).
   - Legend shows "Session 1 (n=NNN)" through "Session 4 (n=NNN)" and "Observational".
   - M5/L5 annotations appear only on the observational line (if retained) or are absent.
4. Spot-check fixture values: query `enmo_mean` for `group='intervention', session_number=1, hour=12` from the DB; confirm the plotted radius at the 12pm position matches the expected radial scale distance.

---

## Development with fixture data

If GGIR source files are not available locally, create a fixture CSV:

```bash
# Minimal fixture: 2 participants, 2 sessions, all 24 hours
python -m src.cli.import_actigraphy --hourly-enmo --fixture
```

*(The `--fixture` flag uses synthetic data from `tests/fixtures/hourly_enmo/` — generated as part of the implementation task for validation.)*

---

## Troubleshooting

| Symptom | Check |
|---------|-------|
| `session_hourly_enmo` table does not exist | Re-run `psql ... -f src/act/schema.sql` |
| `/api/plot3` returns `[]` | Run the importer; check `psql` row count |
| Plot shows no per-session lines | Check browser console for fetch errors; verify endpoint responds |
| SD band missing for all sessions | Check if `enmo_sd` is NULL in DB — expected only when N=1 per hour |
