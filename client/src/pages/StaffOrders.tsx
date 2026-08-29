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
  contactNumber: string | null
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

const STATUS_STYLES: Record<string, string> = {
  PENDING_PAYMENT: 'bg-banana-light text-espresso',
  PAYMENT_REVIEW: 'bg-banana-light text-espresso',
  CONFIRMED: 'bg-caramel-light text-caramel-dark',
  PREPARING: 'bg-caramel-light text-caramel-dark',
  READY: 'bg-leaf-light text-leaf',
  COMPLETED: 'bg-leaf text-white',
  CANCELLED: 'bg-red-50 text-red-700',
}

const DELIVERY_METHOD_LABELS: Record<string, string> = {
  OWN_COURIER: "Customer's own courier",
  TEAM_DELIVERY: 'Team-handled delivery',
}

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] || 'bg-cream-deep text-espresso-soft'
  return (
    <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${style}`}>
      {STATUS_LABELS[status] || status}
    </span>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 text-sm py-0.5">
      <span className="text-espresso-soft">{label}</span>
      <span className="text-espresso font-medium text-right">{value}</span>
    </div>
  )
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

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="h-8 w-32 bg-cream-deep rounded animate-pulse mb-6" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-card border border-caramel-light/60 rounded-2xl p-4 h-20 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="font-display text-3xl font-semibold text-espresso mb-6">Orders</h1>

      <div className="flex gap-3 mb-6">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border border-caramel-light rounded-xl px-3 py-2 text-sm bg-card text-espresso focus:outline-none focus:ring-2 focus:ring-caramel/40"
        >
          <option value="">All statuses</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-800 mb-4">
          {error}
        </div>
      )}

      {orders.length === 0 && <p className="text-espresso-soft">No orders found.</p>}

      <div className="space-y-3">
        {orders.map((order) => {
          const isExpanded = expandedIds.has(order.id)
          return (
            <div key={order.id} className="bg-card border border-caramel-light/60 rounded-2xl overflow-hidden shadow-sm">
              <button
                type="button"
                onClick={() => toggleExpanded(order.id)}
                className="w-full text-left p-4 flex items-center justify-between gap-4 hover:bg-cream-deep/40 transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="font-display font-semibold text-espresso">{order.orderNumber}</p>
                    <StatusBadge status={order.status} />
                  </div>
                  <p className="text-sm text-espresso-soft truncate">
                    {order.customer.name} · ₱{order.total} · {order.fulfillmentType === 'PICKUP' ? 'Pickup' : 'Delivery'}
                  </p>
                </div>
                <span className="text-caramel-dark text-sm font-semibold shrink-0">
                  {isExpanded ? '▲ Hide' : '▼ Details'}
                </span>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 border-t border-caramel-light/60 pt-4 space-y-3">
                  <div className="bg-cream rounded-xl p-3">
                    <p className="text-xs font-semibold text-espresso-soft uppercase tracking-wide mb-2">Items</p>
                    {order.items.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm text-espresso py-0.5">
                        <span>{item.productName} × {item.quantity}</span>
                        <span className="font-medium">₱{item.subtotal}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm text-espresso-soft pt-1.5 mt-1.5 border-t border-caramel-light/60">
                      <span>Subtotal</span>
                      <span>₱{order.subtotal}</span>
                    </div>
                    {order.fulfillmentType === 'DELIVERY' && (
                      <div className="flex justify-between text-sm text-espresso-soft">
                        <span>Delivery Fee</span>
                        <span>₱{order.deliveryFee}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-semibold text-espresso pt-1.5 mt-1.5 border-t border-caramel-light/60">
                      <span>Total</span>
                      <span>₱{order.total}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-cream-deep rounded-xl p-3">
                      <p className="text-xs font-semibold text-espresso-soft uppercase tracking-wide mb-1.5">
                        Customer &amp; Fulfillment
                      </p>
                      <InfoRow label="Email" value={order.customer.email} />
                      {order.contactNumber && <InfoRow label="Contact" value={order.contactNumber} />}
                      <InfoRow label="Type" value={order.fulfillmentType === 'PICKUP' ? 'Pickup' : 'Delivery'} />
                      {order.fulfillmentType === 'DELIVERY' && order.deliveryMethod && (
                        <InfoRow
                          label="Method"
                          value={DELIVERY_METHOD_LABELS[order.deliveryMethod] || order.deliveryMethod}
                        />
                      )}
                      {order.pickupDate && (
                        <InfoRow label="Date" value={new Date(order.pickupDate).toLocaleDateString()} />
                      )}
                      {order.pickupTime && <InfoRow label="Time" value={order.pickupTime} />}
                      {order.deliveryAddress && <InfoRow label="Address" value={order.deliveryAddress} />}
                      {order.notes && <InfoRow label="Notes" value={order.notes} />}
                    </div>

                    {order.payment && (
                      <div className="bg-cream-deep rounded-xl p-3">
                        <p className="text-xs font-semibold text-espresso-soft uppercase tracking-wide mb-1.5">
                          Payment
                        </p>
                        <InfoRow label="Method" value={order.payment.paymentMethod} />
                        <InfoRow label="Status" value={order.payment.status} />
                        {order.payment.rejectionReason && (
                          <InfoRow label="Rejection reason" value={order.payment.rejectionReason} />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="px-4 pb-4 flex items-center gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                {NEXT_STATUS[order.status] && (
                  <button
                    onClick={() => advanceStatus(order.id, NEXT_STATUS[order.status])}
                    className="bg-caramel hover:bg-caramel-dark text-white rounded-full px-4 py-1.5 text-sm font-semibold transition-colors"
                  >
                    Mark as {STATUS_LABELS[NEXT_STATUS[order.status]]}
                  </button>
                )}
                {order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && (
                  <button
                    onClick={() => cancelOrder(order.id)}
                    className="border border-red-300 text-red-700 hover:bg-red-50 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                )}
                {user?.role === 'OWNER' && (
                  <button
                    onClick={() => deleteOrder(order.id)}
                    className="text-xs text-espresso-soft/60 hover:text-red-600 underline underline-offset-2 ml-auto"
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