-- 식물 정보를 항목별(햇빛/물주기/온도/습도/흙/주의)로 저장하기 위한 jsonb 컬럼
-- 예: {"sunlight": "...", "water": "...", "temperature": "...", "humidity": "...", "soil": "...", "caution": "..."}
ALTER TABLE plants
  ADD COLUMN IF NOT EXISTS care_info jsonb NOT NULL DEFAULT '{}'::jsonb;
