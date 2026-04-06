#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOCAL_DIR="${ROOT_DIR}/.local"
SOCKET_DIR="${LOCAL_DIR}"
BACKUP_DIR="$ROOT_DIR/backups"
PORT="${PORT:-55432}"
DB_NAME="${DB_NAME:-boost_actigraphy}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
BASENAME="${DB_NAME}_${TIMESTAMP}"
DUMP_FILE="${BACKUP_DIR}/${BASENAME}.dump"
CHECKSUM_FILE="${DUMP_FILE}.sha256"
METADATA_FILE="${DUMP_FILE}.json"

mkdir -p "${BACKUP_DIR}"

if ! pg_ctl -D "${LOCAL_DIR}/pgdata" status >/dev/null 2>&1; then
  echo "Local PostgreSQL is not running. Start it first with scripts/start-local-db.sh" >&2
  exit 1
fi

echo "Running preflight maintenance SQL"
psql \
  -v ON_ERROR_STOP=1 \
  -h "${SOCKET_DIR}" \
  -p "${PORT}" \
  -d "${DB_NAME}" \
  -f "${ROOT_DIR}/db/maintenance/prepare-transfer.sql"

echo "Creating compressed logical backup at ${DUMP_FILE}"
pg_dump \
  -h "${SOCKET_DIR}" \
  -p "${PORT}" \
  -d "${DB_NAME}" \
  -Fc \
  -Z 9 \
  --file="${DUMP_FILE}"

sha256sum "${DUMP_FILE}" > "${CHECKSUM_FILE}"

{
  printf '{\n'
  printf '  "database": "%s",\n' "${DB_NAME}"
  printf '  "created_at": "%s",\n' "$(date -Iseconds)"
  printf '  "port": %s,\n' "${PORT}"
  printf '  "dump_file": "%s"\n' "$(basename "${DUMP_FILE}")"
  printf '}\n'
} > "${METADATA_FILE}"

echo "Backup complete"
echo "  dump:     ${DUMP_FILE}"
echo "  checksum: ${CHECKSUM_FILE}"
echo "  metadata: ${METADATA_FILE}"
