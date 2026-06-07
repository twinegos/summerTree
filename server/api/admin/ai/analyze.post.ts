import Anthropic from '@anthropic-ai/sdk'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const apiKey = config.anthropicApiKey as string | undefined

  if (!apiKey) {
    throw createError({ statusCode: 503, statusMessage: 'ANTHROPIC_API_KEY가 설정되지 않았습니다' })
  }

  const { imageUrl } = await readBody(event) as { imageUrl: string }
  if (!imageUrl) {
    throw createError({ statusCode: 400, statusMessage: 'imageUrl이 필요합니다' })
  }

  const client = new Anthropic({ apiKey })

  const message = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'url', url: imageUrl },
          },
          {
            type: 'text',
            text: `이 식물 사진을 분석해서 아래 JSON 형식으로만 응답해주세요. 다른 텍스트 없이 JSON만 출력하세요.

{
  "name": "식물 이름 (한국어, 모를 경우 추정)",
  "short_description": "한 줄 설명 (30자 이내)",
  "description": "상세 설명 (200자 이내, 원산지/특징/모양 등)",
  "care_guide": "키우는 방법 (물주기, 햇빛, 온도, 흙 등 핵심만 간결하게)",
  "caution": "주의사항 (독성, 직사광선 주의 등, 없으면 빈 문자열)",
  "suggested_category": "관엽식물 | 다육식물 | 선인장 | 허브 | 꽃식물 | 수생식물 | 기타 중 하나"
}`,
          },
        ],
      },
    ],
  })

  const text = (message.content[0] as { type: string; text: string }).text
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw createError({ statusCode: 500, statusMessage: 'AI 응답 파싱 실패' })
  }

  return JSON.parse(jsonMatch[0])
})
