-- plants 테이블 RLS
ALTER TABLE plants ENABLE ROW LEVEL SECURITY;

-- 누구나 읽기 가능 (QR 스캔 고객 포함)
CREATE POLICY "plants_select_all" ON plants
  FOR SELECT USING (true);

-- 인증된 사용자(관리자)만 생성/수정/삭제
CREATE POLICY "plants_insert_auth" ON plants
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "plants_update_auth" ON plants
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "plants_delete_auth" ON plants
  FOR DELETE USING (auth.role() = 'authenticated');

-- categories 테이블 RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories_select_all" ON categories
  FOR SELECT USING (true);

CREATE POLICY "categories_insert_auth" ON categories
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "categories_update_auth" ON categories
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "categories_delete_auth" ON categories
  FOR DELETE USING (auth.role() = 'authenticated');
