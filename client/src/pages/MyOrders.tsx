import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../lib/api'

interface Order {
  id: string
  orderNumber: string
  status: string
  total: string
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

  if (loading) return <div className="p-8">Loading your orders...</div>
  if (error) return <div className="p-8 text-red-600">{error}</div>

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">My Orders</h1>

      {orders.length === 0 && <p className="text-gray-600">You haven't placed any orders yet.</p>}

      <div className="space-y-3">
        {orders.map((order) => (
          <Link
            key={order.id}
            to={`/orders/${order.id}`}
            className="block border rounded-lg p-4 hover:bg-gray-50"
          >
            <div className="flex justify-between">
              <p className="font-semibold">{order.orderNumber}</p>
              <p className="text-sm text-gray-600">₱{order.total}</p>
            </div>
            <p className="text-sm text-gray-600">{STATUS_LABELS[order.status] || order.status}</p>
            <p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}

export default MyOrders