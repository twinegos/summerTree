<script setup lang="ts">

interface EditorValue {
  x: number   // translate X as % of container (0 = center)
  y: number   // translate Y as % of container (0 = center)
  scale: number
}

const props = defineProps<{
  imageUrl: string
  modelValue: EditorValue
}>()

const emit = defineEmits<{
  'update:modelValue': [value: EditorValue]
}>()

const containerRef = ref<HTMLElement | null>(null)
const isDragging = ref(false)
const isTouchDevice = ref(false)
const isHovered = ref(false)

const activePointers = new Map<number, { x: number; y: number }>()
let pinchStartDist = 0
let pinchStartScale = 1.0

onMounted(() => {
  isTouchDevice.value = navigator.maxTouchPoints > 0
})

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v))
}

function emitValue(x: number, y: number, scale: number) {
  emit('update:modelValue', { x, y, scale: clamp(scale, 0.1, 5.0) })
}

function pinchDist() {
  const pts = [...activePointers.values()]
  if (pts.length < 2) return 0
  const dx = pts[1].x - pts[0].x
  const dy = pts[1].y - pts[0].y
  return Math.sqrt(dx * dx + dy * dy)
}

function onPointerDown(e: PointerEvent) {
  if (!containerRef.value) return
  e.preventDefault()
  containerRef.value.setPointerCapture(e.pointerId)
  activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY })

  if (activePointers.size === 1) {
    isDragging.value = true
  } else if (activePointers.size === 2) {
    isDragging.value = false
    pinchStartDist = pinchDist()
    pinchStartScale = props.modelValue.scale
  }
}

function onPointerMove(e: PointerEvent) {
  if (!containerRef.value || !activePointers.has(e.pointerId)) return

  const prev = activePointers.get(e.pointerId)!
  const dx = e.clientX - prev.x
  const dy = e.clientY - prev.y
  activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY })

  const W = containerRef.value.offsetWidth
  const H = containerRef.value.offsetHeight

  if (activePointers.size >= 2) {
    const dist = pinchDist()
    if (pinchStartDist > 0) {
      emitValue(props.modelValue.x, props.modelValue.y, pinchStartScale * dist / pinchStartDist)
    }
  } else if (activePointers.size === 1 && isDragging.value) {
    const s = props.modelValue.scale
    emitValue(
      props.modelValue.x + (dx / W) * 100,
      props.modelValue.y + (dy / H) * 100,
      s
    )
  }
}

function onPointerUp(e: PointerEvent) {
  activePointers.delete(e.pointerId)
  if (activePointers.size === 0) {
    isDragging.value = false
    pinchStartDist = 0
  } else if (activePointers.size === 1) {
    isDragging.value = true
  }
}

function onWheel(e: WheelEvent) {
  e.preventDefault()
  emitValue(props.modelValue.x, props.modelValue.y, props.modelValue.scale - e.deltaY / 400)
}

// top corners: drag UP (dy<0) = grow → sign -1
// bottom corners: drag DOWN (dy>0) = grow → sign +1
const cornerHandles = [
  { top: '4px', left: '4px', cursor: 'nwse-resize', sign: -1 },
  { top: '4px', right: '4px', cursor: 'nesw-resize', sign: -1 },
  { bottom: '4px', left: '4px', cursor: 'nesw-resize', sign: 1 },
  { bottom: '4px', right: '4px', cursor: 'nwse-resize', sign: 1 },
] as const

function onHandlePointerDown(e: PointerEvent, sign: number) {
  e.stopPropagation()
  e.preventDefault()
  const startY = e.clientY
  const startScale = props.modelValue.scale
  const H = containerRef.value?.offsetHeight ?? 300

  function onMove(ev: PointerEvent) {
    const dy = ev.clientY - startY
    emitValue(props.modelValue.x, props.modelValue.y, startScale + sign * (dy / H) * 3)
  }
  function onUp() {
    document.removeEventListener('pointermove', onMove)
    document.removeEventListener('pointerup', onUp)
  }
  document.addEventListener('pointermove', onMove)
  document.addEventListener('pointerup', onUp)
}

function onScaleSlider(e: Event) {
  const val = parseFloat((e.target as HTMLInputElement).value)
  emitValue(props.modelValue.x, props.modelValue.y, val)
}

function reset() {
  emitValue(0, 0, 1.0)
}

