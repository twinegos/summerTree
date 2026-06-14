<script setup lang="ts">
import type { HomeSettings } from '~/composables/useHomeSettings'

definePageMeta({ layout: false })

const { categories, fetchCategories } = useCategories()
const { fetchSettings } = useHomeSettings()

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
  <div class="min-h-screen" style="background: var(--bg);">
    <!-- 헤더 -->
    <header class="max-w-[480px] mx-auto px-5 pt-6 pb-4 flex items-center justify-between">
      <span class="text-lg font-bold tracking-tight" style="color: var(--brand);">summerTree</span>
      <NuxtLink to="/cart" class="text-sm font-medium" style="color: var(--muted);">장바구니</NuxtLink>
    </header>

    <div class="max-w-[480px] mx-auto">
      <!-- 히어로 (배경 이미지 + 텍스트) -->
      <section class="relative overflow-hidden px-5 py-14" :class="heroImage ? '' : ''">
        <!-- 배경 이미지 -->
        <div v-if="heroImage" class="absolute inset-0">
          <img
            :src="heroImage"
            class="w-full h-full object-cover"
            :style="`opacity: ${settings?.hero_image_opacity ?? 0.5}`"
          />
        </div>

        <!-- 텍스트 콘텐츠 -->
        <div class="relative z-10">
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

      <div class="px-5">
        <!-- 구분선 -->
        <div class="h-px" style="background: var(--border);" />

        <!-- 카테고리 목록 -->
        <nav class="py-8">
          <NuxtLink
            to="/plants"
            class="block py-3 text-2xl font-bold tracking-tight transition-colors"
            style="color: var(--dark);"
          >
            전체보기
          </NuxtLink>
          <NuxtLink
            v-for="cat in categories"
            :key="cat.id"
            :to="`/plants?category=${encodeURIComponent(cat.name)}`"
            class="block py-3 text-2xl font-bold tracking-tight transition-colors"
            style="color: var(--dark);"
          >
            {{ cat.name }}
          </NuxtLink>
        </nav>

        <!-- 푸터 -->
        <div class="py-8 flex justify-end" style="border-top: 1px solid var(--border);">
          <NuxtLink to="/admin" class="text-xs" style="color: var(--border);">관리자</NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>
