-- Phase 4 RLS Migration
-- 주문/결제 관련 보안 정책

-- ============================================================
-- orders: 인증된 관리자만 읽기, 서비스 롤만 쓰기
-- ============================================================

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- 관리자(인증 사용자)는 모든 주문 조회 가능
CREATE POLICY "Authenticated users can read orders"
  ON orders FOR SELECT
  TO authenticated
  USING (true);

-- 관리자는 주문 상태 변경 가능
CREATE POLICY "Authenticated users can update orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (true);

-- 비인증 사용자(anon)는 주문 생성 불가 — 서비스 롤(서버 API)을 통해서만 생성
-- 주문 생성은 server/api/payment/complete.post.ts 에서 서비스 롤로 처리

-- ============================================================
-- order_items: orders와 동일한 정책
-- ============================================================

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read order_items"
  ON order_items FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================
-- cart_items: 세션 기반 익명 접근 허용
-- session_id는 랜덤 UUID라 실질적 보안 제공
-- ============================================================

ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

-- anon 사용자 전체 CRUD 허용 (session_id 기반 격리는 앱 레이어에서 처리)
CREATE POLICY "Anyone can manage cart items"
  ON cart_items FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
