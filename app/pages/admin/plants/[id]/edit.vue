<script setup lang="ts">
import type { PlantUpdate } from '~/types/database.types'

definePageMeta({
  middleware: 'auth',
})

const route = useRoute()
const plantId = route.params.id as string

const { categories, fetchCategories } = useCategories()
const { updatePlant } = usePlants()
const { deleteImage, uploadImage } = useStorage()
const { showSuccess, showError } = useToast()

// 폼 상태
const form = reactive({
  name: '',
  category_id: '',
  price: '',
  stock: '',
  short_description: '',
  description: '',
  care_guide: '',
  caution: '',
  care_level: 'normal' as 'easy' | 'normal' | 'hard',
  page_bg_color: '' as string,
  page_bg_image: '' as string,
  page_font: 'sans' as 'sans' | 'serif' | 'mono',
  image_position: '50% 50%' as string,
  image_scale: 1.0 as number,
})

const existingImageUrls = ref<string[]>([])
const newUploadedUrls = ref<string[]>([])
const imageUploaderRef = ref<{ getPendingFiles: () => File[] } | null>(null)

const isLoading = ref(true)
const isSubmitting = ref(false)
const isDeletingImage = ref<string | null>(null)

const errors = reactive({
  name: '',
  category_id: '',
  price: '',
  stock: '',
})

function parseImagePosition(pos: string): { x: number; y: number } {
  const parts = (pos || '50% 50%').split(' ')
  return { x: parseFloat(parts[0]) || 50, y: parseFloat(parts[1]) || 50 }
}

const imageEditorValue = computed({
  get() {
    const { x, y } = parseImagePosition(form.image_position)
    return { x, y, scale: Math.max(1.0, form.image_scale) }
  },
  set(val: { x: number; y: number; scale: number }) {
    form.image_position = `${val.x.toFixed(2)}% ${val.y.toFixed(2)}%`
    form.image_scale = Math.max(1.0, val.scale)
  },
})

const chatFormState = computed(() => ({
  name: form.name,
  category_name: categories.value.find(c => c.id === form.category_id)?.name ?? '',
  price: form.price,
  short_description: form.short_description,
  description: form.description,
  care_guide: form.care_guide,
  caution: form.caution,
}))

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
  newUploadedUrls.value = [imageUrl, ...newUploadedUrls.value]
}

async function handleAiRegisterImage(imageUrl: string) {
  if (newUploadedUrls.value.includes(imageUrl) || existingImageUrls.value.includes(imageUrl)) return
  newUploadedUrls.value = [imageUrl, ...newUploadedUrls.value]
  await updatePlant(plantId, {
    image_urls: [...existingImageUrls.value, imageUrl, ...newUploadedUrls.value.filter(u => u !== imageUrl)],
  })
  showSuccess('이미지가 대표사진으로 등록됐습니다')
}

function handleAiStylePage(style: { bg_color?: string; bg_image_url?: string; font?: string }) {
  if (style.bg_color) form.page_bg_color = style.bg_color
  if (style.bg_image_url) form.page_bg_image = style.bg_image_url
  if (style.font && ['sans', 'serif', 'mono'].includes(style.font)) {
    form.page_font = style.font as 'sans' | 'serif' | 'mono'
  }
}

function validate(): boolean {
  let valid = true
  errors.name = ''
  errors.category_id = ''
  errors.price = ''
  errors.stock = ''

  if (!form.name.trim()) {
    errors.name = '식물 이름을 입력해주세요'
    valid = false
  }
  if (!form.category_id) {
    errors.category_id = '카테고리를 선택해주세요'
    valid = false
  }
  if (form.price === '' || Number(form.price) < 0) {
    errors.price = '올바른 가격을 입력해주세요'
    valid = false
  }
  if (form.stock === '' || Number(form.stock) < 0) {
    errors.stock = '올바른 재고 수량을 입력해주세요'
    valid = false
  }
  return valid
}

async function handleDeleteImage(url: string) {
  isDeletingImage.value = url
  const { error } = await deleteImage(url)
  isDeletingImage.value = null

  if (error) {
    showError(error)
    return
  }

  existingImageUrls.value = existingImageUrls.value.filter((u) => u !== url)
  // DB도 즉시 업데이트
  await updatePlant(plantId, {
    image_urls: [...existingImageUrls.value, ...newUploadedUrls.value],
  })
  showSuccess('이미지가 삭제되었습니다')
}

