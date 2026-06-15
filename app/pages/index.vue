<script setup lang="ts">
import type { HomeSettings } from '~/composables/useHomeSettings'

definePageMeta({ layout: false })

const { categories, fetchCategories } = useCategories()
const { fetchSettings } = useHomeSettings()

const hoveredId = ref<string | null>(null)

// 카테고리 인덱스에 따라 점진적으로 진해지는 배경색
function categoryBg(index: number): string {
  // 기본 --bg: #E8EAD8 ≈ hsl(66, 25%, 88%)
  const lightness = Math.max(68, 85 - index * 6)
  return `hsl(66, 22%, ${lightness}%)`
}

const settings = ref<HomeSettings | null>(null)
const heroImage = ref<string | null>(null)
const heroPhrase = ref<string>('')

function pickRandom<T>(arr: T[]): T | null {
  if (!arr?.length) return null
  return arr[Math.floor(Math.random() * arr.length)]
}

function pickNextImage(images: string[]): string | null {
  if (!images?.length) return null
  if (images.length === 1) return images[0]
  const last = localStorage.getItem('lastHeroImage')
  const pool = last ? images.filter(url => url !== last) : images
  const picked = pool[Math.floor(Math.random() * pool.length)]
  localStorage.setItem('lastHeroImage', picked)
  return picked
}

// 오버스크롤 시 body 배경이 마지막 카테고리 색과 일치하도록
watchEffect(() => {
  if (categories.value.length) {
    document.body.style.backgroundColor = categoryBg(categories.value.length - 1)
  }
})

// 스크롤 속도에 따라 카테고리 간격이 벌어지는 효과 — GSAP 기반
// transform만 사용 (GPU 가속, layout reflow 없음)
import gsap from 'gsap'

const _gsapState = { spacing: 0 }
let _lastTouchY = 0
let _touchMaxSpacing = 0
let _catColors: string[] = []
let _footerEl: HTMLElement | null = null
let _wheelTimer: ReturnType<typeof setTimeout> | null = null

function _applyFromState() {
  if (!_footerEl) _footerEl = document.querySelector<HTMLElement>('.cat-footer')
  const items = Array.from(document.querySelectorAll<HTMLElement>('.cat-item'))

  if (!_catColors.length && items.length) {
    _catColors = items.map(el => getComputedStyle(el).backgroundColor)
  }

  const s = _gsapState.spacing
  const active = Math.abs(s) > 0.3

  items.forEach((el, i) => {
    el.style.transform = active ? `translateY(${s * (i + 1) * 0.5}px)` : ''
    // box-shadow는 양수(벌어짐)일 때만 — 음수(압축)일 때는 겹침으로 표현
    el.style.boxShadow = s > 0.3 ? `0 ${s * 0.5}px 0 0 ${_catColors[i] ?? ''}` : ''
  })
  if (_footerEl) {
    _footerEl.style.transform = active ? `translateY(${s * items.length * 0.5}px)` : ''
  }
}

function _animateTo(target: number) {
  gsap.to(_gsapState, {
    spacing: target,
    duration: 0.3,
    ease: 'power2.out',
    overwrite: 'auto',
    onUpdate: _applyFromState,
  })
}

function _decayToZero() {
  gsap.to(_gsapState, {
    spacing: 0,
    duration: 0.45,
    ease: 'power2.out',  // inOut → out: 멈춤 없이 즉시 시작
    overwrite: true,
    onUpdate: _applyFromState,
    onComplete: _applyFromState,
  })
}

// ── 모바일 터치 ──
function onTouchStart(e: TouchEvent) {
  _lastTouchY = e.touches[0].clientY
  _touchMaxSpacing = _gsapState.spacing  // 현재 애니메이션 값에서 연속으로 이어받음
}

function onTouchMove(e: TouchEvent) {
  const y = e.touches[0].clientY
  const dy = y - _lastTouchY
  _lastTouchY = y

  if (Math.abs(dy) < 5) return

  if (dy < 0) {
    // 위로 스크롤 → 간격 증가
    _touchMaxSpacing = Math.min(80, _touchMaxSpacing + Math.abs(dy) * 2.5)
  } else {
    // 아래로 스크롤 → 간격 감소 (0 이하로도 압축)
    _touchMaxSpacing = Math.max(-20, _touchMaxSpacing - Math.abs(dy) * 1.2)
  }
  _animateTo(_touchMaxSpacing)
}

function onTouchEnd() {
  _decayToZero()
  _touchMaxSpacing = 0
}

// ── PC 마우스 휠 / 트랙패드 ──
function onWheel(e: WheelEvent) {
  if (Math.abs(e.deltaY) < 5) return

  if (e.deltaY < 0) {
    // 위로 스크롤 → 간격 넓어짐
    _animateTo(Math.min(80, Math.abs(e.deltaY) * 0.6))
  } else {
    // 아래로 스크롤 → 간격 좁아짐
    _animateTo(0)
  }
  if (_wheelTimer) clearTimeout(_wheelTimer)
  _wheelTimer = setTimeout(_decayToZero, 200)
}

