#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOCAL_DIR="${ROOT_DIR}/.local"
PGDATA_DIR="${LOCAL_DIR}/pgdata"
LOG_FILE="${LOCAL_DIR}/postgres.log"
SOCKET_DIR="${LOCAL_DIR}"
PORT="${PORT:-55432}"
DB_NAME="${DB_NAME:-boost_actigraphy}"

mkdir -p "${LOCAL_DIR}"

if [[ ! -d "${PGDATA_DIR}/base" ]]; then
  echo "Initializing local PostgreSQL data directory at ${PGDATA_DIR}"
  initdb -D "${PGDATA_DIR}" >/dev/null
fi

if pg_ctl -D "${PGDATA_DIR}" status >/dev/null 2>&1; then
  echo "PostgreSQL is already running"
else
  echo "Starting PostgreSQL on socket ${SOCKET_DIR} and port ${PORT}"
  pg_ctl -D "${PGDATA_DIR}" -l "${LOG_FILE}" -o "-k ${SOCKET_DIR} -p ${PORT}" -w start
fi

if psql -h "${SOCKET_DIR}" -p "${PORT}" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1; then
  echo "Database ${DB_NAME} already exists"
else
  echo "Creating database ${DB_NAME}"
  createdb -h "${SOCKET_DIR}" -p "${PORT}" "${DB_NAME}"
fi

echo
echo "Local PostgreSQL is ready"
echo "  socket: ${SOCKET_DIR}"
echo "  port:   ${PORT}"
echo "  db:     ${DB_NAME}"
echo
echo "Example:"
echo "  python3 -m src.cli.import_actigraphy --db-url \"dbname=${DB_NAME} host=${SOCKET_DIR} port=${PORT}\" init-db"
