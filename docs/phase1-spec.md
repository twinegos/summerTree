# Phase 1 기술 사양서 — 데이터 모델 & 관리자 페이지

**프로젝트**: summerTree 식물 가게 모바일 웹앱  
**Phase 범위**: DB 스키마 설계, 관리자 인증, 식물/카테고리 CRUD  
**기술 스택**: Nuxt 4 + TypeScript + Tailwind CSS + Supabase  
**참조 스토리**: `docs/phase1-story.md`  
**작성일**: 2026-06-03

---

## 1. DB 스키마

### 1.1 categories

```sql
CREATE TABLE categories (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       varchar(50) NOT NULL UNIQUE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_categories_name ON categories (name);
```

| 컬럼 | 타입 | 제약 | 비고 |
|------|------|------|------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| name | varchar(50) | NOT NULL, UNIQUE | 최대 50자, 앞뒤 공백 trim은 앱 레이어에서 처리 |
| description | text | nullable | |
| created_at | timestamptz | NOT NULL DEFAULT now() | |
| updated_at | timestamptz | NOT NULL DEFAULT now() | 수정 시 업데이트 트리거 적용 |

**트리거**: `updated_at` 자동 갱신

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

### 1.2 plants

```sql
CREATE TABLE plants (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id      uuid        NOT NULL REFERENCES categories(id),
  name             varchar(100) NOT NULL,
  short_description text,
  description      text,
  care_guide       text,
  caution          text,
  price            integer     NOT NULL CHECK (price >= 0),
  stock            integer     NOT NULL DEFAULT 0 CHECK (stock >= 0),
  image_urls       text[]      NOT NULL DEFAULT '{}',
  is_deleted       boolean     NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_plants_category_id  ON plants (category_id);
CREATE INDEX idx_plants_is_deleted   ON plants (is_deleted);
CREATE INDEX idx_plants_created_at   ON plants (created_at DESC);
```

| 컬럼 | 타입 | 제약 | 비고 |
|------|------|------|------|
| id | uuid | PK | |
| category_id | uuid | NOT NULL, FK → categories(id) | 카테고리 삭제 전 식물 이동/삭제 필요 (RESTRICT) |
| name | varchar(100) | NOT NULL | 최대 100자 |
| short_description | text | nullable | 간단 설명 |
| description | text | nullable | 상세 설명, 최대 2000자는 앱 레이어에서 검증 |
| care_guide | text | nullable | 키우는 방법 |
| caution | text | nullable | 주의사항 |
| price | integer | NOT NULL, CHECK >= 0 | 원 단위 정수 |
| stock | integer | NOT NULL DEFAULT 0, CHECK >= 0 | 0 = 품절 |
| image_urls | text[] | NOT NULL DEFAULT '{}' | Storage URL 배열, 최대 5개는 앱 레이어에서 검증 |
| is_deleted | boolean | NOT NULL DEFAULT false | 소프트 삭제 플래그 |
| created_at | timestamptz | NOT NULL DEFAULT now() | |
| updated_at | timestamptz | NOT NULL DEFAULT now() | |

**트리거**: `updated_at` 자동 갱신 (동일 함수 재사용)

```sql
CREATE TRIGGER plants_updated_at
  BEFORE UPDATE ON plants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

**삭제 전략**:
- 주문 내역 없는 식물: 하드 삭제 + Storage 이미지 삭제
- 주문 내역 있는 식물: `is_deleted = true` 소프트 삭제 (이미지 유지)
- 관리자 목록 조회: `WHERE is_deleted = false`

---

### 1.3 orders

```sql
CREATE TABLE orders (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  status          varchar(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'paid', 'preparing', 'shipped', 'delivered', 'cancelled', 'refunded')),
  total_amount    integer     NOT NULL CHECK (total_amount >= 0),
  buyer_name      varchar(100),
  buyer_phone     varchar(20),
  buyer_email     varchar(255),
  shipping_address text,
  portone_payment_id varchar(255),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_status     ON orders (status);
