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
            @fill-fields="handleAiFillFields"
            @generate-image="handleAiGenerateImage"
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
