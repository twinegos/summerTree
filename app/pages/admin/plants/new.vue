<script setup lang="ts">
import type { PlantInsert } from '~/types/database.types'

definePageMeta({ middleware: 'auth' })

const { categories, fetchCategories } = useCategories()
const { createPlant, updatePlant } = usePlants()
const { uploadImage } = useStorage()
const { showSuccess, showError } = useToast()

const form = reactive({
  name: '',
  category_id: '',
  price: '',
  stock: '0',
  short_description: '',
  description: '',
  care_guide: '',
  caution: '',
  care_info: Object.fromEntries(CARE_ITEMS.map((i) => [i.key, ''])) as Record<string, string>,
  care_level: 'normal' as 'easy' | 'normal' | 'hard',
  page_bg_color: '' as string,
  page_bg_image: '' as string,
  page_font: 'sans' as 'sans' | 'serif' | 'mono',
  image_position: '0% 0%' as string,
  image_scale: 1.0 as number,
  overlay_opacity: 0.75 as number,
})

interface PendingImage {
  id: string
  previewUrl: string   // 그리드/에디터 표시용
  file?: File          // 업로드할 로컬 파일
  remoteUrl?: string   // 이미 URL인 경우(AI 생성)
}
const MAX_IMAGES = 5
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const images = ref<PendingImage[]>([])
const fileInput = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)
const isSubmitting = ref(false)

function triggerFileInput() {
  fileInput.value?.click()
}

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files) {
    addFiles(Array.from(input.files))
    input.value = ''
  }
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  isDragging.value = false
  addFiles(Array.from(e.dataTransfer?.files ?? []))
}

function addFiles(files: File[]) {
  const available = MAX_IMAGES - images.value.length
  if (available <= 0) {
    showError(`이미지는 최대 ${MAX_IMAGES}장까지 등록할 수 있습니다`)
    return
  }
  for (const file of files.slice(0, available)) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      showError('jpg, png, webp 형식만 지원합니다')
      continue
    }
    if (file.size > 5 * 1024 * 1024) {
      showError('이미지 크기는 5MB 이하여야 합니다')
      continue
    }
    images.value.push({ id: crypto.randomUUID(), previewUrl: URL.createObjectURL(file), file })
  }
}

function removeImage(id: string) {
  const img = images.value.find((i) => i.id === id)
  if (img?.file) URL.revokeObjectURL(img.previewUrl)
  images.value = images.value.filter((i) => i.id !== id)
}

// 선택한 이미지를 맨 앞(대표)으로 이동 — image_urls[0]이 썸네일/상세 첫 화면
function setCover(id: string) {
  const idx = images.value.findIndex((i) => i.id === id)
  if (idx <= 0) return
  const [img] = images.value.splice(idx, 1)
  images.value.unshift(img)
}

function parseImagePosition(pos: string): { x: number; y: number } {
  const parts = (pos || '0% 0%').split(' ')
  return { x: parseFloat(parts[0]) || 0, y: parseFloat(parts[1]) || 0 }
}

const imageEditorValue = computed({
  get() {
    const { x, y } = parseImagePosition(form.image_position)
    return { x, y, scale: form.image_scale }
  },
  set(val: { x: number; y: number; scale: number }) {
    form.image_position = `${val.x.toFixed(2)}% ${val.y.toFixed(2)}%`
    form.image_scale = val.scale
  },
})

// 에디터에 표시할 이미지 = 대표(목록 첫 번째)
const editorImageUrl = computed(() => images.value[0]?.previewUrl || '')

const errors = reactive({ name: '', category_id: '', price: '', stock: '' })

const chatFormState = computed(() => ({
  name: form.name,
  category_name: categories.value.find(c => c.id === form.category_id)?.name ?? '',
  price: form.price,
  short_description: form.short_description,
  description: form.description,
  care_guide: form.care_guide,
  caution: form.caution,
}))

