import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../lib/api'

interface Order {
  id: string
  orderNumber: string
  status: string
  total: string
  fulfillmentType?: string
  createdAt: string
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

const FULFILLMENT_LABELS: Record<string, string> = {
  PICKUP: 'Pickup',
  DELIVERY: 'Delivery',
}

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] || 'bg-cream-deep text-espresso-soft'
  return (
    <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${style}`}>
      {STATUS_LABELS[status] || status}
    </span>
  )
}

function OrderCardSkeleton() {
  return (
    <div className="bg-card border border-caramel-light/60 rounded-2xl p-4 animate-pulse">
      <div className="flex justify-between mb-2">
        <div className="h-4 w-28 bg-cream-deep rounded" />
        <div className="h-4 w-16 bg-cream-deep rounded" />
      </div>
      <div className="h-5 w-20 bg-cream-deep rounded-full mb-2" />
      <div className="h-3 w-24 bg-cream-deep rounded" />
    </div>
  )
}

function MyOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const data = await apiFetch('/orders')
        setOrders(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load orders.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="h-8 w-40 bg-cream-deep rounded animate-pulse mb-6" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <OrderCardSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <p className="font-display text-lg text-espresso mb-1">Couldn't load your orders.</p>
        <p className="text-sm text-espresso-soft">{error}</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="font-display text-3xl font-semibold text-espresso mb-6">My Orders</h1>

      {orders.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🍮</p>
          <p className="font-display text-xl text-espresso mb-1">No orders yet</p>
          <p className="text-sm text-espresso-soft mb-6">Once you place an order, you'll see it here.</p>
          <Link
            to="/"
            className="inline-block bg-caramel hover:bg-caramel-dark text-white rounded-full px-6 py-2.5 font-semibold shadow-sm hover:shadow-md active:scale-[0.98] transition-all"
          >
            Browse the Menu
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Link
              key={order.id}
              to={`/orders/${order.id}`}
              className="block bg-card border border-caramel-light/60 rounded-2xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <div className="flex justify-between items-start mb-2">
                <p className="font-display font-semibold text-espresso">{order.orderNumber}</p>
                <p className="font-display font-bold text-espresso">₱{order.total}</p>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <StatusBadge status={order.status} />
                {order.fulfillmentType && (
                  <span className="text-xs text-espresso-soft">
                    {FULFILLMENT_LABELS[order.fulfillmentType] || order.fulfillmentType}
                  </span>
                )}
              </div>
              <p className="text-xs text-espresso-soft/70">{new Date(order.createdAt).toLocaleDateString()}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default MyOrders