async function handleSubmit() {
  if (!validate()) return
  isSubmitting.value = true

  try {
    // 보류 파일 업로드
    const files = imageUploaderRef.value?.getPendingFiles() ?? []
    const freshUrls: string[] = []

    for (const file of files) {
      const { url, error: uploadError } = await uploadImage(plantId, file)
      if (uploadError) {
        showError(uploadError)
        continue
      }
      if (url) freshUrls.push(url)
    }

    const allImageUrls = [...existingImageUrls.value, ...newUploadedUrls.value, ...freshUrls]

    const payload: PlantUpdate = {
      name: form.name.trim(),
      category_id: form.category_id,
      price: Number(form.price),
      stock: Number(form.stock),
      short_description: form.short_description.trim() || null,
      description: form.description.trim() || null,
      care_guide: form.care_guide.trim() || null,
      caution: form.caution.trim() || null,
      care_level: form.care_level,
      page_bg_color: form.page_bg_color.trim() || null,
      page_bg_image: form.page_bg_image.trim() || null,
      page_font: form.page_font,
      image_position: form.image_position,
      image_scale: form.image_scale,
      image_urls: allImageUrls,
    }

    const { error } = await updatePlant(plantId, payload)
    if (error) {
      showError(error)
      return
    }

    showSuccess('식물 정보가 저장되었습니다')
    await navigateTo('/admin')
  } finally {
    isSubmitting.value = false
  }
}

