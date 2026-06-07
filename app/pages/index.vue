<script setup lang="ts">
definePageMeta({ layout: false })

const { plants, fetchPlants } = usePlants()

onMounted(async () => {
  await fetchPlants({ pageSize: 4 })
})
</script>

<template>
  <div class="min-h-screen" style="background: var(--bg); position: relative;">
    <!-- 배경 일러스트 -->
    <div class="pointer-events-none select-none" style="position: absolute; bottom: 0; left: 0; right: 0; z-index: 0; opacity: 0.09; color: var(--dark);">
      <IllustrationMain style="display: block; width: 100%;" />
    </div>
    <!-- 콘텐츠 레이어 -->
    <div style="position: relative; z-index: 1;">
    <!-- 헤더 -->
    <header class="max-w-[480px] mx-auto px-5 pt-6 pb-4 flex items-center justify-between">
      <span class="text-lg font-bold tracking-tight" style="color: var(--brand);">summerTree</span>
      <NuxtLink to="/cart" class="text-sm font-medium" style="color: var(--muted);">장바구니</NuxtLink>
    </header>

    <div class="max-w-[480px] mx-auto px-5">
      <!-- 히어로 -->
      <section class="py-14">
        <p class="text-xs font-medium tracking-widest uppercase mb-4" style="color: var(--muted);">Plant Shop</p>
        <h1 class="text-5xl font-bold leading-[1.05] tracking-tight mb-6" style="color: var(--dark);">
          당신의<br />공간에<br />초록을.
        </h1>
        <p class="text-sm leading-relaxed mb-8" style="color: var(--muted);">
          식물과 함께하는 일상.<br />QR 코드로 식물의 이야기를 만나보세요.
        </p>
        <NuxtLink to="/plants" class="text-link text-base">
          식물 둘러보기 →
        </NuxtLink>
      </section>

      <!-- 구분선 -->
      <div class="h-px mb-8" style="background: var(--border);" />

      <!-- 식물 미리보기 -->
      <section v-if="plants.length > 0" class="pb-12">
        <div class="flex items-end justify-between mb-5">
          <h2 class="text-xl font-bold tracking-tight" style="color: var(--dark);">식물</h2>
          <NuxtLink to="/plants" class="text-link text-sm">전체보기 →</NuxtLink>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <StorePlantCard
            v-for="plant in plants"
            :key="plant.id"
            :plant="plant"
          />
        </div>
      </section>

      <!-- 하단 브랜드 -->
      <footer class="pb-8 text-center">
        <p class="text-xs" style="color: var(--muted);">summerTree — 식물 전문 가게</p>
      </footer>
    </div>
    </div><!-- /콘텐츠 레이어 -->
  </div>
</template>
