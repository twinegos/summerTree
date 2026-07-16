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
  <div class="list-root fixed inset-0 flex flex-col overflow-hidden">
    <CommonToast />

    <!-- 헤더 -->
    <header class="lst-hdr">
      <div class="lst-hdr-in">
        <NuxtLink to="/"><BrandLogo /></NuxtLink>
        <NuxtLink to="/cart" class="hdr-cart">
          장바구니<span v-if="cartCount > 0" class="cart-badge">{{ cartCount }}</span>
        </NuxtLink>
      </div>
    </header>

    <!-- 검색 + 필터 -->
    <div class="controls">
      <div class="search">
        <svg class="search-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
        <input v-model="searchQuery" @input="onSearchInput" type="text" placeholder="식물 이름 검색" />
      </div>
      <div class="chips-row">
        <button class="fchip" :class="{ on: selectedCategoryId === null }" @click="selectCategory(null)">전체</button>
        <button
          v-for="cat in categories"
          :key="cat.id"
          class="fchip"
          :class="{ on: selectedCategoryId === cat.id }"
          @click="selectCategory(cat.id)"
        >{{ cat.name }}</button>
      </div>
    </div>

    <!-- 로딩 -->
    <div v-if="isLoading" class="flex-1 flex justify-center py-16">
      <div class="w-5 h-5 border border-t-transparent rounded-full animate-spin" style="border-color: var(--muted); border-top-color: transparent;" />
    </div>

    <!-- 빈 상태 -->
    <div v-else-if="plants.length === 0" class="flex-1 flex items-center justify-center text-sm" style="color: var(--muted);">
      식물이 없습니다
    </div>

    <!-- 상품 그리드 — 두 열을 각각 독립 스크롤 -->
    <template v-else>
      <div class="flex-1 relative min-h-0">
        <!-- 왼쪽 열 — absolute로 높이 확정(iOS flexbox 스크롤 이슈 회피) -->
        <div class="col col-left">
          <StorePlantCard v-for="plant in leftColumn" :key="plant.id" :plant="plant" :category-name="categoryMap[plant.category_id]" />
        </div>
        <!-- 오른쪽 열 -->
        <div class="col col-right">
          <StorePlantCard v-for="plant in rightColumn" :key="plant.id" :plant="plant" :category-name="categoryMap[plant.category_id]" />
        </div>
      </div>

      <!-- 페이지네이션 -->
      <div v-if="totalPages > 1" class="pager">
        <button class="pg-btn" @click="currentPage--; load()" :disabled="currentPage === 1">이전</button>
        <span class="pg-num">{{ currentPage }} / {{ totalPages }}</span>
        <button class="pg-btn" @click="currentPage++; load()" :disabled="currentPage >= totalPages">다음</button>
      </div>
    </template>
  </div>
</template>

<style scoped>
/* 애플식 식물 목록 — 2열 독립 스크롤 유지 + 크롬 리파인 */
.list-root {
  background: var(--bg); color: var(--dark);
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Apple SD Gothic Neo", "Pretendard", system-ui, sans-serif;
}

.lst-hdr { flex: none; padding: 14px 20px 10px; }
.lst-hdr-in { max-width: 480px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; }
.hdr-cart { font-size: 14px; font-weight: 500; color: var(--muted); min-height: 44px; display: inline-flex; align-items: center; padding: 0 10px; border-radius: 10px; transition: transform .14s cubic-bezier(0.23,1,0.32,1), color .14s ease; }
.hdr-cart:active { transform: scale(0.94); }
.cart-badge { margin-left: 5px; font-weight: 700; color: #fff; background: var(--brand); font-size: 11px; padding: 1px 7px; border-radius: 999px; }

.controls { flex: none; max-width: 480px; width: 100%; margin: 0 auto; padding: 4px 16px 10px; }
.search { position: relative; margin-bottom: 12px; }
.search-ic { position: absolute; left: 13px; top: 50%; transform: translateY(-50%); width: 17px; height: 17px; color: var(--muted); pointer-events: none; }
.search input {
  width: 100%; height: 44px; padding: 0 14px 0 38px;
  background: var(--bg-light); border: 1px solid var(--border); border-radius: 12px;
  font-size: 15px; color: var(--dark); font-family: inherit;
  transition: border-color .15s ease, box-shadow .15s ease;
}
.search input::placeholder { color: var(--muted); }
.search input:focus { outline: none; border-color: var(--brand); box-shadow: 0 0 0 3px rgba(43,72,32,0.10); }

.chips-row { display: flex; gap: 7px; overflow-x: auto; scrollbar-width: none; padding-bottom: 2px; }
.chips-row::-webkit-scrollbar { display: none; }
.fchip {
  flex: none; height: 34px; padding: 0 15px; border-radius: 999px;
  font-size: 13.5px; font-weight: 600; letter-spacing: -0.01em;
  background: var(--bg-light); color: var(--muted); border: 1px solid var(--border);
  transition: transform .14s cubic-bezier(0.23,1,0.32,1), background .14s ease, color .14s ease, border-color .14s ease;
}
.fchip:active { transform: scale(0.95); }
.fchip.on { background: var(--brand); color: #fff; border-color: var(--brand); }
.fchip:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }

/* 2열 독립 스크롤 */
.col { position: absolute; top: 0; bottom: 0; width: 50%; overflow-y: auto; overscroll-behavior: contain; -webkit-overflow-scrolling: touch; padding-top: 4px; padding-bottom: 20px; }
.col-left { left: 0; padding-left: 16px; padding-right: 7px; }
.col-right { right: 0; padding-right: 16px; padding-left: 7px; }
.col :deep(.card) { margin-bottom: 14px; }

/* 페이지네이션 */
.pager { flex: none; display: flex; align-items: center; justify-content: center; gap: 10px; padding: 12px; border-top: 1px solid var(--border); background: var(--bg); }
.pg-btn {
  height: 38px; padding: 0 18px; border-radius: 999px;
  background: var(--bg-light); border: 1px solid var(--border);
  font-size: 14px; font-weight: 600; color: var(--dark);
  transition: transform .14s cubic-bezier(0.23,1,0.32,1), opacity .14s ease;
}
.pg-btn:active { transform: scale(0.95); }
.pg-btn:disabled { opacity: 0.35; }
.pg-btn:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }
.pg-num { font-size: 13px; font-weight: 600; color: var(--muted); font-variant-numeric: tabular-nums; min-width: 52px; text-align: center; }

@media (hover: hover) and (pointer: fine) {
  .hdr-cart:hover { color: var(--dark); }
  .fchip:not(.on):hover { border-color: var(--brand); color: var(--dark); }
  .pg-btn:not(:disabled):hover { border-color: var(--brand); }
}
@media (prefers-reduced-motion: reduce) {
  .hdr-cart:active, .fchip:active, .pg-btn:active { transform: none; }
}
</style>