function handleAiStylePage(style: { bg_color?: string; bg_image_url?: string; font?: string }) {
  if (style.bg_color) form.page_bg_color = style.bg_color
  if (style.bg_image_url) form.page_bg_image = style.bg_image_url
  if (style.font && ['sans', 'serif', 'mono'].includes(style.font)) {
    form.page_font = style.font as 'sans' | 'serif' | 'mono'
  }
}

const isGeneratingCare = ref(false)
async function handleGenerateCareInfo() {
  if (!form.name.trim()) { showError('식물 이름을 먼저 입력해주세요'); return }
  isGeneratingCare.value = true
  try {
    const res = await $fetch<{ careInfo: Record<string, string> }>('/api/admin/ai/care-info', {
      method: 'POST',
      body: { name: form.name, category: categories.value.find((c) => c.id === form.category_id)?.name },
    })
    form.care_info = { ...form.care_info, ...res.careInfo }
    showSuccess('AI가 항목을 채웠어요. 내용을 확인·수정해주세요!')
  } catch {
    showError('AI 자동 작성에 실패했습니다')
  } finally {
    isGeneratingCare.value = false
  }
}

function handleAiFillFields(fields: Record<string, unknown>) {
  if (fields.name) form.name = String(fields.name)
  if (fields.short_description) form.short_description = String(fields.short_description)
  if (fields.description) form.description = String(fields.description)
  if (fields.care_guide) form.care_guide = String(fields.care_guide)
  if (fields.caution) form.caution = String(fields.caution)
  if (fields.price) form.price = String(fields.price)
  if (fields.suggested_category) {
    const matched = categories.value.find(c =>
      c.name.includes(String(fields.suggested_category)) || String(fields.suggested_category).includes(c.name)
    )
    if (matched) form.category_id = matched.id
  }
}

function handleAiGenerateImage(imageUrl: string) {
  if (images.value.length >= MAX_IMAGES) {
    showError(`이미지는 최대 ${MAX_IMAGES}장까지 등록할 수 있습니다`)
    return
  }
  // AI 생성 이미지를 맨 앞(대표)에 추가
  images.value.unshift({ id: crypto.randomUUID(), previewUrl: imageUrl, remoteUrl: imageUrl })
}

function validate(): boolean {
  let valid = true
  errors.name = ''
  errors.category_id = ''
  errors.price = ''
  errors.stock = ''
  if (!form.name.trim()) { errors.name = '식물 이름을 입력해주세요'; valid = false }
  if (!form.category_id) { errors.category_id = '카테고리를 선택해주세요'; valid = false }
  if (form.price === '' || Number(form.price) < 0) { errors.price = '올바른 가격을 입력해주세요'; valid = false }
  if (form.stock === '' || Number(form.stock) < 0) { errors.stock = '올바른 재고 수량을 입력해주세요'; valid = false }
  return valid
}


async function handleSubmit() {
  if (!validate()) return
  isSubmitting.value = true
  try {
    const payload: PlantInsert = {
      name: form.name.trim(),
      category_id: form.category_id,
      price: Number(form.price),
      stock: Number(form.stock),
      short_description: form.short_description.trim() || null,
      description: form.description.trim() || null,
      care_guide: form.care_guide.trim() || null,
      caution: form.caution.trim() || null,
      care_info: Object.fromEntries(Object.entries(form.care_info).filter(([, v]) => v.trim())),
      care_level: form.care_level,
      page_bg_color: form.page_bg_color.trim() || null,
      page_bg_image: form.page_bg_image.trim() || null,
      page_font: form.page_font,
      image_position: form.image_position,
      image_scale: form.image_scale,
      overlay_opacity: form.overlay_opacity,
      image_urls: [],
    }

    const { data: plant, error: createError } = await createPlant(payload)
    if (createError || !plant) { showError(createError ?? '등록에 실패했습니다'); return }

    // 목록 순서대로 최종 URL 구성 (파일은 업로드, AI 생성 URL은 그대로) → [0]이 대표
    const finalUrls: string[] = []
    for (const img of images.value) {
      if (img.remoteUrl) {
        finalUrls.push(img.remoteUrl)
        continue
      }
      if (img.file) {
        const { url, error: uploadError } = await uploadImage(plant.id, img.file)
        if (uploadError) { showError(uploadError); continue }
        if (url) finalUrls.push(url)
      }
    }
    if (finalUrls.length > 0) {
      await updatePlant(plant.id, { image_urls: finalUrls })
    }

    showSuccess('식물이 등록되었습니다')
    await navigateTo('/admin')
  } finally {
    isSubmitting.value = false
  }
}

