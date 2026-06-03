<script setup lang="ts">
definePageMeta({ layout: false })

const config = useRuntimeConfig()
const { cartItems, totalAmount, fetchCart, clearCart } = useCart()
const { sessionId } = useSession()
const { showError } = useToast()
const router = useRouter()

const isSubmitting = ref(false)

const buyerName = ref('')
const buyerPhone = ref('')
const buyerEmail = ref('')
const shippingAddress = ref('')
const payMethod = ref<'CARD' | 'EASY_PAY'>('CARD')
const easyPayProvider = ref<'TOSSPAY' | 'KAKAOPAY'>('TOSSPAY')

const formattedTotal = computed(() =>
  totalAmount.value.toLocaleString('ko-KR') + '원'
)

const isFormValid = computed(() =>
  buyerName.value.trim() &&
  buyerPhone.value.trim() &&
  shippingAddress.value.trim() &&
  cartItems.value.length > 0
)

async function handlePayment() {
  if (!isFormValid.value || isSubmitting.value) return
  isSubmitting.value = true

  try {
    // 포트원 V2 SDK 동적 임포트 (클라이언트 전용)
    const PortOne = await import('@portone/browser-sdk/v2')

    const paymentId = `payment-${crypto.randomUUID()}`
    const orderName = cartItems.value.length === 1
      ? (cartItems.value[0].plants?.name ?? '식물')
      : `${cartItems.value[0].plants?.name ?? '식물'} 외 ${cartItems.value.length - 1}건`

    const response = await PortOne.requestPayment({
      storeId: config.public.portoneStoreId as string,
      channelKey: payMethod.value === 'EASY_PAY' && easyPayProvider.value === 'KAKAOPAY'
        ? config.public.portoneKakaoChannelKey as string
        : config.public.portoneTossChannelKey as string,
      paymentId,
      orderName,
      totalAmount: totalAmount.value,
      currency: 'KRW' as const,
      payMethod: payMethod.value,
      ...(payMethod.value === 'EASY_PAY' && {
        easyPay: { easyPayProvider: easyPayProvider.value },
      }),
      customer: {
        fullName: buyerName.value,
        phoneNumber: buyerPhone.value,
        ...(buyerEmail.value && { email: buyerEmail.value }),
      },
    })

    if (response?.code) {
      showError(response.message ?? '결제에 실패했습니다')
      isSubmitting.value = false
      return
    }

    // 결제 완료 → 서버에서 검증 후 주문 생성
    const { data } = await $fetch<{ orderId: string }>('/api/payment/complete', {
      method: 'POST',
      body: {
        paymentId,
        sessionId: sessionId.value,
        buyerName: buyerName.value,
        buyerPhone: buyerPhone.value,
        buyerEmail: buyerEmail.value || null,
        shippingAddress: shippingAddress.value,
      },
    })

    await clearCart()
    router.push(`/order/${data?.orderId}`)
  } catch (e) {
    showError('결제 중 오류가 발생했습니다')
    isSubmitting.value = false
  }
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
      <h1 class="text-base font-bold text-gray-900">주문/결제</h1>
    </div>

    <div class="max-w-[480px] mx-auto px-4 py-4 pb-40 space-y-4">

      <!-- 주문 상품 요약 -->
      <div class="bg-white rounded-xl border border-gray-100 p-4">
        <h2 class="text-sm font-bold text-gray-800 mb-3">주문 상품</h2>
        <div v-if="cartItems.length === 0" class="text-sm text-gray-400 text-center py-4">
          장바구니가 비었습니다
        </div>
        <div v-else class="space-y-2">
          <div v-for="item in cartItems" :key="item.id" class="flex items-center justify-between">
            <div class="flex items-center gap-2 min-w-0">
              <div class="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                <img
                  v-if="item.plants?.image_urls?.[0]"
                  :src="item.plants.image_urls[0]"
                  class="w-full h-full object-cover"
                />
              </div>
              <span class="text-sm text-gray-700 truncate">
                {{ item.plants?.name }} × {{ item.quantity }}
              </span>
            </div>
            <span class="text-sm font-medium text-gray-800 shrink-0 ml-2">
              {{ ((item.plants?.price ?? 0) * item.quantity).toLocaleString('ko-KR') }}원
            </span>
          </div>
        </div>
      </div>

      <!-- 배송 정보 -->
      <div class="bg-white rounded-xl border border-gray-100 p-4">
        <h2 class="text-sm font-bold text-gray-800 mb-3">배송 정보</h2>
        <div class="space-y-3">
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">이름 *</label>
            <input
              v-model="buyerName"
              type="text"
              placeholder="홍길동"
              class="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">전화번호 *</label>
            <input
              v-model="buyerPhone"
              type="tel"
              placeholder="010-0000-0000"
              class="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">이메일 (선택)</label>
            <input
              v-model="buyerEmail"
              type="email"
              placeholder="example@email.com"
              class="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">배송 주소 *</label>
            <textarea
              v-model="shippingAddress"
              placeholder="서울시 강남구 테헤란로 123 101호"
              rows="2"
              class="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
            />
          </div>
        </div>
      </div>

      <!-- 결제 방법 -->
      <div class="bg-white rounded-xl border border-gray-100 p-4">
        <h2 class="text-sm font-bold text-gray-800 mb-3">결제 방법</h2>
        <div class="space-y-2">
          <label class="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors"
            :class="payMethod === 'CARD' ? 'border-green-500 bg-green-50' : 'border-gray-200'"
          >
            <input v-model="payMethod" type="radio" value="CARD" class="accent-green-600" />
            <span class="text-sm font-medium text-gray-700">신용/체크카드</span>
          </label>

          <label class="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors"
            :class="payMethod === 'EASY_PAY' && easyPayProvider === 'TOSSPAY' ? 'border-green-500 bg-green-50' : 'border-gray-200'"
            @click="payMethod = 'EASY_PAY'; easyPayProvider = 'TOSSPAY'"
          >
            <input v-model="easyPayProvider" type="radio" value="TOSSPAY"
              @change="payMethod = 'EASY_PAY'" class="accent-green-600" />
            <span class="text-sm font-medium text-gray-700">토스페이</span>
          </label>

          <label class="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors"
            :class="payMethod === 'EASY_PAY' && easyPayProvider === 'KAKAOPAY' ? 'border-green-500 bg-green-50' : 'border-gray-200'"
            @click="payMethod = 'EASY_PAY'; easyPayProvider = 'KAKAOPAY'"
          >
            <input v-model="easyPayProvider" type="radio" value="KAKAOPAY"
              @change="payMethod = 'EASY_PAY'" class="accent-green-600" />
            <span class="text-sm font-medium text-gray-700">카카오페이</span>
          </label>
        </div>
      </div>

    </div>

    <!-- 하단 고정: 합계 + 결제 버튼 -->
    <div
      class="bg-white border-t border-gray-100 px-4 py-4"
      style="position: fixed; bottom: 0; left: 0; right: 0; z-index: 50;"
    >
      <div class="max-w-[480px] mx-auto">
        <div class="flex items-center justify-between mb-3">
          <span class="text-sm text-gray-600">총 결제 금액</span>
          <span class="text-lg font-bold text-gray-900">{{ formattedTotal }}</span>
        </div>
        <button
          @click="handlePayment"
          :disabled="!isFormValid || isSubmitting"
          class="w-full py-3.5 text-base font-bold rounded-2xl transition-colors"
          :class="isFormValid && !isSubmitting
            ? 'bg-green-600 hover:bg-green-700 text-white'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed'"
        >
          {{ isSubmitting ? '결제 처리 중...' : `${formattedTotal} 결제하기` }}
        </button>
      </div>
    </div>
  </div>
</template>
