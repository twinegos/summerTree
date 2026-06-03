import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Storage bucket mock ───────────────────────────────────────────────────────
let mockStorageBucket: {
  upload: ReturnType<typeof vi.fn>
  getPublicUrl: ReturnType<typeof vi.fn>
  remove: ReturnType<typeof vi.fn>
  list: ReturnType<typeof vi.fn>
}

vi.stubGlobal('useSupabase', () => ({
  storage: {
    from: vi.fn(() => mockStorageBucket),
  },
}))

import { useStorage } from '../../app/composables/useStorage'

// ─────────────────────────────────────────────────────────────────────────────

const makeFile = (type: string, sizeBytes: number): File => {
  const content = 'x'.repeat(sizeBytes)
  return new File([content], 'test.' + type.split('/')[1], { type })
}

describe('useStorage', () => {
  beforeEach(() => {
    mockStorageBucket = {
      upload: vi.fn(),
      getPublicUrl: vi.fn(),
      remove: vi.fn(),
      list: vi.fn(),
    }
  })

  // ── uploadImage — 파일 타입 검증 ────────────────────────────────────────────

  describe('uploadImage 파일 타입 검증', () => {
    it('image/jpeg는 업로드를 시도한다', async () => {
      mockStorageBucket.upload.mockResolvedValue({ error: null })
      mockStorageBucket.getPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://example.com/plant-images/p1/uuid.jpg' },
      })

      const file = makeFile('image/jpeg', 100)
      const { uploadImage } = useStorage()
      const result = await uploadImage('plant-id-1', file)

      expect(result.error).toBeNull()
      expect(result.url).toContain('plant-images')
      expect(mockStorageBucket.upload).toHaveBeenCalledOnce()
    })

    it('image/png는 업로드를 시도한다', async () => {
      mockStorageBucket.upload.mockResolvedValue({ error: null })
      mockStorageBucket.getPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://example.com/plant-images/p1/uuid.png' },
      })

      const file = makeFile('image/png', 100)
      const { uploadImage } = useStorage()
      const result = await uploadImage('plant-id-1', file)

      expect(result.error).toBeNull()
    })

    it('image/webp는 업로드를 시도한다', async () => {
      mockStorageBucket.upload.mockResolvedValue({ error: null })
      mockStorageBucket.getPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://example.com/plant-images/p1/uuid.webp' },
      })

      const file = makeFile('image/webp', 100)
      const { uploadImage } = useStorage()
      const result = await uploadImage('plant-id-1', file)

      expect(result.error).toBeNull()
    })

    it('image/gif는 "jpg, png, webp 형식만 지원합니다" 오류를 반환한다', async () => {
      const file = makeFile('image/gif', 100)
      const { uploadImage } = useStorage()
      const result = await uploadImage('plant-id-1', file)

      expect(result.error).toBe('jpg, png, webp 형식만 지원합니다')
      expect(result.url).toBeNull()
      expect(mockStorageBucket.upload).not.toHaveBeenCalled()
    })

    it('image/bmp는 "jpg, png, webp 형식만 지원합니다" 오류를 반환한다', async () => {
      const file = makeFile('image/bmp', 100)
      const { uploadImage } = useStorage()
      const result = await uploadImage('plant-id-1', file)

      expect(result.error).toBe('jpg, png, webp 형식만 지원합니다')
      expect(result.url).toBeNull()
    })
  })

  // ── uploadImage — 파일 크기 검증 ────────────────────────────────────────────

  describe('uploadImage 파일 크기 검증', () => {
    const FIVE_MB = 5 * 1024 * 1024

    it('5MB 초과 파일은 "이미지 크기는 5MB 이하여야 합니다" 오류를 반환한다', async () => {
      const file = makeFile('image/jpeg', FIVE_MB + 1)
      const { uploadImage } = useStorage()
      const result = await uploadImage('plant-id-1', file)

      expect(result.error).toBe('이미지 크기는 5MB 이하여야 합니다')
      expect(result.url).toBeNull()
      expect(mockStorageBucket.upload).not.toHaveBeenCalled()
    })

    it('정확히 5MB 파일은 업로드를 시도한다', async () => {
      mockStorageBucket.upload.mockResolvedValue({ error: null })
      mockStorageBucket.getPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://example.com/img.jpg' },
      })

      const file = makeFile('image/jpeg', FIVE_MB)
      const { uploadImage } = useStorage()
      const result = await uploadImage('plant-id-1', file)

      expect(result.error).toBeNull()
      expect(mockStorageBucket.upload).toHaveBeenCalledOnce()
    })

    it('5MB 미만 파일은 정상 업로드된다', async () => {
      mockStorageBucket.upload.mockResolvedValue({ error: null })
      mockStorageBucket.getPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://example.com/img.png' },
      })

      const file = makeFile('image/png', 1024)
      const { uploadImage } = useStorage()
      const result = await uploadImage('plant-id-1', file)

      expect(result.error).toBeNull()
    })
  })

  // ── uploadImage — 업로드 실패 ────────────────────────────────────────────────

  describe('uploadImage 업로드 실패 처리', () => {
    it('Storage 업로드 실패 시 "이미지 업로드에 실패했습니다. 다시 시도해주세요" 오류를 반환한다', async () => {
      mockStorageBucket.upload.mockResolvedValue({ error: { message: 'Storage error' } })

      const file = makeFile('image/jpeg', 100)
      const { uploadImage } = useStorage()
      const result = await uploadImage('plant-id-1', file)

      expect(result.error).toBe('이미지 업로드에 실패했습니다. 다시 시도해주세요')
      expect(result.url).toBeNull()
    })
  })

  // ── deleteImage ──────────────────────────────────────────────────────────────

  describe('deleteImage', () => {
    it('올바른 URL에서 경로를 추출하여 삭제한다', async () => {
      mockStorageBucket.remove.mockResolvedValue({ error: null })

      const url = 'https://proj.supabase.co/storage/v1/object/public/plant-images/p1/uuid.jpg'
      const { deleteImage } = useStorage()
      const result = await deleteImage(url)

      expect(result.error).toBeNull()
      expect(mockStorageBucket.remove).toHaveBeenCalledWith(['p1/uuid.jpg'])
    })

    it('올바르지 않은 URL은 "올바르지 않은 이미지 URL입니다" 오류를 반환한다', async () => {
      const { deleteImage } = useStorage()
      const result = await deleteImage('https://example.com/notsupabase/file.jpg')

      expect(result.error).toBe('올바르지 않은 이미지 URL입니다')
      expect(mockStorageBucket.remove).not.toHaveBeenCalled()
    })
  })

  // ── deleteImagesByPlantId ────────────────────────────────────────────────────

  describe('deleteImagesByPlantId', () => {
    it('파일이 있으면 모두 삭제한다', async () => {
      mockStorageBucket.list.mockResolvedValue({
        data: [{ name: 'uuid1.jpg' }, { name: 'uuid2.png' }],
        error: null,
      })
      mockStorageBucket.remove.mockResolvedValue({ error: null })

      const { deleteImagesByPlantId } = useStorage()
      const result = await deleteImagesByPlantId('plant-id-1')

      expect(result.error).toBeNull()
      expect(mockStorageBucket.remove).toHaveBeenCalledWith([
        'plant-id-1/uuid1.jpg',
        'plant-id-1/uuid2.png',
      ])
    })

    it('파일이 없으면 삭제 없이 성공을 반환한다', async () => {
      mockStorageBucket.list.mockResolvedValue({ data: [], error: null })

      const { deleteImagesByPlantId } = useStorage()
      const result = await deleteImagesByPlantId('plant-id-empty')

      expect(result.error).toBeNull()
      expect(mockStorageBucket.remove).not.toHaveBeenCalled()
    })

    it('list 오류 시 오류 메시지를 반환한다', async () => {
      mockStorageBucket.list.mockResolvedValue({ data: null, error: { message: '목록 조회 실패' } })

      const { deleteImagesByPlantId } = useStorage()
      const result = await deleteImagesByPlantId('plant-id-1')

      expect(result.error).toBe('목록 조회 실패')
    })
  })
})
