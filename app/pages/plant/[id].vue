<script setup lang="ts">
import type { PlantWithCategory } from '~/composables/usePlants'

definePageMeta({ layout: false })

const route = useRoute()
const { fetchPlantById } = usePlants()
const { addToCart } = useCart()
const { showSuccess, showError } = useToast()

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

const isAddingToCart = ref(false)

async function handleAddToCart() {
  if (!plant.value || isAddingToCart.value) return
  isAddingToCart.value = true
  const { error } = await addToCart(plant.value.id)
  isAddingToCart.value = false
  if (error) {
    showError('장바구니 담기에 실패했습니다')
  } else {
    showSuccess('장바구니에 담겼습니다')
  }
}

onMounted(load)
</script>

<template>
  <div class="min-h-screen" style="background: var(--bg);">
    <CommonToast />

    <!-- 로딩 -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-screen">
      <div class="w-5 h-5 border border-t-transparent rounded-full animate-spin" style="border-color: var(--muted); border-top-color: transparent;" />
    </div>

    <!-- 상품 없음 -->
    <div v-else-if="notFound" class="flex flex-col items-center justify-center min-h-screen px-6 text-center">
      <p class="text-lg font-bold mb-2" style="color: var(--dark);">상품을 찾을 수 없습니다</p>
      <p class="text-sm mb-8" style="color: var(--muted);">삭제되었거나 존재하지 않는 상품입니다</p>
      <NuxtLink to="/plants" class="text-link">식물 목록으로 →</NuxtLink>
    </div>

    <!-- 상품 상세 -->
    <div v-else-if="plant" class="max-w-[480px] mx-auto pb-32">

      <!-- 헤더 -->
      <div class="sticky top-0 z-10 px-5 py-4 flex items-center justify-between" style="background: var(--bg); border-bottom: 1px solid var(--border);">
        <NuxtLink to="/plants" class="text-sm font-medium" style="color: var(--muted);">← 식물 목록</NuxtLink>
        <NuxtLink to="/cart" class="text-sm font-medium" style="color: var(--muted);">장바구니</NuxtLink>
      </div>

      <!-- 이미지 갤러리 -->
      <div class="relative" style="background: var(--bg-light);">
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
              class="w-full h-80 shrink-0 snap-center object-cover"
            />
          </div>
          <!-- 점 인디케이터 -->
          <div v-if="plant.image_urls.length > 1" class="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5">
            <span
              v-for="(_, i) in plant.image_urls"
              :key="i"
              class="w-1 h-1 rounded-full transition-colors"
              :style="i === activeImageIndex ? 'background: var(--dark);' : 'background: var(--border);'"
            />
          </div>
        </div>
        <div v-else class="h-64 flex items-center justify-center">
          <svg class="w-12 h-12" style="color: var(--border);" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      </div>

      <!-- 기본 정보 -->
      <div class="px-5 pt-6 pb-4">
        <div class="flex items-center gap-2 mb-2">
          <span v-if="categoryName" class="text-xs font-medium tracking-widest uppercase" style="color: var(--muted);">{{ categoryName }}</span>
          <span v-if="isOutOfStock" class="text-xs font-medium px-2 py-0.5 rounded" style="background: var(--border); color: var(--muted);">품절</span>
        </div>
        <h1 class="text-2xl font-bold tracking-tight leading-snug mb-3" style="color: var(--dark);">{{ plant.name }}</h1>
        <p class="text-2xl font-bold" style="color: var(--brand);">{{ formattedPrice }}</p>
        <p v-if="!isOutOfStock" class="text-xs mt-1" style="color: var(--muted);">재고 {{ plant.stock }}개</p>
        <p v-if="plant.short_description" class="text-sm leading-relaxed mt-4" style="color: var(--muted);">{{ plant.short_description }}</p>
      </div>

      <!-- 구분선 -->
      <div class="mx-5 h-px" style="background: var(--border);" />

      <!-- 상세 설명 -->
      <div v-if="plant.description" class="px-5 py-6">
        <h2 class="text-xs font-medium tracking-widest uppercase mb-3" style="color: var(--muted);">상세 설명</h2>
        <p class="text-sm leading-relaxed whitespace-pre-line" style="color: var(--dark);">{{ plant.description }}</p>
      </div>

      <div v-if="plant.description && (plant.care_guide || plant.caution)" class="mx-5 h-px" style="background: var(--border);" />

      <!-- 키우는 방법 -->
      <div v-if="plant.care_guide" class="px-5 py-6">
        <h2 class="text-xs font-medium tracking-widest uppercase mb-3" style="color: var(--muted);">키우는 방법</h2>
        <p class="text-sm leading-relaxed whitespace-pre-line" style="color: var(--dark);">{{ plant.care_guide }}</p>
      </div>

      <div v-if="plant.care_guide && plant.caution" class="mx-5 h-px" style="background: var(--border);" />

      <!-- 주의사항 -->
      <div v-if="plant.caution" class="px-5 py-6">
        <h2 class="text-xs font-medium tracking-widest uppercase mb-3" style="color: var(--muted);">주의사항</h2>
        <p class="text-sm leading-relaxed whitespace-pre-line" style="color: var(--dark);">{{ plant.caution }}</p>
      </div>
    </div>

    <!-- 하단 고정: 장바구니 담기 -->
    <div
      v-if="plant && !notFound && !isLoading"
      class="px-5 py-5"
      style="position: fixed; bottom: 0; left: 0; right: 0; z-index: 50; background: var(--bg); border-top: 1px solid var(--border);"
    >
      <div class="max-w-[480px] mx-auto flex items-center justify-between">
        <div>
          <p class="text-xs font-medium tracking-widest uppercase mb-0.5" style="color: var(--muted);">가격</p>
          <p class="text-lg font-bold" style="color: var(--brand);">{{ formattedPrice }}</p>
        </div>
        <button
          @click="handleAddToCart"
          :disabled="isOutOfStock || isAddingToCart"
          class="text-link text-base disabled:opacity-40"
          :style="isOutOfStock ? 'color: var(--muted);' : ''"
        >
          {{ isOutOfStock ? '품절' : isAddingToCart ? '담는 중...' : '장바구니 담기 →' }}
        </button>
      </div>
    </div>
  </div>
</template>
