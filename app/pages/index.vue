<script setup lang="ts">
definePageMeta({ layout: false })

const { plants, fetchPlants } = usePlants()

onMounted(async () => {
  await fetchPlants({ pageSize: 4 })
})
</script>

<template>
  <div class="min-h-screen bg-white">
    <!-- 헤더 -->
    <header class="px-4 py-4 flex items-center justify-between max-w-[480px] mx-auto">
      <span class="text-lg font-bold text-green-700">summerTree</span>
      <NuxtLink to="/cart" class="p-2 -mr-1">
        <svg class="w-6 h-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      </NuxtLink>
    </header>

    <div class="max-w-[480px] mx-auto px-4">
      <!-- 히어로 섹션 -->
      <div class="py-10 text-center">
        <div class="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5">
          <span class="text-4xl">🌿</span>
        </div>
        <h1 class="text-2xl font-bold text-gray-900 mb-2">summerTree</h1>
        <p class="text-sm text-gray-500 leading-relaxed">
          식물과 함께하는 일상<br />당신의 공간에 초록을 더해보세요
        </p>
        <NuxtLink
          to="/plants"
          class="inline-block mt-6 px-8 py-3 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-2xl transition-colors active:scale-[0.97]"
        >
          식물 보러가기
        </NuxtLink>
      </div>

      <!-- 구분선 -->
      <div class="h-px bg-gray-100 mb-6" />

      <!-- 등록된 식물 미리보기 -->
      <div v-if="plants.length > 0" class="pb-10">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-base font-bold text-gray-800">등록된 식물</h2>
          <NuxtLink to="/plants" class="text-sm text-green-600 font-medium">전체보기</NuxtLink>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <StorePlantCard
            v-for="plant in plants"
            :key="plant.id"
            :plant="plant"
          />
        </div>
      </div>
    </div>
  </div>
</template>
