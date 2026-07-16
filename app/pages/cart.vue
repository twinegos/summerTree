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
  <div class="cart-root">
    <CommonToast />

    <!-- 헤더 -->
    <header class="nav">
      <NuxtLink to="/plants" class="nav-back">‹ 계속 쇼핑</NuxtLink>
      <h1 class="nav-title">장바구니</h1>
      <span class="nav-spacer"></span>
    </header>

    <div class="wrap">
      <!-- 로딩 -->
      <div v-if="isLoading" class="flex justify-center py-20">
        <div class="w-5 h-5 border border-t-transparent rounded-full animate-spin" style="border-color: var(--muted); border-top-color: transparent;" />
      </div>

      <!-- 빈 장바구니 -->
      <div v-else-if="cartItems.length === 0" class="empty">
        <p class="empty-title">장바구니가<br />비었습니다</p>
        <p class="empty-sub">QR 코드를 스캔해서 식물을 담아보세요</p>
        <NuxtLink to="/plants" class="empty-cta">식물 보러가기</NuxtLink>
      </div>

      <!-- 장바구니 목록 -->
      <div v-else class="cart-list">
        <div v-for="item in cartItems" :key="item.id" class="cart-row">
          <div class="thumb">
            <img
              v-if="item.plants?.image_urls?.[0]"
              :src="item.plants.image_urls[0]"
              :alt="item.plants?.name"
            />
            <div v-else class="ph">
              <svg class="w-6 h-6" style="color: var(--border);" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>

          <div class="info">
            <div class="info-top">
              <p class="name">{{ item.plants?.name ?? '상품 없음' }}</p>
              <button @click="handleRemove(item.id)" class="remove" aria-label="삭제">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </div>
            <p class="price">{{ ((item.plants?.price ?? 0) * item.quantity).toLocaleString('ko-KR') }}원</p>
            <div class="stepper">
              <button class="step" @click="handleQuantityChange(item.id, -1, item.quantity)" :disabled="item.quantity <= 1" aria-label="수량 감소">−</button>
              <span class="qty">{{ item.quantity }}</span>
              <button class="step" @click="handleQuantityChange(item.id, +1, item.quantity)" :disabled="item.quantity >= (item.plants?.stock ?? 99)" aria-label="수량 증가">+</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 하단 고정 합계 + 결제 -->
    <div v-if="cartItems.length > 0" class="actionbar">
      <div class="actionbar-inner">
        <div class="total">
          <span class="total-label">합계</span>
          <span class="total-value">{{ formattedTotal }}</span>
        </div>
        <NuxtLink to="/checkout" class="cta">결제하기</NuxtLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 애플식 장바구니 */
.cart-root {
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
.nav-spacer { width: 84px; }

.wrap { max-width: 480px; margin: 0 auto; padding: 18px 16px calc(120px + env(safe-area-inset-bottom)); }

/* 빈 상태 */
.empty { padding: 80px 0; text-align: center; }
.empty-title { font-size: 26px; font-weight: 700; letter-spacing: -0.02em; line-height: 1.25; margin: 0 0 12px; color: var(--dark); }
.empty-sub { font-size: 14px; color: var(--muted); margin: 0 0 26px; }
.empty-cta { display: inline-block; background: var(--brand); color: #fff; font-size: 15px; font-weight: 600; padding: 12px 22px; border-radius: 14px; transition: transform .16s cubic-bezier(0.34,1.4,0.5,1); }
.empty-cta:active { transform: scale(0.96); }

/* 목록 (그룹 인셋) */
.cart-list { background: var(--bg-light); border-radius: 18px; overflow: hidden; }
.cart-row { display: flex; gap: 14px; padding: 16px; position: relative; }
.cart-row + .cart-row::before { content: ""; position: absolute; top: 0; left: 16px; right: 16px; height: 1px; background: var(--border); }
.thumb { width: 76px; height: 76px; flex: none; border-radius: 12px; overflow: hidden; background: var(--bg); box-shadow: inset 0 0 0 1px var(--border); }
.thumb img { width: 100%; height: 100%; object-fit: cover; }
.thumb .ph { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }

.info { flex: 1; min-width: 0; }
.info-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
.name { font-size: 15px; font-weight: 650; line-height: 1.35; color: var(--dark); margin: 0; }
.remove { flex: none; width: 28px; height: 28px; margin: -4px -4px 0 0; display: flex; align-items: center; justify-content: center; color: var(--muted); border-radius: 8px; transition: color .14s ease, background .14s ease; }
.remove svg { width: 15px; height: 15px; }
.remove:active { background: var(--border); }
.price { font-size: 15px; font-weight: 700; letter-spacing: -0.01em; color: var(--dark); margin: 4px 0 12px; font-variant-numeric: tabular-nums; }

.stepper { display: inline-flex; align-items: center; background: var(--bg); border: 1px solid var(--border); border-radius: 999px; padding: 2px; }
.step { width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-size: 18px; line-height: 1; color: var(--dark); border-radius: 999px; transition: background .14s ease, opacity .14s ease; }
.step:active { background: var(--border); }
.step:disabled { opacity: 0.3; }
.qty { min-width: 28px; text-align: center; font-size: 14px; font-weight: 600; color: var(--dark); font-variant-numeric: tabular-nums; }

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
  flex: 1; height: 52px; display: flex; align-items: center; justify-content: center;
  background: var(--brand); color: #fff; border-radius: 16px;
  font-size: 16.5px; font-weight: 650; letter-spacing: -0.01em;
  transition: transform .16s cubic-bezier(0.34,1.4,0.5,1), filter .16s ease;
}
.cta:active { transform: scale(0.965); }

.nav-back:focus-visible, .remove:focus-visible, .step:focus-visible, .empty-cta:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; border-radius: 10px; }
.cta:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--bg), 0 0 0 4px var(--brand); }

@media (hover: hover) and (pointer: fine) {
  .cta:hover { filter: brightness(1.07); }
  .remove:hover { color: var(--dark); }
}
@media (prefers-reduced-motion: reduce) {
  .cta:active, .empty-cta:active, .step:active { transform: none; }
}
</style>
