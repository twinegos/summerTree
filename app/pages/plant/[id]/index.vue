<script setup lang="ts">
import type { PlantWithCategory } from '~/composables/usePlants'

definePageMeta({ layout: false })

const route = useRoute()
const { fetchPlantById } = usePlants()
const { addToCart } = useCart()
const { showSuccess, showError } = useToast()

const plant = ref<PlantWithCategory | null>(null)
const isLoading = ref(true)
const notFound = ref(false)
const activeImageIndex = ref(0)
const galleryRef = ref<HTMLElement | null>(null)
const isAddingToCart = ref(false)

const formattedPrice = computed(() =>
  plant.value ? plant.value.price.toLocaleString('ko-KR') + '원' : ''
)
const isOutOfStock = computed(() => (plant.value?.stock ?? 0) === 0)
const categoryName = computed(() => plant.value?.categories?.name ?? '')

const heroImageStyle = computed(() => {
  if (!plant.value) return {}
  const parts = (plant.value.image_position ?? '0% 0%').split(' ')
  const x = parseFloat(parts[0]) || 0
  const y = parseFloat(parts[1]) || 0
  const s = plant.value.image_scale ?? 1
  return {
    position: 'absolute' as const,
    width: '100%',
    height: '100%',
    objectFit: 'contain' as const,
    objectPosition: '50% 50%',
    transformOrigin: '50% 50%',
    transform: `translate(${x}%, ${y}%) scale(${s})`,
  }
})

const fontFamilyMap: Record<string, string> = {
  serif: '"Noto Serif", Georgia, "Batang", serif',
  mono: '"Courier New", Courier, monospace',
  sans: 'inherit',
}

const pageStyle = computed(() => {
  if (!plant.value) return {}
  const s: Record<string, string> = {}
  if (plant.value.page_bg_image) {
    s.backgroundImage = `url(${plant.value.page_bg_image})`
    s.backgroundSize = 'cover'
    s.backgroundAttachment = 'local'
    s.backgroundPosition = 'center'
  }
  if (plant.value.page_bg_color) {
    s.backgroundColor = plant.value.page_bg_color
  }
  const font = plant.value.page_font || 'sans'
  if (font !== 'sans') s.fontFamily = fontFamilyMap[font] ?? 'inherit'
  return s
})

const careLevelConfig = computed(() => {
  const level = plant.value?.care_level ?? 'normal'
  if (level === 'easy') return { label: '쉬움', color: '#2B4820', bg: '#D6E8CD', dots: 1 }
  if (level === 'hard') return { label: '까다로움', color: '#7A3B1E', bg: '#F5D9C8', dots: 3 }
  return { label: '보통', color: '#6B5B1A', bg: '#F5EDCC', dots: 2 }
})

// 항목별 정보 (값이 있는 항목만, CARE_ITEMS 순서대로)
const careInfoList = computed(() => {
  const info = plant.value?.care_info ?? {}
  return CARE_ITEMS
    .filter((item) => info[item.key]?.trim())
    .map((item) => ({ ...item, content: info[item.key] }))
})

// SF Symbols 스타일의 깔끔한 라인 아이콘 (이모지 대체, 단색 stroke)
const SVG = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"'
const careIcons: Record<string, string> = {
  sunlight: `<svg ${SVG}><circle cx="12" cy="12" r="3.6"/><path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"/></svg>`,
  water: `<svg ${SVG}><path d="M12 3.3c2.7 3 4.7 5.6 4.7 8.5a4.7 4.7 0 1 1-9.4 0C7.3 8.9 9.3 6.3 12 3.3z"/></svg>`,
  temperature: `<svg ${SVG}><path d="M14 14.9V5.4a2 2 0 1 0-4 0v9.5a4 4 0 1 0 4 0z"/><circle cx="12" cy="17" r="1.6" fill="currentColor" stroke="none"/></svg>`,
  humidity: `<svg ${SVG}><path d="M3.5 8.8c1.9 1.7 3.8 1.7 5.7 0s3.8-1.7 5.7 0 3.8 1.7 5.6 0M3.5 14.8c1.9 1.7 3.8 1.7 5.7 0s3.8-1.7 5.7 0 3.8 1.7 5.6 0"/></svg>`,
  soil: `<svg ${SVG}><path d="M12 21v-8.5"/><path d="M12 13c0-3.4-2.3-5.6-5.7-5.6C6.3 10.8 8.6 13 12 13z"/><path d="M12 11c0-3.1 2.1-5.2 5.3-5.2C17.3 8.9 15.2 11 12 11z"/></svg>`,
  caution: `<svg ${SVG}><path d="M12 3.9 21.4 20H2.6L12 3.9z"/><path d="M12 10v4.3"/><circle cx="12" cy="17.4" r="0.9" fill="currentColor" stroke="none"/></svg>`,
}

