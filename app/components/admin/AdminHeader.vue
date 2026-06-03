<script setup lang="ts">
const { signOut } = useAuth()

async function handleSignOut() {
  await signOut()
  await navigateTo('/admin/login')
}
</script>

<template>
  <header class="bg-white border-b border-gray-200 sticky top-0 z-40">
    <div class="max-w-[480px] mx-auto px-4 py-4 flex items-center justify-between">
      <h1 class="text-lg font-bold text-green-700">summerTree 관리자</h1>
      <button
        @click="handleSignOut"
        class="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
      >
        로그아웃
      </button>
    </div>
  </header>
</template>
