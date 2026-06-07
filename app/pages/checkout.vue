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
  <div class="min-h-screen" style="background: var(--bg);">
    <CommonToast />

    <!-- 헤더 -->
    <div class="sticky top-0 z-10 px-5 py-4 flex items-center justify-between" style="background: var(--bg); border-bottom: 1px solid var(--border);">
      <button @click="$router.back()" class="text-sm font-medium" style="color: var(--muted);">← 장바구니</button>
      <h1 class="text-sm font-bold tracking-tight" style="color: var(--dark);">주문/결제</h1>
      <div class="w-16" />
    </div>

    <div class="max-w-[480px] mx-auto px-5 pt-6 pb-36 space-y-8">

      <!-- 주문 상품 요약 -->
      <div>
        <h2 class="text-xs font-medium tracking-widest uppercase mb-4" style="color: var(--muted);">주문 상품</h2>
        <div v-if="cartItems.length === 0" class="text-sm text-center py-8" style="color: var(--muted);">
          장바구니가 비었습니다
        </div>
        <div v-else class="space-y-3">
          <div v-for="item in cartItems" :key="item.id" class="flex items-center justify-between py-2" style="border-bottom: 1px solid var(--border);">
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-10 h-10 shrink-0 overflow-hidden" style="background: var(--bg-light); border-radius: 4px;">
                <img v-if="item.plants?.image_urls?.[0]" :src="item.plants.image_urls[0]" class="w-full h-full object-cover" />
              </div>
              <span class="text-sm truncate" style="color: var(--dark);">{{ item.plants?.name }} × {{ item.quantity }}</span>
            </div>
            <span class="text-sm font-semibold shrink-0 ml-3" style="color: var(--brand);">
              {{ ((item.plants?.price ?? 0) * item.quantity).toLocaleString('ko-KR') }}원
            </span>
          </div>
        </div>
      </div>

      <!-- 배송 정보 -->
      <div>
        <h2 class="text-xs font-medium tracking-widest uppercase mb-4" style="color: var(--muted);">배송 정보</h2>
        <div class="space-y-4">
          <div>
            <label class="block text-xs mb-1.5" style="color: var(--muted);">이름 *</label>
            <input
              v-model="buyerName"
              type="text"
              placeholder="홍길동"
              class="w-full px-4 py-2.5 text-sm focus:outline-none"
              style="background: var(--bg-light); border: 1px solid var(--border); border-radius: 4px; color: var(--dark);"
            />
          </div>
          <div>
            <label class="block text-xs mb-1.5" style="color: var(--muted);">전화번호 *</label>
            <input
              v-model="buyerPhone"
              type="tel"
              placeholder="010-0000-0000"
              class="w-full px-4 py-2.5 text-sm focus:outline-none"
              style="background: var(--bg-light); border: 1px solid var(--border); border-radius: 4px; color: var(--dark);"
            />
          </div>
          <div>
            <label class="block text-xs mb-1.5" style="color: var(--muted);">이메일 (선택)</label>
            <input
              v-model="buyerEmail"
              type="email"
              placeholder="example@email.com"
              class="w-full px-4 py-2.5 text-sm focus:outline-none"
              style="background: var(--bg-light); border: 1px solid var(--border); border-radius: 4px; color: var(--dark);"
            />
          </div>
          <div>
            <label class="block text-xs mb-1.5" style="color: var(--muted);">배송 주소 *</label>
            <textarea
              v-model="shippingAddress"
              placeholder="서울시 강남구 테헤란로 123 101호"
              rows="2"
              class="w-full px-4 py-2.5 text-sm focus:outline-none resize-none"
              style="background: var(--bg-light); border: 1px solid var(--border); border-radius: 4px; color: var(--dark);"
            />
          </div>
        </div>
      </div>

      <!-- 결제 방법 -->
      <div>
        <h2 class="text-xs font-medium tracking-widest uppercase mb-4" style="color: var(--muted);">결제 방법</h2>
        <div class="space-y-2">
          <label
            class="flex items-center gap-3 px-4 py-3 cursor-pointer"
            :style="payMethod === 'CARD' ? 'border: 1.5px solid var(--brand); border-radius: 4px;' : 'border: 1px solid var(--border); border-radius: 4px;'"
          >
            <input v-model="payMethod" type="radio" value="CARD" class="accent-green-700" />
            <span class="text-sm font-medium" style="color: var(--dark);">신용/체크카드</span>
          </label>
          <label
            class="flex items-center gap-3 px-4 py-3 cursor-pointer"
            :style="payMethod === 'EASY_PAY' && easyPayProvider === 'TOSSPAY' ? 'border: 1.5px solid var(--brand); border-radius: 4px;' : 'border: 1px solid var(--border); border-radius: 4px;'"
            @click="payMethod = 'EASY_PAY'; easyPayProvider = 'TOSSPAY'"
          >
            <input v-model="easyPayProvider" type="radio" value="TOSSPAY" @change="payMethod = 'EASY_PAY'" class="accent-green-700" />
            <span class="text-sm font-medium" style="color: var(--dark);">토스페이</span>
          </label>
          <label
            class="flex items-center gap-3 px-4 py-3 cursor-pointer"
            :style="payMethod === 'EASY_PAY' && easyPayProvider === 'KAKAOPAY' ? 'border: 1.5px solid var(--brand); border-radius: 4px;' : 'border: 1px solid var(--border); border-radius: 4px;'"
            @click="payMethod = 'EASY_PAY'; easyPayProvider = 'KAKAOPAY'"
          >
            <input v-model="easyPayProvider" type="radio" value="KAKAOPAY" @change="payMethod = 'EASY_PAY'" class="accent-green-700" />
            <span class="text-sm font-medium" style="color: var(--dark);">카카오페이</span>
          </label>
        </div>
      </div>

    </div>

    <!-- 하단 고정: 합계 + 결제 -->
    <div class="px-5 py-5" style="position: fixed; bottom: 0; left: 0; right: 0; z-index: 50; background: var(--bg); border-top: 1px solid var(--border);">
      <div class="max-w-[480px] mx-auto flex items-center justify-between">
        <div>
          <p class="text-xs font-medium tracking-widest uppercase mb-0.5" style="color: var(--muted);">합계</p>
          <p class="text-lg font-bold" style="color: var(--dark);">{{ formattedTotal }}</p>
        </div>
        <button
          @click="handlePayment"
          :disabled="!isFormValid || isSubmitting"
          class="text-link text-base disabled:opacity-40"
          :style="!isFormValid || isSubmitting ? 'color: var(--muted);' : ''"
        >
          {{ isSubmitting ? '처리 중...' : '결제하기 →' }}
        </button>
      </div>
    </div>
  </div>
</template>
