# Hosting `plots/act` on Vercel with Supabase Postgres

This document describes a practical production setup for the combined ACT + HR dashboard:

- Vercel hosts the web app
- Supabase hosts the PostgreSQL database used by the ACT endpoints
- The HR CSV stays in the repository at `data/zone_out.csv` and is served read-only by the app

## Current repo status

As of 2026-04-07, the repo now has a Vercel-oriented Express entrypoint:

- [`plots/act/server.ts`](/home/zak/work/hbc/boost/extras/report-2/plots/act/server.ts) exports the Express app as a default export for Vercel
- [`plots/act/server/app.ts`](/home/zak/work/hbc/boost/extras/report-2/plots/act/server/app.ts) holds the shared route definitions
- [`plots/act/server/index.ts`](/home/zak/work/hbc/boost/extras/report-2/plots/act/server/index.ts) remains the local `app.listen(...)` entrypoint for local development
- `npm run build:client` now copies [`data/zone_out.csv`](/home/zak/work/hbc/boost/extras/report-2/data/zone_out.csv) into `plots/act/public/data/zone_out.csv` so Vercel can serve the HR CSV from the app root

That means the app is now structured in the deployment shape Vercel documents for Express. You should still run a real Vercel smoke test after connecting the project, but the `listen(...)` incompatibility is no longer the main blocker.

This runbook covers:

1. How to prepare the database in Supabase
2. How to transfer the current local database state
3. How to refresh Supabase later when local data changes
4. Which environment variables to use

## Recommended architecture

- Vercel project root: `plots/act`
- Runtime database connection for the deployed app: Supabase pooler transaction-mode connection string
- Migration/admin connection for `pg_dump`, `psql`, and `pg_restore`: Supabase session pooler or direct connection string
- Source-of-truth data:
  - ACT data: local PostgreSQL database built by the importer
  - HR data: repository file `data/zone_out.csv`

The connection-mode split follows current Supabase guidance:

- use transaction mode for temporary/serverless runtimes
- use session pooler or direct connection for migration tools like `pg_dump`, `psql`, and `pg_restore`

Sources:

- Vercel environment variables: https://vercel.com/docs/environment-variables
- Vercel env management and redeploy behavior: https://vercel.com/docs/environment-variables/managing-environment-variables
- Supabase connection modes: https://supabase.com/docs/guides/database/connecting-to-postgres
- Supabase migration guide: https://supabase.com/docs/guides/platform/migrating-to-supabase/postgres

## 1. Create the Supabase project

1. Create a new Supabase project in the region closest to your expected Vercel region.
2. Save the database password securely.
3. In Supabase, open the database connection details and copy:
   - the transaction pooler connection string for app runtime
   - the session pooler connection string for migrations
4. Keep SSL enabled in all connection strings.

Use these roles for different jobs:

- `ACTIGRAPHY_DB_URL`: runtime connection used by the app
- `SUPABASE_MIGRATION_DB_URL`: operator connection used manually from your terminal

## 2. Prepare the local source database

Make sure your local database contains the exact state you want to publish.

From the repo root:

```bash
nix develop -c bash scripts/start-local-db.sh
python3 -m src.cli.import_actigraphy init-db
python3 -m src.cli.import_actigraphy import
```

If you have already imported the data and only want to verify the DB is running, you can skip the importer commands.

The local helper script sets the socket-based URL like this:

```bash
bash plots/act/dev.sh
```

That local socket URL is only for local development. Do not use it on Vercel.

## 3. Transfer the current local DB state into Supabase

### Recommended approach

For this repository, the safest and simplest production migration path is:

1. treat the local Postgres database as the source of truth
2. create a plain SQL export that is safe for Supabase
3. import that export into Supabase using the migration connection

This is the most straightforward option because:

- the dataset is relatively small
- the schema is controlled in-repo
- Supabase recommends session pooler or direct connections for dump/restore tooling

### 3.1 Create a local export

Set a local source connection string:

```bash
export LOCAL_DB_URL='postgresql://localhost/boost_actigraphy?host=/home/zak/work/hbc/boost/extras/report-2/.local&port=55432'
```

Create a Supabase-friendly export:

```bash
mkdir -p tmp

pg_dump "$LOCAL_DB_URL" \
  --clean \
  --if-exists \
  --quote-all-identifiers \
  --no-owner \
  --no-privileges \
  > tmp/boost_actigraphy_supabase.sql
```

Why these flags:

- `--clean --if-exists` lets the import replace existing objects
- `--no-owner --no-privileges` avoids managed-role conflicts in Supabase
- `--quote-all-identifiers` keeps identifier handling predictable

### 3.2 Import into Supabase

Set the migration connection string. Use the Supabase session pooler or direct connection, not the transaction pooler.

```bash
export SUPABASE_MIGRATION_DB_URL='postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres?sslmode=require'
```

Load the export:

```bash
psql "$SUPABASE_MIGRATION_DB_URL" -f tmp/boost_actigraphy_supabase.sql
```

### 3.3 Verify the import

Run a few checks against Supabase:

