<script setup lang="ts">
import type { CategoryRow } from '~/types/database.types'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const { categories, isLoading, fetchCategories, createCategory, updateCategory, deleteCategory } =
  useCategories()
const { showSuccess, showError } = useToast()

// 새 카테고리 폼
const newName = ref('')
const newDescription = ref('')
const isCreating = ref(false)

// 인라인 수정 상태
const editingId = ref<string | null>(null)
const editName = ref('')
const editDescription = ref('')
const isSaving = ref(false)

function close() {
  emit('update:modelValue', false)
}

function startEdit(cat: CategoryRow) {
  editingId.value = cat.id
  editName.value = cat.name
  editDescription.value = cat.description ?? ''
}

function cancelEdit() {
  editingId.value = null
}

async function handleCreate() {
  if (!newName.value.trim()) return
  isCreating.value = true
  const { error } = await createCategory({
    name: newName.value,
    description: newDescription.value.trim() || null,
  })
  isCreating.value = false
  if (error) {
    showError(error)
  } else {
    showSuccess('카테고리가 추가되었습니다')
    newName.value = ''
    newDescription.value = ''
    await fetchCategories()
  }
}

async function handleUpdate(id: string) {
  if (!editName.value.trim()) return
  isSaving.value = true
  const { error } = await updateCategory(id, {
    name: editName.value,
    description: editDescription.value.trim() || null,
  })
  isSaving.value = false
  if (error) {
    showError(error)
  } else {
    showSuccess('카테고리가 수정되었습니다')
    editingId.value = null
    await fetchCategories()
  }
}

async function handleDelete(cat: CategoryRow) {
  const { error } = await deleteCategory(cat.id)
  if (error) {
    showError(error)
  } else {
    showSuccess('카테고리가 삭제되었습니다')
    await fetchCategories()
  }
}

// 모달 열릴 때 카테고리 목록 로드
watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      fetchCategories()
      editingId.value = null
      newName.value = ''
      newDescription.value = ''
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
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
        @click.self="close"
      >
        <div class="absolute inset-0 bg-black/40" @click="close" />
        <div class="relative bg-white w-full max-w-[480px] rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[85vh] flex flex-col">
          <!-- 헤더 -->
          <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 class="text-lg font-bold text-gray-900">카테고리 관리</h2>
            <button @click="close" class="text-gray-400 hover:text-gray-600 p-1">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- 카테고리 목록 -->
          <div class="flex-1 overflow-y-auto px-5 py-4 space-y-2">
            <div v-if="isLoading" class="text-center py-8 text-gray-400 text-sm">
              불러오는 중...
            </div>
            <div v-else-if="categories.length === 0" class="text-center py-8 text-gray-400 text-sm">
              등록된 카테고리가 없습니다
            </div>
            <template v-else>
              <div
                v-for="cat in categories"
                :key="cat.id"
                class="border border-gray-200 rounded-xl p-3"
              >
                <!-- 수정 폼 -->
                <template v-if="editingId === cat.id">
                  <div class="space-y-2">
                    <input
                      v-model="editName"
                      type="text"
                      placeholder="카테고리 이름"
                      maxlength="50"
                      class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <input
                      v-model="editDescription"
                      type="text"
                      placeholder="설명 (선택)"
                      class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <div class="flex gap-2">
                      <button
                        @click="cancelEdit"
                        class="flex-1 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
                      >
                        취소
                      </button>
                      <button
                        @click="handleUpdate(cat.id)"
                        :disabled="isSaving"
                        class="flex-1 py-1.5 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50"
                      >
                        {{ isSaving ? '저장 중...' : '저장' }}
                      </button>
                    </div>
                  </div>
                </template>
                <!-- 카테고리 행 -->
                <template v-else>
                  <div class="flex items-center gap-2">
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-medium text-gray-800 truncate">{{ cat.name }}</p>
                      <p v-if="cat.description" class="text-xs text-gray-400 truncate">{{ cat.description }}</p>
                    </div>
                    <button
                      @click="startEdit(cat)"
                      class="text-xs px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors shrink-0"
                    >
                      수정
                    </button>
                    <button
                      @click="handleDelete(cat)"
                      class="text-xs px-2.5 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors shrink-0"
                    >
                      삭제
                    </button>
                  </div>
                </template>
              </div>
            </template>
          </div>

          <!-- 새 카테고리 추가 폼 -->
          <div class="border-t border-gray-100 px-5 py-4">
            <p class="text-xs font-medium text-gray-500 mb-2">새 카테고리 추가</p>
            <div class="space-y-2">
              <input
                v-model="newName"
                type="text"
                placeholder="카테고리 이름 *"
                maxlength="50"
                class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <input
                v-model="newDescription"
                type="text"
                placeholder="설명 (선택)"
                class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <button
                @click="handleCreate"
                :disabled="isCreating || !newName.trim()"
                class="w-full py-2.5 text-sm bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white rounded-xl font-medium transition-colors"
              >
                {{ isCreating ? '추가 중...' : '추가' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
