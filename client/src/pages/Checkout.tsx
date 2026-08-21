import { useState, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../lib/api'

const OPEN_HOUR = 9 // 9:00 AM
const CLOSE_HOUR = 19 // 7:00 PM

function formatDateInput(d: Date) {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatTimeLabel(hour: number, minute: number) {
  const period = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 === 0 ? 12 : hour % 12
  const displayMinute = String(minute).padStart(2, '0')
  return `${displayHour}:${displayMinute} ${period}`
}

function isSunday(dateStr: string) {
  if (!dateStr) return false
  // Parse as local date, not UTC, to avoid off-by-one day issues
  const [year, month, day] = dateStr.split('-').map(Number)
  const d = new Date(year, month - 1, day)
  return d.getDay() === 0
}

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
  const [dateError, setDateError] = useState('')
  const [loading, setLoading] = useState(false)

  const today = new Date()
  const minDateStr = formatDateInput(today)

  function handleDateChange(value: string) {
    setDateError('')
    setPickupTime('')

    if (isSunday(value)) {
      setDateError('Closed on Sundays.')
      setPickupDate('')
      return
    }

    setPickupDate(value)
  }

  const availableTimes = useMemo(() => {
    if (!pickupDate) return []

    const isToday = pickupDate === minDateStr
    const slots: string[] = []

    for (let hour = OPEN_HOUR; hour <= CLOSE_HOUR; hour++) {
      for (const minute of [0, 30]) {
        if (hour === CLOSE_HOUR && minute > 0) continue // don't go past 7:00 PM

        if (isToday) {
          const slotTime = new Date()
          slotTime.setHours(hour, minute, 0, 0)
          if (slotTime.getTime() <= today.getTime()) continue
        }

        slots.push(formatTimeLabel(hour, minute))
      }
    }

    return slots
  }, [pickupDate])

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
            min={minDateStr}
            onChange={(e) => handleDateChange(e.target.value)}
            className="w-full border border-amber-300 rounded px-3 py-2"
            required
          />
          <p className="text-xs text-gray-500 mt-1">Open daily 9:00 AM–7:00 PM. Closed Sundays.</p>
          {dateError && <p className="text-red-600 text-sm mt-1">{dateError}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-amber-900">Preferred Time</label>
          <select
            value={pickupTime}
            onChange={(e) => setPickupTime(e.target.value)}
            disabled={!pickupDate}
            className="w-full border border-amber-300 rounded px-3 py-2 bg-white disabled:bg-gray-100 disabled:text-gray-400"
            required
          >
            <option value="">
              {pickupDate ? 'Select a time' : 'Choose a date first'}
            </option>
            {availableTimes.map((time) => (
              <option key={time} value={time}>{time}</option>
            ))}
          </select>
          {pickupDate && availableTimes.length === 0 && (
            <p className="text-red-600 text-sm mt-1">No time slots left today. Please choose another date.</p>
          )}
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