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
  <div class="min-h-screen" style="background: var(--bg); position: relative;">
    <!-- 배경 일러스트 -->
    <div class="pointer-events-none select-none" style="position: absolute; bottom: 0; left: 0; right: 0; z-index: 0; opacity: 0.07; color: var(--dark);">
      <IllustrationCart style="display: block; width: 100%;" />
    </div>
    <!-- 콘텐츠 레이어 -->
    <div style="position: relative; z-index: 1;">
    <CommonToast />

    <!-- 헤더 -->
    <div class="sticky top-0 z-10 px-5 py-4 flex items-center justify-between" style="background: var(--bg); border-bottom: 1px solid var(--border);">
      <NuxtLink to="/plants" class="text-sm font-medium" style="color: var(--muted);">← 계속 쇼핑</NuxtLink>
      <h1 class="text-sm font-bold tracking-tight" style="color: var(--dark);">장바구니</h1>
      <div class="w-16" />
    </div>

    <div class="max-w-[480px] mx-auto px-5 pt-6 pb-36">

      <!-- 로딩 -->
      <div v-if="isLoading" class="flex justify-center py-20">
        <div class="w-5 h-5 border border-t-transparent rounded-full animate-spin" style="border-color: var(--muted); border-top-color: transparent;" />
      </div>

      <!-- 빈 장바구니 -->
      <div v-else-if="cartItems.length === 0" class="py-24 text-center">
        <p class="text-2xl font-bold mb-3 tracking-tight" style="color: var(--dark);">장바구니가<br />비었습니다</p>
        <p class="text-sm mb-8" style="color: var(--muted);">QR 코드를 스캔해서 식물을 담아보세요</p>
        <NuxtLink to="/plants" class="text-link">식물 보러가기 →</NuxtLink>
      </div>

      <!-- 장바구니 목록 -->
      <div v-else class="space-y-0">
        <div
          v-for="(item, index) in cartItems"
          :key="item.id"
          class="py-4 flex gap-4"
          :style="index < cartItems.length - 1 ? 'border-bottom: 1px solid var(--border);' : ''"
        >
          <!-- 이미지 -->
          <div class="w-20 h-20 shrink-0 overflow-hidden" style="background: var(--bg-light); border-radius: 4px;">
            <img
              v-if="item.plants?.image_urls?.[0]"
              :src="item.plants.image_urls[0]"
              :alt="item.plants?.name"
              class="w-full h-full object-cover"
            />
            <div v-else class="w-full h-full flex items-center justify-center">
              <svg class="w-7 h-7" style="color: var(--border);" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>

          <!-- 정보 -->
          <div class="flex-1 min-w-0">
            <div class="flex items-start justify-between gap-2 mb-1">
              <p class="text-sm font-semibold leading-snug" style="color: var(--dark);">{{ item.plants?.name ?? '상품 없음' }}</p>
              <button @click="handleRemove(item.id)" class="shrink-0 text-xs font-medium" style="color: var(--muted);">삭제</button>
            </div>
            <p class="text-sm font-bold mb-3" style="color: var(--brand);">
              {{ ((item.plants?.price ?? 0) * item.quantity).toLocaleString('ko-KR') }}원
            </p>
            <!-- 수량 조절 -->
            <div class="flex items-center gap-3">
              <button
                @click="handleQuantityChange(item.id, -1, item.quantity)"
                :disabled="item.quantity <= 1"
                class="text-base font-medium disabled:opacity-30"
                style="color: var(--dark);"
              >−</button>
              <span class="text-sm font-medium w-4 text-center" style="color: var(--dark);">{{ item.quantity }}</span>
              <button
                @click="handleQuantityChange(item.id, +1, item.quantity)"
                :disabled="item.quantity >= (item.plants?.stock ?? 99)"
                class="text-base font-medium disabled:opacity-30"
                style="color: var(--dark);"
              >+</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    </div><!-- /콘텐츠 레이어 -->

    <!-- 하단 고정 합계 + 결제 -->
    <div
      v-if="cartItems.length > 0"
      class="px-5 py-5"
      style="position: fixed; bottom: 0; left: 0; right: 0; z-index: 50; background: var(--bg); border-top: 1px solid var(--border);"
    >
      <div class="max-w-[480px] mx-auto flex items-center justify-between">
        <div>
          <p class="text-xs font-medium tracking-widest uppercase mb-0.5" style="color: var(--muted);">합계</p>
          <p class="text-lg font-bold" style="color: var(--dark);">{{ formattedTotal }}</p>
        </div>
        <NuxtLink to="/checkout" class="text-link text-base">결제하기 →</NuxtLink>
      </div>
    </div>
  </div>
</template>
