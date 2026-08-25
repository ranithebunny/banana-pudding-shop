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

interface Payment {
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
  items: OrderItem[]
  payment: Payment | null
  createdAt: string
}

const DELIVERY_METHOD_LABELS: Record<string, string> = {
  OWN_COURIER: "Customer's own courier",
  TEAM_DELIVERY: 'Team-handled delivery',
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

  const orderAgeHours = (Date.now() - new Date(order.createdAt).getTime()) / (1000 * 60 * 60)
  const wasLikelyAutoCancelled = order.status === 'CANCELLED' && orderAgeHours >= 24 && !order.payment

  return (
    <div className="p-8 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-1 text-amber-900">Order {order.orderNumber}</h1>
      <p className="text-sm text-gray-600 mb-6">Status: {order.status.replace('_', ' ')}</p>

      {order.status === 'CANCELLED' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-sm text-red-800">
          {wasLikelyAutoCancelled
            ? 'This order was automatically cancelled because payment wasn\'t submitted within 24 hours.'
            : 'This order has been cancelled.'}
        </div>
      )}

      {order.payment?.status === 'REJECTED' && order.status === 'PENDING_PAYMENT' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-sm text-red-800">
          <p className="font-medium mb-1">Your payment was rejected.</p>
          {order.payment.rejectionReason && <p>Reason: {order.payment.rejectionReason}</p>}
          <p className="mt-1">Please upload a new proof of payment below.</p>
        </div>
      )}

      <div className="bg-white border border-amber-200 rounded-lg p-4 mb-6">
        {order.items.map((item) => (
          <div key={item.id} className="flex justify-between text-sm mb-1">
            <span>{item.productName} × {item.quantity}</span>
            <span>₱{item.subtotal}</span>
          </div>
        ))}
        <div className="flex justify-between text-sm pt-2 border-t border-amber-200 text-gray-700">
          <span>Subtotal</span>
          <span>₱{order.subtotal}</span>
        </div>
        {order.fulfillmentType === 'DELIVERY' && (
          <>
            <div className="flex justify-between text-sm text-gray-700">
              <span>Delivery Method</span>
              <span>{order.deliveryMethod ? DELIVERY_METHOD_LABELS[order.deliveryMethod] || order.deliveryMethod : '—'}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-700">
              <span>Delivery Fee</span>
              <span>₱{order.deliveryFee}</span>
            </div>
          </>
        )}
        <div className="flex justify-between font-bold mt-2 pt-2 border-t border-amber-200 text-amber-900">
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
          className="inline-block bg-amber-500 hover:bg-amber-600 text-white rounded px-4 py-2 text-sm font-medium mb-4 transition-colors"
        >
          Upload Payment Proof
        </Link>
      )}

      <div>
        <Link to="/" className="text-amber-600 text-sm font-medium">Back to menu</Link>
      </div>
    </div>
  )
}

export default OrderDetail