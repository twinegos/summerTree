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

// 스크롤(터치) 속도에 따라 카테고리 간격이 실시간으로 변하는 효과
const scrollSpacing = ref(0)
const isActiveTouch = ref(false)
let _lastTouchY = 0
let _pendingTarget = 0
let _rafUpdate: number | null = null

function onTouchStart(e: TouchEvent) {
  _lastTouchY = e.touches[0].clientY
  isActiveTouch.value = true
  if (_rafUpdate) { cancelAnimationFrame(_rafUpdate); _rafUpdate = null }
}

function onTouchMove(e: TouchEvent) {
  const y = e.touches[0].clientY
  const dy = y - _lastTouchY
  _lastTouchY = y

  // 상하 경계 오버스크롤 무시 (떨림 방지)
  const scrollY = window.scrollY
  const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
  if ((scrollY <= 0 && dy > 0) || (scrollY >= maxScroll && dy < 0)) return

  _pendingTarget = Math.min(20, Math.abs(dy) * 3.0)

  if (!_rafUpdate) {
    _rafUpdate = requestAnimationFrame(() => {
      scrollSpacing.value = scrollSpacing.value * 0.5 + _pendingTarget * 0.5
      _rafUpdate = null
    })
  }
}

function onTouchEnd() {
  if (_rafUpdate) { cancelAnimationFrame(_rafUpdate); _rafUpdate = null }
  isActiveTouch.value = false
  // CSS transition이 500ms ease-out으로 0까지 부드럽게 복귀
  scrollSpacing.value = 0
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
  if (_rafUpdate) cancelAnimationFrame(_rafUpdate)
  document.body.style.backgroundColor = ''
})
</script>

<template>
  <!-- flex-col: 푸터가 남은 높이를 채울 수 있도록 -->
  <div class="min-h-screen flex flex-col" style="background: var(--bg);"
    @touchstart.passive="onTouchStart"
    @touchmove.passive="onTouchMove"
    @touchend="onTouchEnd"
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
          class="font-bold leading-[1.1] tracking-tight mb-6"
          :class="heroPhrase.length > 12 ? 'text-4xl' : 'text-5xl'"
          style="color: var(--dark);"
        >
          {{ heroPhrase || '당신의\n공간에\n초록을.' }}
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
        @mouseenter="hoveredId = cat.id"
        @mouseleave="hoveredId = null"
        :style="`
          background: ${categoryBg(i)};
          padding-top: ${scrollSpacing * 0.5}px;
          padding-bottom: ${scrollSpacing * 0.5}px;
          transition: padding ${isActiveTouch ? '40ms linear' : '500ms ease-out'};
        `"
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
      class="flex-1"
      :style="`background: ${categories.length ? categoryBg(categories.length - 1) : 'var(--bg)'};`"
    >
      <div class="max-w-[480px] mx-auto sm:max-w-none px-5 sm:px-8 py-8 flex justify-end" style="border-top: 1px solid rgba(0,0,0,0.2);">
        <NuxtLink to="/admin" class="text-xs" style="color: rgba(0,0,0,0.35);">관리자</NuxtLink>
      </div>
    </div>

  </div>
</template>
