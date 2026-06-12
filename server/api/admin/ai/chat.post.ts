import Anthropic from '@anthropic-ai/sdk'

interface FormState {
  name: string
  short_description: string
  description: string
  care_guide: string
  caution: string
  category_name: string
  price: string
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  imageUrl?: string
}

const tools: Anthropic.Tool[] = [
  {
    name: 'fill_fields',
    description: '식물 등록 폼 필드를 채웁니다. 분석한 정보나 작성한 내용을 폼에 자동으로 입력합니다.',
    input_schema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: '식물 이름' },
        short_description: { type: 'string', description: '한 줄 설명 (30자 이내)' },
        description: { type: 'string', description: '상세 설명' },
        care_guide: { type: 'string', description: '키우는 방법 (물주기, 햇빛, 온도 등)' },
        caution: { type: 'string', description: '주의사항' },
        suggested_category: { type: 'string', description: '카테고리 이름 (예: 관엽식물, 다육식물, 선인장 등)' },
        price: { type: 'number', description: '권장 가격 (원)' },
      },
    },
  },
  {
    name: 'generate_image',
    description: 'OpenAI로 식물 이미지를 새로 생성합니다. 이미지가 없을 때 사용합니다.',
    input_schema: {
      type: 'object' as const,
      properties: {
        prompt: { type: 'string', description: '이미지 생성 프롬프트 (영어 권장, 예: monstera plant in white ceramic pot, bright background)' },
      },
      required: ['prompt'],
    },
  },
  {
    name: 'style_page',
    description: '식물 상세 페이지의 디자인 스타일을 변경합니다. 배경색, 배경이미지 URL, 폰트를 설정합니다.',
    input_schema: {
      type: 'object' as const,
      properties: {
        bg_color: { type: 'string', description: 'CSS 배경색 (예: "#F5F0E8", "#D6E8CD"). 배경 이미지가 있으면 이미지 위에 반투명하게 적용됩니다.' },
        bg_image_url: { type: 'string', description: '배경 이미지 URL. 사용자가 제공했거나 이전에 생성된 이미지 URL을 그대로 사용.' },
        font: { type: 'string', enum: ['sans', 'serif', 'mono'], description: 'sans: 기본 고딕, serif: 세리프(고급스러운 느낌), mono: 고정폭(독특한 느낌)' },
      },
    },
  },
  {
    name: 'edit_image',
    description: '기존 이미지를 AI로 수정합니다. 사용자가 이미지를 첨부하고 수정을 요청할 때 사용합니다. 배경 변경, 스타일 변경, 색상 변경, 객체 추가/제거, 이모티콘 스타일 변환 등에 사용합니다.',
    input_schema: {
      type: 'object' as const,
      properties: {
        prompt: { type: 'string', description: '수정 내용 설명 (영어 권장, 예: remove background and make it white, make it look like a cute emoji sticker, change background to soft sage green)' },
        imageUrl: { type: 'string', description: '수정할 이미지 URL. 사용자가 첨부한 이미지 URL, 또는 이전에 생성/수정된 이미지 URL, 또는 현재 등록된 이미지 중 첫 번째 URL을 사용.' },
      },
      required: ['prompt', 'imageUrl'],
    },
  },
  {
    name: 'register_image',
    description: '생성하거나 수정한 이미지를 식물의 대표사진 목록에 등록합니다. 사용자가 "등록해줘", "저장해줘", "사진 추가해줘", "이 사진 써줘" 등을 요청할 때 사용합니다. 이미지를 먼저 생성/수정하지 않고 등록만 요청할 경우에도 사용합니다.',
    input_schema: {
      type: 'object' as const,
      properties: {
        imageUrl: { type: 'string', description: '등록할 이미지 URL. 직전에 생성/수정된 이미지 URL(lastGeneratedImageUrl)을 우선 사용. 없으면 현재 등록된 이미지 중 첫 번째를 사용.' },
      },
      required: ['imageUrl'],
    },
  },
]

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const apiKey = config.anthropicApiKey as string | undefined

  if (!apiKey) {
    throw createError({ statusCode: 503, statusMessage: 'ANTHROPIC_API_KEY가 설정되지 않았습니다. .env에 추가해주세요.' })
  }

  const { messages, formState, imageUrl, imageUrls, lastGeneratedImageUrl } = await readBody(event) as {
    messages: ChatMessage[]
    formState: FormState
    imageUrl?: string
    imageUrls?: string[]
    lastGeneratedImageUrl?: string
  }

  const client = new Anthropic({ apiKey })

  const currentImages = imageUrls && imageUrls.length > 0
    ? `\n현재 등록된 이미지 URL (${imageUrls.length}장):\n${imageUrls.map((u, i) => `  ${i + 1}. ${u}`).join('\n')}`
    : '\n현재 등록된 이미지: 없음'

  const lastGenInfo = lastGeneratedImageUrl
    ? `\n\n⚡ 직전에 생성/수정된 이미지 URL (register_image, edit_image에서 우선 사용):\n  ${lastGeneratedImageUrl}`
    : ''

  const systemPrompt = `당신은 식물 가게 관리자를 돕는 AI 어시스턴트입니다. 식물 등록/수정 폼 작성을 도와줍니다.

현재 폼 상태:
- 이름: ${formState.name || '(비어있음)'}
- 카테고리: ${formState.category_name || '(선택 안됨)'}
- 가격: ${formState.price || '(비어있음)'}
- 한줄설명: ${formState.short_description || '(비어있음)'}
- 상세설명: ${formState.description || '(비어있음)'}
- 키우는방법: ${formState.care_guide || '(비어있음)'}
- 주의사항: ${formState.caution || '(비어있음)'}
${currentImages}${lastGenInfo}

역할:
- 식물 사진을 분석해서 정보를 자동으로 채워주세요 (fill_fields 도구 사용)
- 새 이미지 생성 요청 → generate_image 도구 사용. 생성 후 "등록하시겠어요?" 라고 묻지 말고, 이미지를 보여주는 것으로 충분합니다 (채팅 UI에 [등록하기] 버튼이 자동 표시됩니다)
- 기존 이미지 수정 요청(배경 변경, 이모티콘 변환, 색상 변경 등) → edit_image 도구 사용
  - imageUrl 우선순위: lastGeneratedImageUrl > 사용자 첨부 이미지 > 현재 등록된 이미지 첫 번째
  - URL을 사용자에게 다시 물어보지 마세요
- 이미지 등록/저장 요청("등록해줘", "저장해줘", "사진 추가해줘") → register_image 도구 사용
  - imageUrl: lastGeneratedImageUrl을 우선 사용, 없으면 현재 등록된 이미지 첫 번째 URL
- 페이지 배경색·배경이미지·폰트 변경 요청 → style_page 도구 사용
- 기존 텍스트 내용 수정, 이모티콘 삽입 요청 → fill_fields 도구 사용 (텍스트에 이모티콘 자연스럽게 포함 가능)
- 한국어로 친근하게 대화하세요
- 응답은 간결하게 1-3문장으로 해주세요`

  // 마지막 사용자 메시지 구성 (이미지 포함 가능)
  const lastUserMessage = messages[messages.length - 1]
  const anthropicMessages: Anthropic.MessageParam[] = [
    ...messages.slice(0, -1).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
  ]

  if (imageUrl) {
    anthropicMessages.push({
      role: 'user',
      content: [
        { type: 'image', source: { type: 'url', url: imageUrl } },
        { type: 'text', text: lastUserMessage.content },
      ],
    })
  } else {
    anthropicMessages.push({
      role: 'user',
      content: lastUserMessage.content,
    })
  }

  const response = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 1024,
    system: systemPrompt,
    tools,
    messages: anthropicMessages,
  })

  // 응답 파싱
  let replyText = ''
  const actions: Array<{
    type: 'fill_fields' | 'generate_image' | 'edit_image' | 'style_page' | 'register_image'
    fields?: Record<string, unknown>
    prompt?: string
    imageUrl?: string
    style?: { bg_color?: string; bg_image_url?: string; font?: string }
  }> = []

  for (const block of response.content) {
    if (block.type === 'text') {
      replyText = block.text
    } else if (block.type === 'tool_use') {
      if (block.name === 'fill_fields') {
        actions.push({ type: 'fill_fields', fields: block.input as Record<string, unknown> })
      } else if (block.name === 'generate_image') {
        const input = block.input as { prompt: string }
        actions.push({ type: 'generate_image', prompt: input.prompt })
      } else if (block.name === 'edit_image') {
        const input = block.input as { prompt: string; imageUrl: string }
        actions.push({ type: 'edit_image', prompt: input.prompt, imageUrl: input.imageUrl })
      } else if (block.name === 'style_page') {
        const input = block.input as { bg_color?: string; bg_image_url?: string; font?: string }
        actions.push({ type: 'style_page', style: input })
      } else if (block.name === 'register_image') {
        const input = block.input as { imageUrl: string }
        actions.push({ type: 'register_image', imageUrl: input.imageUrl })
      }
    }
  }

  if (!replyText && actions.length > 0) {
    if (actions.some(a => a.type === 'fill_fields')) replyText = '폼을 채웠어요!'
    if (actions.some(a => a.type === 'generate_image')) replyText = (replyText ? replyText + ' ' : '') + '이미지를 생성할게요!'
    if (actions.some(a => a.type === 'edit_image')) replyText = (replyText ? replyText + ' ' : '') + '이미지를 수정할게요!'
    if (actions.some(a => a.type === 'style_page')) replyText = (replyText ? replyText + ' ' : '') + '페이지 스타일을 변경할게요!'
    if (actions.some(a => a.type === 'register_image')) replyText = (replyText ? replyText + ' ' : '') + '이미지를 등록할게요!'
  }

  return { reply: replyText, actions }
})
