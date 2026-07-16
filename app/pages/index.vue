<script setup lang="ts">
import type { HomeSettings } from '~/composables/useHomeSettings'

definePageMeta({ layout: false })

const { categories, fetchCategories } = useCategories()
const { fetchSettings } = useHomeSettings()

const settings = ref<HomeSettings | null>(null)
const heroImage = ref<string | null>(null)
const heroPhrase = ref<string>('')

function pickRandom<T>(arr: T[]): T | null {
  if (!arr?.length) return null
  return arr[Math.floor(Math.random() * arr.length)]
}

function pickNextImage(images: string[]): string | null {
  if (!images?.length) return null
  if (images.length === 1) return images[0]
  const last = localStorage.getItem('lastHeroImage')
  const pool = last ? images.filter((url) => url !== last) : images
  const picked = pool[Math.floor(Math.random() * pool.length)]
  localStorage.setItem('lastHeroImage', picked)
  return picked
}

// 카테고리 스크롤 리빌
let io: IntersectionObserver | null = null
function setupReveal() {
  const rows = document.querySelectorAll<HTMLElement>('.reveal-row')
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduce || !('IntersectionObserver' in window)) {
    rows.forEach((r) => r.classList.add('in'))
    return
  }
  io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('in'); io!.unobserve(e.target) }
    })
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' })
  rows.forEach((r) => io!.observe(r))
}

onMounted(async () => {
  const [, { data }] = await Promise.all([fetchCategories(), fetchSettings()])
  if (data) {
    settings.value = data
    heroImage.value = pickNextImage(data.hero_images)
    heroPhrase.value = pickRandom(data.hero_phrases) ?? ''
  }
  await nextTick()
  setupReveal()
})
onUnmounted(() => { io?.disconnect() })
</script>

<template>
  <div class="home">
    <!-- 헤더 (배경 위) -->
    <header class="hdr">
      <BrandLogo />
      <NuxtLink to="/cart" class="hdr-cart">장바구니</NuxtLink>
    </header>

    <!-- 히어로: 풀블리드 이미지 + 그라디언트 스크림 -->
    <section class="hero">
      <div v-if="heroImage" class="hero-media">
        <img :src="heroImage" alt="" />
      </div>
      <div v-else class="hero-fallback"></div>
      <div class="hero-scrim"></div>
      <div class="hero-copy">
        <p class="eyebrow anim a0">PLANT SHOP</p>
        <h1 v-if="heroPhrase" class="hero-title anim a1">{{ heroPhrase }}</h1>
        <p class="hero-sub anim a2">식물과 함께하는 일상.<br />QR 코드로 식물의 이야기를 만나보세요.</p>
      </div>
    </section>

    <!-- 카테고리 -->
    <section class="sheet">
      <div class="sec-label anim a3">둘러보기</div>
      <nav class="cat-list">
        <NuxtLink to="/plants" class="cat-row reveal-row">
          <span class="cat-main">
            <span class="cat-name">전체보기</span>
            <span class="cat-desc">모든 식물을 한눈에</span>
          </span>
          <svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6" /></svg>
        </NuxtLink>
        <NuxtLink
          v-for="cat in categories"
          :key="cat.id"
          :to="`/plants?category=${encodeURIComponent(cat.name)}`"
          class="cat-row reveal-row"
        >
          <span class="cat-main">
            <span class="cat-name">{{ cat.name }}</span>
            <span v-if="cat.description" class="cat-desc">{{ cat.description }}</span>
          </span>
          <svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6" /></svg>
        </NuxtLink>
      </nav>
    </section>

    <!-- 푸터 -->
    <footer class="ftr">
      <NuxtLink to="/admin" class="admin-link">관리자</NuxtLink>
    </footer>
  </div>
</template>

<style scoped>
/* 애플식 홈 (emil-design-eng + apple-design). 브랜드 팔레트 유지, 라이트 단일 테마 */
.home {
  min-height: 100dvh;
  background: var(--bg);
  color: var(--dark);
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Apple SD Gothic Neo", "Pretendard", system-ui, sans-serif;
  display: flex; flex-direction: column;
}

/* 헤더 */
.hdr {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 20px 14px;
}
.hdr-cart {
  font-size: 14px; font-weight: 500; color: var(--muted);
  padding: 8px 10px; border-radius: 10px;
  transition: transform .14s cubic-bezier(0.23,1,0.32,1), color .14s ease;
}
.hdr-cart:active { transform: scale(0.94); }

