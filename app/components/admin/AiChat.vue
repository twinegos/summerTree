<script setup lang="ts">
interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  imageUrl?: string
  isLoading?: boolean
}

interface FillFieldsAction {
  name?: string
  short_description?: string
  description?: string
  care_guide?: string
  caution?: string
  suggested_category?: string
  price?: number
}

interface Props {
  formState: {
    name: string
    category_name: string
    price: string
    short_description: string
    description: string
    care_guide: string
    caution: string
  }
}

const props = defineProps<Props>()
interface StylePageAction {
  bg_color?: string
  bg_image_url?: string
  font?: string
}

const emit = defineEmits<{
  'fill-fields': [fields: FillFieldsAction]
  'generate-image': [imageUrl: string]
  'style-page': [style: StylePageAction]
}>()

const messages = ref<ChatMessage[]>([
  {
    role: 'assistant',
    content: '안녕하세요! 식물 등록을 도와드릴게요.\n\n사진 URL을 붙여넣으면 정보를 자동으로 채워드리고, 이미지 생성도 가능해요. 궁금한 점이 있으면 편하게 말씀해주세요.',
  },
])
const input = ref('')
const attachedImageUrl = ref('')
const showImageInput = ref(false)
const isLoading = ref(false)
const messagesEl = ref<HTMLElement | null>(null)

async function scrollToBottom() {
  await nextTick()
  if (messagesEl.value) {
    messagesEl.value.scrollTop = messagesEl.value.scrollHeight
  }
}

async function send() {
  const text = input.value.trim()
  if (!text || isLoading.value) return

  const userMsg: ChatMessage = { role: 'user', content: text }
  if (attachedImageUrl.value.trim()) {
    userMsg.imageUrl = attachedImageUrl.value.trim()
  }
  messages.value.push(userMsg)
  input.value = ''

  const imageUrlToSend = attachedImageUrl.value.trim()
  attachedImageUrl.value = ''
  showImageInput.value = false

  isLoading.value = true
  const loadingMsg: ChatMessage = { role: 'assistant', content: '', isLoading: true }
  messages.value.push(loadingMsg)
  await scrollToBottom()

  try {
    const history = messages.value
      .filter(m => !m.isLoading && m.role !== 'system')
      .slice(0, -1)
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))

    const res = await $fetch<{
      reply: string
      actions: Array<{
        type: 'fill_fields' | 'generate_image' | 'edit_image' | 'style_page'
        fields?: FillFieldsAction
        prompt?: string
        imageUrl?: string
        style?: StylePageAction
      }>
    }>('/api/admin/ai/chat', {
      method: 'POST',
      body: {
        messages: [...history, { role: 'user', content: userMsg.content }],
        formState: props.formState,
        imageUrl: imageUrlToSend || undefined,
      },
    })

    messages.value.pop() // remove loading

    let replyText = res.reply || ''

    for (const action of res.actions) {
      if (action.type === 'fill_fields' && action.fields) {
        emit('fill-fields', action.fields)
      } else if (action.type === 'generate_image' && action.prompt) {
        replyText = replyText || '이미지를 생성할게요...'
        messages.value.push({ role: 'assistant', content: replyText })
        await scrollToBottom()
        replyText = ''

        const genLoadingMsg: ChatMessage = { role: 'system', content: '🎨 이미지 생성 중...', isLoading: true }
        messages.value.push(genLoadingMsg)
        await scrollToBottom()

        try {
          const genRes = await $fetch<{ imageUrl: string }>('/api/admin/ai/generate-image', {
            method: 'POST',
            body: { prompt: action.prompt },
          })
          messages.value.pop()
          messages.value.push({ role: 'system', content: '이미지가 생성되었어요!', imageUrl: genRes.imageUrl })
          emit('generate-image', genRes.imageUrl)
        } catch (genErr: unknown) {
          messages.value.pop()
          const errMsg = (genErr as { statusMessage?: string })?.statusMessage || '이미지 생성에 실패했어요. OPENAI_API_KEY를 확인해주세요.'
          messages.value.push({ role: 'system', content: errMsg })
        }
        await scrollToBottom()
      } else if (action.type === 'edit_image' && action.prompt && action.imageUrl) {
        replyText = replyText || '이미지를 수정할게요...'
        messages.value.push({ role: 'assistant', content: replyText })
        await scrollToBottom()
        replyText = ''

        const editLoadingMsg: ChatMessage = { role: 'system', content: '✏️ 이미지 수정 중...', isLoading: true }
        messages.value.push(editLoadingMsg)
        await scrollToBottom()

        try {
          const editRes = await $fetch<{ imageUrl: string }>('/api/admin/ai/edit-image', {
            method: 'POST',
            body: { imageUrl: action.imageUrl, prompt: action.prompt },
          })
          messages.value.pop()
          messages.value.push({ role: 'system', content: '이미지 수정이 완료됐어요!', imageUrl: editRes.imageUrl })
          emit('generate-image', editRes.imageUrl)
        } catch (editErr: unknown) {
          messages.value.pop()
          const errMsg = (editErr as { statusMessage?: string })?.statusMessage || '이미지 수정에 실패했어요.'
          messages.value.push({ role: 'system', content: errMsg })
        }
        await scrollToBottom()
      } else if (action.type === 'style_page' && action.style) {
        emit('style-page', action.style)
        if (!replyText) {
          const parts = []
          if (action.style.bg_color) parts.push(`배경색 ${action.style.bg_color}`)
          if (action.style.bg_image_url) parts.push('배경 이미지')
          if (action.style.font) parts.push(`폰트 ${action.style.font}`)
          replyText = `페이지 스타일을 변경했어요! (${parts.join(', ')})`
        }
      }
    }

    if (replyText) {
      messages.value.push({ role: 'assistant', content: replyText })
    }
  } catch (e: unknown) {
    messages.value.pop()
    const err = e as { statusMessage?: string }
    let errMsg = 'AI 응답에 실패했어요.'
    if (err?.statusMessage?.includes('ANTHROPIC_API_KEY')) {
      errMsg = '.env에 ANTHROPIC_API_KEY를 설정해주세요.'
    }
    messages.value.push({ role: 'system', content: errMsg })
  } finally {
    isLoading.value = false
    await scrollToBottom()
  }
}

