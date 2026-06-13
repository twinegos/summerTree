<script setup lang="ts">

interface EditorValue {
  x: number   // 0-100, 이미지 중심의 컨테이너 내 X위치
  y: number   // 0-100, 이미지 중심의 컨테이너 내 Y위치
  scale: number // 1.0+
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

// Pointer state
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
  emit('update:modelValue', {
    x: clamp(x, 0, 100),
    y: clamp(y, 0, 100),
    scale: clamp(scale, 0.1, 5.0),
  })
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
    if (s >= 1) {
      emitValue(
        props.modelValue.x - (dx / W) * 100 / s,
        props.modelValue.y - (dy / H) * 100 / s,
        s
      )
    } else {
      const factor = Math.max(1 - s, 0.05)
      emitValue(
        props.modelValue.x + (dx / W) * 100 / factor,
        props.modelValue.y + (dy / H) * 100 / factor,
        s
      )
    }
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

// PC 모서리 핸들: 위로 드래그 = 확대
function onHandlePointerDown(e: PointerEvent) {
  e.stopPropagation()
  e.preventDefault()
  const startY = e.clientY
  const startScale = props.modelValue.scale
  const H = containerRef.value?.offsetHeight ?? 300

  function onMove(ev: PointerEvent) {
    const dy = ev.clientY - startY
    emitValue(props.modelValue.x, props.modelValue.y, startScale - (dy / H) * 3)
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
  emitValue(50, 50, 1.0)
}

const imageStyle = computed(() => {
  const { x, y, scale } = props.modelValue
  const zoomedOut = scale < 1
  return {
    position: 'absolute' as const,
    width: '100%',
    height: '100%',
    // scale<1: 전체 이미지 표시(contain), scale>=1: 프레임 채움(cover)
    objectFit: (zoomedOut ? 'contain' : 'cover') as 'contain' | 'cover',
    objectPosition: zoomedOut ? '50% 50%' : `${x}% ${y}%`,
    transformOrigin: `${x}% ${y}%`,
    transform: `scale(${scale})`,
    pointerEvents: 'none' as const,
    userSelect: 'none' as const,
  }
})
</script>

<template>
  <div class="space-y-2">
    <!-- 9:16 비율 에디터 (상세페이지 hero와 동일 비율) -->
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
    >
      <img
        :src="imageUrl"
        draggable="false"
        :style="imageStyle"
      />

      <!-- PC 전용: 4모서리 스케일 핸들 + 초점 마커 -->
      <template v-if="!isTouchDevice">
        <div
          v-for="(s, i) in [
            { top: '-5px', left: '-5px', cursor: 'nwse-resize' },
            { top: '-5px', right: '-5px', cursor: 'nesw-resize' },
            { bottom: '-5px', left: '-5px', cursor: 'nesw-resize' },
            { bottom: '-5px', right: '-5px', cursor: 'nwse-resize' },
          ]"
          :key="i"
          class="absolute z-10 w-3.5 h-3.5 bg-white border-2 border-green-500 rounded-sm"
          :style="{ ...s }"
          @pointerdown="onHandlePointerDown"
        />
        <!-- 초점 십자선 -->
        <div
          class="absolute w-5 h-5 pointer-events-none z-10"
          :style="{ left: `calc(${modelValue.x}% - 10px)`, top: `calc(${modelValue.y}% - 10px)` }"
        >
          <svg viewBox="0 0 20 20" fill="none" class="w-full h-full drop-shadow">
            <line x1="10" y1="0" x2="10" y2="20" stroke="white" stroke-width="1.5" stroke-dasharray="2 2"/>
            <line x1="0" y1="10" x2="20" y2="10" stroke="white" stroke-width="1.5" stroke-dasharray="2 2"/>
            <circle cx="10" cy="10" r="3" fill="white" fill-opacity="0.9"/>
          </svg>
        </div>
      </template>

      <!-- 힌트 + 배율 표시 -->
      <div class="absolute bottom-2 left-2 right-2 flex justify-between items-end pointer-events-none">
        <span class="text-[10px] text-white/90 bg-black/40 px-1.5 py-0.5 rounded leading-tight">
          {{ isTouchDevice ? '한 손가락 이동 · 두 손가락 확대' : '드래그 이동 · 스크롤/모서리 확대' }}
        </span>
        <span class="text-[11px] text-white font-semibold bg-black/40 px-1.5 py-0.5 rounded">
          {{ modelValue.scale.toFixed(2) }}×
        </span>
      </div>
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
