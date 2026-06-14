<script setup lang="ts">
import { HOME_DEFAULT_PHRASES } from '~/composables/useHomeSettings'
import type { HomeSettings } from '~/composables/useHomeSettings'

definePageMeta({ middleware: 'auth' })

const { fetchSettings, saveSettings, uploadHeroImage, deleteHeroImage } = useHomeSettings()
const { showSuccess, showError } = useToast()

const isLoading = ref(true)
const isSaving = ref(false)
const isUploading = ref(false)

const form = reactive<Pick<HomeSettings, 'hero_images' | 'hero_phrases' | 'hero_image_opacity'>>({
  hero_images: [],
  hero_phrases: [...HOME_DEFAULT_PHRASES],
  hero_image_opacity: 0.5,
})

const newPhrase = ref('')
const fileInputRef = ref<HTMLInputElement | null>(null)

async function load() {
  isLoading.value = true
  const { data } = await fetchSettings()
  if (data) {
    form.hero_images = data.hero_images ?? []
    form.hero_phrases = data.hero_phrases?.length ? data.hero_phrases : [...HOME_DEFAULT_PHRASES]
    form.hero_image_opacity = data.hero_image_opacity ?? 0.5
  }
  isLoading.value = false
}

async function handleImageUpload(e: Event) {
  const files = (e.target as HTMLInputElement).files
  if (!files?.length) return

  isUploading.value = true
  for (const file of Array.from(files)) {
    const { url, error } = await uploadHeroImage(file)
    if (error) {
      showError(error)
    } else if (url) {
      form.hero_images = [...form.hero_images, url]
    }
  }
  isUploading.value = false
  if (fileInputRef.value) fileInputRef.value.value = ''
}

async function removeImage(url: string, i: number) {
  form.hero_images = form.hero_images.filter((_, idx) => idx !== i)
  await deleteHeroImage(url)
}

function addPhrase() {
  const t = newPhrase.value.trim()
  if (!t) return
  form.hero_phrases = [...form.hero_phrases, t]
  newPhrase.value = ''
}

function removePhrase(i: number) {
  form.hero_phrases = form.hero_phrases.filter((_, idx) => idx !== i)
}

async function handleSave() {
  isSaving.value = true
  const { error } = await saveSettings({
    hero_images: form.hero_images,
    hero_phrases: form.hero_phrases,
    hero_image_opacity: form.hero_image_opacity,
  })
  isSaving.value = false
  if (error) showError('저장 실패: ' + error)
  else showSuccess('홈 화면 설정이 저장되었습니다')
}