async function load() {
  isLoading.value = true
  const { data, error } = await fetchPlantById(route.params.id as string)
  isLoading.value = false
  if (error || !data) { notFound.value = true; return }
  plant.value = data
}

function onGalleryScroll() {
  if (!galleryRef.value || !plant.value) return
  const el = galleryRef.value
  const index = Math.round(el.scrollLeft / el.clientWidth)
  activeImageIndex.value = Math.min(index, plant.value.image_urls.length - 1)
}

async function handleAddToCart() {
  if (!plant.value || isAddingToCart.value) return
  isAddingToCart.value = true
  const { error } = await addToCart(plant.value.id)
  isAddingToCart.value = false
  if (error) showError('장바구니 담기에 실패했습니다')
  else showSuccess('장바구니에 담겼습니다')
}

// 스크롤 시 나타나는 반투명 미니 헤더
const showMini = ref(false)
function onScroll() {
  showMini.value = window.scrollY > window.innerHeight * 0.42
}

// 돌봄 가이드 항목 스크롤 리빌
let io: IntersectionObserver | null = null
function setupReveal() {
  const rows = document.querySelectorAll<HTMLElement>('.care-row')
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduce || !('IntersectionObserver' in window)) {
    rows.forEach((r) => r.classList.add('in'))
    return
  }
  io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('in'); io!.unobserve(e.target) }
    })
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' })
  rows.forEach((r) => io!.observe(r))
}

onMounted(async () => {
  window.addEventListener('scroll', onScroll, { passive: true })
  await load()
  await nextTick()
  setupReveal()
})
onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
  io?.disconnect()
})
</script>

