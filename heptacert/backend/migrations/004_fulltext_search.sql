-- 004_fulltext_search.sql
-- Adds a generated tsvector column + GIN index for full-text search on student_name.
-- NOTE: This is a reference file. The backend also supports inline to_tsvector queries
-- without this migration. Applying this migration improves search performance on large datasets.

-- Add tsvector column
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS name_tsv tsvector;

-- Backfill existing rows
UPDATE certificates SET name_tsv = to_tsvector('simple', coalesce(student_name, ''))
WHERE name_tsv IS NULL;

-- Create trigger function to auto-update on INSERT/UPDATE
CREATE OR REPLACE FUNCTION certs_tsv_trigger() RETURNS trigger AS $$
BEGIN
  NEW.name_tsv := to_tsvector('simple', coalesce(NEW.student_name, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS tsvectorupdate ON certificates;
CREATE TRIGGER tsvectorupdate
  BEFORE INSERT OR UPDATE OF student_name
  ON certificates
  FOR EACH ROW EXECUTE FUNCTION certs_tsv_trigger();

-- Build GIN index concurrently (non-blocking on large tables)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cert_name_tsv ON certificates USING GIN(name_tsv);
