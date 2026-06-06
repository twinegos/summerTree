import type { OrderRow, OrderUpdate, OrderStatus } from '~/types/database.types'

export interface OrderWithItems extends OrderRow {
  order_items: Array<{
    id: string
    plant_name: string
    unit_price: number
    quantity: number
  }>
}

interface OrderListParams {
  status?: OrderStatus | null
  page?: number
  pageSize?: number
}

interface OrderListResult {
  data: OrderRow[]
  total: number
  error: string | null
}

export function useOrders() {
  const supabase = useSupabase()
  const orders = ref<OrderRow[]>([])
  const isLoading = ref(false)

  async function fetchOrders(params: OrderListParams = {}): Promise<OrderListResult> {
    isLoading.value = true
    try {
      const page = params.page ?? 1
      const pageSize = params.pageSize ?? 20
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      let query = supabase
        .from('orders')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to)

      if (params.status) {
        query = query.eq('status', params.status)
      }

      const { data, count, error } = await query

      if (error) {
        return { data: [], total: 0, error: error.message }
      }

      orders.value = data ?? []
      return { data: data ?? [], total: count ?? 0, error: null }
    } finally {
      isLoading.value = false
    }
  }

  async function fetchOrderWithItems(
    id: string
  ): Promise<{ data: OrderWithItems | null; error: string | null }> {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(id, plant_name, unit_price, quantity)')
      .eq('id', id)
      .single()

    if (error) {
      return { data: null, error: error.message }
    }

    return { data: data as unknown as OrderWithItems, error: null }
  }

  async function updateOrderStatus(
    id: string,
    status: OrderStatus
  ): Promise<{ error: string | null }> {
    const payload: OrderUpdate = { status, updated_at: new Date().toISOString() }
    const { error } = await supabase.from('orders').update(payload).eq('id', id)

    if (error) {
      return { error: error.message }
    }
    return { error: null }
  }

  return {
    orders,
    isLoading,
    fetchOrders,
    fetchOrderWithItems,
    updateOrderStatus,
  }
}
