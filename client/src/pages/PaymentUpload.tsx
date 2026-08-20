import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

const PAYMENT_METHODS = [
  {
    value: 'GCASH',
    label: 'GCash',
    qrUrl: 'https://aevowxuwcyacwrmyqpme.supabase.co/storage/v1/object/public/product-images/gcash.JPG',
  },
  {
    value: 'BANK_TRANSFER',
    label: 'Bank Transfer',
    qrUrl: 'https://aevowxuwcyacwrmyqpme.supabase.co/storage/v1/object/public/product-images/gotyme.jpg',
  },
]

function PaymentUpload() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [paymentMethod, setPaymentMethod] = useState('GCASH')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!file) {
      setError('Please select a proof of payment image.')
      return
    }

    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('paymentMethod', paymentMethod)
      formData.append('proof', file)

      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL}/orders/${id}/payment`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit payment.')
      }

      navigate(`/orders/${id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit payment.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-amber-900">Submit Payment</h1>

      <p className="text-sm font-medium text-amber-900 mb-3">Choose your payment method and scan to pay</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {PAYMENT_METHODS.map((method) => {
          const isSelected = paymentMethod === method.value
          return (
            <button
              key={method.value}
              type="button"
              onClick={() => setPaymentMethod(method.value)}
              className={`text-left border-2 rounded-lg p-4 bg-white transition-colors ${
                isSelected ? 'border-amber-500 ring-2 ring-amber-200' : 'border-amber-200 hover:border-amber-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-3">
                <span
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    isSelected ? 'border-amber-500' : 'border-gray-300'
                  }`}
                >
                  {isSelected && <span className="w-2 h-2 rounded-full bg-amber-500" />}
                </span>
                <span className="font-semibold text-amber-900">{method.label}</span>
              </div>
              <div className="flex justify-center bg-white p-3">
                <img
                  src={method.qrUrl}
                  alt={`${method.label} QR code`}
                  className="w-40 h-40 object-contain"
                />
              </div>
            </button>
          )
        })}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-amber-900">Proof of Payment</label>
          <input
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full border border-amber-300 rounded px-3 py-2"
            required
          />
          <p className="text-xs text-gray-500 mt-1">JPG, PNG, or WEBP. Max 5MB.</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-amber-500 hover:bg-amber-600 text-white rounded py-2 font-medium disabled:opacity-50 transition-colors"
        >
          {loading ? 'Uploading...' : 'Submit Payment'}
        </button>
      </form>
    </div>
  )
}

export default PaymentUpload