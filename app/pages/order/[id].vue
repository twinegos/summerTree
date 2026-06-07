<script setup lang="ts">
definePageMeta({ layout: false })
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center px-6 text-center" style="background: var(--bg);">
    <p class="text-xs font-medium tracking-widest uppercase mb-8" style="color: var(--muted);">Order Confirmed</p>
    <h1 class="text-4xl font-bold tracking-tight mb-4" style="color: var(--dark);">주문이<br />완료되었습니다.</h1>
    <p class="text-sm mb-2" style="color: var(--muted);">식물이 곧 찾아갈게요.</p>
    <p class="text-xs mb-12 font-mono" style="color: var(--border);">{{ $route.params.id }}</p>
    <NuxtLink to="/" class="text-link text-base">계속 쇼핑하기 →</NuxtLink>
  </div>
</template>
