import type { CategoryRow, CategoryInsert, CategoryUpdate } from '~/types/database.types'

interface CategoryMutationResult {
  data: CategoryRow | null
  error: string | null
}

export function useCategories() {
  const supabase = useSupabase()
  const categories = ref<CategoryRow[]>([])
  const isLoading = ref(false)

  async function fetchCategories(): Promise<{ data: CategoryRow[]; error: string | null }> {
    isLoading.value = true
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true })

      if (error) {
        return { data: [], error: error.message }
      }

      categories.value = data ?? []
      return { data: data ?? [], error: null }
    } finally {
      isLoading.value = false
    }
  }

  async function createCategory(payload: CategoryInsert): Promise<CategoryMutationResult> {
    const trimmed: CategoryInsert = {
      ...payload,
      name: payload.name.trim(),
    }

    const { data, error } = await supabase
      .from('categories')
      .insert(trimmed)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return { data: null, error: '이미 존재하는 카테고리 이름입니다' }
      }
      return { data: null, error: error.message }
    }

    return { data, error: null }
  }

  async function updateCategory(
    id: string,
    payload: CategoryUpdate
  ): Promise<CategoryMutationResult> {
    const trimmed: CategoryUpdate = {
      ...payload,
      ...(payload.name !== undefined ? { name: payload.name.trim() } : {}),
    }

    const { data, error } = await supabase
      .from('categories')
      .update(trimmed)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return { data: null, error: '이미 존재하는 카테고리 이름입니다' }
      }
      return { data: null, error: error.message }
    }

    return { data, error: null }
  }

  async function deleteCategory(id: string): Promise<{ error: string | null }> {
    // is_deleted = false 기준으로 식물 수 확인
    const { count, error: countError } = await supabase
      .from('plants')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', id)
      .eq('is_deleted', false)

    if (countError) {
      return { error: countError.message }
    }

    if (count && count > 0) {
      return {
        error: `이 카테고리에 식물 ${count}개가 등록되어 있습니다. 식물을 먼저 다른 카테고리로 이동하거나 삭제해주세요`,
      }
    }

    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (error) {
      return { error: error.message }
    }
    return { error: null }
  }

  return {
    categories,
    isLoading,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
  }
}
