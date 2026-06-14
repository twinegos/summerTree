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
</script>

<template>
  <!-- flex-col: 푸터가 남은 높이를 채울 수 있도록 -->
  <div class="min-h-screen flex flex-col" style="background: var(--bg);">

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

    <!-- 푸터: 마지막 카테고리 색상 + flex-1로 브라우저 하단까지 채움 -->
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
