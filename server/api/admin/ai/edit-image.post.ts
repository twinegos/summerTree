import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const apiKey = config.openaiApiKey as string | undefined
  if (!apiKey) throw createError({ statusCode: 503, statusMessage: 'OPENAI_API_KEY가 설정되지 않았습니다' })

  const { imageUrl, prompt } = await readBody(event) as { imageUrl: string; prompt: string }
  if (!imageUrl || !prompt) throw createError({ statusCode: 400, statusMessage: 'imageUrl과 prompt가 필요합니다' })

  // 원본 이미지 다운로드
  let imgBuffer: Buffer
  let contentType: string
  try {
    const res = await fetch(imageUrl)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    contentType = res.headers.get('content-type') || 'image/png'
    imgBuffer = Buffer.from(await res.arrayBuffer())
  } catch (e) {
    throw createError({ statusCode: 400, statusMessage: `이미지를 불러올 수 없습니다: ${e instanceof Error ? e.message : String(e)}` })
  }

  const ext = contentType.includes('webp') ? 'webp' : contentType.includes('png') ? 'png' : 'jpeg'
  const imgFile = new File([imgBuffer], `source.${ext}`, { type: contentType })

  const client = new OpenAI({ apiKey })

  let editResponse
  try {
    editResponse = await client.images.edit({
      model: 'gpt-image-1',
      image: imgFile,
      prompt,
      n: 1,
      size: '1024x1024',
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    throw createError({ statusCode: 502, statusMessage: `OpenAI 오류: ${msg}` })
  }

  const b64 = editResponse.data[0]?.b64_json
  if (!b64) throw createError({ statusCode: 500, statusMessage: '이미지 편집 실패: 응답에 이미지 없음' })

  const supabase = createClient(
    config.public.supabaseUrl as string,
    config.supabaseServiceKey as string,
  )

  const outputBuffer = Buffer.from(b64, 'base64')
  const fileName = `ai-edited/${Date.now()}.png`

  const { error: uploadError } = await supabase.storage
    .from('plant-images')
    .upload(fileName, outputBuffer, { contentType: 'image/png', upsert: false })

  if (uploadError) throw createError({ statusCode: 500, statusMessage: `Storage 업로드 실패: ${uploadError.message}` })

  const { data: { publicUrl } } = supabase.storage.from('plant-images').getPublicUrl(fileName)

  return { imageUrl: publicUrl }
})
