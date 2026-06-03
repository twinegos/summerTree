<script setup lang="ts">
import type { PlantWithCategory } from '~/composables/usePlants'

definePageMeta({ layout: false })

const route = useRoute()
const { fetchPlantById } = usePlants()
const { showSuccess } = useToast()

const plant = ref<PlantWithCategory | null>(null)
const isLoading = ref(true)
const notFound = ref(false)
const activeImageIndex = ref(0)
const galleryRef = ref<HTMLElement | null>(null)

const formattedPrice = computed(() =>
  plant.value ? plant.value.price.toLocaleString('ko-KR') + '원' : ''
)
const isOutOfStock = computed(() => (plant.value?.stock ?? 0) === 0)
const categoryName = computed(() => plant.value?.categories?.name ?? '')

async function load() {
  isLoading.value = true
  const { data, error } = await fetchPlantById(route.params.id as string)
  isLoading.value = false
  if (error || !data) {
    notFound.value = true
    return
  }
  plant.value = data
}

function onGalleryScroll() {
  if (!galleryRef.value || !plant.value) return
  const el = galleryRef.value
  const index = Math.round(el.scrollLeft / el.clientWidth)
  activeImageIndex.value = Math.min(index, plant.value.image_urls.length - 1)
}

function handleAddToCart() {
  // Phase 4에서 실제 장바구니 로직 연결
  showSuccess('장바구니에 담겼습니다')
}

onMounted(load)
</script>

<template>
  <div class="min-h-screen bg-white">
    <CommonToast />

    <!-- 로딩 -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-screen">
      <div class="text-center">
        <div class="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p class="text-sm text-gray-400">불러오는 중...</p>
      </div>
    </div>

    <!-- 상품 없음 -->
    <div v-else-if="notFound" class="flex flex-col items-center justify-center min-h-screen px-6 text-center">
      <svg class="w-16 h-16 text-gray-200 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
          d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p class="text-gray-500 font-medium mb-1">상품을 찾을 수 없습니다</p>
      <p class="text-sm text-gray-400">삭제되었거나 존재하지 않는 상품입니다</p>
    </div>

    <!-- 상품 상세 -->
    <div v-else-if="plant" class="max-w-[480px] mx-auto pb-28">

      <!-- 헤더 -->
      <div class="sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button @click="$router.back()" class="p-1.5 -ml-1.5 text-gray-500 hover:text-gray-800 transition-colors">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span class="text-sm font-semibold text-green-700">summerTree</span>
      </div>

      <!-- 이미지 갤러리 -->
      <div class="relative bg-gray-100">
        <div v-if="plant.image_urls.length > 0">
          <div
            ref="galleryRef"
            class="flex overflow-x-auto snap-x snap-mandatory scroll-smooth"
            style="scrollbar-width: none;"
            @scroll="onGalleryScroll"
          >
            <img
              v-for="(url, i) in plant.image_urls"
              :key="i"
              :src="url"
              :alt="`${plant.name} ${i + 1}`"
              class="w-full h-72 shrink-0 snap-center object-cover"
            />
          </div>
          <!-- 점 인디케이터 -->
          <div
            v-if="plant.image_urls.length > 1"
            class="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5"
          >
            <span
              v-for="(_, i) in plant.image_urls"
              :key="i"
              class="w-1.5 h-1.5 rounded-full transition-colors"
              :class="i === activeImageIndex ? 'bg-white' : 'bg-white/50'"
            />
          </div>
        </div>
        <!-- 이미지 없음 -->
        <div v-else class="h-64 flex items-center justify-center">
          <svg class="w-16 h-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      </div>

      <!-- 기본 정보 -->
      <div class="px-4 pt-4 pb-3">
        <!-- 카테고리 + 품절 -->
        <div class="flex items-center gap-2 mb-1.5">
          <span v-if="categoryName" class="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium">
            {{ categoryName }}
          </span>
          <span v-if="isOutOfStock" class="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-medium">
            품절
          </span>
        </div>

        <!-- 이름 -->
        <h1 class="text-xl font-bold text-gray-900 leading-snug">{{ plant.name }}</h1>

        <!-- 가격 -->
        <p class="text-2xl font-bold text-green-600 mt-2">{{ formattedPrice }}</p>

        <!-- 재고 -->
        <p v-if="!isOutOfStock" class="text-xs text-gray-400 mt-1">재고 {{ plant.stock }}개</p>

        <!-- 한 줄 설명 -->
        <p v-if="plant.short_description" class="text-sm text-gray-600 mt-3 leading-relaxed">
          {{ plant.short_description }}
        </p>
      </div>

      <!-- 구분선 -->
      <div class="h-2 bg-gray-50" />

      <!-- 상세 설명 -->
      <div v-if="plant.description" class="px-4 py-4">
        <h2 class="text-sm font-bold text-gray-800 mb-2 flex items-center gap-1.5">
          <span>📖</span> 상세 설명
        </h2>
        <p class="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{{ plant.description }}</p>
      </div>

      <div v-if="plant.description && (plant.care_guide || plant.caution)" class="mx-4 border-t border-gray-100" />

      <!-- 키우는 방법 -->
      <div v-if="plant.care_guide" class="px-4 py-4">
        <h2 class="text-sm font-bold text-gray-800 mb-2 flex items-center gap-1.5">
          <span>🌿</span> 키우는 방법
        </h2>
        <p class="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{{ plant.care_guide }}</p>
      </div>

      <div v-if="plant.care_guide && plant.caution" class="mx-4 border-t border-gray-100" />

      <!-- 주의사항 -->
      <div v-if="plant.caution" class="px-4 py-4">
        <h2 class="text-sm font-bold text-gray-800 mb-2 flex items-center gap-1.5">
          <span>⚠️</span> 주의사항
        </h2>
        <p class="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{{ plant.caution }}</p>
      </div>

    </div>

    <!-- 하단 고정 장바구니 버튼 -->
    <div
      v-if="plant && !notFound && !isLoading"
      class="bg-white border-t border-gray-100 px-4 py-3"
      style="position: fixed; bottom: 0; left: 0; right: 0; z-index: 50;"
    >
      <div class="max-w-[480px] mx-auto">
        <button
          @click="handleAddToCart"
          :disabled="isOutOfStock"
          class="w-full py-3.5 text-base font-bold rounded-2xl transition-colors"
          :class="isOutOfStock
            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
            : 'bg-green-600 hover:bg-green-700 text-white active:scale-[0.98]'"
        >
          {{ isOutOfStock ? '품절' : '🛒 장바구니 담기' }}
        </button>
      </div>
    </div>
  </div>
</template>