function handleEnter(e: KeyboardEvent) {
  if (e.shiftKey) return
  e.preventDefault()
  send()
}
</script>

<template>
  <div class="border border-gray-200 rounded-xl overflow-hidden bg-white flex flex-col" style="height: 380px;">
    <!-- 헤더 -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50 shrink-0">
      <div class="flex items-center gap-2">
        <span class="text-sm font-semibold text-gray-700">AI 어시스턴트</span>
        <span class="text-xs text-gray-400">Claude · Nano Banana</span>
      </div>
    </div>

    <!-- 메시지 목록 -->
    <div ref="messagesEl" class="flex-1 overflow-y-auto px-4 py-3 space-y-3 scroll-smooth">
      <template v-for="(msg, i) in messages" :key="i">
        <!-- 사용자 메시지 -->
        <div v-if="msg.role === 'user'" class="flex justify-end">
          <div class="max-w-[80%] space-y-1">
            <div v-if="msg.imageUrl" class="flex justify-end">
              <img :src="msg.imageUrl" class="h-16 w-16 object-cover rounded-lg border border-gray-200" />
            </div>
            <div class="bg-gray-800 text-white text-sm px-3 py-2 rounded-2xl rounded-tr-sm leading-relaxed" style="white-space: pre-wrap;">{{ msg.content }}</div>
          </div>
        </div>

        <!-- AI 응답 -->
        <div v-else-if="msg.role === 'assistant'" class="flex justify-start">
          <div class="max-w-[85%] bg-green-50 border border-green-100 text-sm px-3 py-2 rounded-2xl rounded-tl-sm leading-relaxed text-gray-800" style="white-space: pre-wrap;">
            <span v-if="msg.isLoading" class="flex items-center gap-1.5 text-gray-400">
              <span class="flex gap-0.5">
                <span class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0ms;" />
                <span class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 150ms;" />
                <span class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 300ms;" />
              </span>
            </span>
            <template v-else>{{ msg.content }}</template>
          </div>
        </div>

        <!-- 시스템 메시지 (이미지 생성 등) -->
        <div v-else class="flex justify-start">
          <div class="max-w-[85%] space-y-2">
            <div v-if="msg.isLoading" class="text-xs text-blue-500 flex items-center gap-1.5">
              <svg class="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {{ msg.content }}
            </div>
            <template v-else>
              <div v-if="msg.imageUrl" class="space-y-1">
                <img :src="msg.imageUrl" class="w-32 h-32 object-cover rounded-xl border border-gray-200" />
                <p class="text-xs text-gray-500">{{ msg.content }}</p>
              </div>
              <p v-else class="text-xs text-gray-500 px-1">{{ msg.content }}</p>
            </template>
          </div>
        </div>
      </template>
    </div>

    <!-- 이미지 URL 첨부 -->
    <div v-if="showImageInput" class="px-3 pb-2 shrink-0">
      <div class="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
        <svg class="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <input
          v-model="attachedImageUrl"
          type="url"
          placeholder="식물 사진 URL 붙여넣기"
          class="flex-1 text-xs bg-transparent focus:outline-none text-gray-700 placeholder-gray-400"
        />
        <button type="button" @click="showImageInput = false; attachedImageUrl = ''" class="text-gray-400 hover:text-gray-600">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>

    <!-- 입력창 -->
    <div class="px-3 pb-3 shrink-0 border-t border-gray-100">
      <div class="flex items-end gap-2 pt-2">
        <!-- 이미지 첨부 버튼 -->
        <button
          type="button"
          @click="showImageInput = !showImageInput"
          class="shrink-0 p-2 rounded-lg transition-colors"
          :class="showImageInput ? 'bg-green-100 text-green-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>

        <textarea
          v-model="input"
          rows="1"
          placeholder="메시지 입력... (예: 이 사진 식물 분석해줘, 몬스테라 이미지 만들어줘)"
          class="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 resize-none bg-white"
          style="max-height: 80px;"
          @keydown.enter="handleEnter"
        />
        <button
          type="button"
          @click="send"
          :disabled="!input.trim() || isLoading"
          class="shrink-0 p-2 rounded-xl transition-colors"
          :class="input.trim() && !isLoading ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-gray-100 text-gray-400'"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>
