<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean
  plantName: string
  plantId: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: [id: string]
}>()

function close() {
  emit('update:modelValue', false)
}

function handleConfirm() {
  emit('confirm', props.plantId)
}
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
        class="fixed inset-0 z-50 flex items-center justify-center px-4"
        @click.self="close"
      >
        <div class="absolute inset-0 bg-black/40" @click="close" />
        <div class="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
          <h2 class="text-lg font-bold text-gray-900 mb-2">식물 삭제</h2>
          <p class="text-sm text-gray-600 mb-6">
            <span class="font-medium text-gray-900">{{ plantName }}</span>을(를) 정말 삭제하시겠습니까?<br />
            삭제된 데이터는 복구할 수 없습니다.
          </p>
          <div class="flex gap-3">
            <button
              @click="close"
              class="flex-1 py-2.5 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
            <button
              @click="handleConfirm"
              class="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors"
            >
              삭제
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
