# Local Database Transfer Plan

This repository uses a repo-local PostgreSQL cluster in `.local/pgdata`, created by
[`scripts/start-local-db.sh`](/home/zak/work/hbc/boost/extras/report-2/scripts/start-local-db.sh).

For transfer to another computer, do not zip `.local/pgdata` while PostgreSQL is
running. A raw `pgdata` archive is version-sensitive, larger than necessary, and
easy to corrupt if copied hot.

Use a logical dump instead:

1. Start the local database if it is not already running.
2. Run the preflight SQL to vacuum/analyze and record database size.
3. Create a compressed `pg_dump` archive in `.local/backups/`.
4. Copy the resulting `.dump`, `.sha256`, and `.json` files to the other machine.
5. Restore the dump into a fresh database on the destination machine.

## Export

```bash
nix develop -c bash scripts/start-local-db.sh
nix develop -c bash scripts/backup-local-db.sh
```

Default output location:

```text
.local/backups/
```

This path is already excluded from git because `.local/` is ignored.

## Transfer

Copy the newest backup bundle to the destination machine with any file transfer
tool you prefer, for example:

```bash
scp .local/backups/boost_actigraphy_YYYYmmdd_HHMMSS.dump user@host:/tmp/
scp .local/backups/boost_actigraphy_YYYYmmdd_HHMMSS.dump.sha256 user@host:/tmp/
scp .local/backups/boost_actigraphy_YYYYmmdd_HHMMSS.dump.json user@host:/tmp/
```

## Restore

On the destination machine, create or start PostgreSQL, then run:

```bash
nix develop -c bash scripts/restore-local-db.sh /tmp/boost_actigraphy_YYYYmmdd_HHMMSS.dump
```

By default the restore script writes into a database named `boost_actigraphy`.
Override with `DB_NAME=...` if needed.

## Notes

- `pg_dump -Fc -Z9` already produces a compressed archive. Do not wrap it in git.
- If you need a byte-for-byte physical cluster copy instead, stop PostgreSQL first
  and use `pg_basebackup` or a cold archive of `.local/pgdata`. That is a separate
  workflow and should only be used when Postgres versions match exactly.