/* 히어로 */
.hero {
  position: relative; width: 100%;
  height: 60vh; min-height: 380px; max-height: 620px;
  overflow: hidden; background: var(--bg-light);
}
.hero-media { position: absolute; inset: 0; animation: heroIn 1.1s cubic-bezier(0.16,1,0.3,1) both; }
.hero-media img { width: 100%; height: 100%; object-fit: cover; object-position: center; }
@keyframes heroIn { from { transform: scale(1.06); } to { transform: scale(1); } }
.hero-fallback { position: absolute; inset: 0; background: linear-gradient(160deg, #cfd8c0, #aab88f); }
.hero-scrim {
  position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(to top, rgba(14,18,8,0.72) 0%, rgba(14,18,8,0.34) 26%, rgba(14,18,8,0) 54%);
}
.hero-copy { position: absolute; left: 0; right: 0; bottom: 0; padding: 0 22px 30px; color: #fff; }
.eyebrow { font-size: 11px; font-weight: 700; letter-spacing: 0.22em; margin: 0 0 12px; color: rgba(255,255,255,0.82); }
.hero-title {
  margin: 0 0 12px; font-size: 40px; line-height: 1.08; font-weight: 700;
  letter-spacing: -0.03em; text-wrap: balance; max-width: 14ch;
  text-shadow: 0 2px 24px rgba(0,0,0,0.3);
}
.hero-sub { margin: 0; font-size: 15px; line-height: 1.5; color: rgba(255,255,255,0.86); }

/* 카테고리 시트 */
.sheet {
  position: relative; z-index: 2; margin-top: -20px;
  background: var(--bg); border-radius: 24px 24px 0 0;
  box-shadow: 0 -1px 40px rgba(20,30,12,0.10);
  padding: 26px 18px 0;
}
.sec-label { font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); padding: 0 6px 12px; }

.cat-list { background: var(--bg-light); border-radius: 18px; overflow: hidden; }
.cat-row {
  display: flex; align-items: center; gap: 12px;
  padding: 17px 18px; position: relative;
  transition: background .14s ease;
}
.cat-row + .cat-row::before { content: ""; position: absolute; top: 0; left: 18px; right: 0; height: 1px; background: var(--border); }
.cat-row:active { background: rgba(43, 72, 32, 0.08); }
.cat-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.cat-name { font-size: 18px; font-weight: 650; letter-spacing: -0.02em; color: var(--dark); }
.cat-desc { font-size: 13px; line-height: 1.4; color: var(--muted); overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; }
.chev { flex: none; width: 18px; height: 18px; color: var(--border); }

/* 푸터 */
.ftr {
  margin-top: auto; padding: 26px 22px 30px;
  display: flex; justify-content: flex-end;
}
.admin-link { font-size: 12px; color: rgba(122, 124, 104, 0.7); padding: 6px; }

/* 등장 */
.anim { opacity: 0; transform: translateY(12px); animation: rise .6s cubic-bezier(0.23,1,0.32,1) both; }
.a0 { animation-delay: .12s; } .a1 { animation-delay: .19s; } .a2 { animation-delay: .26s; } .a3 { animation-delay: .33s; }
@keyframes rise { to { opacity: 1; transform: none; } }
.reveal-row { opacity: 0; transform: translateY(12px); transition: opacity .5s ease, transform .5s cubic-bezier(0.23,1,0.32,1); }
.reveal-row.in { opacity: 1; transform: none; }

/* 키보드 포커스 */
.cat-row:focus-visible { outline: 2px solid var(--brand); outline-offset: -2px; border-radius: 12px; }
.hdr-cart:focus-visible, .admin-link:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; border-radius: 8px; }

@media (hover: hover) and (pointer: fine) {
  .hdr-cart:hover { color: var(--dark); }
  .cat-row:hover { background: rgba(43, 72, 32, 0.06); }
}
@media (prefers-reduced-motion: reduce) {
  .hero-media { animation: none; }
  .anim { animation: fade .3s ease both; transform: none; }
  .reveal-row { transition: opacity .3s ease; transform: none; }
  .cat-row:active, .hdr-cart:active { transform: none; }
}
@keyframes fade { from { opacity: 0; } to { opacity: 1; } }
</style>
