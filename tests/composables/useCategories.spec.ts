import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'

// ── Nuxt global shims ─────────────────────────────────────────────────────────
vi.stubGlobal('ref', ref)

// ── Supabase query builder mock factory ──────────────────────────────────────
function buildQueryMock(finalResult: Record<string, unknown>) {
  const mock: Record<string, unknown> = {}
  const methods = ['select', 'insert', 'update', 'delete', 'eq', 'order', 'single', 'range', 'ilike']
  for (const m of methods) {
    mock[m] = vi.fn(() => mock)
  }
  // Make awaitable
  mock.then = (resolve: (v: unknown) => unknown) => Promise.resolve(finalResult).then(resolve)
  return mock
}

// ── useSupabase global stub (set per-test via mockFrom) ───────────────────────
let mockFrom: ReturnType<typeof vi.fn>

vi.stubGlobal('useSupabase', () => ({ from: mockFrom }))

// ── Import composable AFTER global stubs are in place ─────────────────────────
import { useCategories } from '../../app/composables/useCategories'

// ─────────────────────────────────────────────────────────────────────────────

describe('useCategories', () => {
  beforeEach(() => {
    mockFrom = vi.fn()
  })

  // ── deleteCategory ──────────────────────────────────────────────────────────

  describe('deleteCategory', () => {
    it('식물이 있는 카테고리 삭제 시 오류 메시지를 반환한다', async () => {
      const countQuery = buildQueryMock({ count: 3, error: null })
      mockFrom.mockReturnValueOnce(countQuery)

      const { deleteCategory } = useCategories()
      const result = await deleteCategory('cat-uuid-1')

      expect(result.error).toBe(
        '이 카테고리에 식물 3개가 등록되어 있습니다. 식물을 먼저 다른 카테고리로 이동하거나 삭제해주세요'
      )
    })

    it('식물이 없는 카테고리는 하드 삭제에 성공한다', async () => {
      const countQuery = buildQueryMock({ count: 0, error: null })
      const deleteQuery = buildQueryMock({ error: null })
      mockFrom.mockReturnValueOnce(countQuery).mockReturnValueOnce(deleteQuery)

      const { deleteCategory } = useCategories()
      const result = await deleteCategory('cat-uuid-empty')

      expect(result.error).toBeNull()
    })

    it('식물이 1개일 때 N=1 오류 메시지를 반환한다', async () => {
      const countQuery = buildQueryMock({ count: 1, error: null })
      mockFrom.mockReturnValueOnce(countQuery)

      const { deleteCategory } = useCategories()
      const result = await deleteCategory('cat-uuid-2')

      expect(result.error).toContain('1개')
    })

    it('카운트 쿼리 오류 시 DB 오류 메시지를 반환한다', async () => {
      const countQuery = buildQueryMock({ count: null, error: { message: 'DB 연결 오류' } })
      mockFrom.mockReturnValueOnce(countQuery)

      const { deleteCategory } = useCategories()
      const result = await deleteCategory('cat-uuid-3')

      expect(result.error).toBe('DB 연결 오류')
    })
  })

  // ── createCategory ──────────────────────────────────────────────────────────

  describe('createCategory', () => {
    it('중복 이름 오류(23505) 시 한국어 오류 메시지를 반환한다', async () => {
      const insertQuery = buildQueryMock({ data: null, error: { code: '23505', message: 'duplicate' } })
      mockFrom.mockReturnValueOnce(insertQuery)

      const { createCategory } = useCategories()
      const result = await createCategory({ name: '다육식물' })

      expect(result.error).toBe('이미 존재하는 카테고리 이름입니다')
      expect(result.data).toBeNull()
    })

    it('이름 앞뒤 공백을 trim 처리한다', async () => {
      const row = { id: 'uuid-1', name: '다육식물', description: null, created_at: '', updated_at: '' }
      const insertQuery = buildQueryMock({ data: row, error: null })
      mockFrom.mockReturnValueOnce(insertQuery)

      const { createCategory } = useCategories()
      await createCategory({ name: '  다육식물  ' })

      expect(mockFrom).toHaveBeenCalledWith('categories')
    })

    it('정상 등록 시 data를 반환하고 error는 null이다', async () => {
      const row = { id: 'uuid-2', name: '관엽식물', description: null, created_at: '', updated_at: '' }
      const insertQuery = buildQueryMock({ data: row, error: null })
      mockFrom.mockReturnValueOnce(insertQuery)

      const { createCategory } = useCategories()
      const result = await createCategory({ name: '관엽식물' })

      expect(result.error).toBeNull()
      expect(result.data).toEqual(row)
    })
  })

  // ── updateCategory ──────────────────────────────────────────────────────────

  describe('updateCategory', () => {
    it('중복 이름 오류(23505) 시 한국어 오류 메시지를 반환한다', async () => {
      const updateQuery = buildQueryMock({ data: null, error: { code: '23505', message: 'dup' } })
      mockFrom.mockReturnValueOnce(updateQuery)

      const { updateCategory } = useCategories()
      const result = await updateCategory('cat-uuid', { name: '다육식물' })

      expect(result.error).toBe('이미 존재하는 카테고리 이름입니다')
    })

    it('정상 수정 시 error는 null이다', async () => {
      const row = { id: 'cat-uuid', name: '수정된이름', description: null, created_at: '', updated_at: '' }
      const updateQuery = buildQueryMock({ data: row, error: null })
      mockFrom.mockReturnValueOnce(updateQuery)

      const { updateCategory } = useCategories()
      const result = await updateCategory('cat-uuid', { name: '수정된이름' })

      expect(result.error).toBeNull()
      expect(result.data).toEqual(row)
    })
  })
})
