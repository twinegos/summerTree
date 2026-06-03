<script setup lang="ts">
import type { PlantRow } from '~/types/database.types'

definePageMeta({
  middleware: 'auth',
})

const { plants, isLoading, fetchPlants, deletePlant } = usePlants()
const { categories, fetchCategories } = useCategories()
const { showSuccess, showError } = useToast()

const showCategoryModal = ref(false)
const showDeleteModal = ref(false)
const showQRModal = ref(false)
const deleteTargetId = ref('')
const deleteTargetName = ref('')
const qrTargetPlant = ref<PlantRow | null>(null)

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

function openQRModal(plant: PlantRow) {
  qrTargetPlant.value = plant
  showQRModal.value = true
}

function openDeleteModal(plant: PlantRow) {
  deleteTargetId.value = plant.id
  deleteTargetName.value = plant.name
  showDeleteModal.value = true
}

async function handleDelete(id: string) {
  showDeleteModal.value = false
  const { error } = await deletePlant(id)
  if (error) {
    showError(error)
  } else {
    showSuccess('식물이 삭제되었습니다')
    await load()
  }
}

// 카테고리 모달 닫힐 때 목록 갱신
watch(showCategoryModal, (val) => {
  if (!val) {
    fetchCategories()
    load()
  }
})

onMounted(async () => {
  await fetchCategories()
  await load()
})
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <AdminHeader />
    <CommonToast />

    <div class="max-w-[480px] mx-auto px-4 py-4">
      <!-- 액션 버튼 -->
      <div class="flex gap-2 mb-4">
        <button
          @click="showCategoryModal = true"
          class="flex-1 py-2.5 text-sm font-medium rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
        >
          카테고리 관리
        </button>
        <NuxtLink
          to="/admin/plants/new"
          class="flex-1 py-2.5 text-sm font-medium rounded-xl bg-green-600 hover:bg-green-700 text-white text-center transition-colors"
        >
          + 식물 등록
        </NuxtLink>
      </div>

      <!-- 카테고리 필터 탭 -->
      <div class="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-hide">
        <button
          @click="selectCategory(null)"
          :class="[
            'shrink-0 px-3 py-1.5 text-sm rounded-full transition-colors',
            selectedCategoryId === null
              ? 'bg-green-600 text-white'
              : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50',
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
              : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50',
          ]"
        >
          {{ cat.name }}
        </button>
      </div>

      <!-- 검색창 -->
      <div class="relative mb-4">
        <svg class="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          v-model="searchQuery"
          @input="onSearchInput"
          type="text"
          placeholder="식물 이름 검색"
          class="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      <!-- 로딩 -->
      <div v-if="isLoading" class="text-center py-16 text-gray-400 text-sm">
        불러오는 중...
      </div>

      <!-- 빈 상태 -->
      <div v-else-if="plants.length === 0" class="text-center py-16">
        <svg class="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
        <p class="text-gray-500 text-sm mb-4">등록된 식물이 없습니다.<br />첫 번째 식물을 등록해보세요!</p>
        <NuxtLink
          to="/admin/plants/new"
          class="inline-block px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-xl transition-colors"
        >
          식물 등록하기
        </NuxtLink>
      </div>

      <!-- 식물 목록 -->
      <div v-else class="space-y-3">
        <AdminPlantCard
          v-for="plant in plants"
          :key="plant.id"
          :plant="plant"
          :category-name="categoryMap[plant.category_id] ?? ''"
          @edit="navigateTo(`/admin/plants/${$event}/edit`)"
          @delete="openDeleteModal(plant)"
          @qr="openQRModal(plant)"
        />

        <!-- 페이지네이션 -->
        <div v-if="totalPages > 1" class="flex items-center justify-center gap-2 pt-4 pb-2">
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

    <!-- 모달 -->
    <AdminCategoryModal v-model="showCategoryModal" />
    <AdminQRCodeModal v-model="showQRModal" :plant="qrTargetPlant" />
    <AdminDeleteConfirmModal
      v-model="showDeleteModal"
      :plant-name="deleteTargetName"
      :plant-id="deleteTargetId"
      @confirm="handleDelete"
    />
  </div>
</template>
