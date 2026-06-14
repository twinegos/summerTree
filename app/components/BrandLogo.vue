<script setup lang="ts">
withDefaults(defineProps<{ large?: boolean }>(), { large: false })
</script>

<template>
  <div style="font-family: 'Nanum Myeongjo', serif; line-height: 1.15;">
    <div :style="large
      ? 'font-size: 15px; font-weight: 400; letter-spacing: 0.25em; color: #8a7560; text-transform: uppercase;'
      : 'font-size: 10px; font-weight: 400; letter-spacing: 0.25em; color: #8a7560; text-transform: uppercase;'">
      plant shop
    </div>
    <div :style="large
      ? 'font-size: 30px; font-weight: 700; color: var(--brand);'
      : 'font-size: 20px; font-weight: 700; color: var(--brand);'">
      여름나무
    </div>
  </div>
</template>
