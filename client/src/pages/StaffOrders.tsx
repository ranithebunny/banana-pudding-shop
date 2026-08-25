import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'
import { useAuth } from '../context/AuthContext'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

interface OrderItem {
  id: string
  productName: string
  quantity: number
  unitPrice: string
  subtotal: string
}

interface Payment {
  paymentMethod: string
  status: string
  rejectionReason: string | null
}

interface Order {
  id: string
  orderNumber: string
  status: string
  subtotal: string
  deliveryMethod: string | null
  deliveryFee: string
  total: string
  fulfillmentType: string
  pickupDate: string | null
  pickupTime: string | null
  deliveryAddress: string | null
  notes: string | null
  customer: { name: string; email: string }
  items: OrderItem[]
  payment: Payment | null
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

const DELIVERY_METHOD_LABELS: Record<string, string> = {
  OWN_COURIER: "Customer's own courier",
  TEAM_DELIVERY: 'Team-handled delivery',
}

function StaffOrders() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

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

  function toggleExpanded(orderId: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(orderId)) {
        next.delete(orderId)
      } else {
        next.add(orderId)
      }
      return next
    })
  }

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

  async function cancelOrder(orderId: string) {
    if (!confirm('Are you sure you want to cancel this order?')) return
    try {
      await apiFetch(`/orders/${orderId}/cancel`, { method: 'POST' })
      loadOrders()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel order.')
    }
  }

  async function deleteOrder(orderId: string) {
    if (!confirm('Permanently delete this order? This cannot be undone.')) return
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL}/orders/${orderId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to delete order.')
      }
      loadOrders()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete order.')
    }
  }

  if (loading) return <div className="p-8">Loading orders...</div>

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-amber-900">Orders</h1>

      <div className="flex gap-3 mb-6">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border border-amber-300 rounded px-3 py-2 text-sm bg-white"
        >
          <option value="">All statuses</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      {orders.length === 0 && <p className="text-gray-600">No orders found.</p>}

      <div className="space-y-3">
        {orders.map((order) => {
          const isExpanded = expandedIds.has(order.id)
          return (
            <div key={order.id} className="bg-white border border-amber-200 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => toggleExpanded(order.id)}
                className="w-full text-left p-4 flex items-center justify-between gap-4"
              >
                <div>
                  <p className="font-semibold text-amber-900">{order.orderNumber}</p>
                  <p className="text-sm text-gray-600">
                    {order.customer.name} — ₱{order.total} — {order.fulfillmentType}
                  </p>
                  <p className="text-xs text-gray-500">{STATUS_LABELS[order.status] || order.status}</p>
                </div>
                <span className="text-amber-600 text-sm shrink-0">{isExpanded ? '▲ Hide' : '▼ Details'}</span>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 border-t border-amber-100 pt-3 text-sm text-gray-700 space-y-2">
                  <div>
                    <p className="font-medium text-amber-900 mb-1">Items</p>
                    {order.items.map((item) => (
                      <div key={item.id} className="flex justify-between">
                        <span>{item.productName} × {item.quantity}</span>
                        <span>₱{item.subtotal}</span>
                      </div>
                    ))}
                    <div className="flex justify-between pt-1 mt-1 border-t border-amber-100">
                      <span>Subtotal</span>
                      <span>₱{order.subtotal}</span>
                    </div>
                    {order.fulfillmentType === 'DELIVERY' && (
                      <>
                        <div className="flex justify-between">
                          <span>Delivery Method</span>
                          <span>
                            {order.deliveryMethod
                              ? DELIVERY_METHOD_LABELS[order.deliveryMethod] || order.deliveryMethod
                              : '—'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Delivery Fee</span>
                          <span>₱{order.deliveryFee}</span>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between font-medium text-amber-900">
                      <span>Total</span>
                      <span>₱{order.total}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-amber-100">
                    <p>Customer email: {order.customer.email}</p>
                    <p>Fulfillment: {order.fulfillmentType}</p>
                    {order.pickupDate && <p>Date: {new Date(order.pickupDate).toLocaleDateString()}</p>}
                    {order.pickupTime && <p>Time: {order.pickupTime}</p>}
                    {order.deliveryAddress && <p>Address: {order.deliveryAddress}</p>}
                    {order.notes && <p>Notes: {order.notes}</p>}
                  </div>

                  {order.payment && (
                    <div className="pt-2 border-t border-amber-100">
                      <p>Payment method: {order.payment.paymentMethod}</p>
                      <p>Payment status: {order.payment.status}</p>
                      {order.payment.rejectionReason && (
                        <p>Rejection reason: {order.payment.rejectionReason}</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div
                className="px-4 pb-4 flex gap-2"
                onClick={(e) => e.stopPropagation()}
              >
                {NEXT_STATUS[order.status] && (
                  <button
                    onClick={() => advanceStatus(order.id, NEXT_STATUS[order.status])}
                    className="bg-amber-500 hover:bg-amber-600 text-white rounded px-4 py-1.5 text-sm font-medium transition-colors"
                  >
                    Mark as {STATUS_LABELS[NEXT_STATUS[order.status]]}
                  </button>
                )}
                {order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && (
                  <button
                    onClick={() => cancelOrder(order.id)}
                    className="bg-red-600 hover:bg-red-700 text-white rounded px-4 py-1.5 text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                )}
                {user?.role === 'OWNER' && (
                  <button
                    onClick={() => deleteOrder(order.id)}
                    className="text-sm text-gray-500 hover:text-red-600"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default StaffOrders