import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../lib/api'

function Checkout() {
  const { items, total, clearCart } = useCart()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [fulfillmentType, setFulfillmentType] = useState('PICKUP')
  const [pickupDate, setPickupDate] = useState('')
  const [pickupTime, setPickupTime] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const order = await apiFetch('/orders', {
        method: 'POST',
        body: JSON.stringify({
          items: items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
          fulfillmentType,
          pickupDate: pickupDate || undefined,
          pickupTime: pickupTime || undefined,
          deliveryAddress: deliveryAddress || undefined,
          notes: notes || undefined,
        }),
      })

      clearCart()
      navigate(`/orders/${order.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to place order.')
    } finally {
      setLoading(false)
    }
  }

  if (items.length === 0) {
    return <div className="p-8 text-center text-gray-600">Your cart is empty.</div>
  }

  if (!user) {
    return (
      <div className="p-8 max-w-md mx-auto text-center">
        <h1 className="text-2xl font-bold mb-3 text-amber-900">Sign up or log in to checkout</h1>
        <p className="text-gray-600 mb-6">You'll need an account to place an order and track it.</p>
        <div className="flex gap-3 justify-center">
          <Link
            to="/login"
            className="bg-amber-500 hover:bg-amber-600 text-white rounded px-6 py-2 font-medium transition-colors"
          >
            Log in
          </Link>
          <Link
            to="/register"
            className="border border-amber-300 text-amber-900 rounded px-6 py-2 font-medium"
          >
            Register
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-amber-900">Checkout</h1>

      <div className="mb-6 bg-white border border-amber-200 rounded-lg p-4">
        {items.map((item) => (
          <div key={item.productId} className="flex justify-between text-sm mb-1 text-gray-700">
            <span>{item.name} × {item.quantity}</span>
            <span>₱{item.price * item.quantity}</span>
          </div>
        ))}
        <div className="flex justify-between font-bold mt-2 pt-2 border-t border-amber-200 text-amber-900">
          <span>Total</span>
          <span>₱{total}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-amber-900">Pickup or Delivery</label>
          <select
            value={fulfillmentType}
            onChange={(e) => setFulfillmentType(e.target.value)}
            className="w-full border border-amber-300 rounded px-3 py-2 bg-white"
          >
            <option value="PICKUP">Pickup</option>
            <option value="DELIVERY">Delivery</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-amber-900">
            {fulfillmentType === 'PICKUP' ? 'Pickup Date' : 'Delivery Date'}
          </label>
          <input
            type="date"
            value={pickupDate}
            onChange={(e) => setPickupDate(e.target.value)}
            className="w-full border border-amber-300 rounded px-3 py-2"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-amber-900">Preferred Time</label>
          <input
            type="text"
            value={pickupTime}
            onChange={(e) => setPickupTime(e.target.value)}
            placeholder="e.g. 2:00 PM"
            className="w-full border border-amber-300 rounded px-3 py-2"
            required
          />
        </div>

        {fulfillmentType === 'DELIVERY' && (
          <div>
            <label className="block text-sm font-medium mb-1 text-amber-900">Delivery Address</label>
            <textarea
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              className="w-full border border-amber-300 rounded px-3 py-2"
              required
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1 text-amber-900">Order Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full border border-amber-300 rounded px-3 py-2"
          />
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
          {loading ? 'Placing order...' : 'Place Order'}
        </button>
      </form>
    </div>
  )
}

export default Checkout