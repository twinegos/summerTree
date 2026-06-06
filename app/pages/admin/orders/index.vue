<script setup lang="ts">
import type { OrderStatus } from '~/types/database.types'

definePageMeta({
  middleware: 'auth',
})

const { orders, isLoading, fetchOrders, updateOrderStatus } = useOrders()
const { showSuccess, showError } = useToast()

const selectedStatus = ref<OrderStatus | null>(null)
const currentPage = ref(1)
const total = ref(0)
const PAGE_SIZE = 20

const totalPages = computed(() => Math.ceil(total.value / PAGE_SIZE))

const statusOptions: Array<{ label: string; value: OrderStatus | null }> = [
  { label: '전체', value: null },
  { label: '결제대기', value: 'pending' },
  { label: '결제완료', value: 'paid' },
  { label: '준비중', value: 'preparing' },
  { label: '배송중', value: 'shipped' },
  { label: '완료', value: 'delivered' },
  { label: '취소', value: 'cancelled' },
]

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

async function load() {
  const result = await fetchOrders({
    status: selectedStatus.value,
    page: currentPage.value,
    pageSize: PAGE_SIZE,
  })
  total.value = result.total
}

function selectStatus(status: OrderStatus | null) {
  selectedStatus.value = status
  currentPage.value = 1
  load()
}

async function handleStatusChange(orderId: string, newStatus: OrderStatus) {
  const { error } = await updateOrderStatus(orderId, newStatus)
  if (error) {
    showError('상태 변경에 실패했습니다')
  } else {
    showSuccess('주문 상태가 변경되었습니다')
    await load()
  }
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function formatPrice(amount: number) {
  return amount.toLocaleString('ko-KR') + '원'
}

onMounted(load)
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <AdminHeader />
    <CommonToast />

    <div class="max-w-[480px] mx-auto px-4 py-4">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-base font-bold text-gray-800">주문 관리</h2>
        <span class="text-sm text-gray-500">총 {{ total }}건</span>
      </div>

      <!-- 상태 필터 탭 -->
      <div class="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
        <button
          v-for="opt in statusOptions"
          :key="String(opt.value)"
          @click="selectStatus(opt.value)"
          :class="[
            'shrink-0 px-3 py-1.5 text-sm rounded-full transition-colors',
            selectedStatus === opt.value
              ? 'bg-green-600 text-white'
              : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50',
          ]"
        >
          {{ opt.label }}
        </button>
      </div>

      <!-- 로딩 -->
      <div v-if="isLoading" class="text-center py-16 text-gray-400 text-sm">
        불러오는 중...
      </div>

      <!-- 빈 상태 -->
      <div v-else-if="orders.length === 0" class="text-center py-16">
        <p class="text-gray-400 text-sm">주문이 없습니다</p>
      </div>

      <!-- 주문 목록 -->
      <div v-else class="space-y-3">
        <NuxtLink
          v-for="order in orders"
          :key="order.id"
          :to="`/admin/orders/${order.id}`"
          class="block bg-white rounded-xl border border-gray-200 p-4 hover:border-green-300 transition-colors"
        >
          <div class="flex items-start justify-between mb-2">
            <span class="text-xs text-gray-400 font-mono">{{ order.id.slice(0, 8) }}...</span>
            <span :class="['text-xs font-medium px-2 py-0.5 rounded-full', statusColor[order.status]]">
              {{ statusLabel[order.status] }}
            </span>
          </div>
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-800">{{ order.buyer_name ?? '구매자 미입력' }}</p>
              <p class="text-xs text-gray-400 mt-0.5">{{ formatDate(order.created_at) }}</p>
            </div>
            <p class="text-sm font-bold text-gray-900">{{ formatPrice(order.total_amount) }}</p>
          </div>
          <!-- 빠른 상태 변경 -->
          <div class="mt-3 pt-3 border-t border-gray-100" @click.prevent>
            <select
              :value="order.status"
              @change="handleStatusChange(order.id, ($event.target as HTMLSelectElement).value as OrderStatus)"
              class="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500"
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
        </NuxtLink>

        <!-- 페이지네이션 -->
        <div v-if="totalPages > 1" class="flex items-center justify-center gap-2 pt-4 pb-2">
          <button
            @click="currentPage--; load()"
            :disabled="currentPage === 1"
            class="px-3 py-2 text-sm rounded-lg border border-gray-300 disabled:opacity-40 hover:bg-gray-100 transition-colors"
          >
            이전
          </button>
          <span class="text-sm text-gray-600">{{ currentPage }} / {{ totalPages }}</span>
          <button
            @click="currentPage++; load()"
            :disabled="currentPage >= totalPages"
            class="px-3 py-2 text-sm rounded-lg border border-gray-300 disabled:opacity-40 hover:bg-gray-100 transition-colors"
          >
            다음
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