<template>
  <div class="min-h-screen" :style="{ background: 'var(--bg)', ...pageStyle }">
    <CommonToast />

    <!-- 로딩 -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-screen">
      <div class="w-5 h-5 border border-t-transparent rounded-full animate-spin" style="border-color: var(--muted); border-top-color: transparent;" />
    </div>

    <!-- 404 -->
    <div v-else-if="notFound" class="flex flex-col items-center justify-center min-h-screen px-6 text-center">
      <p class="text-lg font-bold mb-2" style="color: var(--dark);">상품을 찾을 수 없습니다</p>
      <p class="text-sm mb-8" style="color: var(--muted);">삭제되었거나 존재하지 않는 상품입니다</p>
      <NuxtLink to="/plants" class="text-link">식물 목록으로 →</NuxtLink>
    </div>

    <!-- 상품 상세 -->
    <div v-else-if="plant" class="detail max-w-[480px] mx-auto">

      <!-- 스크롤 시 나타나는 반투명 미니 헤더 -->
      <div class="minibar" :class="{ show: showMini }">
        <NuxtLink to="/plants" class="mini-back" aria-label="식물 목록">‹</NuxtLink>
        <span class="mini-title">{{ plant.name }}</span>
        <NuxtLink to="/cart" class="mini-cart">장바구니</NuxtLink>
      </div>

      <!-- 히어로: 풀블리드 이미지 + 그라디언트 스크림 -->
      <section class="hero">
        <div
          v-if="plant.image_urls.length > 0"
          ref="galleryRef"
          class="gallery"
          @scroll="onGalleryScroll"
        >
          <div v-for="(url, i) in plant.image_urls" :key="i" class="slide">
            <div class="slide-media">
              <img :src="url" :alt="`${plant.name} ${i + 1}`" :style="heroImageStyle" />
            </div>
          </div>
        </div>
        <div v-else class="hero-empty">
          <svg class="w-12 h-12" style="color: var(--border);" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>

        <div class="hero-scrim"></div>

        <!-- 상단 고스트 버튼 -->
        <NuxtLink to="/plants" class="ghost-btn ghost-back">‹ 식물 목록</NuxtLink>
        <NuxtLink to="/cart" class="ghost-btn ghost-cart">장바구니</NuxtLink>

        <!-- 하단 메타 -->
        <div class="hero-meta">
          <div v-if="plant.image_urls.length > 1" class="dots">
            <span
              v-for="(_, i) in plant.image_urls"
              :key="i"
              class="dot"
              :class="{ on: i === activeImageIndex }"
            />
          </div>

          <div class="chips r r0">
            <span v-if="categoryName" class="chip">{{ categoryName }}</span>
            <span class="chip">
              <span class="lvl">
                <b v-for="n in 3" :key="n" :class="{ off: n > careLevelConfig.dots }" />
              </span>
              {{ careLevelConfig.label }}
            </span>
            <span v-if="isOutOfStock" class="chip chip-sold">품절</span>
          </div>

          <h1 class="hero-title r r1">{{ plant.name }}</h1>
          <p v-if="plant.short_description" class="hero-sub r r2">{{ plant.short_description }}</p>
        </div>
      </section>

      <!-- 콘텐츠 시트 (히어로 위로 겹침) -->
      <section class="sheet">
        <p v-if="plant.description" class="intro r r3">{{ plant.description }}</p>

        <template v-if="careInfoList.length > 0">
          <div class="group-label r r4">돌봄 가이드</div>
          <div class="care-list">
            <div v-for="item in careInfoList" :key="item.key" class="care-row">
              <span class="care-ic" v-html="careIcons[item.key]"></span>
              <div class="care-body">
                <p class="care-label">{{ item.label }}</p>
                <p class="care-value">{{ item.content }}</p>
              </div>
            </div>
          </div>
        </template>

        <div class="sheet-pad"></div>
      </section>
    </div>

    <!-- 하단 고정 액션바 -->
    <div v-if="plant && !notFound && !isLoading" class="actionbar">
      <div class="actionbar-inner max-w-[480px] mx-auto">
        <div class="price">
          <span class="price-label">가격</span>
          <span class="price-value">{{ formattedPrice }}</span>
        </div>
        <button
          @click="handleAddToCart"
          :disabled="isOutOfStock || isAddingToCart"
          class="cta"
        >
          {{ isOutOfStock ? '품절' : isAddingToCart ? '담는 중...' : '장바구니 담기' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/*
  애플식 상세 페이지 (emil-design-eng + apple-design 적용)
  - 풀블리드 히어로 + 그라디언트 스크림 + 겹치는 라운드 시트(깊이)
  - iOS 그룹 인셋 리스트, 반투명 블러 미니헤더/액션바
  - 강한 커스텀 이징, 누름 즉시 반응, 로드/스크롤 리빌, reduced-motion 존중
  - 브랜드 팔레트(var(--brand) 등) 유지, 라이트 단일 테마(앱 전체 일관)
*/

.detail { position: relative; padding-bottom: 0; }

/* ── 스크롤 시 나타나는 미니 헤더 ── */
.minibar {
  position: fixed; top: 0; left: 0; right: 0; z-index: 40;
  max-width: 480px; margin: 0 auto;
  height: 52px; display: flex; align-items: center; gap: 8px;
  padding: 0 12px 0 8px;
  background: rgba(240, 241, 232, 0.72);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  backdrop-filter: saturate(180%) blur(20px);
  border-bottom: 1px solid var(--border);
  opacity: 0; transform: translateY(-6px); pointer-events: none;
  transition: opacity .28s ease, transform .28s cubic-bezier(0.23, 1, 0.32, 1);
}
.minibar.show { opacity: 1; transform: none; pointer-events: auto; }
.mini-back { font-size: 22px; line-height: 1; color: var(--dark); padding: 4px 10px; }
.mini-title { flex: 1; font-size: 15px; font-weight: 600; letter-spacing: -0.01em; color: var(--dark); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mini-cart { font-size: 14px; font-weight: 500; color: var(--muted); padding: 4px 6px; }

/* ── 히어로 ── */
.hero {
  position: relative; width: 100%;
  aspect-ratio: 4 / 5; max-height: 640px;
  overflow: hidden; background: var(--bg-light);
}
.gallery {
  display: flex; height: 100%;
  overflow-x: auto; scroll-snap-type: x mandatory; scroll-behavior: smooth;
  scrollbar-width: none;
}
.gallery::-webkit-scrollbar { display: none; }
.slide { position: relative; flex: 0 0 100%; width: 100%; height: 100%; scroll-snap-align: center; overflow: hidden; }
.slide-media { position: absolute; inset: 0; animation: heroIn 1s cubic-bezier(0.16, 1, 0.3, 1) both; }
@keyframes heroIn { from { transform: scale(1.05); } to { transform: scale(1); } }
.hero-empty { height: 100%; display: flex; align-items: center; justify-content: center; }

.hero-scrim {
  position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(to top,
    rgba(16, 20, 10, 0.66) 0%, rgba(16, 20, 10, 0.32) 24%, rgba(16, 20, 10, 0) 50%);
}

.ghost-btn {
  position: absolute; top: 14px; z-index: 5;
  display: inline-flex; align-items: center; height: 34px; padding: 0 14px;
  border-radius: 999px; color: #fff; font-size: 14px; font-weight: 500;
  background: rgba(255, 255, 255, 0.16);
  -webkit-backdrop-filter: blur(14px); backdrop-filter: blur(14px);
  transition: transform .14s cubic-bezier(0.23, 1, 0.32, 1), background .14s ease;
}
.ghost-back { left: 12px; padding-left: 10px; }
.ghost-cart { right: 12px; }
.ghost-btn:active { transform: scale(0.94); }

.hero-meta { position: absolute; left: 0; right: 0; bottom: 0; z-index: 4; padding: 0 22px 22px; color: #fff; }
.dots { display: flex; justify-content: center; gap: 6px; margin-bottom: 14px; }
.dot { width: 6px; height: 6px; border-radius: 50%; background: rgba(255,255,255,0.45); transition: background .2s ease; }
.dot.on { background: #fff; }

.chips { display: flex; flex-wrap: wrap; gap: 7px; margin-bottom: 12px; }
.chip {
  display: inline-flex; align-items: center; gap: 6px;
  height: 26px; padding: 0 11px; border-radius: 999px;
  background: rgba(255, 255, 255, 0.18);
  -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px);
  font-size: 12px; font-weight: 600; letter-spacing: 0.02em; color: #fff;
}
.chip-sold { background: rgba(0,0,0,0.4); }
.lvl { display: inline-flex; gap: 3px; align-items: center; }
.lvl b { width: 5px; height: 5px; border-radius: 50%; background: #fff; }
.lvl b.off { background: rgba(255, 255, 255, 0.4); }

.hero-title {
  margin: 0; font-size: 31px; line-height: 1.08; font-weight: 700;
  letter-spacing: -0.025em; text-wrap: balance;
  text-shadow: 0 1px 18px rgba(0, 0, 0, 0.28);
}
.hero-sub { margin: 8px 0 0; font-size: 15px; line-height: 1.45; color: rgba(255, 255, 255, 0.88); max-width: 30ch; }

/* ── 콘텐츠 시트 (히어로 위로 겹침) ── */
.sheet {
  position: relative; z-index: 6; margin-top: -18px;
  background: var(--bg); border-radius: 22px 22px 0 0;
  box-shadow: 0 -1px 40px rgba(20, 30, 12, 0.10);
  padding: 26px 22px 0;
}
.intro { margin: 6px 0 26px; font-size: 16px; line-height: 1.62; color: var(--dark); opacity: 0.9; letter-spacing: -0.003em; white-space: pre-line; }
.group-label { font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); padding: 0 4px 10px; }

.care-list { background: var(--bg-light); border-radius: 18px; overflow: hidden; }
.care-row { display: flex; gap: 14px; align-items: flex-start; padding: 15px 16px; position: relative; }
.care-row + .care-row::before { content: ""; position: absolute; top: 0; left: 62px; right: 0; height: 1px; background: var(--border); }
.care-ic {
  flex: none; width: 34px; height: 34px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  background: var(--bg); color: var(--brand);
  box-shadow: inset 0 0 0 1px var(--border);
}
.care-ic :deep(svg) { width: 20px; height: 20px; display: block; }
.care-body { min-width: 0; padding-top: 1px; }
.care-label { font-size: 12.5px; font-weight: 600; letter-spacing: 0.01em; color: var(--muted); margin: 0 0 3px; }
.care-value { font-size: 15px; line-height: 1.5; margin: 0; color: var(--dark); opacity: 0.92; letter-spacing: -0.003em; white-space: pre-line; }

.sheet-pad { height: 120px; }

/* ── 하단 고정 액션바 ── */
.actionbar {
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 50;
  background: rgba(240, 241, 232, 0.72);
  -webkit-backdrop-filter: saturate(180%) blur(22px);
  backdrop-filter: saturate(180%) blur(22px);
  border-top: 1px solid var(--border);
}
.actionbar-inner {
  display: flex; align-items: center; gap: 14px;
  padding: 14px 18px calc(14px + env(safe-area-inset-bottom));
}
.price { display: flex; flex-direction: column; line-height: 1; }
.price-label { font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); margin-bottom: 6px; }
.price-value { font-size: 22px; font-weight: 700; letter-spacing: -0.02em; color: var(--dark); font-variant-numeric: tabular-nums; }
.cta {
  flex: 1; height: 52px; border-radius: 16px;
  background: var(--brand); color: #fff;
  font-size: 16.5px; font-weight: 650; letter-spacing: -0.01em;
  transition: transform .16s cubic-bezier(0.34, 1.4, 0.5, 1), filter .16s ease, opacity .16s ease;
}
.cta:active { transform: scale(0.965); }
.cta:disabled { opacity: 0.5; background: var(--muted); }

/* ── 등장 애니메이션 ── */
.r { opacity: 0; transform: translateY(12px); animation: rise .6s cubic-bezier(0.23, 1, 0.32, 1) both; }
.r0 { animation-delay: .10s; } .r1 { animation-delay: .17s; } .r2 { animation-delay: .24s; }
.r3 { animation-delay: .31s; } .r4 { animation-delay: .38s; }
@keyframes rise { to { opacity: 1; transform: none; } }

.care-row { opacity: 0; transform: translateY(12px); transition: opacity .5s ease, transform .5s cubic-bezier(0.23, 1, 0.32, 1); }
.care-row.in { opacity: 1; transform: none; }

/* hover는 마우스 환경에서만 */
@media (hover: hover) and (pointer: fine) {
  .cta:not(:disabled):hover { filter: brightness(1.07); }
  .ghost-btn:hover { background: rgba(255, 255, 255, 0.26); }
  .mini-cart:hover { color: var(--dark); }
}

/* 접근성: 움직임 최소화 */
@media (prefers-reduced-motion: reduce) {
  .slide-media { animation: none; }
  .r { animation: fade .3s ease both; transform: none; }
  .care-row { transition: opacity .3s ease; transform: none; }
  .cta:active, .ghost-btn:active { transform: none; }
}
@keyframes fade { from { opacity: 0; } to { opacity: 1; } }
</style>
