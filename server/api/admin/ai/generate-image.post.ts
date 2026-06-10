import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const apiKey = config.openaiApiKey as string | undefined

  if (!apiKey) {
    throw createError({ statusCode: 503, statusMessage: 'OPENAI_API_KEY가 설정되지 않았습니다' })
  }

  const { prompt } = await readBody(event) as { prompt: string }
  if (!prompt) {
    throw createError({ statusCode: 400, statusMessage: 'prompt가 필요합니다' })
  }

  const client = new OpenAI({ apiKey })

  let response
  try {
    response = await client.images.generate({
      model: 'gpt-image-1',
      prompt: `식물 사진. 배경은 깔끔한 흰색이나 밝은 색. 사진 스타일: ${prompt}`,
      n: 1,
      size: '1024x1024',
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    throw createError({ statusCode: 502, statusMessage: `OpenAI 오류: ${msg}` })
  }

  const b64 = response.data[0]?.b64_json
  if (!b64) {
    throw createError({ statusCode: 500, statusMessage: '이미지 생성 실패: 응답에 이미지가 없습니다' })
  }

  const supabase = createClient(
    config.public.supabaseUrl as string,
    config.supabaseServiceKey as string,
  )

  const buffer = Buffer.from(b64, 'base64')
  const fileName = `ai-generated/${Date.now()}.png`

  const { error: uploadError } = await supabase.storage
    .from('plant-images')
    .upload(fileName, buffer, { contentType: 'image/png', upsert: false })

  if (uploadError) {
    throw createError({ statusCode: 500, statusMessage: `Storage 업로드 실패: ${uploadError.message}` })
  }

  const { data: { publicUrl } } = supabase.storage.from('plant-images').getPublicUrl(fileName)

  return { imageUrl: publicUrl }
})
