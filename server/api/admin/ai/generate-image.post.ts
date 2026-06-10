import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  // 디버그: 모든 에러를 200 응답으로 반환해서 원인 파악
  try {
    const config = useRuntimeConfig()
    const apiKey = config.openaiApiKey as string | undefined

    if (!apiKey) {
      return { debug_error: 'OPENAI_API_KEY 없음', apiKey: 'undefined' }
    }

    const { prompt } = await readBody(event) as { prompt: string }
    if (!prompt) {
      return { debug_error: 'prompt 없음' }
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
      return { debug_error: `OpenAI 오류: ${msg}` }
    }

    const b64 = response.data[0]?.b64_json
    if (!b64) {
      return { debug_error: '이미지 없음' }
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
      return { debug_error: `Storage 오류: ${uploadError.message}` }
    }

    const { data: { publicUrl } } = supabase.storage.from('plant-images').getPublicUrl(fileName)

    return { imageUrl: publicUrl }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return { debug_error: `최상위 오류: ${msg}` }
  }
})
