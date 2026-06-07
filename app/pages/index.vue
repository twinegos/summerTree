<script setup lang="ts">
definePageMeta({ layout: false })

const { categories, fetchCategories } = useCategories()

onMounted(async () => {
  await fetchCategories()
})
</script>

<template>
  <div class="min-h-screen" style="background: var(--bg);">
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
        <p class="text-sm leading-relaxed" style="color: var(--muted);">
          식물과 함께하는 일상.<br />QR 코드로 식물의 이야기를 만나보세요.
        </p>
      </section>

      <!-- 구분선 -->
      <div class="h-px" style="background: var(--border);" />

      <!-- 카테고리 목록 -->
      <nav class="py-8">
        <NuxtLink
          to="/plants"
          class="block py-3 text-2xl font-bold tracking-tight transition-colors"
          style="color: var(--dark); border-bottom: 1px solid var(--border);"
        >
          전체보기
        </NuxtLink>
        <NuxtLink
          v-for="cat in categories"
          :key="cat.id"
          :to="`/plants?category=${encodeURIComponent(cat.name)}`"
          class="block py-3 text-2xl font-bold tracking-tight transition-colors"
          style="color: var(--dark); border-bottom: 1px solid var(--border);"
        >
          {{ cat.name }}
        </NuxtLink>
      </nav>
    </div>
  </div>
</template>
