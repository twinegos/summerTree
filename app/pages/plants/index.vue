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

onMounted(async () => {
  await Promise.all([fetchCategories(), load(), fetchCart()])
})
</script>

<template>
  <div class="min-h-screen" style="background: var(--bg);">
    <CommonToast />

    <!-- 헤더 -->
    <header class="sticky top-0 z-40 px-5 py-4" style="background: var(--bg); border-bottom: 1px solid var(--border);">
      <div class="max-w-[480px] mx-auto flex items-center justify-between">
        <NuxtLink to="/" class="text-lg font-bold tracking-tight" style="color: var(--brand);">summerTree</NuxtLink>
        <NuxtLink to="/cart" class="text-sm font-medium" style="color: var(--muted);">
          장바구니<span v-if="cartCount > 0" class="ml-1 font-bold" style="color: var(--brand);">({{ cartCount }})</span>
        </NuxtLink>
      </div>
    </header>

    <div class="max-w-[480px] mx-auto px-5 pt-6">
      <!-- 페이지 타이틀 -->
      <div class="mb-6">
        <p class="text-xs font-medium tracking-widest uppercase mb-1" style="color: var(--muted);">Collection</p>
        <h1 class="text-3xl font-bold tracking-tight" style="color: var(--dark);">식물</h1>
      </div>

      <!-- 검색 -->
      <div class="relative mb-4">
        <input
          v-model="searchQuery"
          @input="onSearchInput"
          type="text"
          placeholder="식물 이름 검색"
          class="w-full px-4 py-2.5 text-sm focus:outline-none"
          style="background: var(--bg-light); border: 1px solid var(--border); border-radius: 4px; color: var(--dark);"
        />
      </div>

      <!-- 카테고리 필터 -->
      <div class="flex gap-4 overflow-x-auto pb-1 mb-6 scrollbar-hide">
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

      <!-- 총 개수 -->
      <p class="text-xs mb-4" style="color: var(--muted);">{{ total }}개</p>

      <!-- 로딩 -->
      <div v-if="isLoading" class="flex justify-center py-16">
        <div class="w-5 h-5 border border-t-transparent rounded-full animate-spin" style="border-color: var(--muted); border-top-color: transparent;" />
      </div>

      <!-- 빈 상태 -->
      <div v-else-if="plants.length === 0" class="text-center py-16 text-sm" style="color: var(--muted);">
        식물이 없습니다
      </div>

      <!-- 상품 그리드 -->
      <div v-else>
        <div class="grid grid-cols-2 gap-x-4 gap-y-8">
          <StorePlantCard
            v-for="plant in plants"
            :key="plant.id"
            :plant="plant"
            :category-name="categoryMap[plant.category_id]"
          />
        </div>

        <!-- 페이지네이션 -->
        <div v-if="totalPages > 1" class="flex items-center justify-center gap-6 py-10">
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
      </div>

      <div class="pb-12" />
    </div>
  </div>
</template>
