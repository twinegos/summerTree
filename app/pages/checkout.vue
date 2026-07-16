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
  <div class="co-root">
    <CommonToast />

    <!-- 헤더 -->
    <header class="nav">
      <button @click="$router.back()" class="nav-back">‹ 장바구니</button>
      <h1 class="nav-title">주문 · 결제</h1>
      <span class="nav-spacer"></span>
    </header>

    <div class="wrap">
      <!-- 주문 상품 요약 -->
      <section class="sec">
        <div class="sec-label">주문 상품</div>
        <div v-if="cartItems.length === 0" class="empty-note">장바구니가 비었습니다</div>
        <div v-else class="group">
          <div v-for="item in cartItems" :key="item.id" class="sum-row">
            <div class="sum-thumb">
              <img v-if="item.plants?.image_urls?.[0]" :src="item.plants.image_urls[0]" :alt="item.plants?.name" />
            </div>
            <span class="sum-name">{{ item.plants?.name }} <span class="sum-qty">× {{ item.quantity }}</span></span>
            <span class="sum-price">{{ ((item.plants?.price ?? 0) * item.quantity).toLocaleString('ko-KR') }}원</span>
          </div>
        </div>
      </section>

      <!-- 배송 정보 -->
      <section class="sec">
        <div class="sec-label">배송 정보</div>
        <div class="fields">
          <div class="field">
            <label>이름 <i>*</i></label>
            <input v-model="buyerName" type="text" placeholder="홍길동" />
          </div>
          <div class="field">
            <label>전화번호 <i>*</i></label>
            <input v-model="buyerPhone" type="tel" placeholder="010-0000-0000" />
          </div>
          <div class="field">
            <label>이메일 <span class="opt">(선택)</span></label>
            <input v-model="buyerEmail" type="email" placeholder="example@email.com" />
          </div>
          <div class="field">
            <label>배송 주소 <i>*</i></label>
            <textarea v-model="shippingAddress" placeholder="서울시 강남구 테헤란로 123 101호" rows="2" />
          </div>
        </div>
      </section>

      <!-- 결제 방법 -->
      <section class="sec">
        <div class="sec-label">결제 방법</div>
        <div class="group pay-group">
          <label class="pay-row" :class="{ on: payMethod === 'CARD' }">
            <input v-model="payMethod" type="radio" value="CARD" class="sr-only" />
            <span class="pay-name">신용 / 체크카드</span>
            <svg class="pay-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
          </label>
          <label class="pay-row" :class="{ on: payMethod === 'EASY_PAY' && easyPayProvider === 'TOSSPAY' }" @click="payMethod = 'EASY_PAY'; easyPayProvider = 'TOSSPAY'">
            <input v-model="easyPayProvider" type="radio" value="TOSSPAY" class="sr-only" @change="payMethod = 'EASY_PAY'" />
            <span class="pay-name">토스페이</span>
            <svg class="pay-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
          </label>
          <label class="pay-row" :class="{ on: payMethod === 'EASY_PAY' && easyPayProvider === 'KAKAOPAY' }" @click="payMethod = 'EASY_PAY'; easyPayProvider = 'KAKAOPAY'">
            <input v-model="easyPayProvider" type="radio" value="KAKAOPAY" class="sr-only" @change="payMethod = 'EASY_PAY'" />
            <span class="pay-name">카카오페이</span>
            <svg class="pay-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
          </label>
        </div>
      </section>
    </div>

    <!-- 하단 고정: 합계 + 결제 -->
    <div class="actionbar">
      <div class="actionbar-inner">
        <div class="total">
          <span class="total-label">합계</span>
          <span class="total-value">{{ formattedTotal }}</span>
        </div>
        <button class="cta" @click="handlePayment" :disabled="!isFormValid || isSubmitting">
          {{ isSubmitting ? '처리 중...' : '결제하기' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 애플식 주문·결제 */
.co-root {
  min-height: 100dvh; background: var(--bg); color: var(--dark);
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Apple SD Gothic Neo", "Pretendard", system-ui, sans-serif;
}
.nav {
  position: sticky; top: 0; z-index: 10;
  display: flex; align-items: center; padding: 12px 14px;
  background: rgba(240,241,232,0.72);
  -webkit-backdrop-filter: saturate(180%) blur(20px); backdrop-filter: saturate(180%) blur(20px);
  border-bottom: 1px solid var(--border);
}
.nav-back { font-size: 15px; color: var(--muted); padding: 6px 8px; border-radius: 8px; }
.nav-back:active { opacity: 0.6; }
.nav-title { flex: 1; text-align: center; font-size: 16px; font-weight: 700; letter-spacing: -0.01em; color: var(--dark); }
.nav-spacer { width: 74px; }

.wrap { max-width: 480px; margin: 0 auto; padding: 22px 16px calc(120px + env(safe-area-inset-bottom)); display: flex; flex-direction: column; gap: 26px; }
.sec-label { font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); padding: 0 6px 10px; }
.empty-note { text-align: center; font-size: 14px; color: var(--muted); padding: 24px 0; }

.group { background: var(--bg-light); border-radius: 16px; overflow: hidden; }

/* 주문 상품 */
.sum-row { display: flex; align-items: center; gap: 12px; padding: 12px 14px; position: relative; }
.sum-row + .sum-row::before { content: ""; position: absolute; top: 0; left: 52px; right: 14px; height: 1px; background: var(--border); }
.sum-thumb { width: 40px; height: 40px; flex: none; border-radius: 9px; overflow: hidden; background: var(--bg); box-shadow: inset 0 0 0 1px var(--border); }
.sum-thumb img { width: 100%; height: 100%; object-fit: cover; }
.sum-name { flex: 1; min-width: 0; font-size: 14px; color: var(--dark); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sum-qty { color: var(--muted); }
.sum-price { flex: none; font-size: 14px; font-weight: 700; color: var(--dark); font-variant-numeric: tabular-nums; }

/* 폼 */
.fields { display: flex; flex-direction: column; gap: 14px; }
.field label { display: block; font-size: 13px; font-weight: 600; color: var(--muted); margin: 0 0 7px 4px; }
.field label i { color: var(--brand); font-style: normal; }
.field label .opt { font-weight: 400; }
.field input, .field textarea {
  width: 100%; padding: 12px 14px; font-size: 15px; color: var(--dark);
  background: var(--bg-light); border: 1px solid var(--border); border-radius: 12px;
  font-family: inherit; resize: none;
  transition: border-color .15s ease, box-shadow .15s ease;
}
.field input::placeholder, .field textarea::placeholder { color: var(--muted); }
.field input:focus, .field textarea:focus { outline: none; border-color: var(--brand); box-shadow: 0 0 0 3px rgba(43,72,32,0.10); }

/* 결제 방법 */
.pay-row { display: flex; align-items: center; gap: 10px; padding: 15px 16px; position: relative; cursor: pointer; }
.pay-row + .pay-row::before { content: ""; position: absolute; top: 0; left: 16px; right: 16px; height: 1px; background: var(--border); }
.pay-name { flex: 1; font-size: 15px; font-weight: 550; color: var(--dark); }
.pay-check { width: 20px; height: 20px; color: var(--brand); opacity: 0; transform: scale(0.7); transition: opacity .16s ease, transform .16s cubic-bezier(0.34,1.4,0.5,1); }
.pay-row.on { background: rgba(43,72,32,0.06); }
.pay-row.on .pay-check { opacity: 1; transform: scale(1); }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }

/* 하단 액션바 */
.actionbar {
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 50;
  background: rgba(240,241,232,0.72);
  -webkit-backdrop-filter: saturate(180%) blur(22px); backdrop-filter: saturate(180%) blur(22px);
  border-top: 1px solid var(--border);
}
.actionbar-inner { max-width: 480px; margin: 0 auto; display: flex; align-items: center; gap: 14px; padding: 14px 18px calc(14px + env(safe-area-inset-bottom)); }
.total { display: flex; flex-direction: column; line-height: 1; }
.total-label { font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); margin-bottom: 6px; }
.total-value { font-size: 21px; font-weight: 700; letter-spacing: -0.02em; color: var(--dark); font-variant-numeric: tabular-nums; }
.cta {
  flex: 1; height: 52px; border-radius: 16px;
  background: var(--brand); color: #fff;
  font-size: 16.5px; font-weight: 650; letter-spacing: -0.01em;
  transition: transform .16s cubic-bezier(0.34,1.4,0.5,1), filter .16s ease, opacity .16s ease;
}
.cta:active { transform: scale(0.965); }
.cta:disabled { opacity: 0.5; background: var(--muted); }

.nav-back:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; border-radius: 8px; }
.pay-row:focus-within { outline: 2px solid var(--brand); outline-offset: -2px; border-radius: 12px; }
.cta:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--bg), 0 0 0 4px var(--brand); }

@media (hover: hover) and (pointer: fine) {
  .cta:not(:disabled):hover { filter: brightness(1.07); }
  .pay-row:not(.on):hover { background: rgba(43,72,32,0.03); }
}
@media (prefers-reduced-motion: reduce) {
  .cta:active { transform: none; }
  .pay-check { transition: opacity .16s ease; transform: none; }
}
</style>
