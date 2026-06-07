<script setup lang="ts">
import type { PlantRow } from '~/types/database.types'

const props = defineProps<{
  plant: PlantRow
  categoryName?: string
}>()

const thumbnailUrl = computed(() =>
  props.plant.image_urls.length > 0 ? props.plant.image_urls[0] : null
)

const formattedPrice = computed(() =>
  props.plant.price.toLocaleString('ko-KR') + '원'
)
</script>

<template>
  <NuxtLink :to="`/plant/${plant.id}`" class="block bg-white rounded-2xl overflow-hidden border border-gray-100 active:scale-[0.97] transition-transform">
    <!-- 이미지 -->
    <div class="aspect-square bg-gray-100 overflow-hidden relative">
      <img
        v-if="thumbnailUrl"
        :src="thumbnailUrl"
        :alt="plant.name"
        class="w-full h-full object-cover"
      />
      <div v-else class="w-full h-full flex items-center justify-center">
        <svg class="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
      <span v-if="plant.stock === 0" class="absolute top-2 left-2 text-xs bg-black/60 text-white px-2 py-0.5 rounded-full">
        품절
      </span>
    </div>
    <!-- 정보 -->
    <div class="p-3">
      <p v-if="categoryName" class="text-xs text-green-600 font-medium mb-0.5">{{ categoryName }}</p>
      <p class="text-sm font-semibold text-gray-900 leading-snug line-clamp-2">{{ plant.name }}</p>
      <p class="text-sm font-bold text-green-600 mt-1.5">{{ formattedPrice }}</p>
    </div>
  </NuxtLink>
</template>