onMounted(async () => {
  const [, { data }] = await Promise.all([
    fetchCategories(),
    fetchSettings(),
  ])

  if (data) {
    settings.value = data
    heroImage.value = pickNextImage(data.hero_images)
    heroPhrase.value = pickRandom(data.hero_phrases) ?? ''
  }
})

onUnmounted(() => {
  gsap.killTweensOf(_gsapState)
  if (_wheelTimer) clearTimeout(_wheelTimer)
  document.body.style.backgroundColor = ''
})
</script>

<template>
  <!-- flex-col: 푸터가 남은 높이를 채울 수 있도록 -->
  <div class="min-h-screen flex flex-col" style="background: var(--bg);"
    @touchstart.passive="onTouchStart"
    @touchmove.passive="onTouchMove"
    @touchend="onTouchEnd"
    @wheel.passive="onWheel"
  >

    <!-- 헤더: w-full로 항상 전체 너비, justify-between으로 좌우 배치 -->
    <header class="w-full px-5 pt-6 pb-4 flex items-center justify-between sm:px-8 sm:pt-8 sm:pb-5">
      <BrandLogo class="sm:hidden" />
      <div class="hidden sm:block"><BrandLogo :large="true" /></div>
      <NuxtLink to="/cart" class="text-sm font-medium" style="color: var(--muted);">장바구니</NuxtLink>
    </header>

    <!-- 히어로: 풀 와이드 -->
    <section class="relative overflow-hidden" style="min-height: 55vh;">
      <div v-if="heroImage" class="absolute inset-0">
        <img
          :src="heroImage"
          class="w-full h-full object-cover"
          :style="`opacity: ${settings?.hero_image_opacity ?? 0.5}`"
        />
      </div>
      <!-- 텍스트: 모바일 중앙 480px / PC 풀 와이드 왼쪽 정렬 -->
      <div class="relative z-10 max-w-[480px] mx-auto sm:max-w-none px-5 sm:px-8 pt-[30vh] pb-14">
        <p class="text-xs font-medium tracking-widest uppercase mb-4" style="color: var(--muted);">Plant Shop</p>
        <h1
          v-if="heroPhrase"
          class="font-bold leading-[1.1] tracking-tight mb-6"
          :class="heroPhrase.length > 12 ? 'text-4xl' : 'text-5xl'"
          style="color: var(--dark);"
        >
          {{ heroPhrase }}
        </h1>
        <p class="text-sm leading-relaxed" style="color: var(--muted);">
          식물과 함께하는 일상.<br />QR 코드로 식물의 이야기를 만나보세요.
        </p>
      </div>
    </section>

    <!-- 구분선: 풀 와이드 -->
    <div class="h-px" style="background: rgba(0,0,0,0.15);" />

    <!-- 카테고리 목록 -->
    <nav>
      <!-- 전체보기 -->
      <div style="background: var(--bg);">
        <NuxtLink
          to="/plants"
          class="block max-w-[480px] mx-auto sm:max-w-none px-5 sm:px-8 py-4 text-2xl font-bold tracking-tight"
          style="color: var(--dark);"
        >
          전체보기
        </NuxtLink>
      </div>

      <!-- 카테고리별 아코디언 -->
      <div
        v-for="(cat, i) in categories"
        :key="cat.id"
        class="cat-item"
        @mouseenter="hoveredId = cat.id"
        @mouseleave="hoveredId = null"
        :style="`background: ${categoryBg(i)};`"
      >
        <NuxtLink
          :to="`/plants?category=${encodeURIComponent(cat.name)}`"
          class="block max-w-[480px] mx-auto sm:max-w-none px-5 sm:px-8 py-4 text-2xl font-bold tracking-tight"
          style="color: var(--dark);"
        >
          {{ cat.name }}
        </NuxtLink>

        <!-- 슬라이드 설명 -->
        <div
          class="grid transition-all duration-300 ease-in-out"
          :style="hoveredId === cat.id ? 'grid-template-rows: 1fr;' : 'grid-template-rows: 0fr;'"
        >
          <div class="overflow-hidden">
            <p class="max-w-[480px] mx-auto sm:max-w-none px-5 sm:px-8 pb-4 text-sm leading-relaxed" style="color: var(--muted);">
              {{ cat.description }}
            </p>
          </div>
        </div>
      </div>
    </nav>

    <!-- 푸터: 마지막 카테고리 색상 + flex-1 -->
    <div
      class="flex-1 cat-footer"
      :style="`background: ${categories.length ? categoryBg(categories.length - 1) : 'var(--bg)'};`"
    >
      <div class="max-w-[480px] mx-auto sm:max-w-none px-5 sm:px-8 py-8 flex justify-end" style="border-top: 1px solid rgba(0,0,0,0.2);">
        <NuxtLink to="/admin" class="text-xs" style="color: rgba(0,0,0,0.35);">관리자</NuxtLink>
      </div>
    </div>

  </div>
</template>