CREATE INDEX idx_orders_created_at ON orders (created_at DESC);
```

> Phase 1에서는 테이블만 생성. 실제 사용은 Phase 4(결제)에서 시작.

---

### 1.4 order_items

```sql
CREATE TABLE order_items (
  id           uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     uuid    NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  plant_id     uuid    REFERENCES plants(id) ON DELETE SET NULL,
  plant_name   varchar(100) NOT NULL,
  unit_price   integer NOT NULL CHECK (unit_price >= 0),
  quantity     integer NOT NULL CHECK (quantity > 0),
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_items_order_id ON order_items (order_id);
CREATE INDEX idx_order_items_plant_id ON order_items (plant_id);
```

> `plant_name`, `unit_price`를 별도 저장하는 이유: 식물이 소프트 삭제되거나 가격이 변경되어도 주문 당시 정보를 보존.

---

### 1.5 cart_items

```sql
CREATE TABLE cart_items (
  id         uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id varchar(255) NOT NULL,
  plant_id   uuid    NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  quantity   integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, plant_id)
);

CREATE INDEX idx_cart_items_session_id ON cart_items (session_id);
```

> Phase 1에서는 테이블만 생성. 실제 사용은 Phase 3(장바구니)에서 시작.  
> 고객 인증 없이 `session_id`(브라우저 로컬 UUID) 기반 비회원 장바구니로 설계.

---

## 2. Supabase Storage

### 2.1 버킷 설정

| 항목 | 값 |
|------|----|
| 버킷명 | `plant-images` |
| 공개 여부 | Public (이미지 URL 직접 접근 허용) |
| 최대 파일 크기 | 5 MB |
| 허용 MIME 타입 | `image/jpeg`, `image/png`, `image/webp` |

### 2.2 파일 경로 구조

```
plant-images/
└── {plant_id}/
    └── {uuid}.{ext}
```

**예시**:
```
plant-images/
├── a1b2c3d4-.../
│   ├── f7e8d9c0-....jpg
│   └── 11223344-....webp
└── e5f6a7b8-.../ 
    └── aabbccdd-....png
