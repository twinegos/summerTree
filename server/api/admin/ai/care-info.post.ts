import Anthropic from '@anthropic-ai/sdk'

// 식물 이름 기반으로 항목별 관리 정보를 C 톤(식물 1인칭)으로 자동 생성
export default defineEventHandler(async (event) => {
  const body = await readBody<{ name?: string; category?: string }>(event)
  const name = body.name?.trim()
  if (!name) {
    throw createError({ statusCode: 400, statusMessage: '식물 이름이 필요합니다' })
  }

  const config = useRuntimeConfig()
  const apiKey = config.anthropicApiKey as string | undefined
  if (!apiKey) {
    throw createError({ statusCode: 500, statusMessage: 'AI 설정이 없습니다' })
  }

  const client = new Anthropic({ apiKey })

  const prompt = `식물 "${name}"${body.category ? ` (분류: ${body.category})` : ''}의 관리 정보를 아래 6개 항목으로 작성해줘.

말투 규칙(중요): 식물이 스스로 1인칭으로 말하는 귀엽고 친근한 톤.
예시) 햇빛 → "저는 밝은 곳이 좋아요! 직사광선은 조금 따가워요."
예시) 물주기 → "목마를 때 듬뿍 주시면 행복해요!"

각 항목은 1~2문장으로 간결하게. 실제 그 식물의 특성에 맞게 작성해줘.`

  const response = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 1024,
    tools: [
      {
        name: 'care_info',
        description: '식물 항목별 관리 정보를 채웁니다.',
        input_schema: {
          type: 'object' as const,
          properties: {
            sunlight: { type: 'string', description: '햇빛 (밝기/직사광선 등)' },
            water: { type: 'string', description: '물주기 (빈도/양)' },
            temperature: { type: 'string', description: '적정 온도' },
            humidity: { type: 'string', description: '습도' },
            soil: { type: 'string', description: '흙 종류·분갈이 주기' },
            caution: { type: 'string', description: '주의사항' },
          },
          required: ['sunlight', 'water', 'temperature', 'humidity', 'soil', 'caution'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'care_info' },
    messages: [{ role: 'user', content: prompt }],
  })

  const toolUse = response.content.find((c) => c.type === 'tool_use')
  if (!toolUse || toolUse.type !== 'tool_use') {
    throw createError({ statusCode: 500, statusMessage: 'AI 응답 생성에 실패했습니다' })
  }

  return { careInfo: toolUse.input as Record<string, string> }
})
