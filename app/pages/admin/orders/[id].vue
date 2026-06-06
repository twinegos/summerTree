<script setup lang="ts">
import type { OrderStatus } from '~/types/database.types'
import type { OrderWithItems } from '~/composables/useOrders'

definePageMeta({
  middleware: 'auth',
})

const route = useRoute()
const { fetchOrderWithItems, updateOrderStatus } = useOrders()
const { showSuccess, showError } = useToast()

const order = ref<OrderWithItems | null>(null)
const isLoading = ref(true)

const statusLabel: Record<OrderStatus, string> = {
  pending: '결제대기',
  paid: '결제완료',
  preparing: '준비중',
  shipped: '배송중',
  delivered: '완료',
  cancelled: '취소',
  refunded: '환불',
}

const statusColor: Record<OrderStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  paid: 'bg-blue-100 text-blue-700',
  preparing: 'bg-purple-100 text-purple-700',
  shipped: 'bg-indigo-100 text-indigo-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  refunded: 'bg-gray-100 text-gray-600',
}

async function handleStatusChange(newStatus: OrderStatus) {
  if (!order.value) return
  const { error } = await updateOrderStatus(order.value.id, newStatus)
  if (error) {
    showError('상태 변경에 실패했습니다')
  } else {
    order.value.status = newStatus
    showSuccess('주문 상태가 변경되었습니다')
  }
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function formatPrice(amount: number) {
  return amount.toLocaleString('ko-KR') + '원'
}

onMounted(async () => {
  const { data, error } = await fetchOrderWithItems(route.params.id as string)
  if (error) {
    showError('주문을 불러올 수 없습니다')
  } else {
    order.value = data
  }
  isLoading.value = false
})
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <AdminHeader />
    <CommonToast />

    <div class="max-w-[480px] mx-auto px-4 py-4">
      <!-- 뒤로가기 -->
      <button
        @click="navigateTo('/admin/orders')"
        class="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        주문 목록
      </button>

      <!-- 로딩 -->
      <div v-if="isLoading" class="text-center py-16 text-gray-400 text-sm">
        불러오는 중...
      </div>

      <!-- 주문 없음 -->
      <div v-else-if="!order" class="text-center py-16 text-gray-400 text-sm">
        주문을 찾을 수 없습니다
      </div>

      <template v-else>
        <!-- 주문 상태 -->
        <div class="bg-white rounded-xl border border-gray-200 p-4 mb-3">
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-sm font-bold text-gray-800">주문 상태</h2>
            <span :class="['text-xs font-medium px-2 py-0.5 rounded-full', statusColor[order.status]]">
              {{ statusLabel[order.status] }}
            </span>
          </div>
          <select
            :value="order.status"
            @change="handleStatusChange(($event.target as HTMLSelectElement).value as OrderStatus)"
            class="w-full text-sm border border-gray-300 rounded-xl px-3 py-2.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="pending">결제대기</option>
            <option value="paid">결제완료</option>
            <option value="preparing">준비중</option>
            <option value="shipped">배송중</option>
            <option value="delivered">완료</option>
            <option value="cancelled">취소</option>
            <option value="refunded">환불</option>
          </select>
        </div>

        <!-- 주문 정보 -->
        <div class="bg-white rounded-xl border border-gray-200 p-4 mb-3">
          <h2 class="text-sm font-bold text-gray-800 mb-3">주문 정보</h2>
          <dl class="space-y-2 text-sm">
            <div class="flex justify-between">
              <dt class="text-gray-500">주문번호</dt>
              <dd class="text-gray-800 font-mono text-xs">{{ order.id.slice(0, 8) }}...</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-gray-500">주문일시</dt>
              <dd class="text-gray-800">{{ formatDate(order.created_at) }}</dd>
            </div>
            <div v-if="order.portone_payment_id" class="flex justify-between">
              <dt class="text-gray-500">결제 ID</dt>
              <dd class="text-gray-800 font-mono text-xs">{{ order.portone_payment_id }}</dd>
            </div>
          </dl>
        </div>

        <!-- 구매자 정보 -->
        <div class="bg-white rounded-xl border border-gray-200 p-4 mb-3">
          <h2 class="text-sm font-bold text-gray-800 mb-3">구매자 정보</h2>
          <dl class="space-y-2 text-sm">
            <div class="flex justify-between">
              <dt class="text-gray-500">이름</dt>
              <dd class="text-gray-800">{{ order.buyer_name ?? '-' }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-gray-500">연락처</dt>
              <dd class="text-gray-800">{{ order.buyer_phone ?? '-' }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-gray-500">이메일</dt>
              <dd class="text-gray-800">{{ order.buyer_email ?? '-' }}</dd>
            </div>
            <div v-if="order.shipping_address">
              <dt class="text-gray-500 mb-1">배송지</dt>
              <dd class="text-gray-800">{{ order.shipping_address }}</dd>
            </div>
          </dl>
        </div>

        <!-- 주문 상품 -->
        <div class="bg-white rounded-xl border border-gray-200 p-4 mb-3">
          <h2 class="text-sm font-bold text-gray-800 mb-3">주문 상품</h2>
          <div class="space-y-3">
            <div
              v-for="item in order.order_items"
              :key="item.id"
              class="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
            >
              <div>
                <p class="text-sm font-medium text-gray-800">{{ item.plant_name }}</p>
                <p class="text-xs text-gray-400">{{ formatPrice(item.unit_price) }} × {{ item.quantity }}개</p>
              </div>
              <p class="text-sm font-bold text-gray-900">{{ formatPrice(item.unit_price * item.quantity) }}</p>
            </div>
          </div>
          <div class="flex justify-between items-center pt-3 mt-1 border-t border-gray-200">
            <span class="text-sm font-bold text-gray-800">합계</span>
            <span class="text-base font-bold text-green-700">{{ formatPrice(order.total_amount) }}</span>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
