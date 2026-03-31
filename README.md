# Report Plot Generation

## Actigraphy Importer

The repository now includes a local actigraphy importer for GGIR day-summary CSVs.

- Enter the development shell with `nix develop`
- Initialize the local database with `python3 -m src.cli.import_actigraphy init-db`
- Import data with `python3 -m src.cli.import_actigraphy import`

The importer defaults to the hardcoded derivatives root in
`src/act/importer.py`. If you want to load another study tree with the same
path structure after `derivatives/`, update `DEFAULT_DERIVATIVES_ROOT` or pass
`--root /path/to/other/derivatives/...` at runtime.

## Local PostgreSQL Helpers

Start a repo-local PostgreSQL instance:

```bash
nix develop -c bash scripts/start-local-db.sh
```

Stop it:

```bash
nix develop -c bash scripts/stop-local-db.sh
```
