import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { apiFetch } from '../lib/api'

interface OrderItem {
  id: string
  productName: string
  quantity: number
  unitPrice: string
  subtotal: string
}

interface Order {
  id: string
  orderNumber: string
  status: string
  subtotal: string
  total: string
  fulfillmentType: string
  pickupDate: string | null
  pickupTime: string | null
  deliveryAddress: string | null
  notes: string | null
  items: OrderItem[]
}

function OrderDetail() {
  const { id } = useParams()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadOrder() {
      try {
        const data = await apiFetch(`/orders/${id}`)
        setOrder(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load order.')
      } finally {
        setLoading(false)
      }
    }
    loadOrder()
  }, [id])

  if (loading) return <div className="p-8">Loading order...</div>
  if (error) return <div className="p-8 text-red-600">{error}</div>
  if (!order) return null

  return (
    <div className="p-8 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-1">Order {order.orderNumber}</h1>
      <p className="text-sm text-gray-600 mb-6">Status: {order.status.replace('_', ' ')}</p>

      <div className="border rounded-lg p-4 mb-6">
        {order.items.map((item) => (
          <div key={item.id} className="flex justify-between text-sm mb-1">
            <span>{item.productName} × {item.quantity}</span>
            <span>₱{item.subtotal}</span>
          </div>
        ))}
        <div className="flex justify-between font-bold mt-2 pt-2 border-t">
          <span>Total</span>
          <span>₱{order.total}</span>
        </div>
      </div>

      <div className="text-sm text-gray-700 space-y-1 mb-6">
        <p>Fulfillment: {order.fulfillmentType}</p>
        {order.pickupDate && <p>Date: {new Date(order.pickupDate).toLocaleDateString()}</p>}
        {order.pickupTime && <p>Time: {order.pickupTime}</p>}
        {order.deliveryAddress && <p>Address: {order.deliveryAddress}</p>}
        {order.notes && <p>Notes: {order.notes}</p>}
      </div>

      {order.status === 'PENDING_PAYMENT' && (
  <Link
    to={`/orders/${order.id}/pay`}
    className="inline-block bg-blue-600 text-white rounded px-4 py-2 text-sm font-medium mb-4"
  >
    Upload Payment Proof
  </Link>
)}

      <Link to="/" className="text-blue-600 text-sm">Back to menu</Link>
    </div>
  )
}

export default OrderDetail