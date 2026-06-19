<script setup lang="ts">
definePageMeta({ layout: false })

const { plants, isLoading, fetchPlants } = usePlants()
const { categories, fetchCategories } = useCategories()
const { totalCount: cartCount, fetchCart } = useCart()

const selectedCategoryId = ref<string | null>(null)
const searchQuery = ref('')
const currentPage = ref(1)
const total = ref(0)
const PAGE_SIZE = 20

const totalPages = computed(() => Math.ceil(total.value / PAGE_SIZE))

// 두 열을 독립 스크롤하기 위해 좌/우로 분배 (왼쪽=짝수, 오른쪽=홀수 인덱스)
const leftColumn = computed(() => plants.value.filter((_, i) => i % 2 === 0))
const rightColumn = computed(() => plants.value.filter((_, i) => i % 2 === 1))

const categoryMap = computed(() => {
  const map: Record<string, string> = {}
  for (const cat of categories.value) {
    map[cat.id] = cat.name
  }
  return map
})

async function load() {
  const result = await fetchPlants({
    categoryId: selectedCategoryId.value ?? undefined,
    search: searchQuery.value.trim() || undefined,
    page: currentPage.value,
    pageSize: PAGE_SIZE,
  })
  total.value = result.total
}

function selectCategory(id: string | null) {
  selectedCategoryId.value = id
  currentPage.value = 1
  load()
}

let searchTimer: ReturnType<typeof setTimeout> | null = null
function onSearchInput() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    currentPage.value = 1
    load()
  }, 300)
}

const route = useRoute()

onMounted(async () => {
  await fetchCategories()
  if (route.query.category) {
    const matched = categories.value.find(c => c.name === route.query.category)
    if (matched) selectedCategoryId.value = matched.id
  }
  await Promise.all([load(), fetchCart()])
})
</script>

<template>
  <div class="flex flex-col" style="height: 100dvh; background: var(--bg);">
    <CommonToast />

    <!-- 헤더 -->
    <header class="sticky top-0 z-40 px-5 py-4" style="background: var(--bg); border-bottom: 1px solid var(--border);">
      <div class="max-w-[480px] mx-auto flex items-center justify-between">
        <NuxtLink to="/"><BrandLogo /></NuxtLink>
        <NuxtLink to="/cart" class="text-sm font-medium" style="color: var(--muted);">
          장바구니<span v-if="cartCount > 0" class="ml-1 font-bold" style="color: var(--brand);">({{ cartCount }})</span>
        </NuxtLink>
      </div>
    </header>

    <!-- 헤더 컨트롤 (검색, 필터) — 콤팩트 -->
    <div class="max-w-[480px] mx-auto px-5 pt-3">
      <div class="relative mb-2">
        <input
          v-model="searchQuery"
          @input="onSearchInput"
          type="text"
          placeholder="식물 이름 검색"
          class="w-full px-4 py-2 text-sm focus:outline-none"
          style="background: var(--bg-light); border: 1px solid var(--border); border-radius: 4px; color: var(--dark);"
        />
      </div>

      <div class="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        <button
          @click="selectCategory(null)"
          class="shrink-0 text-sm font-medium pb-1 transition-colors"
          :style="selectedCategoryId === null
            ? 'color: var(--brand); border-bottom: 1.5px solid var(--brand);'
            : 'color: var(--muted); border-bottom: 1.5px solid transparent;'"
        >
          전체
        </button>
        <button
          v-for="cat in categories"
          :key="cat.id"
          @click="selectCategory(cat.id)"
          class="shrink-0 text-sm font-medium pb-1 transition-colors"
          :style="selectedCategoryId === cat.id
            ? 'color: var(--brand); border-bottom: 1.5px solid var(--brand);'
            : 'color: var(--muted); border-bottom: 1.5px solid transparent;'"
        >
          {{ cat.name }}
        </button>
      </div>
    </div>

    <!-- 로딩 -->
    <div v-if="isLoading" class="flex-1 flex justify-center py-16">
      <div class="w-5 h-5 border border-t-transparent rounded-full animate-spin" style="border-color: var(--muted); border-top-color: transparent;" />
    </div>

    <!-- 빈 상태 -->
    <div v-else-if="plants.length === 0" class="flex-1 text-center py-16 text-sm" style="color: var(--muted);">
      식물이 없습니다
    </div>

    <!-- 상품 그리드 — 두 열을 각각 독립 스크롤 -->
    <template v-else>
      <div class="flex-1 flex min-h-0">
        <!-- 왼쪽 열 -->
        <div class="w-1/2 overflow-y-auto" style="overscroll-behavior: contain; -webkit-overflow-scrolling: touch;">
          <StorePlantCard
            v-for="plant in leftColumn"
            :key="plant.id"
            :plant="plant"
            :category-name="categoryMap[plant.category_id]"
          />
        </div>
        <!-- 오른쪽 열 -->
        <div class="w-1/2 overflow-y-auto" style="overscroll-behavior: contain; -webkit-overflow-scrolling: touch;">
          <StorePlantCard
            v-for="plant in rightColumn"
            :key="plant.id"
            :plant="plant"
            :category-name="categoryMap[plant.category_id]"
          />
        </div>
      </div>

      <!-- 페이지네이션 — 하단 고정 -->
      <div v-if="totalPages > 1" class="shrink-0 flex items-center justify-center gap-6 py-3" style="border-top: 1px solid var(--border);">
        <button
          @click="currentPage--; load()"
          :disabled="currentPage === 1"
          class="text-sm font-medium disabled:opacity-30"
          style="color: var(--muted);"
        >
          ← 이전
        </button>
        <span class="text-xs" style="color: var(--muted);">{{ currentPage }} / {{ totalPages }}</span>
        <button
          @click="currentPage++; load()"
          :disabled="currentPage >= totalPages"
          class="text-sm font-medium disabled:opacity-30"
          style="color: var(--muted);"
        >
          다음 →
        </button>
      </div>
    </template>
  </div>
</template>
