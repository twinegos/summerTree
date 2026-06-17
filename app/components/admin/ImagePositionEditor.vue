<script setup lang="ts">

interface EditorValue {
  x: number   // translate X as % of container (0 = center)
  y: number   // translate Y as % of container (0 = center)
  scale: number
}

const props = defineProps<{
  imageUrl: string
  modelValue: EditorValue
  overlayOpacity: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: EditorValue]
  'update:overlayOpacity': [value: number]
}>()

const containerRef = ref<HTMLElement | null>(null)
const isDragging = ref(false)
const isTouchDevice = ref(false)
const isHovered = ref(false)

const snapEnabled = ref(false)

function snapToGrid(v: number) {
  return snapEnabled.value ? Math.round(v / 5) * 5 : v
}

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
  emit('update:modelValue', { x: snapToGrid(x), y: snapToGrid(y), scale: clamp(scale, 0.1, 5.0) })
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
    objectFit: 'cover' as const,
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
      class="relative overflow-hidden rounded-xl border-2 border-dashed select-none"
      style="aspect-ratio: 4/5; max-height: 400px; border-color: #86efac; touch-action: none; background: #f0f0f0;"
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

      <!-- 하단: 상세페이지 오버레이 영역 표시 -->
      <div
        class="absolute bottom-0 left-0 right-0 pointer-events-none z-10"
        :style="{ background: `rgba(232, 234, 216, ${props.overlayOpacity})`, height: '38%' }"
      />

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

    <!-- 오버레이 투명도 슬라이더 -->
    <div class="flex items-center gap-2 px-0.5">
      <span class="text-xs text-gray-400 shrink-0 w-16">오버레이</span>
      <input
        type="range"
        min="0"
        max="1"
        step="0.05"
        :value="props.overlayOpacity"
        @input="emit('update:overlayOpacity', parseFloat(($event.target as HTMLInputElement).value))"
        class="flex-1 h-1 accent-green-600 cursor-pointer"
      />
      <span class="text-xs text-gray-400 shrink-0 w-8 text-right">{{ Math.round(props.overlayOpacity * 100) }}%</span>
    </div>

    <!-- 스냅 체크박스 -->
    <div class="flex items-center gap-2 px-0.5">
      <input
        type="checkbox"
        id="snap-toggle"
        v-model="snapEnabled"
        class="cursor-pointer accent-green-600"
      />
      <label for="snap-toggle" class="text-xs text-gray-400 cursor-pointer select-none">스냅 (5% 격자)</label>
    </div>
  </div>
</template>
