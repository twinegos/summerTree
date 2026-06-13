<script setup lang="ts">
interface EditorValue {
  x: number
  y: number
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
const isTouchDevice = ref(false)
const isDragging = ref(false)

// Pointer tracking for drag + pinch
const activePointers = new Map<number, { x: number; y: number }>()
let startDragX = 0
let startDragY = 0
let startPosX = 0
let startPosY = 0
let startPinchDist = 0
let startPinchScale = 1

onMounted(() => {
  isTouchDevice.value = navigator.maxTouchPoints > 0
})

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val))
}

function emit_(x: number, y: number, scale: number) {
  emit('update:modelValue', {
    x: clamp(x, 0, 100),
    y: clamp(y, 0, 100),
    scale: clamp(scale, 0.5, 4.0),
  })
}

function getPinchDist() {
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
    startDragX = e.clientX
    startDragY = e.clientY
    startPosX = props.modelValue.x
    startPosY = props.modelValue.y
  } else if (activePointers.size === 2) {
    isDragging.value = false
    startPinchDist = getPinchDist()
    startPinchScale = props.modelValue.scale
  }
}

function onPointerMove(e: PointerEvent) {
  if (!containerRef.value || !activePointers.has(e.pointerId)) return
  activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY })

  const W = containerRef.value.offsetWidth
  const H = containerRef.value.offsetHeight

  if (activePointers.size >= 2) {
    const dist = getPinchDist()
    if (startPinchDist > 0) {
      const newScale = startPinchScale * (dist / startPinchDist)
      emit_(props.modelValue.x, props.modelValue.y, newScale)
    }
  } else if (activePointers.size === 1 && isDragging.value) {
    const dx = e.clientX - startDragX
    const dy = e.clientY - startDragY
    const s = props.modelValue.scale
    // Divide by scale so movement feels natural at any zoom level
    const newX = startPosX - (dx / W) * 100 / s
    const newY = startPosY - (dy / H) * 100 / s
    emit_(newX, newY, s)
  }
}

function onPointerUp(e: PointerEvent) {
  activePointers.delete(e.pointerId)
  if (activePointers.size === 0) {
    isDragging.value = false
    startPinchDist = 0
  } else if (activePointers.size === 1) {
    // Went from 2 fingers to 1 — restart single-finger tracking
    const [, pos] = [...activePointers.entries()][0]
    startDragX = pos.x
    startDragY = pos.y
    startPosX = props.modelValue.x
    startPosY = props.modelValue.y
    isDragging.value = true
  }
}

function onWheel(e: WheelEvent) {
  e.preventDefault()
  const delta = e.deltaY / 400
  emit_(props.modelValue.x, props.modelValue.y, props.modelValue.scale - delta)
}

// PC corner handle: drag up = zoom in, drag down = zoom out
function onHandlePointerDown(e: PointerEvent) {
  e.stopPropagation()
  e.preventDefault()
  const startY = e.clientY
  const startScale = props.modelValue.scale
  const H = containerRef.value?.offsetHeight ?? 220

  function onMove(ev: PointerEvent) {
    const dy = ev.clientY - startY
    emit_(props.modelValue.x, props.modelValue.y, startScale - (dy / H) * 3)
  }
  function onUp() {
    document.removeEventListener('pointermove', onMove)
    document.removeEventListener('pointerup', onUp)
  }
  document.addEventListener('pointermove', onMove)
  document.addEventListener('pointerup', onUp)
}

function resetEditor() {
  emit_(50, 50, 1.0)
}

function onScaleInput(e: Event) {
  const val = parseFloat((e.target as HTMLInputElement).value)
  emit_(props.modelValue.x, props.modelValue.y, val)
}

const imageStyle = computed(() => ({
  objectPosition: `${props.modelValue.x}% ${props.modelValue.y}%`,
  transform: `scale(${props.modelValue.scale})`,
  transformOrigin: `${props.modelValue.x}% ${props.modelValue.y}%`,
  transition: isDragging.value ? 'none' : 'transform 0.1s ease',
}))
</script>

<template>
  <div class="space-y-2">
    <!-- Interactive editor area -->
    <div
      ref="containerRef"
      class="relative overflow-hidden rounded-xl border-2 border-dashed select-none"
      style="height: 220px; touch-action: none; border-color: #86efac;"
      :style="{ cursor: isDragging ? 'grabbing' : 'grab' }"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @wheel.prevent="onWheel"
    >
      <!-- Plant image -->
      <img
        :src="imageUrl"
        class="w-full h-full object-cover pointer-events-none select-none"
        draggable="false"
        :style="imageStyle"
      />

      <!-- PC corner scale handles (hidden on touch devices) -->
      <template v-if="!isTouchDevice">
        <div
          v-for="(style, i) in [
            { top: '-5px', left: '-5px', cursor: 'nwse-resize' },
            { top: '-5px', right: '-5px', cursor: 'nesw-resize' },
            { bottom: '-5px', left: '-5px', cursor: 'nesw-resize' },
            { bottom: '-5px', right: '-5px', cursor: 'nwse-resize' },
          ]"
          :key="i"
          class="absolute w-3.5 h-3.5 bg-white border-2 border-green-500 rounded-sm z-10"
          :style="{ ...style }"
          @pointerdown="onHandlePointerDown"
        />
        <!-- Crosshair indicator at focal point -->
        <div
          class="absolute w-4 h-4 pointer-events-none"
          :style="{
            left: `calc(${modelValue.x}% - 8px)`,
            top: `calc(${modelValue.y}% - 8px)`,
          }"
        >
          <svg viewBox="0 0 16 16" fill="none" class="w-full h-full">
            <line x1="8" y1="0" x2="8" y2="16" stroke="white" stroke-width="1.5" stroke-dasharray="2 2" />
            <line x1="0" y1="8" x2="16" y2="8" stroke="white" stroke-width="1.5" stroke-dasharray="2 2" />
            <circle cx="8" cy="8" r="2.5" fill="white" />
          </svg>
        </div>
      </template>

      <!-- Hints -->
      <div
        class="absolute bottom-2 left-2 right-2 flex justify-between items-end pointer-events-none"
      >
        <span class="text-[10px] text-white/80 bg-black/40 px-1.5 py-0.5 rounded">
          {{ isTouchDevice ? '한 손가락 이동 · 두 손가락 확대' : '드래그 이동 · 스크롤/모서리 확대' }}
        </span>
        <span class="text-[11px] text-white font-medium bg-black/40 px-1.5 py-0.5 rounded">
          {{ modelValue.scale.toFixed(1) }}×
        </span>
      </div>
    </div>

    <!-- Scale slider + reset -->
    <div class="flex items-center gap-2 px-1">
      <span class="text-xs text-gray-400 shrink-0">0.5×</span>
      <input
        type="range"
        min="0.5"
        max="4"
        step="0.05"
        :value="modelValue.scale"
        @input="onScaleInput"
        class="flex-1 h-1 accent-green-600 cursor-pointer"
      />
      <span class="text-xs text-gray-400 shrink-0">4×</span>
      <button
        type="button"
        @click="resetEditor"
        class="shrink-0 text-xs text-gray-400 hover:text-gray-600 ml-1 transition-colors"
      >
        초기화
      </button>
    </div>
  </div>
</template>
