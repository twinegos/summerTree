ALTER TABLE plants
  ADD COLUMN IF NOT EXISTS care_level text NOT NULL DEFAULT 'normal'
  CHECK (care_level IN ('easy', 'normal', 'hard'));
