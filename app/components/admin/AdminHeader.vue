<script setup lang="ts">
const { signOut } = useAuth()

async function handleSignOut() {
  await signOut()
  await navigateTo('/admin/login')
}
</script>

<template>
  <header class="bg-white border-b border-gray-200 sticky top-0 z-40">
    <div class="max-w-[480px] mx-auto px-4 py-3 flex items-center justify-between">
      <div class="flex items-center gap-4">
        <NuxtLink to="/plants" class="hover:opacity-70 transition-opacity"><BrandLogo /></NuxtLink>
        <nav class="flex gap-1">
          <NuxtLink
            to="/admin"
            class="text-sm px-2.5 py-1.5 rounded-lg transition-colors"
            :class="$route.path.startsWith('/admin/plants') || $route.path === '/admin' ? 'bg-green-50 text-green-700 font-medium' : 'text-gray-500 hover:bg-gray-100'"
          >
            식물
          </NuxtLink>
          <NuxtLink
            to="/admin/orders"
            class="text-sm px-2.5 py-1.5 rounded-lg transition-colors"
            :class="$route.path.startsWith('/admin/orders') ? 'bg-green-50 text-green-700 font-medium' : 'text-gray-500 hover:bg-gray-100'"
          >
            주문
          </NuxtLink>
        </nav>
      </div>
      <button
        @click="handleSignOut"
        class="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
      >
        로그아웃
      </button>
    </div>
  </header>
</template>
