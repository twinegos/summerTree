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
  <div class="min-h-screen bg-gray-50">
    <CommonToast />

    <!-- 헤더 -->
    <header class="bg-white border-b border-gray-100 sticky top-0 z-40">
      <div class="max-w-[480px] mx-auto px-4 py-3 flex items-center justify-between">
        <NuxtLink to="/" class="text-lg font-bold text-green-700">summerTree</NuxtLink>
        <NuxtLink to="/cart" class="relative p-2 -mr-1">
          <svg class="w-6 h-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <span
            v-if="cartCount > 0"
            class="absolute top-1 right-1 w-4 h-4 bg-green-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center"
          >
            {{ cartCount > 9 ? '9+' : cartCount }}
          </span>
        </NuxtLink>
      </div>
    </header>

    <div class="max-w-[480px] mx-auto px-4 py-4">
      <!-- 검색창 -->
      <div class="relative mb-3">
        <svg class="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          v-model="searchQuery"
          @input="onSearchInput"
          type="text"
          placeholder="식물 이름 검색"
          class="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      <!-- 카테고리 필터 -->
      <div class="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
        <button
          @click="selectCategory(null)"
          :class="[
            'shrink-0 px-3 py-1.5 text-sm rounded-full transition-colors',
            selectedCategoryId === null
              ? 'bg-green-600 text-white'
              : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50',
          ]"
        >
          전체
        </button>
        <button
          v-for="cat in categories"
          :key="cat.id"
          @click="selectCategory(cat.id)"
          :class="[
            'shrink-0 px-3 py-1.5 text-sm rounded-full transition-colors',
            selectedCategoryId === cat.id
              ? 'bg-green-600 text-white'
              : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50',
          ]"
        >
          {{ cat.name }}
        </button>
      </div>

      <!-- 로딩 -->
      <div v-if="isLoading" class="flex justify-center py-16">
        <div class="w-7 h-7 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>

      <!-- 빈 상태 -->
      <div v-else-if="plants.length === 0" class="text-center py-16 text-gray-400 text-sm">
        상품이 없습니다
      </div>

      <!-- 상품 그리드 -->
      <div v-else>
        <div class="grid grid-cols-2 gap-3">
          <StorePlantCard
            v-for="plant in plants"
            :key="plant.id"
            :plant="plant"
            :category-name="categoryMap[plant.category_id]"
          />
        </div>

        <!-- 페이지네이션 -->
        <div v-if="totalPages > 1" class="flex items-center justify-center gap-2 pt-6 pb-2">
          <button
            @click="currentPage--; load()"
            :disabled="currentPage === 1"
            class="px-3 py-2 text-sm rounded-lg border border-gray-300 disabled:opacity-40 hover:bg-gray-100 transition-colors"
          >
            이전
          </button>
          <span class="text-sm text-gray-600">{{ currentPage }} / {{ totalPages }}</span>
          <button
            @click="currentPage++; load()"
            :disabled="currentPage >= totalPages"
            class="px-3 py-2 text-sm rounded-lg border border-gray-300 disabled:opacity-40 hover:bg-gray-100 transition-colors"
          >
            다음
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
