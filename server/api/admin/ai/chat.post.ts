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
    description: 'Nano Banana(Google Gemini AI)로 식물 이미지를 생성합니다.',
    input_schema: {
      type: 'object' as const,
      properties: {
        prompt: { type: 'string', description: '이미지 생성 프롬프트 (영어 권장, 예: monstera plant in white ceramic pot, bright background)' },
      },
      required: ['prompt'],
    },
  },
]

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const apiKey = config.anthropicApiKey as string | undefined

  if (!apiKey) {
    throw createError({ statusCode: 503, statusMessage: 'ANTHROPIC_API_KEY가 설정되지 않았습니다. .env에 추가해주세요.' })
  }

  const { messages, formState, imageUrl } = await readBody(event) as {
    messages: ChatMessage[]
    formState: FormState
    imageUrl?: string
  }

  const client = new Anthropic({ apiKey })

  const systemPrompt = `당신은 식물 가게 관리자를 돕는 AI 어시스턴트입니다. 식물 등록 폼 작성을 도와줍니다.

현재 폼 상태:
- 이름: ${formState.name || '(비어있음)'}
- 카테고리: ${formState.category_name || '(선택 안됨)'}
- 가격: ${formState.price || '(비어있음)'}
- 한줄설명: ${formState.short_description || '(비어있음)'}
- 상세설명: ${formState.description || '(비어있음)'}
- 키우는방법: ${formState.care_guide || '(비어있음)'}
- 주의사항: ${formState.caution || '(비어있음)'}

역할:
- 식물 사진을 분석해서 정보를 자동으로 채워주세요 (fill_fields 도구 사용)
- 사용자가 요청하면 이미지를 생성해주세요 (generate_image 도구 사용)
- 기존 내용 수정 요청도 fill_fields로 처리하세요
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
    type: 'fill_fields' | 'generate_image'
    fields?: Record<string, unknown>
    prompt?: string
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
      }
    }
  }

  if (!replyText && actions.length > 0) {
    if (actions.some(a => a.type === 'fill_fields')) replyText = '폼을 채웠어요!'
    if (actions.some(a => a.type === 'generate_image')) replyText = (replyText ? replyText + ' ' : '') + '이미지를 생성할게요!'
  }

  return { reply: replyText, actions }
})
