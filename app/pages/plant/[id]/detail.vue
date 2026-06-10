<script setup lang="ts">
import type { PlantWithCategory } from '~/composables/usePlants'

definePageMeta({ layout: false })

const route = useRoute()
const { fetchPlantById } = usePlants()
const { addToCart } = useCart()
const { showSuccess, showError } = useToast()

const plant = ref<PlantWithCategory | null>(null)
const isLoading = ref(true)
const isAddingToCart = ref(false)

const formattedPrice = computed(() =>
  plant.value ? plant.value.price.toLocaleString('ko-KR') + '원' : ''
)
const isOutOfStock = computed(() => (plant.value?.stock ?? 0) === 0)

async function handleAddToCart() {
  if (!plant.value || isAddingToCart.value) return
  isAddingToCart.value = true
  const { error } = await addToCart(plant.value.id)
  isAddingToCart.value = false
  if (error) showError('장바구니 담기에 실패했습니다')
  else showSuccess('장바구니에 담겼습니다')
}

onMounted(async () => {
  isLoading.value = true
  const { data } = await fetchPlantById(route.params.id as string)
  isLoading.value = false
  plant.value = data
})
</script>

<template>
  <div class="min-h-screen" style="background: var(--bg);">
    <CommonToast />

    <div v-if="isLoading" class="flex items-center justify-center min-h-screen">
      <div class="w-5 h-5 border border-t-transparent rounded-full animate-spin" style="border-color: var(--muted); border-top-color: transparent;" />
    </div>

    <div v-else-if="plant" class="max-w-[480px] mx-auto pb-32">
      <!-- 헤더 -->
      <div class="sticky top-0 z-10 px-5 py-4 flex items-center gap-4" style="background: var(--bg); border-bottom: 1px solid var(--border);">
        <NuxtLink :to="`/plant/${plant.id}`" class="text-sm font-medium" style="color: var(--muted);">← {{ plant.name }}</NuxtLink>
      </div>

      <div class="px-5 pt-8 pb-6">
        <h1 class="text-2xl font-bold tracking-tight mb-6" style="color: var(--dark);">상세 설명</h1>
        <p class="text-sm leading-loose whitespace-pre-line" style="color: var(--dark);">{{ plant.description }}</p>
      </div>
    </div>

    <!-- 하단 가격 + 장바구니 -->
    <div
      v-if="plant"
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
