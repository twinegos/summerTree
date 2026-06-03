import type { CartItemRow } from '~/types/database.types'

export interface CartItemWithPlant extends CartItemRow {
  plants: {
    id: string
    name: string
    price: number
    image_urls: string[]
    stock: number
  } | null
}

export function useCart() {
  const supabase = useSupabase()
  const { sessionId } = useSession()
  const { showError } = useToast()

  const cartItems = ref<CartItemWithPlant[]>([])
  const isLoading = ref(false)

  const totalCount = computed(() =>
    cartItems.value.reduce((sum, item) => sum + item.quantity, 0)
  )

  const totalAmount = computed(() =>
    cartItems.value.reduce(
      (sum, item) => sum + (item.plants?.price ?? 0) * item.quantity,
      0
    )
  )

  async function fetchCart(): Promise<void> {
    if (!sessionId.value) return
    isLoading.value = true
    const { data, error } = await supabase
      .from('cart_items')
      .select('*, plants(id, name, price, image_urls, stock)')
      .eq('session_id', sessionId.value)
      .order('created_at', { ascending: true })

    isLoading.value = false
    if (!error) {
      cartItems.value = (data ?? []) as CartItemWithPlant[]
    }
  }

  async function addToCart(
    plantId: string,
    quantity = 1
  ): Promise<{ error: string | null }> {
    if (!sessionId.value) return { error: '세션 오류' }

    // 기존 아이템 확인
    const existing = cartItems.value.find((i) => i.plant_id === plantId)

    if (existing) {
      return updateQuantity(existing.id, existing.quantity + quantity)
    }

    const { error } = await supabase.from('cart_items').insert({
      session_id: sessionId.value,
      plant_id: plantId,
      quantity,
    })

    if (error) return { error: error.message }
    await fetchCart()
    return { error: null }
  }

  async function updateQuantity(
    cartItemId: string,
    quantity: number
  ): Promise<{ error: string | null }> {
    if (quantity < 1) return removeFromCart(cartItemId)

    const { error } = await supabase
      .from('cart_items')
      .update({ quantity })
      .eq('id', cartItemId)
      .eq('session_id', sessionId.value)

    if (error) return { error: error.message }
    await fetchCart()
    return { error: null }
  }

  async function removeFromCart(
    cartItemId: string
  ): Promise<{ error: string | null }> {
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('id', cartItemId)
      .eq('session_id', sessionId.value)

    if (error) return { error: error.message }
    await fetchCart()
    return { error: null }
  }

  async function clearCart(): Promise<void> {
    if (!sessionId.value) return
    await supabase
      .from('cart_items')
      .delete()
      .eq('session_id', sessionId.value)
    cartItems.value = []
  }

  return {
    cartItems,
    isLoading,
    totalCount,
    totalAmount,
    fetchCart,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
  }
}
