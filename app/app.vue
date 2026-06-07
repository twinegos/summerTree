<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<style>
:root {
  --bg: #E8EAD8;
  --bg-light: #F0F1E8;
  --dark: #1C1A14;
  --brand: #2B4820;
  --muted: #7A7C68;
  --border: #D2D4C2;
}

body {
  background-color: var(--bg);
  color: var(--dark);
}

/* View Transitions - 페이드 슬라이드 */
::view-transition-old(root) {
  animation: vt-out 0.25s ease forwards;
}
::view-transition-new(root) {
  animation: vt-in 0.25s ease forwards;
}

@keyframes vt-out {
  to {
    opacity: 0;
    transform: translateY(-8px);
  }
}

@keyframes vt-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
}

/* 타이포그라피 링크 스타일 */
.text-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-weight: 600;
  color: var(--brand);
  border-bottom: 1px solid transparent;
  transition: border-color 0.2s;
  cursor: pointer;
}
.text-link:hover {
  border-bottom-color: var(--brand);
}
</style>