```bash
psql "$SUPABASE_MIGRATION_DB_URL" -c "select count(*) from subjects;"
psql "$SUPABASE_MIGRATION_DB_URL" -c "select count(*) from sessions;"
psql "$SUPABASE_MIGRATION_DB_URL" -c "select count(*) from session_days;"
psql "$SUPABASE_MIGRATION_DB_URL" -c "select count(*) from session_hourly_enmo;"
```

Then run a representative dashboard query:

```bash
psql "$SUPABASE_MIGRATION_DB_URL" -c "
select \"group\", session_number, count(*)
from session_hourly_enmo
group by 1, 2
order by 1, 2;
"
```

## 4. How to update Supabase later if the local DB changes

Use one of these workflows.

### Workflow A: full refresh from local

Use this when the local database remains the canonical source of truth and you want Supabase to mirror it exactly.

1. Rebuild or update local data.
2. Export local again with `pg_dump`.
3. Re-import into Supabase with `psql`.
4. Redeploy the Vercel project if the app code also changed.

Commands:

```bash
export LOCAL_DB_URL='postgresql://localhost/boost_actigraphy?host=/home/zak/work/hbc/boost/extras/report-2/.local&port=55432'
export SUPABASE_MIGRATION_DB_URL='postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres?sslmode=require'

pg_dump "$LOCAL_DB_URL" \
  --clean \
  --if-exists \
  --quote-all-identifiers \
  --no-owner \
  --no-privileges \
  > tmp/boost_actigraphy_supabase.sql

psql "$SUPABASE_MIGRATION_DB_URL" -f tmp/boost_actigraphy_supabase.sql
```

This is the recommended default for this repo because it is simple and predictable.

### Workflow B: apply schema-only changes first, then refresh data

Use this when you changed schema or views in the repo and want a more controlled rollout.

1. Apply the schema or migration SQL to Supabase.
2. If the new schema changes derived data, rebuild local data.
3. Run the full refresh workflow above.

Examples:

```bash
psql "$SUPABASE_MIGRATION_DB_URL" -f src/act/schema.sql
psql "$SUPABASE_MIGRATION_DB_URL" -f db/migrations/2026-04-03-add-session-days-view.sql
```

Notes:

- prefer additive migration files in `db/migrations/` for production updates
- avoid `db/migrations/reset-actigraphy-db.sql` against Supabase unless you explicitly want a destructive reset

## 5. Keeping a transfer artifact of the current local state

The repo already includes a local backup helper:

```bash
nix develop -c bash scripts/backup-local-db.sh
```

That script creates a compressed custom-format backup under `backups/`.

This is useful for:

- archival snapshots
- moving the current local database state to another machine
- rollback preparation before a Supabase refresh

Use the repo backup as your archive, but use the plain SQL `pg_dump` workflow above for Supabase imports unless you specifically want to manage `pg_restore` flags and formats.

## 6. Vercel project configuration

Create a Vercel project that points at the `plots/act` directory.

Suggested settings:

- Root Directory: `plots/act`
- Install Command: `npm install`
- Build Command: `npm run build`

Environment variables to add in Vercel Project Settings:

- `ACTIGRAPHY_DB_URL`
- any future app-specific secrets

Important Vercel behavior:

- environment variable changes do not affect old deployments automatically
- after changing an environment variable, redeploy the project

That behavior is documented by Vercel in their environment variable docs.

## 7. Runtime connection string for Vercel

For the deployed app runtime, set `ACTIGRAPHY_DB_URL` to the Supabase transaction pooler connection string.

Example pattern:

```env
ACTIGRAPHY_DB_URL=postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require
```

Use the exact port and host shown in your Supabase dashboard for transaction mode.

Why:

- Vercel runs request-driven compute
- Supabase recommends transaction-mode pooling for temporary/serverless clients

## 8. HR CSV deployment note

The heart-rate view reads from:

- [`data/zone_out.csv`](/home/zak/work/hbc/boost/extras/report-2/data/zone_out.csv)

This file is not stored in Supabase in the current design. It is deployed as part of the repo and served read-only by the app.

If the CSV changes:

1. commit the updated file
2. redeploy Vercel

No database migration is required for that step.

## 9. Recommended release checklist

1. Update local DB and validate plots locally.
2. Create a backup with `scripts/backup-local-db.sh`.
3. Export local DB for Supabase with `pg_dump`.
4. Import into Supabase with `psql`.
5. Verify row counts and one representative dashboard query.
6. Update Vercel env vars if needed.
7. Redeploy Vercel.
8. Smoke test:
   - `/health`
   - `/api/plot1/intervention`
   - `/api/plot2`
   - `/api/plot3`
   - `/data/zone_out.csv`

## 10. Suggested future hardening

Before production cutover, I recommend these follow-up changes:

- replace the current Express `app.listen(...)` server with Vercel-compatible API handlers
- add a scripted Supabase migration command in `scripts/`
- add a post-import verification script with row counts and query checks
- consider storing a schema-only baseline in versioned migration files for reproducible deploys
