<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
})

const { signIn, isLoading } = useAuth()

const email = ref('')
const password = ref('')
const errorMessage = ref<string | null>(null)

async function handleLogin() {
  errorMessage.value = null
  const { error } = await signIn(email.value, password.value)
  if (error) {
    errorMessage.value = error
  } else {
    await navigateTo('/admin')
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center px-4">
    <div class="w-full max-w-[480px]">
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <h1 class="text-2xl font-bold text-green-700 text-center mb-8">
          summerTree 관리자
        </h1>

        <form @submit.prevent="handleLogin" class="space-y-4">
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700 mb-1">
              이메일
            </label>
            <input
              id="email"
              v-model="email"
              type="email"
              placeholder="관리자 이메일"
              required
              :disabled="isLoading"
              class="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          <div>
            <label for="password" class="block text-sm font-medium text-gray-700 mb-1">
              비밀번호
            </label>
            <input
              id="password"
              v-model="password"
              type="password"
              placeholder="비밀번호"
              required
              :disabled="isLoading"
              class="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          <div v-if="errorMessage" class="text-red-600 text-sm bg-red-50 px-4 py-3 rounded-xl">
            {{ errorMessage }}
          </div>

          <button
            type="submit"
            :disabled="isLoading"
            class="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium py-3 rounded-xl transition-colors flex items-center justify-center gap-2 mt-2"
          >
            <svg
              v-if="isLoading"
              class="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {{ isLoading ? '로그인 중...' : '로그인' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>
