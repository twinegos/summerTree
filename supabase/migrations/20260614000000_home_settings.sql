-- 홈 화면 설정 테이블
CREATE TABLE IF NOT EXISTS public.home_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hero_images TEXT[] NOT NULL DEFAULT '{}',
  hero_phrases TEXT[] NOT NULL DEFAULT '{}',
  hero_image_opacity FLOAT NOT NULL DEFAULT 0.5,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 기본 글귀 10개로 초기 행 삽입
INSERT INTO public.home_settings (hero_phrases, hero_image_opacity)
VALUES (
  ARRAY[
    '식물은 말없이 당신 곁을 지킵니다',
    '초록으로 가득한 하루를 시작하세요',
    '자연이 주는 선물, 당신의 공간에',
    '살아숨쉬는 인테리어, 그린 라이프',
    '식물 한 그루, 공기가 달라집니다',
    '작은 화분 하나가 공간을 바꿉니다',
    '매일 조금씩 자라는 것들의 이야기',
    '당신의 공간에 생명을 더하세요',
    '초록이 주는 위로, 함께하세요',
    '자연과 함께하는 일상의 여유'
  ],
  0.5
);

-- RLS
ALTER TABLE public.home_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_home_settings"
  ON public.home_settings FOR SELECT USING (true);

CREATE POLICY "auth_write_home_settings"
  ON public.home_settings FOR ALL USING (auth.role() = 'authenticated');
