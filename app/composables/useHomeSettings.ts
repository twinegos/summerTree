export const HOME_DEFAULT_PHRASES = [
  '식물은 말없이 당신 곁을 지킵니다',
  '초록으로 가득한 하루를 시작하세요',
  '자연이 주는 선물, 당신의 공간에',
  '살아숨쉬는 인테리어, 그린 라이프',
  '식물 한 그루, 공기가 달라집니다',
  '작은 화분 하나가 공간을 바꿉니다',
  '매일 조금씩 자라는 것들의 이야기',
  '당신의 공간에 생명을 더하세요',
  '초록이 주는 위로, 함께하세요',
  '자연과 함께하는 일상의 여유',
]

export interface HomeSettings {
  id: string
  hero_images: string[]
  hero_phrases: string[]
  hero_image_opacity: number
  updated_at: string
}

const BUCKET = 'plant-images'
const HOME_PREFIX = 'home'

export function useHomeSettings() {
  const supabase = useSupabase()

  async function fetchSettings(): Promise<{ data: HomeSettings | null; error: string | null }> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('home_settings')
      .select('*')
      .single()
    if (error) return { data: null, error: error.message }
    return { data: data as HomeSettings, error: null }
  }

  async function saveSettings(
    settings: Pick<HomeSettings, 'hero_images' | 'hero_phrases' | 'hero_image_opacity'>
  ): Promise<{ error: string | null }> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (supabase as any)
      .from('home_settings')
      .select('id')
      .single()

    const payload = { ...settings, updated_at: new Date().toISOString() }

    if (existing) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('home_settings')
        .update(payload)
        .eq('id', (existing as { id: string }).id)
      return { error: error?.message ?? null }
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('home_settings')
        .insert([payload])
      return { error: error?.message ?? null }
    }
  }

  async function uploadHeroImage(file: File): Promise<{ url: string | null; error: string | null }> {
    const ALLOWED: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
    }
    if (!ALLOWED[file.type]) return { url: null, error: 'jpg, png, webp만 지원합니다' }
    if (file.size > 5 * 1024 * 1024) return { url: null, error: '5MB 이하 이미지만 가능합니다' }

    const path = `${HOME_PREFIX}/${crypto.randomUUID()}.${ALLOWED[file.type]}`
    const { error } = await supabase.storage.from(BUCKET).upload(path, file)
    if (error) return { url: null, error: '업로드 실패. 다시 시도해주세요' }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
    return { url: data.publicUrl, error: null }
  }

  async function deleteHeroImage(url: string): Promise<void> {
    const marker = `/storage/v1/object/public/${BUCKET}/`
    const idx = url.indexOf(marker)
    if (idx === -1) return
    const path = url.slice(idx + marker.length)
    await supabase.storage.from(BUCKET).remove([path])
  }

  return { fetchSettings, saveSettings, uploadHeroImage, deleteHeroImage }
}