```

**규칙**:
- `plant_id`: plants 테이블의 UUID
- `uuid`: `crypto.randomUUID()` 생성값 (파일명 충돌 방지)
- `ext`: `jpg` | `png` | `webp`
- 식물 삭제(하드) 시 `plant-images/{plant_id}/` 경로 전체 삭제

---

## 3. TypeScript 타입 정의

### 3.1 파일 위치

```
app/types/database.types.ts
```

### 3.2 Database 타입

```typescript
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      categories: {
        Row: CategoryRow
        Insert: CategoryInsert
        Update: CategoryUpdate
      }
      plants: {
        Row: PlantRow
        Insert: PlantInsert
        Update: PlantUpdate
      }
      orders: {
        Row: OrderRow
        Insert: OrderInsert
        Update: OrderUpdate
      }
      order_items: {
        Row: OrderItemRow
        Insert: OrderItemInsert
        Update: OrderItemUpdate
      }
      cart_items: {
        Row: CartItemRow
        Insert: CartItemInsert
        Update: CartItemUpdate
      }
    }
  }
}
```

### 3.3 categories 타입

```typescript
export interface CategoryRow {
  id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

export interface CategoryInsert {
  id?: string
  name: string
  description?: string | null
  created_at?: string
  updated_at?: string
}

export interface CategoryUpdate {
  name?: string
  description?: string | null
  updated_at?: string
}
```

### 3.4 plants 타입

```typescript
export type OrderStatus = 'pending' | 'paid' | 'preparing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded'

export interface PlantRow {
  id: string
  category_id: string
  name: string
  short_description: string | null
  description: string | null
  care_guide: string | null
  caution: string | null
  price: number
  stock: number
  image_urls: string[]
  is_deleted: boolean
  created_at: string
  updated_at: string
}

export interface PlantInsert {
  id?: string
  category_id: string
  name: string
  short_description?: string | null
  description?: string | null
  care_guide?: string | null
  caution?: string | null
  price: number
  stock?: number
  image_urls?: string[]
  is_deleted?: boolean
  created_at?: string
  updated_at?: string
}

export interface PlantUpdate {
  category_id?: string
  name?: string
  short_description?: string | null
  description?: string | null
  care_guide?: string | null
  caution?: string | null
  price?: number
  stock?: number
  image_urls?: string[]
  is_deleted?: boolean
  updated_at?: string
}
```

### 3.5 orders 타입

```typescript
export interface OrderRow {
  id: string
  status: OrderStatus
  total_amount: number
  buyer_name: string | null
  buyer_phone: string | null
  buyer_email: string | null
  shipping_address: string | null
  portone_payment_id: string | null
  created_at: string
  updated_at: string
}

export interface OrderInsert {
  id?: string
  status?: OrderStatus
  total_amount: number
  buyer_name?: string | null
  buyer_phone?: string | null
  buyer_email?: string | null
  shipping_address?: string | null
  portone_payment_id?: string | null
}

export interface OrderUpdate {
  status?: OrderStatus
  total_amount?: number
  buyer_name?: string | null
  buyer_phone?: string | null
  buyer_email?: string | null
  shipping_address?: string | null
  portone_payment_id?: string | null
  updated_at?: string
}
```

### 3.6 order_items 타입

```typescript
export interface OrderItemRow {
  id: string
  order_id: string
  plant_id: string | null
  plant_name: string
  unit_price: number
  quantity: number
  created_at: string
}

export interface OrderItemInsert {
  id?: string
  order_id: string
  plant_id?: string | null
  plant_name: string
  unit_price: number
  quantity: number
}

export interface OrderItemUpdate {
  quantity?: number
}
```

### 3.7 cart_items 타입

```typescript
export interface CartItemRow {
  id: string
  session_id: string
  plant_id: string
  quantity: number
  created_at: string
  updated_at: string
}

export interface CartItemInsert {
  id?: string
  session_id: string
  plant_id: string
  quantity?: number
}

export interface CartItemUpdate {
  quantity?: number
  updated_at?: string
}
```

---

## 4. 파일 구조

Phase 1에서 생성할 파일 전체 목록:

```
summerTree/
├── app/
│   ├── types/
│   │   └── database.types.ts          # DB 타입 정의
│   ├── lib/
│   │   └── supabase.ts                # Supabase 클라이언트 싱글턴
│   ├── composables/
│   │   ├── useAuth.ts                 # 인증 상태 및 로그인/로그아웃
│   │   ├── usePlants.ts               # 식물 CRUD
│   │   ├── useCategories.ts           # 카테고리 CRUD
│   │   └── useStorage.ts             # Storage 이미지 업로드/삭제
│   ├── middleware/
│   │   └── auth.ts                    # 관리자 라우트 보호
│   ├── pages/
│   │   └── admin/
│   │       ├── login.vue              # 로그인 페이지
│   │       ├── index.vue              # 대시보드 (식물 목록)
│   │       └── plants/
│   │           ├── new.vue            # 식물 등록
│   │           └── [id]/
│   │               └── edit.vue       # 식물 수정
│   └── components/
│       ├── admin/
│       │   ├── AdminHeader.vue        # 상단 헤더 (로그아웃 버튼)
│       │   ├── CategoryModal.vue      # 카테고리 등록/수정 모달
│       │   ├── DeleteConfirmModal.vue # 삭제 확인 다이얼로그
│       │   ├── PlantCard.vue          # 식물 목록 카드
│       │   └── ImageUploader.vue      # 이미지 업로드 컴포넌트
│       └── common/
│           └── Toast.vue              # 성공/오류 토스트 알림
├── supabase/
│   └── migrations/
│       └── 20260603000000_phase1_schema.sql  # DB 마이그레이션
└── .env.local                         # 환경변수 (git 제외)
```

---

## 5. API 계약 (Composable 인터페이스)

### 5.1 useAuth

```typescript
// app/composables/useAuth.ts

interface UseAuth {
  // 상태
  user: Ref<User | null>          // Supabase User 객체, 미로그인 시 null
  isLoading: Ref<boolean>         // 인증 처리 중 여부