const imageStyle = computed(() => {
  const { x, y, scale } = props.modelValue
  return {
    position: 'absolute' as const,
    width: '100%',
    height: '100%',
    objectFit: (scale < 1 ? 'contain' : 'cover') as 'contain' | 'cover',
    objectPosition: '50% 50%',
    transformOrigin: '50% 50%',
    transform: `translate(${x}%, ${y}%) scale(${scale})`,
    pointerEvents: 'none' as const,
    userSelect: 'none' as const,
  }
})
</script>

<template>
  <div class="space-y-2">
    <!--
      9:16 비율 에디터 — 상세페이지와 동일한 비율
      하단 28% 오버레이 영역은 상세페이지 텍스트가 덮는 영역 프리뷰
    -->
    <div
      ref="containerRef"
      class="relative overflow-hidden rounded-xl border-2 border-dashed select-none w-full"
      style="aspect-ratio: 9/16; max-height: 360px; border-color: #86efac; touch-action: none; background: #f0f0f0;"
      :style="{ cursor: isDragging ? 'grabbing' : 'grab' }"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @wheel.prevent="onWheel"
      @mouseenter="isHovered = true"
      @mouseleave="isHovered = false"
    >
      <!-- 이미지 -->
      <img
        :src="imageUrl"
        draggable="false"
        :style="imageStyle"
      />

      <!-- 상단: 배율 + 조작 힌트 -->
      <div class="absolute top-2 left-2 right-2 flex justify-between items-start pointer-events-none z-20">
        <span class="text-[9px] text-white/90 bg-black/40 px-1.5 py-0.5 rounded leading-tight">
          {{ isTouchDevice ? '한 손가락 이동 · 두 손가락 확대' : '드래그 이동 · 스크롤/핸들 확대' }}
        </span>
        <span class="text-[10px] text-white font-semibold bg-black/40 px-1.5 py-0.5 rounded">
          {{ modelValue.scale.toFixed(2) }}×
        </span>
      </div>

      <!-- 하단: 상세페이지 오버레이 프리뷰 (비율·색상 동일하게 구도 확인용) -->
      <div
        class="absolute bottom-0 left-0 right-0 pointer-events-none z-10"
        style="background: rgba(232, 234, 216, 0.75); height: 28%;"
      >
        <div class="px-3 pt-4 pb-2 space-y-1.5">
          <!-- 카테고리 라인 -->
          <div class="h-1.5 rounded opacity-40" style="width: 28%; background: #1c1a14;"></div>
          <!-- 식물 이름 (굵고 넓게) -->
          <div class="h-3 rounded opacity-55" style="width: 68%; background: #1c1a14;"></div>
          <!-- 짧은 설명 -->
          <div class="space-y-1">
            <div class="h-1.5 rounded opacity-28" style="width: 95%; background: #1c1a14;"></div>
            <div class="h-1.5 rounded opacity-28" style="width: 72%; background: #1c1a14;"></div>
          </div>
          <!-- 관리 난이도 -->
          <div class="flex items-center gap-1.5 pt-0.5">
            <div class="h-1.5 rounded opacity-30" style="width: 22%; background: #1c1a14;"></div>
            <div class="flex gap-0.5">
              <div class="w-1.5 h-1.5 rounded-full" style="background: rgba(28,26,20,0.45);"></div>
              <div class="w-1.5 h-1.5 rounded-full" style="background: rgba(28,26,20,0.45);"></div>
              <div class="w-1.5 h-1.5 rounded-full" style="background: rgba(28,26,20,0.20);"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- PC 전용: hover 시 4모서리 스케일 핸들 -->
      <template v-if="!isTouchDevice && isHovered">
        <div
          v-for="(h, i) in cornerHandles"
          :key="i"
          class="absolute z-30 w-4 h-4 bg-white border-2 border-green-500 rounded-sm"
          :style="{ top: (h as any).top, left: (h as any).left, right: (h as any).right, bottom: (h as any).bottom, cursor: h.cursor }"
          @pointerdown="(e) => onHandlePointerDown(e, h.sign)"
        />
      </template>
    </div>

    <!-- 배율 슬라이더 -->
    <div class="flex items-center gap-2 px-0.5">
      <span class="text-xs text-gray-400 shrink-0">0.1×</span>
      <input
        type="range"
        min="0.1"
        max="5"
        step="0.05"
        :value="modelValue.scale"
        @input="onScaleSlider"
        class="flex-1 h-1 accent-green-600 cursor-pointer"
      />
      <span class="text-xs text-gray-400 shrink-0">5×</span>
      <button
        type="button"
        @click="reset"
        class="shrink-0 text-xs text-gray-400 hover:text-gray-600 ml-1 transition-colors"
      >
        초기화
      </button>
    </div>
  </div>
</template>
