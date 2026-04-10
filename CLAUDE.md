# report-2 Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-04-10

## Active Technologies
- Python 3.12 (importer extension), TypeScript 5.x (server + browser) + psycopg (Python DB writes), D3 v7, Express, node-postgres (`pg`), esbuild (003-act-time-series)
- PostgreSQL — additive new table `session_hourly_enmo`; existing `session_days` table unchanged (003-act-time-series)
- TypeScript 5.x (browser bundle), esbuild + D3 v7 (SVG text rendering in existing plot render functions) (009-plot-captions)
- N/A — captions are static content defined in a TypeScript source module (009-plot-captions)

- Python 3.12 + psycopg, standard-library CSV/path handling (001-extract-actigraphy-data) — data importer pipeline
- TypeScript 5.x (server + browser) + D3 v7, Express, node-postgres (`pg`), esbuild (002-act-plots-1-2) — plot rendering

## Project Structure

```text
src/               # Python 3.12 data importer (act/, cli/)
tests/             # Python tests
plots/             # TypeScript/D3 visualization apps
└── act/           # Accelerometer plots (002-act-plots-1-2)
    ├── server/    # Express server — DB reads, JSON endpoints
    ├── src/       # D3 browser code
    └── public/    # Static HTML + bundled JS
specs/             # Feature specs, plans, research
docs/plot-specs/   # Authoritative plot visual specifications
```

## Commands

```bash
nix develop                                    # enter dev shell (Node.js, Python, PostgreSQL)
python -m src.cli.import_actigraphy --help     # data importer
cd plots/act && pnpm install && pnpm dev       # run visualization (dev mode)
cd plots/act && pnpm build && pnpm start       # run visualization (production)
pytest                                         # Python tests (if applicable)
```

## Code Style

- Python 3.12: standard Python conventions, explicit data validation, clear module boundaries
- TypeScript 5.x: strict mode, no `any`, D3 v7 type-safe selections

## Recent Changes
- 009-plot-captions: Added TypeScript 5.x (browser bundle), esbuild + D3 v7 (SVG text rendering in existing plot render functions)
- 003-act-time-series: Added Python 3.12 (importer extension), TypeScript 5.x (server + browser) + psycopg (Python DB writes), D3 v7, Express, node-postgres (`pg`), esbuild

- 001-extract-actigraphy-data: Python 3.12 GGIR CSV importer, PostgreSQL schema (subjects/sessions/session_days)

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