  // 메서드
  signIn(email: string, password: string): Promise<{ error: string | null }>
  signOut(): Promise<void>
}
```

**동작 사양**:
- `signIn` 성공 시 `{ error: null }` 반환, 실패 시 `{ error: '이메일 또는 비밀번호가 올바르지 않습니다' }` 반환
- 네트워크 오류 시 `{ error: '연결에 문제가 발생했습니다. 다시 시도해주세요' }` 반환
- `signOut` 완료 후 `/admin/login`으로 라우터 이동은 호출 측 페이지에서 처리
- `user`는 `useSupabaseUser()` 래핑 (SSR 세션 자동 복원 포함)

---

### 5.2 usePlants

```typescript
// app/composables/usePlants.ts

interface PlantListParams {
  categoryId?: string    // 카테고리 필터 (없으면 전체)
  search?: string        // 이름 검색 키워드
  page?: number          // 페이지 번호 (기본값: 1)
  pageSize?: number      // 페이지당 항목 수 (기본값: 20)
}

interface PlantListResult {
  data: PlantRow[]
  total: number
  error: string | null
}

interface PlantMutationResult {
  data: PlantRow | null
  error: string | null
}

interface UsePlants {
  // 상태
  plants: Ref<PlantRow[]>
  isLoading: Ref<boolean>

  // 메서드
  fetchPlants(params?: PlantListParams): Promise<PlantListResult>
  createPlant(payload: PlantInsert): Promise<PlantMutationResult>
  updatePlant(id: string, payload: PlantUpdate): Promise<PlantMutationResult>
  deletePlant(id: string): Promise<{ error: string | null }>
}
```

**동작 사양**:
- `fetchPlants`: `is_deleted = false` 조건 고정, `created_at DESC` 정렬
- `deletePlant`:
  1. 해당 식물의 `order_items` 존재 여부 확인
  2. 주문 내역 없으면 → Storage 이미지 삭제 후 DB 하드 삭제
  3. 주문 내역 있으면 → `is_deleted = true` 소프트 삭제 (이미지 유지)
- `createPlant`/`updatePlant` 실패 시 error 문자열 반환, 성공 시 `{ data: PlantRow, error: null }`

---

### 5.3 useCategories

```typescript
// app/composables/useCategories.ts

interface CategoryMutationResult {
  data: CategoryRow | null
  error: string | null
}

interface UseCategories {
  // 상태
  categories: Ref<CategoryRow[]>
  isLoading: Ref<boolean>

