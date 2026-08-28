import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'

interface Payment {
  id: string
  paymentMethod: string
  amount: string
  order: {
    orderNumber: string
    customer: { name: string; email: string }
  }
}

function PaymentCardSkeleton() {
  return (
    <div className="bg-card border border-caramel-light/60 rounded-2xl p-4 animate-pulse">
      <div className="h-4 w-28 bg-cream-deep rounded mb-2" />
      <div className="h-3 w-40 bg-cream-deep rounded mb-2" />
      <div className="h-3 w-32 bg-cream-deep rounded mb-3" />
      <div className="h-8 w-24 bg-cream-deep rounded-full" />
    </div>
  )
}

function StaffPayments() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({})
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')

  async function loadPayments() {
    setLoading(true)
    try {
      const data = await apiFetch('/payments')
      setPayments(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payments.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPayments()
  }, [])

  async function viewProof(paymentId: string) {
    try {
      const data = await apiFetch(`/payments/${paymentId}/proof-url`)
      setImageUrls((prev) => ({ ...prev, [paymentId]: data.url }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load proof image.')
    }
  }

  async function handleVerify(paymentId: string) {
    try {
      await apiFetch(`/payments/${paymentId}/verify`, { method: 'POST' })
      loadPayments()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify payment.')
    }
  }

  async function handleReject(paymentId: string) {
    if (!rejectionReason.trim()) return
    try {
      await apiFetch(`/payments/${paymentId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ rejectionReason }),
      })
      setRejectingId(null)
      setRejectionReason('')
      loadPayments()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject payment.')
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="h-8 w-64 bg-cream-deep rounded animate-pulse mb-6" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <PaymentCardSkeleton key={i} />)}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="font-display text-3xl font-semibold text-espresso mb-6">Payments Awaiting Review</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-800 mb-4">
          {error}
        </div>
      )}

      {payments.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">✅</p>
          <p className="font-display text-xl text-espresso mb-1">All caught up</p>
          <p className="text-sm text-espresso-soft">No payments awaiting review right now.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {payments.map((payment) => {
            const isRejecting = rejectingId === payment.id
            return (
              <div key={payment.id} className="bg-card border border-caramel-light/60 rounded-2xl p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3 mb-1">
                  <p className="font-display font-semibold text-espresso">Order {payment.order.orderNumber}</p>
                  <span className="text-sm font-semibold text-espresso shrink-0">₱{payment.amount}</span>
                </div>
                <p className="text-sm text-espresso-soft">
                  {payment.order.customer.name} ({payment.order.customer.email})
                </p>
                <p className="text-xs text-espresso-soft/80 mb-3">{payment.paymentMethod}</p>

                {imageUrls[payment.id] ? (
                  <img
                    src={imageUrls[payment.id]}
                    alt="Payment proof"
                    className="max-w-xs w-full rounded-xl border border-caramel-light mb-3"
                  />
                ) : (
                  <button
                    onClick={() => viewProof(payment.id)}
                    className="text-sm font-semibold text-caramel-dark hover:text-caramel underline underline-offset-2 mb-3"
                  >
                    View proof image
                  </button>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => handleVerify(payment.id)}
                    className="bg-leaf hover:opacity-90 text-white rounded-full px-4 py-1.5 text-sm font-semibold transition-opacity"
                  >
                    Verify
                  </button>
                  <button
                    onClick={() => setRejectingId(isRejecting ? null : payment.id)}
                    className="border border-red-300 text-red-700 hover:bg-red-50 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors"
                  >
                    {isRejecting ? 'Cancel' : 'Reject'}
                  </button>
                </div>

                {isRejecting && (
                  <div className="mt-3 pt-3 border-t border-caramel-light/60 flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Reason for rejection"
                      className="flex-1 border border-caramel-light rounded-xl px-3 py-2 text-sm bg-cream focus:outline-none focus:ring-2 focus:ring-caramel/40"
                    />
                    <button
                      onClick={() => handleReject(payment.id)}
                      className="bg-red-600 hover:bg-red-700 text-white rounded-xl px-4 py-2 text-sm font-semibold transition-colors"
                    >
                      Confirm
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default StaffPayments