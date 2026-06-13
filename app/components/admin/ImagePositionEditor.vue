<script setup lang="ts">
/*
 * 이미지 위치/크기 에디터
 *
 * 데이터 모델:
 *   x, y = 컨테이너 내 이미지 중심점 (0~100%)
 *   scale = 배율 (1.0 이상, 컨테이너를 항상 채움)
 *
 * CSS 적용:
 *   position: absolute; width: scale*100%; height: scale*100%;
 *   left: x%; top: y%; transform: translate(-50%, -50%)
 *
 * 이 방식은 object-fit+transform 조합의 역방향 버그가 없고
 * scale<1에서 빈 여백이 생기는 문제도 없음
 */

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
let dragStartX = 0
let dragStartY = 0
let dragStartCx = 0
let dragStartCy = 0
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
    dragStartX = e.clientX
    dragStartY = e.clientY
    dragStartCx = props.modelValue.x
    dragStartCy = props.modelValue.y
  } else if (activePointers.size === 2) {
    isDragging.value = false
    pinchStartDist = pinchDist()
    pinchStartScale = props.modelValue.scale
    // 핀치 시작 시 드래그 기준점 초기화 (손가락 줄인 후 이동 대비)
    dragStartCx = props.modelValue.x
    dragStartCy = props.modelValue.y
  }
}

function onPointerMove(e: PointerEvent) {
  if (!containerRef.value || !activePointers.has(e.pointerId)) return
  activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY })

  const W = containerRef.value.offsetWidth
  const H = containerRef.value.offsetHeight

  if (activePointers.size >= 2) {
    const dist = pinchDist()
    if (pinchStartDist > 0) {
      emitValue(props.modelValue.x, props.modelValue.y, pinchStartScale * dist / pinchStartDist)
    }
  } else if (activePointers.size === 1 && isDragging.value) {
    const dx = e.clientX - dragStartX
    const dy = e.clientY - dragStartY
    const s = props.modelValue.scale
    if (s >= 1) {
      // scale ≥ 1: 패닝 — drag right → 왼쪽 영역 노출 → x 감소
      emitValue(
        dragStartCx - (dx / W) * 100 / s,
        dragStartCy - (dy / H) * 100 / s,
        s
      )
    } else {
      // scale < 1: 이미지 위치 이동 — 1px 드래그 = 1px 이미지 이동 (1:1 매핑)
      // transform-origin 변화량을 container 크기 기준으로 보정
      const factor = Math.max(1 - s, 0.05)
      emitValue(
        dragStartCx + (dx / W) * 100 / factor,
        dragStartCy + (dy / H) * 100 / factor,
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
    // 손가락 하나 뗀 후 나머지 손가락으로 드래그 이어받기
    const [, pos] = [...activePointers.entries()][0]
    dragStartX = pos.x
    dragStartY = pos.y
    dragStartCx = props.modelValue.x
    dragStartCy = props.modelValue.y
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

const imageStyle = computed(() => ({
  position: 'absolute' as const,
  width: '100%',
  height: '100%',
  objectFit: 'cover' as const,
  objectPosition: `${props.modelValue.x}% ${props.modelValue.y}%`,
  transformOrigin: `${props.modelValue.x}% ${props.modelValue.y}%`,
  transform: `scale(${props.modelValue.scale})`,
  pointerEvents: 'none' as const,
  userSelect: 'none' as const,
}))
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
