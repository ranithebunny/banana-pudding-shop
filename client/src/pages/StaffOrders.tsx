import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'

interface Order {
  id: string
  orderNumber: string
  status: string
  total: string
  fulfillmentType: string
  customer: { name: string; email: string }
  createdAt: string
}

const NEXT_STATUS: Record<string, string> = {
  CONFIRMED: 'PREPARING',
  PREPARING: 'READY',
  READY: 'COMPLETED',
}

const STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: 'Pending Payment',
  PAYMENT_REVIEW: 'Payment Review',
  CONFIRMED: 'Confirmed',
  PREPARING: 'Preparing',
  READY: 'Ready',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}

function StaffOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('')

  async function loadOrders() {
    setLoading(true)
    try {
      const query = filter ? `?status=${filter}` : ''
      const data = await apiFetch(`/orders/staff/all${query}`)
      setOrders(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orders.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrders()
  }, [filter])

  async function advanceStatus(orderId: string, nextStatus: string) {
    try {
      await apiFetch(`/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      })
      loadOrders()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update order status.')
    }
  }

  if (loading) return <div className="p-8">Loading orders...</div>

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Orders</h1>

      <select
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="border rounded px-3 py-2 text-sm mb-6"
      >
        <option value="">All statuses</option>
        {Object.entries(STATUS_LABELS).map(([value, label]) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      {orders.length === 0 && <p className="text-gray-600">No orders found.</p>}

      <div className="space-y-3">
        {orders.map((order) => (
          <div key={order.id} className="border rounded-lg p-4 flex items-center justify-between">
            <div>
              <p className="font-semibold">{order.orderNumber}</p>
              <p className="text-sm text-gray-600">
                {order.customer.name} — ₱{order.total} — {order.fulfillmentType}
              </p>
              <p className="text-xs text-gray-500">{STATUS_LABELS[order.status] || order.status}</p>
            </div>

            {NEXT_STATUS[order.status] && (
              <button
                onClick={() => advanceStatus(order.id, NEXT_STATUS[order.status])}
                className="bg-blue-600 text-white rounded px-4 py-1.5 text-sm font-medium"
              >
                Mark as {STATUS_LABELS[NEXT_STATUS[order.status]]}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default StaffOrders