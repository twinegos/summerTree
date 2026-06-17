<script setup lang="ts">
const props = defineProps<{
  modelValue: string[]
  plantId: string | null
}>()

const emit = defineEmits<{
  'update:modelValue': [urls: string[]]
}>()

const { uploadImage } = useStorage()
const { showError } = useToast()

const fileInput = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)
const previews = ref<{ file: File; localUrl: string; uploading: boolean }[]>([])

const MAX_IMAGES = 5
const remaining = computed(() => MAX_IMAGES - props.modelValue.length - previews.value.length)

function triggerFileInput() {
  fileInput.value?.click()
}

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.files) {
    addFiles(Array.from(input.files))
    input.value = ''
  }
}

function onDragOver(e: DragEvent) {
  e.preventDefault()
  isDragging.value = true
}

function onDragLeave() {
  isDragging.value = false
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  isDragging.value = false
  const files = Array.from(e.dataTransfer?.files ?? [])
  addFiles(files)
}

function addFiles(files: File[]) {
  const allowed = ['image/jpeg', 'image/png', 'image/webp']
  const available = remaining.value

  if (available <= 0) {
    showError(`이미지는 최대 ${MAX_IMAGES}장까지 등록할 수 있습니다`)
    return
  }

  const toAdd = files.slice(0, available)

  for (const file of toAdd) {
    if (!allowed.includes(file.type)) {
      showError('jpg, png, webp 형식만 지원합니다')
      continue
    }
    if (file.size > 5 * 1024 * 1024) {
      showError('이미지 크기는 5MB 이하여야 합니다')
      continue
    }

    const localUrl = URL.createObjectURL(file)
    const entry = { file, localUrl, uploading: false }
    previews.value.push(entry)

    // plantId가 있으면 즉시 업로드, 없으면 로컬 미리보기만
    if (props.plantId) {
      uploadEntry(entry)
    }
  }
}

async function uploadEntry(entry: { file: File; localUrl: string; uploading: boolean }) {
  if (!props.plantId) return
  entry.uploading = true
  const { url, error } = await uploadImage(props.plantId, entry.file)
  entry.uploading = false

  if (error) {
    showError(error)
    previews.value = previews.value.filter((p) => p !== entry)
    URL.revokeObjectURL(entry.localUrl)
    return
  }

  if (url) {
    emit('update:modelValue', [...props.modelValue, url])
    previews.value = previews.value.filter((p) => p !== entry)
    URL.revokeObjectURL(entry.localUrl)
  }
}

// plantId가 나중에 설정될 때 (새 식물 등록: 저장 후 업로드)
watch(
  () => props.plantId,
  async (id) => {
    if (!id) return
    const pending = [...previews.value]
    for (const entry of pending) {
      await uploadEntry(entry)
    }
  }
)

// 외부에서 로컬 파일 접근용 (새 식물 등록 시 plantId 없이 파일만 보관)
// firstPreviewUrl: 등록 전 첫 이미지 미리보기 URL (위치/크기 에디터용)
const firstPreviewUrl = computed(() => previews.value[0]?.localUrl ?? null)
defineExpose({
  getPendingFiles: () => previews.value.map((p) => p.file),
  firstPreviewUrl,
})
</script>

<template>
  <div class="space-y-3">
    <!-- 드래그앤드롭 영역 -->
    <div
      @click="triggerFileInput"
      @dragover="onDragOver"
      @dragleave="onDragLeave"
      @drop="onDrop"
      :class="[
        'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors',
        isDragging ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-green-400 hover:bg-gray-50',
        remaining <= 0 ? 'pointer-events-none opacity-50' : '',
      ]"
    >
      <input
        ref="fileInput"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        class="hidden"
        @change="onFileChange"
      />
      <svg class="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      <p class="text-sm text-gray-500">
        이미지를 드래그하거나 <span class="text-green-600 font-medium">클릭하여 선택</span>
      </p>
      <p class="text-xs text-gray-400 mt-1">jpg, png, webp / 최대 5MB / {{ MAX_IMAGES }}장 중 {{ props.modelValue.length + previews.length }}장 등록됨</p>
    </div>

    <!-- 업로드 전 로컬 미리보기 -->
    <div v-if="previews.length > 0" class="grid grid-cols-3 gap-2">
      <div
        v-for="(preview, i) in previews"
        :key="i"
        class="relative aspect-square rounded-xl overflow-hidden bg-gray-100"
      >
        <img :src="preview.localUrl" class="w-full h-full object-cover" />
        <div
          v-if="preview.uploading"
          class="absolute inset-0 bg-black/40 flex items-center justify-center"
        >
          <svg class="animate-spin w-5 h-5 text-white" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      </div>
    </div>
  </div>
</template>
