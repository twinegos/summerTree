<script setup lang="ts">
import type { PlantRow } from '~/types/database.types'

const props = defineProps<{
  modelValue: boolean
  plant: PlantRow | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const { getPlantUrl, generateDataUrl, downloadPNG, printQR } = useQRCode()
const { showError } = useToast()

const qrDataUrl = ref<string | null>(null)
const isGenerating = ref(false)

function close() {
  emit('update:modelValue', false)
}

async function generate() {
  if (!props.plant) return
  isGenerating.value = true
  try {
    qrDataUrl.value = await generateDataUrl(props.plant.id)
  } catch {
    showError('QR 코드 생성에 실패했습니다')
  } finally {
    isGenerating.value = false
  }
}

async function handleDownload() {
  if (!props.plant) return
  try {
    await downloadPNG(props.plant.id, props.plant.name)
  } catch {
    showError('다운로드에 실패했습니다')
  }
}

function handlePrint() {
  if (!qrDataUrl.value || !props.plant) return
  printQR(qrDataUrl.value, props.plant.name)
}

watch(
  () => props.modelValue,
  (val) => {
    if (val && props.plant) {
      qrDataUrl.value = null
      generate()
    }
  }
)
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="modelValue && plant"
        class="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
        @click.self="close"
      >
        <div class="absolute inset-0 bg-black/40" @click="close" />
        <div class="relative bg-white w-full max-w-[360px] rounded-t-2xl sm:rounded-2xl shadow-xl">
          <!-- 헤더 -->
          <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 class="text-base font-bold text-gray-900">QR 코드</h2>
            <button @click="close" class="text-gray-400 hover:text-gray-600 p-1">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- QR 코드 영역 -->
          <div class="flex flex-col items-center px-5 py-6">
            <!-- 로딩 -->
            <div v-if="isGenerating" class="w-[250px] h-[250px] flex items-center justify-center bg-gray-50 rounded-xl">
              <span class="text-sm text-gray-400">생성 중...</span>
            </div>

            <!-- QR 이미지 -->
            <img
              v-else-if="qrDataUrl"
              :src="qrDataUrl"
              :alt="`${plant.name} QR 코드`"
              class="w-[250px] h-[250px] rounded-xl border border-gray-100"
            />

            <!-- 식물 이름 -->
            <p class="mt-3 text-sm font-semibold text-gray-800 text-center">{{ plant.name }}</p>

            <!-- URL -->
            <p class="mt-1 text-xs text-gray-400 text-center break-all px-2">
              {{ getPlantUrl(plant.id) }}
            </p>
          </div>

          <!-- 버튼 -->
          <div class="flex gap-2 px-5 pb-5">
            <button
              @click="handleDownload"
              :disabled="isGenerating || !qrDataUrl"
              class="flex-1 py-2.5 text-sm font-medium rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              PNG 저장
            </button>
            <button
              @click="handlePrint"
              :disabled="isGenerating || !qrDataUrl"
              class="flex-1 py-2.5 text-sm font-medium rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white transition-colors"
            >
              인쇄
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
