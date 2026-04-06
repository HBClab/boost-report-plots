\echo Preparing database for logical backup

VACUUM (ANALYZE);
CHECKPOINT;

SELECT
  current_database() AS database_name,
  pg_size_pretty(pg_database_size(current_database())) AS database_size,
  now() AS prepared_at;
