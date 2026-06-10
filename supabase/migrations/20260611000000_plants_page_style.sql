ALTER TABLE plants
  ADD COLUMN IF NOT EXISTS page_bg_color text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS page_bg_image text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS page_font text NOT NULL DEFAULT 'sans'
    CHECK (page_font IN ('sans', 'serif', 'mono'));