onMounted(load)
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <AdminHeader />
    <CommonToast />

    <div class="max-w-[480px] mx-auto px-4 py-4 pb-24">
      <div class="flex items-center gap-3 mb-5">
        <NuxtLink to="/admin" class="text-gray-400 hover:text-gray-600">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </NuxtLink>
        <h1 class="text-lg font-bold text-gray-800">홈 화면 편집</h1>
      </div>

      <div v-if="isLoading" class="text-center py-16 text-gray-400 text-sm">불러오는 중...</div>

      <div v-else class="space-y-5">

        <!-- 배경 사진 -->
        <div class="bg-white rounded-2xl p-4 shadow-sm">
          <h2 class="text-sm font-semibold text-gray-700 mb-3">배경 사진</h2>
          <p class="text-xs text-gray-400 mb-3">여러 장 업로드 시 접속마다 랜덤 표시됩니다.</p>

          <!-- 업로드 버튼 -->
          <input
            ref="fileInputRef"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            class="hidden"
            @change="handleImageUpload"
          />
          <button
            type="button"
            @click="fileInputRef?.click()"
            :disabled="isUploading"
            class="w-full py-3 text-sm font-medium rounded-xl border-2 border-dashed border-gray-300 text-gray-500 hover:border-green-400 hover:text-green-600 transition-colors disabled:opacity-50"
          >
            {{ isUploading ? '업로드 중...' : '+ 사진 추가' }}
          </button>

          <!-- 이미지 그리드 -->
          <div v-if="form.hero_images.length" class="grid grid-cols-2 gap-2 mt-3">
            <div
              v-for="(url, i) in form.hero_images"
              :key="i"
              class="relative group aspect-[3/2] rounded-xl overflow-hidden bg-gray-100"
            >
              <img :src="url" class="w-full h-full object-cover" />
              <button
                type="button"
                @click="removeImage(url, i)"
                class="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 hover:bg-red-500 text-white rounded-full flex items-center justify-center text-xs transition-colors"
              >
                ✕
              </button>
            </div>
          </div>
          <p v-else class="text-xs text-gray-400 text-center mt-3">사진이 없으면 기존 텍스트 배경만 표시됩니다.</p>
        </div>

        <!-- 이미지 투명도 -->
        <div class="bg-white rounded-2xl p-4 shadow-sm">
          <div class="flex items-center justify-between mb-2">
            <h2 class="text-sm font-semibold text-gray-700">배경 사진 밝기/투명도</h2>
            <span class="text-xs font-mono text-gray-500">{{ Math.round(form.hero_image_opacity * 100) }}%</span>
          </div>
          <p class="text-xs text-gray-400 mb-3">낮을수록 사진이 연해져 글자가 선명해집니다.</p>
          <input
            v-model.number="form.hero_image_opacity"
            type="range"
            min="0.05"
            max="1"
            step="0.05"
            class="w-full h-1.5 accent-green-600 cursor-pointer"
          />
          <div class="flex justify-between text-[10px] text-gray-400 mt-1">
            <span>연하게</span>
            <span>진하게</span>
          </div>

          <!-- 프리뷰 -->
          <div v-if="form.hero_images.length" class="mt-3 relative rounded-xl overflow-hidden h-28 bg-gray-100">
            <img
              :src="form.hero_images[0]"
              class="w-full h-full object-cover"
              :style="`opacity: ${form.hero_image_opacity}`"
            />
            <div class="absolute inset-0 flex items-center justify-center">
              <p class="text-base font-bold text-gray-800 drop-shadow">글자 미리보기</p>
            </div>
          </div>
        </div>

        <!-- 글귀 -->
        <div class="bg-white rounded-2xl p-4 shadow-sm">
          <h2 class="text-sm font-semibold text-gray-700 mb-1">글귀</h2>
          <p class="text-xs text-gray-400 mb-3">접속마다 랜덤으로 하나가 표시됩니다.</p>

          <!-- 새 글귀 입력 -->
          <div class="flex gap-2 mb-3">
            <input
              v-model="newPhrase"
              type="text"
              placeholder="새 글귀 입력..."
              class="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400"
              @keydown.enter.prevent="addPhrase"
            />
            <button
              type="button"
              @click="addPhrase"
              class="px-3 py-2 text-sm font-medium bg-green-600 hover:bg-green-700 text-white rounded-xl transition-colors"
            >
              추가
            </button>
          </div>

          <!-- 글귀 목록 -->
          <div class="space-y-1.5">
            <div
              v-for="(phrase, i) in form.hero_phrases"
              :key="i"
              class="flex items-center gap-2 px-3 py-2.5 bg-gray-50 rounded-xl"
            >
              <span class="text-xs text-gray-400 shrink-0 w-5 text-right">{{ i + 1 }}</span>
              <span class="flex-1 text-sm text-gray-700 leading-snug">{{ phrase }}</span>
              <button
                type="button"
                @click="removePhrase(i)"
                class="shrink-0 text-gray-300 hover:text-red-400 transition-colors text-lg leading-none"
              >
                ×
              </button>
            </div>
            <p v-if="!form.hero_phrases.length" class="text-xs text-gray-400 text-center py-3">
              글귀가 없습니다. 위에서 추가해주세요.
            </p>
          </div>
        </div>

      </div>
    </div>

    <!-- 저장 버튼 (하단 고정) -->
    <div class="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 px-4 py-3">
      <div class="max-w-[480px] mx-auto">
        <button
          type="button"
          @click="handleSave"
          :disabled="isSaving"
          class="w-full py-3 text-sm font-semibold rounded-xl bg-green-600 hover:bg-green-700 text-white transition-colors disabled:opacity-50"
        >
          {{ isSaving ? '저장 중...' : '저장' }}
        </button>
      </div>
    </div>
  </div>
</template>
