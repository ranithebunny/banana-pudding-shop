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

  if (loading) return <div className="p-8">Loading payments...</div>

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Payments Awaiting Review</h1>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      {payments.length === 0 && <p className="text-gray-600">No payments awaiting review.</p>}

      <div className="space-y-4">
        {payments.map((payment) => (
          <div key={payment.id} className="border rounded-lg p-4">
            <p className="font-semibold">Order {payment.order.orderNumber}</p>
            <p className="text-sm text-gray-600">
              {payment.order.customer.name} ({payment.order.customer.email})
            </p>
            <p className="text-sm text-gray-600 mb-2">
              {payment.paymentMethod} — ₱{payment.amount}
            </p>

            {imageUrls[payment.id] ? (
              <img src={imageUrls[payment.id]} alt="Payment proof" className="max-w-xs rounded mb-3" />
            ) : (
              <button
                onClick={() => viewProof(payment.id)}
                className="text-blue-600 text-sm mb-3"
              >
                View proof image
              </button>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => handleVerify(payment.id)}
                className="bg-green-600 text-white rounded px-4 py-1.5 text-sm font-medium"
              >
                Verify
              </button>
              <button
                onClick={() => setRejectingId(payment.id)}
                className="bg-red-600 text-white rounded px-4 py-1.5 text-sm font-medium"
              >
                Reject
              </button>
            </div>

            {rejectingId === payment.id && (
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Reason for rejection"
                  className="flex-1 border rounded px-3 py-1.5 text-sm"
                />
                <button
                  onClick={() => handleReject(payment.id)}
                  className="bg-red-600 text-white rounded px-4 py-1.5 text-sm"
                >
                  Confirm
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default StaffPayments