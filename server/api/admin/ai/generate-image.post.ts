import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const googleApiKey = config.googleAiApiKey as string | undefined

  if (!googleApiKey) {
    throw createError({ statusCode: 503, statusMessage: 'GOOGLE_AI_API_KEY가 설정되지 않았습니다' })
  }

  const { prompt } = await readBody(event) as { prompt: string }
  if (!prompt) {
    throw createError({ statusCode: 400, statusMessage: 'prompt가 필요합니다' })
  }

  const genAI = new GoogleGenerativeAI(googleApiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-3-pro-image-preview' })

  const result = await model.generateContent([
    `식물 사진을 생성해주세요. 배경은 깔끔한 흰색이나 밝은 색. 사진 스타일로: ${prompt}`,
  ])

  const response = result.response
  const parts = response.candidates?.[0]?.content?.parts ?? []
  const imagePart = parts.find((p: { inlineData?: { mimeType: string; data: string } }) => p.inlineData?.mimeType?.startsWith('image/'))

  if (!imagePart?.inlineData) {
    throw createError({ statusCode: 500, statusMessage: '이미지 생성 실패' })
  }

  // Supabase Storage에 업로드
  const supabase = createClient(
    config.public.supabaseUrl as string,
    config.supabaseServiceKey as string,
  )

  const buffer = Buffer.from(imagePart.inlineData.data, 'base64')
  const fileName = `ai-generated/${Date.now()}.jpg`

  const { error: uploadError } = await supabase.storage
    .from('plant-images')
    .upload(fileName, buffer, { contentType: imagePart.inlineData.mimeType, upsert: false })

  if (uploadError) {
    throw createError({ statusCode: 500, statusMessage: `Storage 업로드 실패: ${uploadError.message}` })
  }

  const { data: { publicUrl } } = supabase.storage.from('plant-images').getPublicUrl(fileName)

  return { imageUrl: publicUrl }
})
