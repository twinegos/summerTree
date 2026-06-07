// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss'],
  experimental: {
    viewTransition: true,
  },
  runtimeConfig: {
    // 서버 전용 (클라이언트 노출 안 됨)
    supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY,
    portoneApiSecret: process.env.PORTONE_API_SECRET,
    public: {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseKey: process.env.SUPABASE_ANON_KEY,
      siteUrl: process.env.SITE_URL || 'https://summer-tree.vercel.app',
      portoneStoreId: process.env.PORTONE_STORE_ID,
      portoneTossChannelKey: process.env.PORTONE_TOSS_CHANNEL_KEY,
      portoneKakaoChannelKey: process.env.PORTONE_KAKAO_CHANNEL_KEY,
    }
  }
})
