# summerTree 프로젝트

## 프로젝트 설명

식물 가게용 모바일 웹 앱. 식물마다 QR 코드를 부착하고, 고객이 핸드폰으로 스캔하면 식물 상세 페이지(설명, 키우는 방법, 주의사항, 가격)가 열리며 장바구니 담기 및 결제가 가능하다.

## 기술 스택

- 프레임워크: Nuxt 3 (Vue 3) + TypeScript
- 데이터베이스: Supabase (PostgreSQL + Storage + Auth)
- 결제: 포트원 V2 + 토스페이먼츠 + 카카오페이
- QR 코드: qrcode.js
- 스타일: Tailwind CSS
- 배포: Vercel

## 개발자 배경

- Python, Qt 경험 있음 (프론트엔드 프레임워크 처음)
- Vue .vue 파일 구조 = Qt 위젯 파일 구조로 이해하면 됨
- template = Qt Designer UI, script setup = Python 클래스, style = QSS

## 프로젝트 구조 (예정)

```
summerTree/
├── pages/          # 파일명 = URL 자동 라우팅
│   ├── index.vue           # 홈 (리디렉션)
│   ├── plant/[id].vue      # 식물 상세 페이지 (QR 스캔 후 진입)
│   ├── cart.vue            # 장바구니
│   ├── checkout.vue        # 결제
│   └── admin/              # 관리자 페이지
│       ├── index.vue       # 대시보드
│       └── plants.vue      # 식물 관리
├── components/     # 재사용 Vue 컴포넌트
├── server/api/     # 백엔드 API 라우트
├── composables/    # 공통 로직 (useCart, usePlants 등)
├── lib/            # Supabase 클라이언트 등 유틸
└── public/         # 정적 파일
```

## 에이전트 워크플로우

- Claude Code: 주 개발 담당
- Hermes Agent (~/.hermes): 자동화 보조 (병렬 서브에이전트, Cron 테스트)

## 코딩 규칙

- TypeScript 사용, 타입 명시
- 컴포넌트는 Composition API (`<script setup>`) 사용
- 모바일 퍼스트 (핸드폰으로 QR 스캔 후 사용하는 앱)
- 한국어 UI

## git

- user: twinegos
- email: twinegos@gmail.com
- branch 전략: main (프로덕션) / dev (개발) / feature/* (기능별)

## 주요 참고 문서

- Nuxt 3: https://nuxt.com/docs
- Supabase: https://supabase.com/docs
- 포트원 V2: https://developers.portone.io
- 토스페이먼츠: https://developers.tosspayments.com
