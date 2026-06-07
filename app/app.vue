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

/* View Transitions - 슬라이드 */
::view-transition-old(root) {
  animation: vt-slide-out 0.28s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}
::view-transition-new(root) {
  animation: vt-slide-in 0.28s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

@keyframes vt-slide-out {
  to {
    opacity: 0;
    transform: translateX(-24px);
  }
}

@keyframes vt-slide-in {
  from {
    opacity: 0;
    transform: translateX(24px);
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
