const BUCKET = 'plant-images'
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5MB

const EXT_MAP: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

interface UploadResult {
  url: string | null
  error: string | null
}

export function useStorage() {
  const supabase = useSupabase()

  async function uploadImage(plantId: string, file: File): Promise<UploadResult> {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return { url: null, error: 'jpg, png, webp 형식만 지원합니다' }
    }

    if (file.size > MAX_SIZE_BYTES) {
      return { url: null, error: '이미지 크기는 5MB 이하여야 합니다' }
    }

    const ext = EXT_MAP[file.type]
    const fileName = `${crypto.randomUUID()}.${ext}`
    const path = `${plantId}/${fileName}`

    const { error } = await supabase.storage.from(BUCKET).upload(path, file)

    if (error) {
      return { url: null, error: '이미지 업로드에 실패했습니다. 다시 시도해주세요' }
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
    return { url: data.publicUrl, error: null }
  }

  async function deleteImage(url: string): Promise<{ error: string | null }> {
    // URL에서 버킷 이후 경로 추출
    // 형식: .../storage/v1/object/public/plant-images/{path}
    const marker = `/storage/v1/object/public/${BUCKET}/`
    const idx = url.indexOf(marker)
    if (idx === -1) {
      return { error: '올바르지 않은 이미지 URL입니다' }
    }
    const path = url.slice(idx + marker.length)

    const { error } = await supabase.storage.from(BUCKET).remove([path])
    if (error) {
      return { error: error.message }
    }
    return { error: null }
  }

  async function deleteImagesByPlantId(
    plantId: string
  ): Promise<{ error: string | null }> {
    // plant-images/{plantId}/ 하위 파일 목록 조회 후 일괄 삭제
    const { data: files, error: listError } = await supabase.storage
      .from(BUCKET)
      .list(plantId)

    if (listError) {
      return { error: listError.message }
    }

    if (!files || files.length === 0) {
      return { error: null }
    }

    const paths = files.map((f) => `${plantId}/${f.name}`)
    const { error } = await supabase.storage.from(BUCKET).remove(paths)
    if (error) {
      return { error: error.message }
    }
    return { error: null }
  }

  return {
    uploadImage,
    deleteImage,
    deleteImagesByPlantId,
  }
}
