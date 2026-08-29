import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { apiFetch } from '../lib/api'

interface OrderItem {
  id: string
  productName: string
  quantity: number
  unitPrice: string
  subtotal: string
  discountedQuantity: number
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
  discount: string
  deliveryMethod: string | null
  deliveryFee: string
  total: string
  fulfillmentType: string
  pickupDate: string | null
  pickupTime: string | null
  deliveryAddress: string | null
  contactNumber: string | null
  notes: string | null
  items: OrderItem[]
  payment: Payment | null
  createdAt: string
}

const DELIVERY_METHOD_LABELS: Record<string, string> = {
  OWN_COURIER: "Customer's own courier",
  TEAM_DELIVERY: 'Team-handled delivery',
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

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] || 'bg-cream-deep text-espresso-soft'
  return (
    <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${style}`}>
      {STATUS_LABELS[status] || status}
    </span>
  )
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

  if (loading) return <div className="max-w-lg mx-auto px-4 py-16 text-center text-espresso-soft">Loading order...</div>
  if (error) return <div className="max-w-lg mx-auto px-4 py-16 text-center text-red-600">{error}</div>
  if (!order) return null

  const orderAgeHours = (Date.now() - new Date(order.createdAt).getTime()) / (1000 * 60 * 60)
  const wasLikelyAutoCancelled = order.status === 'CANCELLED' && orderAgeHours >= 24 && !order.payment

  const discountAmount = Number(order.discount)
  const hasStaffDiscount = discountAmount > 0

  const needsPaymentUpload =
    order.status === 'PENDING_PAYMENT' && (!order.payment || order.payment.status === 'REJECTED')
  const paymentAwaitingReview =
    order.status === 'PENDING_PAYMENT' && order.payment && order.payment.status !== 'REJECTED'

  return (
    <div className="max-w-lg mx-auto px-4 sm:px-6 py-8">
      <h1 className="font-display text-2xl font-semibold text-espresso mb-2">Order {order.orderNumber}</h1>
      <div className="mb-6">
        <StatusBadge status={order.status} />
      </div>

      {order.status === 'CANCELLED' && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 text-sm text-red-800">
          {wasLikelyAutoCancelled
            ? 'This order was automatically cancelled because payment wasn\'t submitted within 24 hours.'
            : 'This order has been cancelled.'}
        </div>
      )}

      {order.payment?.status === 'REJECTED' && order.status === 'PENDING_PAYMENT' && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 text-sm text-red-800">
          <p className="font-semibold mb-1">Your payment was rejected.</p>
          {order.payment.rejectionReason && <p>Reason: {order.payment.rejectionReason}</p>}
          <p className="mt-1">Please upload a new proof of payment below.</p>
        </div>
      )}

      {paymentAwaitingReview && (
        <div className="bg-banana-light border border-banana/40 rounded-2xl p-4 mb-6 text-sm text-espresso flex items-start gap-2.5">
          <span className="text-lg leading-none">⏳</span>
          <div>
            <p className="font-semibold">Payment submitted</p>
            <p className="text-espresso-soft mt-0.5">We're reviewing your receipt — we'll confirm your order shortly.</p>
          </div>
        </div>
      )}

      {hasStaffDiscount && (
        <div className="bg-leaf-light border border-leaf/30 rounded-2xl p-4 mb-6 text-sm text-leaf font-semibold">
          ✓ Staff Discount Applied — you saved ₱{discountAmount.toFixed(2)} on this order.
        </div>
      )}

      <div className="bg-card border border-caramel-light/60 rounded-2xl p-5 mb-6 shadow-sm">
        <p className="text-xs font-semibold text-espresso-soft uppercase tracking-wide mb-3">Order Summary</p>
        {order.items.map((item) => (
          <div key={item.id} className="flex justify-between text-sm mb-1.5 text-espresso">
            <span>
              {item.productName} × {item.quantity}
              {item.discountedQuantity > 0 && (
                <span className="text-xs text-leaf font-medium ml-1.5">
                  ({item.discountedQuantity} @ 20% off)
                </span>
              )}
            </span>
            <span className="font-medium">₱{item.subtotal}</span>
          </div>
        ))}
        <div className="flex justify-between text-sm pt-3 mt-2 border-t border-caramel-light/60 text-espresso-soft">
          <span>Subtotal</span>
          <span>₱{order.subtotal}</span>
        </div>
        {hasStaffDiscount && (
          <div className="flex justify-between text-sm text-leaf mt-1">
            <span>Staff Discount</span>
            <span>−₱{discountAmount.toFixed(2)}</span>
          </div>
        )}
        {order.fulfillmentType === 'DELIVERY' && (
          <>
            <div className="flex justify-between text-sm text-espresso-soft mt-1">
              <span>Delivery Method</span>
              <span>{order.deliveryMethod ? DELIVERY_METHOD_LABELS[order.deliveryMethod] || order.deliveryMethod : '—'}</span>
            </div>
            <div className="flex justify-between text-sm text-espresso-soft mt-1">
              <span>Delivery Fee</span>
              <span>₱{order.deliveryFee}</span>
            </div>
          </>
        )}
        <div className="flex justify-between items-center mt-3 pt-3 border-t border-caramel-light/60">
          <span className="text-sm font-semibold text-espresso-soft">Total</span>
          <span className="font-display font-bold text-xl text-espresso">₱{order.total}</span>
        </div>
      </div>

      <div className="bg-cream-deep rounded-2xl p-5 text-sm text-espresso space-y-1.5 mb-6">
        <p><span className="text-espresso-soft">Fulfillment:</span> {order.fulfillmentType === 'PICKUP' ? 'Pickup' : 'Delivery'}</p>
        {order.contactNumber && <p><span className="text-espresso-soft">Contact:</span> {order.contactNumber}</p>}
        {order.pickupDate && <p><span className="text-espresso-soft">Date:</span> {new Date(order.pickupDate).toLocaleDateString()}</p>}
        {order.pickupTime && <p><span className="text-espresso-soft">Time:</span> {order.pickupTime}</p>}
        {order.deliveryAddress && <p><span className="text-espresso-soft">Address:</span> {order.deliveryAddress}</p>}
        {order.notes && <p><span className="text-espresso-soft">Notes:</span> {order.notes}</p>}
      </div>

      {needsPaymentUpload && (
        <Link
          to={`/orders/${order.id}/pay`}
          className="block w-full text-center bg-caramel hover:bg-caramel-dark text-white rounded-full py-3.5 font-semibold shadow-sm hover:shadow-md active:scale-[0.98] transition-all mb-5"
        >
          Upload Payment Proof
        </Link>
      )}

      <div className="text-center">
        <Link to="/" className="text-espresso-soft/70 hover:text-espresso text-sm font-medium underline underline-offset-2 transition-colors">
          Back to menu
        </Link>
      </div>
    </div>
  )
}

export default OrderDetail