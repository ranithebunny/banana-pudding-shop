import { useRef, useState } from 'react'
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
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [paymentMethod, setPaymentMethod] = useState('GCASH')
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function setSelectedFile(selected: File | null) {
    setFile(selected)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(selected ? URL.createObjectURL(selected) : null)
    if (selected) setError('')
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const dropped = e.dataTransfer.files?.[0]
    if (dropped) setSelectedFile(dropped)
  }

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
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="font-display text-3xl font-semibold text-espresso mb-1">Submit Payment</h1>
      <p className="text-sm text-espresso-soft mb-6">
        Scan to pay, then upload a screenshot of your receipt below.
      </p>

      <p className="text-sm font-semibold text-espresso mb-3">1. Choose your payment method</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {PAYMENT_METHODS.map((method) => {
          const isSelected = paymentMethod === method.value
          return (
            <button
              key={method.value}
              type="button"
              onClick={() => setPaymentMethod(method.value)}
              className={`text-left border-2 rounded-2xl p-4 bg-card transition-colors ${
                isSelected ? 'border-caramel ring-2 ring-caramel/15' : 'border-caramel-light hover:border-caramel/50'
              }`}
            >
              <div className="flex items-center gap-2 mb-3">
                <span
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    isSelected ? 'border-caramel' : 'border-espresso-soft/30'
                  }`}
                >
                  {isSelected && <span className="w-2 h-2 rounded-full bg-caramel" />}
                </span>
                <span className="font-semibold text-espresso">{method.label}</span>
              </div>
              <div className="flex justify-center bg-cream rounded-xl p-3">
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

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <p className="text-sm font-semibold text-espresso mb-3">2. Upload your receipt</p>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            className="sr-only"
            id="payment-proof-input"
          />

          {!previewUrl ? (
            <label
              htmlFor="payment-proof-input"
              onDragOver={(e) => {
                e.preventDefault()
                setIsDragging(true)
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-2xl px-6 py-10 text-center cursor-pointer transition-colors ${
                isDragging ? 'border-caramel bg-caramel-light/40' : 'border-caramel-light bg-cream-deep hover:border-caramel/50'
              }`}
            >
              <span className="text-3xl" aria-hidden="true">🧾</span>
              <p className="font-display font-semibold text-espresso">Upload Receipt</p>
              <p className="text-sm text-espresso-soft">Drag & drop or choose your payment screenshot</p>
              <span className="mt-2 inline-block bg-caramel hover:bg-caramel-dark text-white rounded-full px-5 py-2 text-sm font-semibold shadow-sm transition-colors">
                Choose File
              </span>
              <p className="text-xs text-espresso-soft/70 mt-2">JPG, PNG, or WEBP · Max 5MB</p>
            </label>
          ) : (
            <div className="border border-caramel-light rounded-2xl p-4 bg-card">
              <div className="flex items-start gap-4">
                <img
                  src={previewUrl}
                  alt="Selected proof of payment preview"
                  className="w-24 h-24 object-cover rounded-xl border border-caramel-light shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-espresso truncate">{file?.name}</p>
                  <p className="text-xs text-espresso-soft mt-0.5">
                    {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : ''}
                  </p>
                  <div className="flex gap-3 mt-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs font-semibold text-caramel-dark hover:text-caramel underline underline-offset-2"
                    >
                      Replace
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedFile(null)}
                      className="text-xs font-semibold text-espresso-soft/70 hover:text-red-600 underline underline-offset-2"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <p className="text-xs text-espresso-soft mt-2">
            After you submit, our team will review your receipt and confirm your order.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-caramel hover:bg-caramel-dark text-white rounded-full py-3.5 font-semibold shadow-sm hover:shadow-md active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100"
        >
          {loading ? 'Uploading...' : 'Submit Payment'}
        </button>
      </form>
    </div>
  )
}

export default PaymentUpload