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
const isAddingToCart = ref(false)

const formattedPrice = computed(() =>
  plant.value ? plant.value.price.toLocaleString('ko-KR') + '원' : ''
)
const isOutOfStock = computed(() => (plant.value?.stock ?? 0) === 0)
const categoryName = computed(() => plant.value?.categories?.name ?? '')

const heroImageStyle = computed(() => {
  if (!plant.value) return {}
  const parts = (plant.value.image_position ?? '0% 0%').split(' ')
  const x = parseFloat(parts[0]) || 0
  const y = parseFloat(parts[1]) || 0
  const s = plant.value.image_scale ?? 1
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

const fontFamilyMap: Record<string, string> = {
  serif: '"Noto Serif", Georgia, "Batang", serif',
  mono: '"Courier New", Courier, monospace',
  sans: 'inherit',
}

const pageStyle = computed(() => {
  if (!plant.value) return {}
  const s: Record<string, string> = {}
  if (plant.value.page_bg_image) {
    s.backgroundImage = `url(${plant.value.page_bg_image})`
    s.backgroundSize = 'cover'
    s.backgroundAttachment = 'local'
    s.backgroundPosition = 'center'
  }
  if (plant.value.page_bg_color) {
    s.backgroundColor = plant.value.page_bg_color
  }
  const font = plant.value.page_font || 'sans'
  if (font !== 'sans') s.fontFamily = fontFamilyMap[font] ?? 'inherit'
  return s
})

const careLevelConfig = computed(() => {
  const level = plant.value?.care_level ?? 'normal'
  if (level === 'easy') return { label: '쉬움', color: '#2B4820', bg: '#D6E8CD', dots: 1 }
  if (level === 'hard') return { label: '까다로움', color: '#7A3B1E', bg: '#F5D9C8', dots: 3 }
  return { label: '보통', color: '#6B5B1A', bg: '#F5EDCC', dots: 2 }
})

// 항목별 정보 (값이 있는 항목만, CARE_ITEMS 순서대로)
const careInfoList = computed(() => {
  const info = plant.value?.care_info ?? {}
  return CARE_ITEMS
    .filter((item) => info[item.key]?.trim())
    .map((item) => ({ ...item, content: info[item.key] }))
})

async function load() {
  isLoading.value = true
  const { data, error } = await fetchPlantById(route.params.id as string)
  isLoading.value = false
  if (error || !data) { notFound.value = true; return }
  plant.value = data
}

function onGalleryScroll() {
  if (!galleryRef.value || !plant.value) return
  const el = galleryRef.value
  const index = Math.round(el.scrollLeft / el.clientWidth)
  activeImageIndex.value = Math.min(index, plant.value.image_urls.length - 1)
}

async function handleAddToCart() {
  if (!plant.value || isAddingToCart.value) return
  isAddingToCart.value = true
  const { error } = await addToCart(plant.value.id)
  isAddingToCart.value = false
  if (error) showError('장바구니 담기에 실패했습니다')
  else showSuccess('장바구니에 담겼습니다')
}

onMounted(load)
</script>

<template>
  <div class="min-h-screen" :style="{ background: 'var(--bg)', ...pageStyle }">
    <CommonToast />

    <!-- 로딩 -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-screen">
      <div class="w-5 h-5 border border-t-transparent rounded-full animate-spin" style="border-color: var(--muted); border-top-color: transparent;" />
    </div>

    <!-- 404 -->
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

      <!-- 이미지 + 오버랩 텍스트 (에디터와 동일 4:5 비율) -->
      <div class="relative overflow-hidden" style="background: var(--bg-light); aspect-ratio: 4/5; max-height: 672px; width: 100%;">
        <!-- 이미지 갤러리 -->
        <div
          v-if="plant.image_urls.length > 0"
          ref="galleryRef"
          class="flex overflow-x-auto snap-x snap-mandatory scroll-smooth h-full"
          style="scrollbar-width: none;"
          @scroll="onGalleryScroll"
        >
          <div
            v-for="(url, i) in plant.image_urls"
            :key="i"
            class="relative shrink-0 snap-center overflow-hidden"
            style="width: 100%; height: 100%; flex-shrink: 0;"
          >
            <img
              :src="url"
              :alt="`${plant.name} ${i + 1}`"
              :style="heroImageStyle"
            />
          </div>
        </div>
        <div v-else class="h-full flex items-center justify-center">
          <svg class="w-12 h-12" style="color: var(--border);" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>

        <!-- 텍스트 오버레이 (하단) — height: 38%로 고정, 에디터 프리뷰와 동일 비율 -->
        <div
          class="absolute bottom-0 left-0 right-0 px-5 pb-6 flex flex-col justify-end"
          :style="{ background: `rgba(232, 234, 216, ${plant.overlay_opacity ?? 0.75})`, height: '38%' }"
        >
          <!-- 점 인디케이터 -->
          <div v-if="plant.image_urls.length > 1" class="flex justify-center gap-1.5 mb-4">
            <span
              v-for="(_, i) in plant.image_urls"
              :key="i"
              class="w-1.5 h-1.5 rounded-full transition-colors"
              :style="i === activeImageIndex ? 'background: var(--dark);' : 'background: rgba(28,26,20,0.3);'"
            />
          </div>

          <!-- 카테고리 + 품절 -->
          <div class="flex items-center gap-2 mb-2">
            <span v-if="categoryName" class="text-xs font-medium tracking-widest uppercase" style="color: var(--dark); opacity: 0.6;">{{ categoryName }}</span>
            <span v-if="isOutOfStock" class="text-xs font-medium px-2 py-0.5 rounded" style="background: var(--border); color: var(--muted);">품절</span>
          </div>

          <!-- 이름 -->
          <h1 class="text-2xl font-bold tracking-tight leading-snug mb-2" style="color: var(--dark);">{{ plant.name }}</h1>

          <!-- 간단 설명 -->
          <p v-if="plant.short_description" class="text-sm leading-relaxed mb-4" style="color: var(--dark); opacity: 0.75;">{{ plant.short_description }}</p>

          <!-- 관리 난이도 -->
          <div class="flex items-center gap-3">
            <span class="text-xs font-medium" style="color: var(--dark); opacity: 0.6;">관리 난이도</span>
            <div class="flex items-center gap-1.5">
              <span
                v-for="n in 3"
                :key="n"
                class="w-2.5 h-2.5 rounded-full transition-colors"
                :style="n <= careLevelConfig.dots
                  ? `background: ${careLevelConfig.color};`
                  : 'background: rgba(28,26,20,0.2);'"
              />
            </div>
            <span
              class="text-xs font-semibold px-2.5 py-0.5 rounded-full"
              :style="`background: ${careLevelConfig.bg}; color: ${careLevelConfig.color};`"
            >{{ careLevelConfig.label }}</span>
          </div>
        </div>
      </div>

      <!-- 소개 -->
      <div v-if="plant.description" class="px-5 py-5" style="border-top: 1px solid var(--border);">
        <p class="text-sm leading-relaxed whitespace-pre-line" style="color: var(--dark); opacity: 0.85;">{{ plant.description }}</p>
      </div>

      <!-- 항목별 정보 카드 -->
      <div v-if="careInfoList.length > 0" :style="{ borderTop: plant.description ? 'none' : '1px solid var(--border)' }">
        <div
          v-for="item in careInfoList"
          :key="item.key"
          class="px-5 py-4 flex items-start gap-3"
          style="border-bottom: 1px solid var(--border);"
        >
          <span class="text-xl shrink-0 leading-none mt-0.5">{{ item.icon }}</span>
          <div class="min-w-0">
            <p class="text-sm font-semibold mb-1" style="color: var(--dark);">{{ item.label }}</p>
            <p class="text-sm leading-relaxed whitespace-pre-line" style="color: var(--dark); opacity: 0.8;">{{ item.content }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 하단 고정: 가격 + 장바구니 -->
    <div
      v-if="plant && !notFound && !isLoading"
      class="px-5 py-5"
      style="position: fixed; bottom: 0; left: 0; right: 0; z-index: 50; background: var(--bg); border-top: 1px solid var(--border);"
    >
      <div class="max-w-[480px] mx-auto flex items-center justify-between">
        <div>
          <p class="text-xs font-medium tracking-widest uppercase mb-0.5" style="color: var(--muted);">가격</p>
          <p class="text-xl font-bold" style="color: var(--brand);">{{ formattedPrice }}</p>
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
