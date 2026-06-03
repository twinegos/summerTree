<script setup lang="ts">
import type { PlantRow } from '~/types/database.types'

const props = defineProps<{
  plant: PlantRow
  categoryName: string
}>()

const emit = defineEmits<{
  edit: [id: string]
  delete: [id: string]
}>()

const formattedPrice = computed(() =>
  props.plant.price.toLocaleString('ko-KR') + '원'
)

const thumbnailUrl = computed(() =>
  props.plant.image_urls.length > 0 ? props.plant.image_urls[0] : null
)
</script>

<template>
  <div class="bg-white rounded-xl border border-gray-200 overflow-hidden flex gap-3 p-3">
    <!-- 썸네일 -->
    <div class="w-20 h-20 rounded-lg overflow-hidden shrink-0 bg-gray-100 flex items-center justify-center">
      <img
        v-if="thumbnailUrl"
        :src="thumbnailUrl"
        :alt="plant.name"
        class="w-full h-full object-cover"
      />
      <svg v-else class="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    </div>

    <!-- 정보 -->
    <div class="flex-1 min-w-0">
      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0">
          <p class="font-medium text-gray-900 truncate">{{ plant.name }}</p>
          <p class="text-xs text-gray-500 mt-0.5">{{ categoryName }}</p>
        </div>
        <div v-if="plant.stock === 0" class="shrink-0">
          <span class="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">품절</span>
        </div>
      </div>

      <div class="mt-2 flex items-center justify-between">
        <div>
          <p class="text-sm font-semibold text-gray-800">{{ formattedPrice }}</p>
          <p class="text-xs text-gray-400 mt-0.5">재고 {{ plant.stock }}개</p>
        </div>
        <div class="flex gap-2">
          <button
            @click="emit('edit', plant.id)"
            class="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
          >
            수정
          </button>
          <button
            @click="emit('delete', plant.id)"
            class="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
