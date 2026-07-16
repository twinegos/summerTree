-- 상세 페이지 부가 정보 (학명/영문명/원산지·자생환경/꽃말 등)
-- 예: {"scientific_name":"Nephrolepis exaltata","english_name":"Boston Fern","origin":"...","flower_meaning":"..."}
ALTER TABLE plants
  ADD COLUMN IF NOT EXISTS extra_info jsonb NOT NULL DEFAULT '{}'::jsonb;
