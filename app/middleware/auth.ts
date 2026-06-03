export default defineNuxtRouteMiddleware((to) => {
  const user = useSupabaseUser()

  // /admin/login은 보호 대상 제외
  if (to.path === '/admin/login') {
    // 이미 로그인된 경우 대시보드로
    if (user.value) return navigateTo('/admin')
    return
  }

  // /admin/** 모든 경로 보호
  if (to.path.startsWith('/admin')) {
    if (!user.value) return navigateTo('/admin/login')
  }
})
