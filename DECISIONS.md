# 기술 결정 로그 (Cruise Mode)

## Phase 2 — QR 코드 시스템

### [2026-06-03] QR URL 생성 방식

**결정**: `window.location.origin` 사용 (서버사이드 폴백은 runtimeConfig)

**이유**: runtimeConfig의 `siteUrl` 값이 개발 환경에서 SSR 초기화 타이밍 이슈로 `undefined`로 읽히는 문제 발생. 클라이언트 사이드에서만 QR 생성이 일어나므로 `window.location.origin`이 가장 정확하고 안전한 방법. 개발 환경: `http://localhost:3000`, 프로덕션: `https://summer-tree.vercel.app` 자동 적용.

**영향**: 개발 중 생성한 QR은 localhost URL 포함 → 실제 사용 시 프로덕션에서 생성 필요. Vercel 환경변수 `SITE_URL` 설정은 불필요해짐.

---

### [2026-06-03] QR 코드 라이브러리 선택

**결정**: `qrcode` npm 패키지

**이유**: 경량(~15KB gzipped), 의존성 없음, Canvas/SVG/DataURL 모두 지원. Vue 전용 래퍼 불필요.

---

### [2026-06-03] QR 코드 DB 저장 여부

**결정**: DB 저장 안 함. 클라이언트 사이드에서 plant.id 기반 동적 생성.

**이유**: plant.id(UUID)는 변하지 않으므로 언제든 동일한 QR 재생성 가능. Storage 용량 절약, 스키마 변경 불필요.

---

## Phase 4 — 장바구니 & 결제

### [2026-06-03] 익명 장바구니 방식
**결정**: session_id (localStorage UUID) 기반. 로그인 불필요.
**Why:** QR 스캔 사용자는 로그인 없이 빠르게 구매해야 함. session_id는 랜덤 UUID라 실질적으로 안전.

### [2026-06-03] cart_items RLS
**결정**: anon 전체 허용. session_id 격리는 앱 레이어에서 처리.
**Why:** cart_items는 식물 ID+수량만 저장, 민감 정보 없음. 완전한 RLS는 JWT 커스텀 클레임 필요로 복잡도 증가.

### [2026-06-03] 장바구니 버튼(plant 페이지 → cart 페이지 이동)
**결정**: 장바구니 담기 후 페이지 이동 없이 토스트만 표시.
**Why:** 쇼핑 흐름 유지. 장바구니 보기는 /cart 직접 접근.

### [2026-06-03] 결제 검증 서버 라우트
**결정**: Nuxt server/api/payment/complete.post.ts에서 포트원 검증 후 주문 생성.
**Why:** 포트원 API 시크릿은 서버 전용. 클라이언트에서 직접 검증 불가.

## Phase 2 — 사용자 확인 필요 항목

없음. Phase 2 내 모든 결정은 위에서 자율 처리됨.
