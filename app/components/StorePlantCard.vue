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
  <NuxtLink
    :to="`/plant/${plant.id}`"
    class="block group"
    style="color: var(--dark);"
  >
    <!-- 이미지 -->
    <div
      class="aspect-square overflow-hidden mb-2.5"
      style="background: var(--bg-light); border-radius: 4px;"
    >
      <img
        v-if="thumbnailUrl"
        :src="thumbnailUrl"
        :alt="plant.name"
        class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        :style="{ objectPosition: plant.image_position || '50% 50%' }"
      />
      <div v-else class="w-full h-full flex items-center justify-center">
        <svg class="w-8 h-8" style="color: var(--border);" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    </div>
    <!-- 정보 -->
    <div>
      <p v-if="categoryName" class="text-[11px] font-medium tracking-wide uppercase mb-0.5" style="color: var(--muted);">{{ categoryName }}</p>
      <p class="text-sm font-semibold leading-snug" style="color: var(--dark);">{{ plant.name }}</p>
      <div class="flex items-center justify-between mt-1">
        <p class="text-sm font-bold" style="color: var(--brand);">{{ formattedPrice }}</p>
        <span v-if="plant.stock === 0" class="text-[10px] font-medium px-1.5 py-0.5 rounded" style="background: var(--border); color: var(--muted);">품절</span>
      </div>
    </div>
  </NuxtLink>
</template>