  // 메서드
  fetchCategories(): Promise<{ data: CategoryRow[]; error: string | null }>
  createCategory(payload: CategoryInsert): Promise<CategoryMutationResult>
  updateCategory(id: string, payload: CategoryUpdate): Promise<CategoryMutationResult>
  deleteCategory(id: string): Promise<{ error: string | null }>
}
```

**동작 사양**:
- `deleteCategory`:
  1. 해당 카테고리의 식물 수 확인 (`is_deleted = false` 기준)
  2. 식물이 있으면 → `{ error: '이 카테고리에 식물 N개가 등록되어 있습니다...' }` 반환
  3. 식물 없으면 → DB에서 하드 삭제
- `createCategory`: name trim 처리 후 중복 체크. Supabase UNIQUE 제약 오류(코드 `23505`) 감지 시 `{ error: '이미 존재하는 카테고리 이름입니다' }` 반환

---

### 5.4 useStorage

```typescript
// app/composables/useStorage.ts

interface UploadResult {
  url: string | null    // 업로드 성공 시 Public URL
  error: string | null
}

interface UseStorage {
  uploadImage(plantId: string, file: File): Promise<UploadResult>
  deleteImage(url: string): Promise<{ error: string | null }>
  deleteImagesByPlantId(plantId: string): Promise<{ error: string | null }>
}
```

**동작 사양**:
- `uploadImage`:
  1. 파일 타입 검증: `image/jpeg` | `image/png` | `image/webp` 아니면 오류 반환
  2. 파일 크기 검증: 5MB 초과 시 오류 반환
  3. 경로: `{plantId}/{crypto.randomUUID()}.{ext}`
  4. 성공 시 Supabase Storage Public URL 반환
- `deleteImage`: URL에서 경로 추출 후 Storage 파일 삭제
- `deleteImagesByPlantId`: `plant-images/{plantId}/` 경로 하위 파일 전체 삭제

**오류 메시지**:
| 상황 | 메시지 |
|------|--------|
| 미지원 형식 | `jpg, png, webp 형식만 지원합니다` |
| 용량 초과 | `이미지 크기는 5MB 이하여야 합니다` |
| 업로드 실패 | `이미지 업로드에 실패했습니다. 다시 시도해주세요` |

---

## 6. 페이지 라우팅

| URL | 파일 | 설명 | 보호 |
|-----|------|------|------|
| `/admin/login` | `pages/admin/login.vue` | 관리자 로그인 | 없음 (이미 로그인 시 /admin 리디렉션) |
| `/admin` | `pages/admin/index.vue` | 대시보드 + 식물 목록 | auth 미들웨어 |
| `/admin/plants/new` | `pages/admin/plants/new.vue` | 식물 등록 | auth 미들웨어 |
| `/admin/plants/[id]/edit` | `pages/admin/plants/[id]/edit.vue` | 식물 수정 | auth 미들웨어 |

**라우팅 규칙**:
- `/admin`으로 진입 시 대시보드(식물 목록)를 바로 표시 (별도 `/admin/plants` 없음)
- 카테고리 관리는 `/admin/index.vue` 내 모달로 처리 (별도 페이지 없음)
- `/` 진입 시 Phase 2 전까지 임시 안내 페이지 또는 `/admin`으로 리디렉션

---

## 7. UI 명세

### 7.1 공통 원칙

- **모바일 퍼스트**: 최대 너비 `480px`, 중앙 정렬 (`max-w-[480px] mx-auto`)
- **언어**: 한국어 UI 전용
- **색상 테마**: Tailwind 기본 + 초록 계열 포인트 (`green-600`, `green-700`)
- **토스트 알림**: 성공(초록), 오류(빨강), 상단 중앙 고정, 3초 후 자동 소멸

---

### 7.2 /admin/login — 로그인 페이지

**필수 요소**:
- 페이지 타이틀: "summerTree 관리자"
- 이메일 입력 필드 (`type="email"`, placeholder: "관리자 이메일")
- 비밀번호 입력 필드 (`type="password"`, placeholder: "비밀번호")
- 로그인 버튼 (처리 중 비활성화 + 로딩 스피너)
- 오류 메시지 영역 (필드 하단 또는 폼 하단)

**동작**:
- 이미 로그인된 상태로 진입 시 `/admin`으로 즉시 리디렉션
- 로그인 성공 시 `/admin`으로 이동

---

### 7.3 /admin — 대시보드 (식물 목록)

**필수 요소**:
- 상단 헤더: "summerTree 관리자" 로고 + 로그아웃 버튼
- 카테고리 관리 버튼 (모달 오픈)
- 식물 등록 버튼 (`/admin/plants/new` 이동)
- 카테고리 필터 탭 (전체 + 각 카테고리명)
- 검색창 (식물 이름 검색)
- 식물 목록 (카드 형태):
  - 대표 이미지 썸네일
  - 식물 이름
  - 카테고리명
  - 가격 (원 단위, 천 단위 콤마)
  - 재고 수량 (0이면 "품절" 배지)
  - 수정 버튼, 삭제 버튼
- 빈 목록 시: "등록된 식물이 없습니다. 첫 번째 식물을 등록해보세요!" + 등록 버튼
- 하단 페이지네이션 (20개 단위)

**카테고리 관리 모달 (`CategoryModal.vue`)**:
- 카테고리 목록
- 각 카테고리에 수정/삭제 버튼
- 새 카테고리 추가 인라인 폼 (이름 + 설명)

---

### 7.4 /admin/plants/new — 식물 등록

**필수 요소**:
- 페이지 타이틀: "식물 등록"
- 뒤로가기 버튼 (`/admin` 이동)
- 이름 입력 (필수, maxlength=100)
- 카테고리 드롭다운 (필수)
- 가격 입력 (`type="number"`, min=0, 필수)
- 재고 입력 (`type="number"`, min=0, 필수)
- 간단 설명 입력 (선택)
- 상세 설명 텍스트에리어 (선택, maxlength=2000)
- 키우는 방법 텍스트에리어 (선택)
- 주의사항 텍스트에리어 (선택)
- 이미지 업로더 (최대 5장, 미리보기 포함)
- 등록 버튼 (처리 중 비활성화)
- 취소 버튼 (`/admin` 이동)
- 필드별 유효성 오류 메시지

---

### 7.5 /admin/plants/[id]/edit — 식물 수정

**필수 요소**:
- 페이지 타이틀: "식물 수정"
- 진입 시 기존 데이터 pre-fill
- 등록 페이지와 동일한 필드 구성
- 기존 이미지 목록 (삭제 버튼 포함)
- 추가 이미지 업로더
- 저장 버튼 (처리 중 비활성화)
- 취소 버튼 (`/admin` 이동, 변경 사항 폐기)

---

## 8. 관리자 인증 미들웨어

### 8.1 파일

```
app/middleware/auth.ts
```

### 8.2 동작 사양

```typescript
// app/middleware/auth.ts
export default defineNuxtRouteMiddleware((to) => {
  const user = useSupabaseUser()

  // /admin/login은 보호 대상 제외
  if (to.path === '/admin/login') {
    // 이미 로그인된 경우 대시보드로
    if (user.value) return navigateTo('/admin')
    return
  }

  // /admin/** 모든 경로 보호
  if (to.path.startsWith('/admin')) {
    if (!user.value) return navigateTo('/admin/login')
  }
})
```

### 8.3 적용 방법

각 관리자 페이지에 미들웨어 선언:

```vue
<!-- pages/admin/index.vue 등 -->
<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
})
</script>
```

또는 `nuxt.config.ts`에서 전역 적용:

```typescript
// nuxt.config.ts
routeRules: {
  '/admin/**': { middleware: ['auth'] }
}
```

### 8.4 세션 복원

- Supabase의 `@nuxtjs/supabase` 모듈 대신 `@supabase/supabase-js` 직접 사용 중이므로, `useSupabaseUser()`는 `lib/supabase.ts`의 클라이언트로 세션 상태를 관리하는 커스텀 컴포저블로 구현
- 새로고침 후 세션 유지: `supabase.auth.getSession()` 호출 및 `onAuthStateChange` 구독으로 처리

```typescript
// app/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'

const config = useRuntimeConfig()

export const supabase = createClient<Database>(
  config.public.supabaseUrl as string,
  config.public.supabaseKey as string
)
```

---

## 9. 환경변수

```bash
# .env.local
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<anon-key>
```

> `.env.local`은 git에 포함하지 않는다 (`.gitignore`에 추가).

---

## 10. 구현 순서 (권장)

1. **DB 마이그레이션** — Supabase SQL Editor에서 `supabase/migrations/20260603000000_phase1_schema.sql` 실행
2. **Storage 버킷 생성** — Supabase 대시보드에서 `plant-images` 버킷 생성 및 Public 설정
3. **타입 및 lib** — `database.types.ts`, `lib/supabase.ts`
4. **Composables** — `useAuth` → `useStorage` → `useCategories` → `usePlants` 순서
5. **미들웨어** — `middleware/auth.ts`
6. **페이지** — `login.vue` → `admin/index.vue` → `plants/new.vue` → `plants/[id]/edit.vue`
7. **컴포넌트** — 각 페이지 개발 중 필요한 시점에 추출

---

*이 사양서는 Phase 1 구현의 기술 기준이다. 구현 중 발견된 불일치나 추가 사항은 이 문서를 업데이트한다.*
