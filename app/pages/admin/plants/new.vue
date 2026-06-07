<script setup lang="ts">
import type { PlantInsert } from '~/types/database.types'

definePageMeta({ middleware: 'auth' })

const { categories, fetchCategories } = useCategories()
const { createPlant, updatePlant } = usePlants()
const { uploadImage } = useStorage()
const { showSuccess, showError } = useToast()

const imageUploaderRef = ref<{ getPendingFiles: () => File[] } | null>(null)

const form = reactive({
  name: '',
  category_id: '',
  price: '',
  stock: '0',
  short_description: '',
  description: '',
  care_guide: '',
  caution: '',
})

const uploadedUrls = ref<string[]>([])
const isSubmitting = ref(false)

const errors = reactive({ name: '', category_id: '', price: '', stock: '' })

// AI 상태
const aiImageUrl = ref('')
const isAnalyzing = ref(false)
const isGenerating = ref(false)
const imagePrompt = ref('')
const generatedImageUrl = ref('')

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

async function handleAnalyze() {
  if (!aiImageUrl.value.trim() || isAnalyzing.value) return
  isAnalyzing.value = true
  try {
    const data = await $fetch<{
      name: string
      short_description: string
      description: string
      care_guide: string
      caution: string
      suggested_category: string
    }>('/api/admin/ai/analyze', {
      method: 'POST',
      body: { imageUrl: aiImageUrl.value.trim() },
    })
    form.name = data.name || form.name
    form.short_description = data.short_description || form.short_description
    form.description = data.description || form.description
    form.care_guide = data.care_guide || form.care_guide
    form.caution = data.caution || form.caution
    // 카테고리 자동 매칭
    const matched = categories.value.find(c =>
      c.name.includes(data.suggested_category) || data.suggested_category.includes(c.name)
    )
    if (matched) form.category_id = matched.id
    showSuccess('AI 분석 완료! 내용을 확인 후 수정해주세요.')
  } catch (e: unknown) {
    const err = e as { statusMessage?: string }
    if (err?.statusMessage?.includes('ANTHROPIC_API_KEY')) {
      showError('.env에 ANTHROPIC_API_KEY를 설정해주세요')
    } else {
      showError('AI 분석에 실패했습니다')
    }
  } finally {
    isAnalyzing.value = false
  }
}

async function handleGenerateImage() {
  if (!imagePrompt.value.trim() || isGenerating.value) return
  isGenerating.value = true
  try {
    const data = await $fetch<{ imageUrl: string }>('/api/admin/ai/generate-image', {
      method: 'POST',
      body: { prompt: imagePrompt.value.trim() },
    })
    generatedImageUrl.value = data.imageUrl
  } catch (e: unknown) {
    const err = e as { statusMessage?: string }
    if (err?.statusMessage?.includes('GOOGLE_AI_API_KEY')) {
      showError('.env에 GOOGLE_AI_API_KEY를 설정해주세요')
    } else {
      showError('이미지 생성에 실패했습니다')
    }
  } finally {
    isGenerating.value = false
  }
}

function useGeneratedImage() {
  if (generatedImageUrl.value) {
    uploadedUrls.value = [generatedImageUrl.value, ...uploadedUrls.value]
    generatedImageUrl.value = ''
    showSuccess('생성된 이미지를 추가했습니다')
  }
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
      image_urls: [],
    }

    const { data: plant, error: createError } = await createPlant(payload)
    if (createError || !plant) { showError(createError ?? '등록에 실패했습니다'); return }

    const pendingFiles = imageUploaderRef.value?.getPendingFiles() ?? []
    const newUrls: string[] = []
    for (const file of pendingFiles) {
      const { url, error: uploadError } = await uploadImage(plant.id, file)
      if (uploadError) { showError(uploadError); continue }
      if (url) newUrls.push(url)
    }

    const allUrls = [...uploadedUrls.value, ...newUrls]
    if (allUrls.length > 0) {
      await updatePlant(plant.id, { image_urls: allUrls })
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

      <!-- AI 자동 입력 섹션 -->
      <div class="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
        <p class="text-sm font-bold text-green-800 mb-1">AI 자동 입력</p>
        <p class="text-xs text-green-600 mb-3">식물 사진 URL을 입력하면 Claude가 자동으로 정보를 채워줍니다.</p>
        <div class="flex gap-2">
          <input
            v-model="aiImageUrl"
            type="url"
            placeholder="https://example.com/plant.jpg"
            class="flex-1 px-3 py-2 text-sm border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
          />
          <button
            type="button"
            @click="handleAnalyze"
            :disabled="!aiImageUrl.trim() || isAnalyzing"
            class="px-4 py-2 text-sm font-medium bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5"
          >
            <svg v-if="isAnalyzing" class="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {{ isAnalyzing ? '분석 중...' : 'AI 분석' }}
          </button>
        </div>
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

        <!-- 상세 설명 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">상세 설명</label>
          <textarea v-model="form.description" rows="4" maxlength="2000" placeholder="상세 설명을 입력해주세요 (선택)"
            class="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
          <p class="text-xs text-gray-400 mt-1 text-right">{{ form.description.length }} / 2000</p>
        </div>

        <!-- 키우는 방법 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">키우는 방법</label>
          <textarea v-model="form.care_guide" rows="3" placeholder="키우는 방법을 입력해주세요 (선택)"
            class="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
        </div>

        <!-- 주의사항 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">주의사항</label>
          <textarea v-model="form.caution" rows="3" placeholder="주의사항을 입력해주세요 (선택)"
            class="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
        </div>

        <!-- 이미지 업로더 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">이미지 <span class="text-gray-400 text-xs">(최대 5장)</span></label>
          <AdminImageUploader ref="imageUploaderRef" v-model="uploadedUrls" :plant-id="null" />
        </div>

        <!-- AI 이미지 생성 -->
        <div class="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p class="text-sm font-bold text-blue-800 mb-1">AI 이미지 생성 (Nano Banana)</p>
          <p class="text-xs text-blue-600 mb-3">식물 이름이나 특징을 설명하면 이미지를 생성합니다.</p>
          <div class="flex gap-2 mb-3">
            <input
              v-model="imagePrompt"
              type="text"
              placeholder="예: 흰 화분에 담긴 몬스테라, 밝은 배경"
              class="flex-1 px-3 py-2 text-sm border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
            <button
              type="button"
              @click="handleGenerateImage"
              :disabled="!imagePrompt.trim() || isGenerating"
              class="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5"
            >
              <svg v-if="isGenerating" class="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {{ isGenerating ? '생성 중...' : '생성' }}
            </button>
          </div>
          <div v-if="generatedImageUrl" class="flex gap-3 items-start">
            <img :src="generatedImageUrl" class="w-24 h-24 object-cover rounded-lg border border-blue-200" />
            <button
              type="button"
              @click="useGeneratedImage"
              class="px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              이미지 사용
            </button>
          </div>
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
