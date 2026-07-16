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
    objectFit: 'contain' as const,
    objectPosition: '50% 50%',
    transformOrigin: '50% 50%',
    transform: `translate(${x}%, ${y}%) scale(${s})`,
  }
})
</script>

<template>
  <NuxtLink :to="`/plant/${plant.id}`" class="card">
    <!-- 이미지만 표시 (라운드 타일) -->
    <div class="thumb">
      <img
        v-if="thumbnailUrl"
        :src="thumbnailUrl"
        :alt="plant.name"
        :style="thumbnailStyle"
      />
      <div v-else class="ph">
        <svg class="w-8 h-8" style="color: var(--border);" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    </div>
  </NuxtLink>
</template>

<style scoped>
.card {
  display: block; color: var(--dark);
  transition: transform .16s cubic-bezier(0.23, 1, 0.32, 1);
}
.card:active { transform: scale(0.97); }
.card:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; border-radius: 16px; }
.thumb {
  position: relative; overflow: hidden;
  aspect-ratio: 4/5; background: var(--bg-light);
  border-radius: 14px;
}
.ph { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
</style>
