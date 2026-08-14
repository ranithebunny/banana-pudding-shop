import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

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
      const response = await fetch(`http://localhost:4000/api/orders/${id}/payment`, {
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
    <div className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">Submit Payment</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Payment Method</label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="w-full border rounded px-3 py-2"
          >
            <option value="GCASH">GCash</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Proof of Payment</label>
          <input
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full border rounded px-3 py-2"
            required
          />
          <p className="text-xs text-gray-500 mt-1">JPG, PNG, or WEBP. Max 5MB.</p>
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white rounded py-2 font-medium disabled:opacity-50"
        >
          {loading ? 'Uploading...' : 'Submit Payment'}
        </button>
      </form>
    </div>
  )
}

export default PaymentUpload