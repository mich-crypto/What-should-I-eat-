-- D1 schema for household sync.
-- One row per household; the document is a JSON blob (plan + the recipes it
-- references + prefs + shopping checkboxes + shared settings).
CREATE TABLE IF NOT EXISTS households (
  code       TEXT PRIMARY KEY,
  doc        TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Lets a cleanup job find households nobody has touched in a long time.
CREATE INDEX IF NOT EXISTS idx_households_updated_at ON households (updated_at);
