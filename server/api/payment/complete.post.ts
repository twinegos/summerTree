import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'

interface CompleteBody {
  paymentId: string
  sessionId: string
  buyerName: string
  buyerPhone: string
  buyerEmail: string | null
  shippingAddress: string
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const body = await readBody<CompleteBody>(event)

  if (!body.paymentId || !body.sessionId) {
    throw createError({ statusCode: 400, statusMessage: '필수 파라미터 누락' })
  }

  // 포트원 V2 결제 검증
  const portoneApiSecret = config.portoneApiSecret
  if (!portoneApiSecret) {
    throw createError({ statusCode: 500, statusMessage: '포트원 API 시크릿 미설정' })
  }

  const portoneRes = await $fetch<{ status: string; amount: { total: number } }>(
    `https://api.portone.io/payments/${encodeURIComponent(body.paymentId)}`,
    {
      headers: { Authorization: `PortOne ${portoneApiSecret}` },
    }
  ).catch(() => null)

  if (!portoneRes || portoneRes.status !== 'PAID') {
    throw createError({ statusCode: 400, statusMessage: '결제 검증 실패' })
  }

  // 서비스 롤 클라이언트 (RLS 우회)
  const supabase = createClient<Database>(
    config.public.supabaseUrl as string,
    config.supabaseServiceKey,
  )

  // 장바구니 조회
  const { data: cartItems, error: cartError } = await supabase
    .from('cart_items')
    .select('*, plants(id, name, price, stock)')
    .eq('session_id', body.sessionId)

  if (cartError || !cartItems?.length) {
    throw createError({ statusCode: 400, statusMessage: '장바구니가 비었습니다' })
  }

  const totalAmount = cartItems.reduce(
    (sum, item) => sum + (item.plants as { price: number })?.price * item.quantity,
    0
  )

  // 결제 금액 검증
  if (portoneRes.amount.total !== totalAmount) {
    throw createError({ statusCode: 400, statusMessage: '결제 금액 불일치' })
  }

  // 주문 생성
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      status: 'paid',
      total_amount: totalAmount,
      buyer_name: body.buyerName,
      buyer_phone: body.buyerPhone,
      buyer_email: body.buyerEmail,
      shipping_address: body.shippingAddress,
      portone_payment_id: body.paymentId,
    })
    .select()
    .single()

  if (orderError || !order) {
    throw createError({ statusCode: 500, statusMessage: '주문 생성 실패' })
  }

  // 주문 아이템 생성
  const orderItems = cartItems.map((item) => ({
    order_id: order.id,
    plant_id: item.plant_id,
    plant_name: (item.plants as { name: string })?.name ?? '알 수 없음',
    unit_price: (item.plants as { price: number })?.price ?? 0,
    quantity: item.quantity,
  }))

  await supabase.from('order_items').insert(orderItems)

  // 재고 감소
  for (const item of cartItems) {
    const plant = item.plants as { id: string; stock: number } | null
    if (plant) {
      await supabase
        .from('plants')
        .update({ stock: Math.max(0, plant.stock - item.quantity) })
        .eq('id', plant.id)
    }
  }

  return { data: { orderId: order.id } }
})
