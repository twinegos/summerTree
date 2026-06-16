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

const thumbnailStyle = computed(() => {
  const parts = (props.plant.image_position ?? '0% 0%').split(' ')
  const x = parseFloat(parts[0]) || 0
  const y = parseFloat(parts[1]) || 0
  const s = props.plant.image_scale ?? 1
  return {
    position: 'absolute' as const,
    width: '100%',
    height: '100%',
    objectFit: (s < 1 ? 'contain' : 'cover') as 'contain' | 'cover',
    objectPosition: '50% 50%',
    transformOrigin: '50% 50%',
    transform: `translate(${x}%, ${y}%) scale(${s})`,
  }
})
</script>

<template>
  <NuxtLink
    :to="`/plant/${plant.id}`"
    class="block group"
    style="color: var(--dark);"
  >
    <!-- 이미지만 표시 -->
    <div
      class="relative overflow-hidden"
      style="aspect-ratio: 4/5; background: var(--bg-light);"
    >
      <img
        v-if="thumbnailUrl"
        :src="thumbnailUrl"
        :alt="plant.name"
        :style="thumbnailStyle"
      />
      <div v-else class="w-full h-full flex items-center justify-center">
        <svg class="w-8 h-8" style="color: var(--border);" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    </div>
  </NuxtLink>
</template>
