<script setup lang="ts">
definePageMeta({ layout: false })
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 text-center">
    <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
      <svg class="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
      </svg>
    </div>
    <h1 class="text-xl font-bold text-gray-900 mb-2">결제가 완료되었습니다!</h1>
    <p class="text-sm text-gray-500 mb-2">주문이 접수되었습니다.</p>
    <p class="text-xs text-gray-400 mb-8 font-mono break-all px-4">주문번호: {{ $route.params.id }}</p>
    <NuxtLink
      to="/"
      class="px-6 py-3 bg-green-600 text-white text-sm font-bold rounded-2xl hover:bg-green-700 transition-colors"
    >
      계속 쇼핑하기
    </NuxtLink>
  </div>
</template>