onMounted(() => { fetchCategories() })
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <AdminHeader />
    <CommonToast />

    <div class="max-w-[480px] mx-auto px-4 py-4">
      <div class="flex items-center gap-3 mb-6">
        <NuxtLink to="/admin" class="text-gray-400 hover:text-gray-600 p-1 -ml-1">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </NuxtLink>
        <h1 class="text-xl font-bold text-gray-900">식물 등록</h1>
      </div>

      <!-- AI 어시스턴트 채팅 -->
      <div class="mb-6">
        <AdminAiChat
          :form-state="chatFormState"
          @fill-fields="handleAiFillFields"
          @generate-image="handleAiGenerateImage"
          @style-page="handleAiStylePage"
        />
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <!-- 이름 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">식물 이름 <span class="text-red-500">*</span></label>
          <input v-model="form.name" type="text" maxlength="100" placeholder="식물 이름을 입력해주세요"
            class="w-full px-4 py-3 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
            :class="errors.name ? 'border-red-400' : 'border-gray-300'" />
          <p v-if="errors.name" class="text-red-500 text-xs mt-1">{{ errors.name }}</p>
        </div>

        <!-- 카테고리 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">카테고리 <span class="text-red-500">*</span></label>
          <select v-model="form.category_id"
            class="w-full px-4 py-3 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
            :class="errors.category_id ? 'border-red-400' : 'border-gray-300'">
            <option value="" disabled>카테고리 선택</option>
            <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
          </select>
          <p v-if="errors.category_id" class="text-red-500 text-xs mt-1">{{ errors.category_id }}</p>
        </div>

        <!-- 가격 / 재고 -->
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">가격 (원) <span class="text-red-500">*</span></label>
            <input v-model="form.price" type="number" min="0" placeholder="0"
              class="w-full px-4 py-3 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
              :class="errors.price ? 'border-red-400' : 'border-gray-300'" />
            <p v-if="errors.price" class="text-red-500 text-xs mt-1">{{ errors.price }}</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">재고 <span class="text-red-500">*</span></label>
            <input v-model="form.stock" type="number" min="0" placeholder="0"
              class="w-full px-4 py-3 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
              :class="errors.stock ? 'border-red-400' : 'border-gray-300'" />
            <p v-if="errors.stock" class="text-red-500 text-xs mt-1">{{ errors.stock }}</p>
          </div>
        </div>

        <!-- 간단 설명 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">간단 설명</label>
          <input v-model="form.short_description" type="text" placeholder="한 줄 설명 (선택)"
            class="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500" />
        </div>

        <!-- 관리 난이도 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">관리 난이도</label>
          <div class="flex gap-2">
            <button
              v-for="opt in [{ value: 'easy', label: '쉬움', color: 'bg-green-50 border-green-400 text-green-800', active: 'bg-green-100' },
                             { value: 'normal', label: '보통', color: 'bg-yellow-50 border-yellow-400 text-yellow-800', active: 'bg-yellow-100' },
                             { value: 'hard', label: '까다로움', color: 'bg-orange-50 border-orange-400 text-orange-800', active: 'bg-orange-100' }]"
              :key="opt.value"
              type="button"
              @click="form.care_level = opt.value as 'easy' | 'normal' | 'hard'"
              class="flex-1 py-2.5 text-sm font-medium rounded-xl border-2 transition-colors"
              :class="form.care_level === opt.value ? opt.color : 'border-gray-200 text-gray-500 bg-white'"
            >{{ opt.label }}</button>
          </div>
        </div>

        <!-- 소개 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">소개</label>
          <textarea v-model="form.description" rows="3" maxlength="2000" placeholder="식물을 짧게 소개해주세요 (선택)"
            class="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
        </div>

        <!-- 식물 정보 (항목별) -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="block text-sm font-medium text-gray-700">식물 정보 (항목별)</label>
            <button type="button" @click="handleGenerateCareInfo" :disabled="isGeneratingCare"
              class="text-xs font-medium text-green-600 hover:text-green-700 disabled:opacity-50">
              {{ isGeneratingCare ? 'AI 작성 중...' : '✨ AI 자동 작성' }}
            </button>
          </div>
          <p class="text-xs text-gray-400 mb-2">식물 이름을 넣고 'AI 자동 작성'을 누르면 항목이 채워져요. 자유롭게 수정하세요.</p>
          <div class="space-y-2">
            <div v-for="item in CARE_ITEMS" :key="item.key">
              <label class="block text-xs text-gray-500 mb-1">{{ item.icon }} {{ item.label }}</label>
              <textarea v-model="form.care_info[item.key]" rows="2" :placeholder="item.placeholder"
                class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
            </div>
          </div>
        </div>

        <!-- 페이지 스타일 -->
        <div class="rounded-xl border border-gray-200 p-4 space-y-4">
          <p class="text-sm font-semibold text-gray-700">페이지 스타일</p>

          <!-- 배경색 -->
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-2">배경색</label>
            <div class="flex items-center gap-3">
              <input v-model="form.page_bg_color" type="color" class="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5" />
              <input v-model="form.page_bg_color" type="text" placeholder="#E8EAD8 또는 비워두면 기본값"
                class="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
              <button v-if="form.page_bg_color" type="button" @click="form.page_bg_color = ''"
                class="text-xs text-gray-400 hover:text-gray-600">초기화</button>
            </div>
          </div>

          <!-- 배경 이미지 -->
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-2">배경 이미지 URL</label>
            <div class="flex items-center gap-2">
              <input v-model="form.page_bg_image" type="url" placeholder="이미지 URL (AI 생성 이미지 사용 가능)"
                class="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
              <button v-if="form.page_bg_image" type="button" @click="form.page_bg_image = ''"
                class="text-xs text-gray-400 hover:text-gray-600 shrink-0">초기화</button>
            </div>
            <div v-if="form.page_bg_image" class="mt-2 h-16 rounded-lg overflow-hidden border border-gray-200">
              <img :src="form.page_bg_image" class="w-full h-full object-cover" />
            </div>
          </div>

          <!-- 폰트 -->
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-2">폰트</label>
            <div class="flex gap-2">
              <button v-for="opt in [{ value: 'sans', label: '기본', preview: '가나다' },
                                     { value: 'serif', label: '세리프', preview: '가나다' },
                                     { value: 'mono', label: '모노', preview: '가나다' }]"
                :key="opt.value" type="button"
                @click="form.page_font = opt.value as 'sans' | 'serif' | 'mono'"
                class="flex-1 py-2.5 text-sm rounded-xl border-2 transition-colors text-center"
                :class="form.page_font === opt.value ? 'border-green-500 bg-green-50 text-green-800' : 'border-gray-200 text-gray-600 bg-white'">
                <span class="block text-xs text-gray-400 mb-0.5"
                  :style="opt.value === 'serif' ? 'font-family: serif' : opt.value === 'mono' ? 'font-family: monospace' : ''">
                  {{ opt.preview }}
                </span>
                {{ opt.label }}
              </button>
            </div>
          </div>

          <!-- 미리보기 -->
          <div v-if="form.page_bg_color || form.page_bg_image"
            class="rounded-lg overflow-hidden border border-gray-200 h-20 flex items-center justify-center relative"
            :style="{
              backgroundColor: form.page_bg_color || undefined,
              backgroundImage: form.page_bg_image ? `url(${form.page_bg_image})` : undefined,
              backgroundSize: 'cover', backgroundPosition: 'center'
            }">
            <span class="text-sm font-bold px-3 py-1 rounded bg-white/60"
              :style="form.page_font === 'serif' ? 'font-family: serif' : form.page_font === 'mono' ? 'font-family: monospace' : ''">
              {{ form.name || '식물 이름' }}
            </span>
          </div>
        </div>

        <!-- 이미지 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            이미지
            <span class="text-gray-400 text-xs">(최대 5장 · 사진을 눌러 대표 지정)</span>
          </label>
          <!-- 드래그앤드롭 / 클릭 선택 -->
          <div
            @click="triggerFileInput"
            @dragover.prevent="isDragging = true"
            @dragleave="isDragging = false"
            @drop="onDrop"
            :class="[
              'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors',
              isDragging ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-green-400 hover:bg-gray-50',
              images.length >= MAX_IMAGES ? 'pointer-events-none opacity-50' : '',
            ]"
          >
            <input ref="fileInput" type="file" accept="image/jpeg,image/png,image/webp" multiple class="hidden" @change="onFileChange" />
            <svg class="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p class="text-sm text-gray-500">이미지를 드래그하거나 <span class="text-green-600 font-medium">클릭하여 선택</span></p>
            <p class="text-xs text-gray-400 mt-1">jpg, png, webp / 최대 5MB / {{ MAX_IMAGES }}장 중 {{ images.length }}장 등록됨</p>
          </div>

          <!-- 등록될 이미지 목록 (대표 선택) -->
          <div v-if="images.length > 0" class="grid grid-cols-3 gap-2 mt-3">
            <div
              v-for="(img, idx) in images"
              :key="img.id"
              class="relative aspect-square rounded-xl overflow-hidden bg-gray-100"
              :class="idx === 0 ? 'ring-2 ring-green-500' : ''"
            >
              <img
                :src="img.previewUrl"
                class="w-full h-full object-cover"
                :class="idx !== 0 ? 'cursor-pointer' : ''"
                @click="idx !== 0 && setCover(img.id)"
              />
              <span
                v-if="idx === 0"
                class="absolute top-1 left-1 bg-green-600 text-white text-[10px] font-medium px-1.5 py-0.5 rounded"
              >대표</span>
              <button
                v-else
                type="button"
                @click="setCover(img.id)"
                class="absolute top-1 left-1 bg-black/50 hover:bg-green-600 text-white text-[10px] px-1.5 py-0.5 rounded transition-colors"
              >대표로</button>
              <button
                type="button"
                @click="removeImage(img.id)"
                class="absolute top-1 right-1 bg-black/50 hover:bg-black/70 text-white rounded-full w-5 h-5 flex items-center justify-center transition-colors"
              >
                <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- 이미지 위치/크기 조절 -->
        <div class="rounded-xl border border-gray-200 p-4 space-y-3">
          <div>
            <p class="text-sm font-semibold text-gray-700">이미지 위치 · 크기</p>
            <p class="text-xs text-gray-400 mt-0.5">상세 페이지 hero 및 식물 목록 썸네일에 적용됩니다</p>
          </div>
          <div v-if="editorImageUrl">
            <AdminImagePositionEditor
              v-model="imageEditorValue"
              v-model:overlayOpacity="form.overlay_opacity"
              :image-url="editorImageUrl"
            />
          </div>
          <p v-else class="text-xs text-gray-400 py-2">이미지를 먼저 등록해주세요</p>
        </div>

        <!-- 버튼 -->
        <div class="flex gap-3 pt-2 pb-6">
          <NuxtLink to="/admin"
            class="flex-1 py-3 text-sm font-medium text-center border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors">
            취소
          </NuxtLink>
          <button type="submit" :disabled="isSubmitting"
            class="flex-1 py-3 text-sm font-medium bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-xl transition-colors flex items-center justify-center gap-2">
            <svg v-if="isSubmitting" class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {{ isSubmitting ? '등록 중...' : '등록' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
