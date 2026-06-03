import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'

vi.stubGlobal('ref', ref)

// ── Supabase query builder mock factory ──────────────────────────────────────
function buildQueryMock(finalResult: Record<string, unknown>) {
  const mock: Record<string, unknown> = {}
  const methods = ['select', 'insert', 'update', 'delete', 'eq', 'order', 'single', 'range', 'ilike']
  for (const m of methods) {
    mock[m] = vi.fn(() => mock)
  }
  mock.then = (resolve: (v: unknown) => unknown) => Promise.resolve(finalResult).then(resolve)
  return mock
}

// ── Global stubs ──────────────────────────────────────────────────────────────
let mockFrom: ReturnType<typeof vi.fn>
let mockDeleteImagesByPlantId: ReturnType<typeof vi.fn>

vi.stubGlobal('useSupabase', () => ({ from: mockFrom }))
vi.stubGlobal('useStorage', () => ({ deleteImagesByPlantId: mockDeleteImagesByPlantId }))

import { usePlants } from '../../app/composables/usePlants'

// ─────────────────────────────────────────────────────────────────────────────

describe('usePlants', () => {
  beforeEach(() => {
    mockFrom = vi.fn()
    mockDeleteImagesByPlantId = vi.fn()
  })

  // ── deletePlant ─────────────────────────────────────────────────────────────

  describe('deletePlant', () => {
    it('주문 내역이 있으면 소프트 삭제(is_deleted=true)를 수행한다', async () => {
      const countQuery = buildQueryMock({ count: 2, error: null })
      const updateQuery = buildQueryMock({ error: null })

      mockFrom
        .mockReturnValueOnce(countQuery)
        .mockReturnValueOnce(updateQuery)

      const { deletePlant } = usePlants()
      const result = await deletePlant('plant-uuid-with-orders')

      expect(result.error).toBeNull()
      // Storage 삭제는 호출되면 안 됨
      expect(mockDeleteImagesByPlantId).not.toHaveBeenCalled()
      // plants 테이블 update 호출 확인
      expect(mockFrom).toHaveBeenCalledWith('plants')
    })

    it('주문 내역이 없으면 Storage 이미지 삭제 후 하드 삭제한다', async () => {
      const countQuery = buildQueryMock({ count: 0, error: null })
      const deleteQuery = buildQueryMock({ error: null })

      mockFrom
        .mockReturnValueOnce(countQuery)
        .mockReturnValueOnce(deleteQuery)

      mockDeleteImagesByPlantId.mockResolvedValue({ error: null })

      const { deletePlant } = usePlants()
      const result = await deletePlant('plant-uuid-no-orders')

      expect(result.error).toBeNull()
      expect(mockDeleteImagesByPlantId).toHaveBeenCalledWith('plant-uuid-no-orders')
    })

    it('주문 내역 없음 + Storage 삭제 실패 시 오류를 반환한다', async () => {
      const countQuery = buildQueryMock({ count: 0, error: null })
      mockFrom.mockReturnValueOnce(countQuery)
      mockDeleteImagesByPlantId.mockResolvedValue({ error: '스토리지 삭제 실패' })

      const { deletePlant } = usePlants()
      const result = await deletePlant('plant-uuid-storage-fail')

      expect(result.error).toBe('스토리지 삭제 실패')
      // DB 하드 삭제는 실행되면 안 됨
      expect(mockFrom).toHaveBeenCalledTimes(1) // order_items count only
    })

    it('주문 내역 카운트 쿼리 오류 시 DB 오류를 반환한다', async () => {
      const countQuery = buildQueryMock({ count: null, error: { message: 'DB 오류' } })
      mockFrom.mockReturnValueOnce(countQuery)

      const { deletePlant } = usePlants()
      const result = await deletePlant('plant-uuid-error')

      expect(result.error).toBe('DB 오류')
      expect(mockDeleteImagesByPlantId).not.toHaveBeenCalled()
    })

    it('소프트 삭제 업데이트 실패 시 오류를 반환한다', async () => {
      const countQuery = buildQueryMock({ count: 1, error: null })
      const updateQuery = buildQueryMock({ error: { message: '업데이트 실패' } })
      mockFrom.mockReturnValueOnce(countQuery).mockReturnValueOnce(updateQuery)

      const { deletePlant } = usePlants()
      const result = await deletePlant('plant-uuid-soft-fail')

      expect(result.error).toBe('업데이트 실패')
    })
  })

  // ── createPlant ─────────────────────────────────────────────────────────────

  describe('createPlant', () => {
    it('정상 등록 시 data를 반환하고 error는 null이다', async () => {
      const row = {
        id: 'p-uuid',
        category_id: 'cat-uuid',
        name: '몬스테라',
        short_description: null,
        description: null,
        care_guide: null,
        caution: null,
        price: 30000,
        stock: 5,
        image_urls: [],
        is_deleted: false,
        created_at: '',
        updated_at: '',
      }
      const insertQuery = buildQueryMock({ data: row, error: null })
      mockFrom.mockReturnValueOnce(insertQuery)

      const { createPlant } = usePlants()
      const result = await createPlant({ category_id: 'cat-uuid', name: '몬스테라', price: 30000 })

      expect(result.error).toBeNull()
      expect(result.data).toEqual(row)
    })

    it('DB 오류 시 error 문자열을 반환한다', async () => {
      const insertQuery = buildQueryMock({ data: null, error: { message: '제약 위반' } })
      mockFrom.mockReturnValueOnce(insertQuery)

      const { createPlant } = usePlants()
      const result = await createPlant({ category_id: 'cat-uuid', name: '테스트', price: 0 })

      expect(result.error).toBe('제약 위반')
      expect(result.data).toBeNull()
    })
  })

  // ── fetchPlants ─────────────────────────────────────────────────────────────

  describe('fetchPlants', () => {
    it('is_deleted=false 필터로 식물 목록을 반환한다', async () => {
      const rows = [
        { id: 'p1', name: '몬스테라', is_deleted: false },
        { id: 'p2', name: '고무나무', is_deleted: false },
      ]
      const selectQuery = buildQueryMock({ data: rows, count: 2, error: null })
      mockFrom.mockReturnValueOnce(selectQuery)

      const { fetchPlants } = usePlants()
      const result = await fetchPlants()

      expect(result.error).toBeNull()
      expect(result.total).toBe(2)
      expect(result.data).toHaveLength(2)
    })

    it('오류 시 빈 배열과 error 문자열을 반환한다', async () => {
      const selectQuery = buildQueryMock({ data: null, count: null, error: { message: '쿼리 오류' } })
      mockFrom.mockReturnValueOnce(selectQuery)

      const { fetchPlants } = usePlants()
      const result = await fetchPlants()

      expect(result.error).toBe('쿼리 오류')
      expect(result.data).toEqual([])
      expect(result.total).toBe(0)
    })
  })
})
