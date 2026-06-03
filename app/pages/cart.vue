<script setup lang="ts">
definePageMeta({ layout: false })

const { cartItems, isLoading, totalAmount, fetchCart, updateQuantity, removeFromCart } = useCart()
const { showError } = useToast()

const formattedTotal = computed(() =>
  totalAmount.value.toLocaleString('ko-KR') + '원'
)

async function handleQuantityChange(cartItemId: string, delta: number, currentQty: number) {
  const newQty = currentQty + delta
  const { error } = await updateQuantity(cartItemId, newQty)
  if (error) showError('수량 변경에 실패했습니다')
}

async function handleRemove(cartItemId: string) {
  const { error } = await removeFromCart(cartItemId)
  if (error) showError('삭제에 실패했습니다')
}

onMounted(fetchCart)
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <CommonToast />

    <!-- 헤더 -->
    <div class="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
      <button @click="$router.back()" class="p-1.5 -ml-1.5 text-gray-500 hover:text-gray-800 transition-colors">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <h1 class="text-base font-bold text-gray-900">장바구니</h1>
    </div>

    <div class="max-w-[480px] mx-auto px-4 py-4 pb-36">

      <!-- 로딩 -->
      <div v-if="isLoading" class="flex justify-center py-20">
        <div class="w-7 h-7 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>

      <!-- 빈 장바구니 -->
      <div v-else-if="cartItems.length === 0" class="flex flex-col items-center justify-center py-24 text-center">
        <svg class="w-16 h-16 text-gray-200 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <p class="text-gray-500 font-medium mb-1">장바구니가 비었습니다</p>
        <p class="text-sm text-gray-400 mb-6">QR 코드를 스캔해서 식물을 담아보세요</p>
        <NuxtLink to="/" class="px-5 py-2.5 bg-green-600 text-white text-sm font-medium rounded-xl hover:bg-green-700 transition-colors">
          쇼핑 계속하기
        </NuxtLink>
      </div>

      <!-- 장바구니 목록 -->
      <div v-else class="space-y-3">
        <div
          v-for="item in cartItems"
          :key="item.id"
          class="bg-white rounded-xl border border-gray-100 p-3 flex gap-3"
        >
          <!-- 이미지 -->
          <div class="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 shrink-0 flex items-center justify-center">
            <img
              v-if="item.plants?.image_urls?.[0]"
              :src="item.plants.image_urls[0]"
              :alt="item.plants?.name"
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
              <p class="text-sm font-semibold text-gray-900 leading-snug">{{ item.plants?.name ?? '상품 없음' }}</p>
              <button
                @click="handleRemove(item.id)"
                class="text-gray-300 hover:text-red-400 transition-colors shrink-0 p-0.5"
                aria-label="삭제"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p class="text-sm font-bold text-green-600 mt-1">
              {{ ((item.plants?.price ?? 0) * item.quantity).toLocaleString('ko-KR') }}원
            </p>

            <!-- 수량 조절 -->
            <div class="flex items-center gap-2 mt-2">
              <button
                @click="handleQuantityChange(item.id, -1, item.quantity)"
                class="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors text-lg font-medium"
                :disabled="item.quantity <= 1"
              >
                −
              </button>
              <span class="text-sm font-medium text-gray-800 w-6 text-center">{{ item.quantity }}</span>
              <button
                @click="handleQuantityChange(item.id, +1, item.quantity)"
                class="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors text-lg font-medium"
                :disabled="item.quantity >= (item.plants?.stock ?? 99)"
              >
                +
              </button>
              <span class="text-xs text-gray-400 ml-1">재고 {{ item.plants?.stock ?? 0 }}개</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 하단 고정: 합계 + 결제 버튼 -->
    <div
      v-if="cartItems.length > 0"
      class="bg-white border-t border-gray-100 px-4 py-4"
      style="position: fixed; bottom: 0; left: 0; right: 0; z-index: 50;"
    >
      <div class="max-w-[480px] mx-auto">
        <div class="flex items-center justify-between mb-3">
          <span class="text-sm text-gray-600">총 결제 금액</span>
          <span class="text-lg font-bold text-gray-900">{{ formattedTotal }}</span>
        </div>
        <NuxtLink
          to="/checkout"
          class="block w-full py-3.5 text-base font-bold rounded-2xl bg-green-600 hover:bg-green-700 text-white text-center transition-colors"
        >
          결제하기
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
