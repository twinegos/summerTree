import type { PlantRow, PlantInsert, PlantUpdate } from '~/types/database.types'

export interface PlantWithCategory extends PlantRow {
  categories: { name: string } | null
}

interface PlantListParams {
  categoryId?: string
  search?: string
  page?: number
  pageSize?: number
}

interface PlantListResult {
  data: PlantRow[]
  total: number
  error: string | null
}

interface PlantMutationResult {
  data: PlantRow | null
  error: string | null
}

export function usePlants() {
  const supabase = useSupabase()
  const { deleteImagesByPlantId } = useStorage()
  const plants = ref<PlantRow[]>([])
  const isLoading = ref(false)

  async function fetchPlants(params: PlantListParams = {}): Promise<PlantListResult> {
    isLoading.value = true
    try {
      const page = params.page ?? 1
      const pageSize = params.pageSize ?? 20
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      let query = supabase
        .from('plants')
        .select('*', { count: 'exact' })
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .range(from, to)

      if (params.categoryId) {
        query = query.eq('category_id', params.categoryId)
      }

      if (params.search) {
        query = query.ilike('name', `%${params.search}%`)
      }

      const { data, count, error } = await query

      if (error) {
        return { data: [], total: 0, error: error.message }
      }

      plants.value = data ?? []
      return { data: data ?? [], total: count ?? 0, error: null }
    } finally {
      isLoading.value = false
    }
  }

  async function createPlant(payload: PlantInsert): Promise<PlantMutationResult> {
    const { data, error } = await supabase
      .from('plants')
      .insert(payload)
      .select()
      .single()

    if (error) {
      return { data: null, error: error.message }
    }

    return { data, error: null }
  }

  async function updatePlant(
    id: string,
    payload: PlantUpdate
  ): Promise<PlantMutationResult> {
    const { data, error } = await supabase
      .from('plants')
      .update(payload)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return { data: null, error: error.message }
    }

    return { data, error: null }
  }

  async function deletePlant(id: string): Promise<{ error: string | null }> {
    // 주문 내역 존재 여부 확인
    const { count, error: countError } = await supabase
      .from('order_items')
      .select('id', { count: 'exact', head: true })
      .eq('plant_id', id)

    if (countError) {
      return { error: countError.message }
    }

    if (count && count > 0) {
      // 주문 내역 있음 → 소프트 삭제 (이미지 유지)
      const { error } = await supabase
        .from('plants')
        .update({ is_deleted: true })
        .eq('id', id)

      if (error) {
        return { error: error.message }
      }
      return { error: null }
    }

    // 주문 내역 없음 → Storage 이미지 삭제 후 하드 삭제
    const { error: storageError } = await deleteImagesByPlantId(id)
    if (storageError) {
      return { error: storageError }
    }

    const { error } = await supabase.from('plants').delete().eq('id', id)
    if (error) {
      return { error: error.message }
    }
    return { error: null }
  }

  async function fetchPlantById(
    id: string
  ): Promise<{ data: PlantWithCategory | null; error: string | null }> {
    const { data, error } = await supabase
      .from('plants')
      .select('*, categories(name)')
      .eq('id', id)
      .eq('is_deleted', false)
      .maybeSingle()

    if (error) {
      return { data: null, error: error.message }
    }
    return { data: data as PlantWithCategory | null, error: null }
  }

  return {
    plants,
    isLoading,
    fetchPlants,
    fetchPlantById,
    createPlant,
    updatePlant,
    deletePlant,
  }
}