onMounted(async () => {
  await fetchCategories()

  // 단건 로드를 위해 useSupabase로 직접 조회
  const supabase = useSupabase()
  const { data: plant, error } = await supabase
    .from('plants')
    .select('*')
    .eq('id', plantId)
    .single()

  if (error || !plant) {
    showError('식물 정보를 불러오지 못했습니다')
    await navigateTo('/admin')
    return
  }

  form.name = plant.name
  form.category_id = plant.category_id
  form.price = String(plant.price)
  form.stock = String(plant.stock)
  form.short_description = plant.short_description ?? ''
  form.description = plant.description ?? ''
  form.care_guide = plant.care_guide ?? ''
  form.caution = plant.caution ?? ''
  form.care_level = (plant.care_level as 'easy' | 'normal' | 'hard') ?? 'normal'
  form.page_bg_color = plant.page_bg_color ?? ''
  form.page_bg_image = plant.page_bg_image ?? ''
  form.page_font = (plant.page_font as 'sans' | 'serif' | 'mono') ?? 'sans'
  form.image_position = plant.image_position ?? '50% 50%'
  form.image_scale = plant.image_scale ?? 1.0
  existingImageUrls.value = [...plant.image_urls]

  isLoading.value = false
})
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <AdminHeader />
    <CommonToast />

    <div class="max-w-[480px] mx-auto px-4 py-4">
      <!-- 헤더 -->
      <div class="flex items-center gap-3 mb-6">
        <NuxtLink to="/admin" class="text-gray-400 hover:text-gray-600 p-1 -ml-1">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </NuxtLink>
        <h1 class="text-xl font-bold text-gray-900">식물 수정</h1>
      </div>

      <div v-if="isLoading" class="text-center py-16 text-gray-400 text-sm">
        불러오는 중...
      </div>

      <template v-else>
        <!-- AI 어시스턴트 채팅 -->
        <div class="mb-6">
          <AdminAiChat
            :form-state="chatFormState"
            :image-urls="[...existingImageUrls, ...newUploadedUrls]"
            :plant-id="plantId"
            @fill-fields="handleAiFillFields"
            @generate-image="handleAiGenerateImage"
            @style-page="handleAiStylePage"
            @register-image="handleAiRegisterImage"
          />
        </div>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <!-- 이름 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            식물 이름 <span class="text-red-500">*</span>
          </label>
          <input
            v-model="form.name"
            type="text"
            maxlength="100"
            placeholder="식물 이름을 입력해주세요"
            class="w-full px-4 py-3 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
            :class="errors.name ? 'border-red-400' : 'border-gray-300'"
          />
          <p v-if="errors.name" class="text-red-500 text-xs mt-1">{{ errors.name }}</p>
        </div>

        <!-- 카테고리 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            카테고리 <span class="text-red-500">*</span>
          </label>
          <select
            v-model="form.category_id"
            class="w-full px-4 py-3 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
            :class="errors.category_id ? 'border-red-400' : 'border-gray-300'"
          >
            <option value="" disabled>카테고리 선택</option>
            <option v-for="cat in categories" :key="cat.id" :value="cat.id">
              {{ cat.name }}
            </option>
          </select>
          <p v-if="errors.category_id" class="text-red-500 text-xs mt-1">{{ errors.category_id }}</p>
        </div>

        <!-- 가격 / 재고 -->
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              가격 (원) <span class="text-red-500">*</span>
            </label>
            <input
              v-model="form.price"
              type="number"
              min="0"
              placeholder="0"
              class="w-full px-4 py-3 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
              :class="errors.price ? 'border-red-400' : 'border-gray-300'"
            />
            <p v-if="errors.price" class="text-red-500 text-xs mt-1">{{ errors.price }}</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              재고 <span class="text-red-500">*</span>
            </label>
            <input
              v-model="form.stock"
              type="number"
              min="0"
              placeholder="0"
              class="w-full px-4 py-3 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
              :class="errors.stock ? 'border-red-400' : 'border-gray-300'"
            />
            <p v-if="errors.stock" class="text-red-500 text-xs mt-1">{{ errors.stock }}</p>
          </div>
        </div>

        <!-- 간단 설명 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">간단 설명</label>
          <input
            v-model="form.short_description"
            type="text"
            placeholder="한 줄 설명 (선택)"
            class="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
          />
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

        <!-- 상세 설명 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">상세 설명</label>
          <textarea
            v-model="form.description"
            rows="4"
            maxlength="2000"
            placeholder="상세 설명을 입력해주세요 (선택)"
            class="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
          />
          <p class="text-xs text-gray-400 mt-1 text-right">{{ form.description.length }} / 2000</p>
        </div>

        <!-- 키우는 방법 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">키우는 방법</label>
          <textarea
            v-model="form.care_guide"
            rows="3"
            placeholder="키우는 방법을 입력해주세요 (선택)"
            class="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
          />
        </div>

        <!-- 주의사항 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">주의사항</label>
          <textarea
            v-model="form.caution"
            rows="3"
            placeholder="주의사항을 입력해주세요 (선택)"
            class="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
          />
        </div>

        <!-- 이미지 위치/크기 조절 -->
        <div class="rounded-xl border border-gray-200 p-4 space-y-3">
          <div>
            <p class="text-sm font-semibold text-gray-700">이미지 위치 · 크기</p>
            <p class="text-xs text-gray-400 mt-0.5">상세 페이지 hero 및 식물 목록 썸네일에 적용됩니다</p>
          </div>
          <div v-if="existingImageUrls.length > 0 || newUploadedUrls.length > 0">
            <AdminImagePositionEditor
              v-model="imageEditorValue"
              :image-url="existingImageUrls[0] || newUploadedUrls[0]"
            />
          </div>
          <p v-else class="text-xs text-gray-400 py-2">이미지를 먼저 등록해주세요</p>
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
                class="text-xs text-gray-400 hover:text-gray-600 shrink-0">초기화</button>
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

        <!-- 기존 이미지 목록 -->
        <div v-if="existingImageUrls.length > 0">
          <label class="block text-sm font-medium text-gray-700 mb-2">등록된 이미지</label>
          <div class="grid grid-cols-3 gap-2">
            <div
              v-for="url in existingImageUrls"
              :key="url"
              class="relative aspect-square rounded-xl overflow-hidden bg-gray-100"
            >
              <img :src="url" class="w-full h-full object-cover" />
              <button
                type="button"
                @click="handleDeleteImage(url)"
                :disabled="isDeletingImage === url"
                class="absolute top-1 right-1 bg-black/50 hover:bg-black/70 text-white rounded-full w-5 h-5 flex items-center justify-center transition-colors"
              >
                <svg v-if="isDeletingImage === url" class="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <svg v-else class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- 추가 이미지 업로더 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            이미지 추가
            <span class="text-gray-400 text-xs">(최대 5장)</span>
          </label>
          <AdminImageUploader
            ref="imageUploaderRef"
            v-model="newUploadedUrls"
            :plant-id="plantId"
          />
        </div>

        <!-- 버튼 -->
        <div class="flex gap-3 pt-2 pb-6">
          <NuxtLink
            to="/admin"
            class="flex-1 py-3 text-sm font-medium text-center border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
          >
            취소
          </NuxtLink>
          <button
            type="submit"
            :disabled="isSubmitting"
            class="flex-1 py-3 text-sm font-medium bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <svg v-if="isSubmitting" class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {{ isSubmitting ? '저장 중...' : '저장' }}
          </button>
        </div>
      </form>
      </template>
    </div>
  </div>
</template>
