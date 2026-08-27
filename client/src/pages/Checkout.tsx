import { useState, useMemo, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../lib/api'

const OPEN_HOUR = 9 // 9:00 AM
const CLOSE_HOUR = 19 // 7:00 PM

const DELIVERY_OPTIONS = [
  {
    value: 'OWN_COURIER',
    label: "I'll book my own courier",
    description: "Book your preferred courier (Lalamove, Grab, etc.) by coordinating with us through Instagram @rnb.akes.",
    fee: 0,
  },
  {
    value: 'TEAM_DELIVERY',
    label: 'Let our team handle delivery',
    description: 'Fixed delivery fee of ₱150 within Metro Manila.',
    fee: 150,
  },
]

interface DiscountedItem {
  productId: string
  productName: string
  quantity: number
  discountedQuantity: number
  regularQuantity: number
  unitPrice: number
  discountedUnitPrice: number
  lineTotal: number
}

interface PreviewResponse {
  isStaff: boolean
  tubsUsedToday?: number
  items?: DiscountedItem[]
  total?: number
  totalDiscountedTubsThisOrder?: number
  dailyLimitReached?: boolean
  tubsRemainingToday?: number
}

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
  const [year, month, day] = dateStr.split('-').map(Number)
  const d = new Date(year, month - 1, day)
  return d.getDay() === 0
}

function Checkout() {
  const { items, total: cartTotal, clearCart } = useCart()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [fulfillmentType, setFulfillmentType] = useState('PICKUP')
  const [deliveryMethod, setDeliveryMethod] = useState('OWN_COURIER')
  const [pickupDate, setPickupDate] = useState('')
  const [pickupTime, setPickupTime] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [dateError, setDateError] = useState('')
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<PreviewResponse | null>(null)

  const today = new Date()
  const minDateStr = formatDateInput(today)

  useEffect(() => {
    if (items.length === 0) {
      setPreview(null)
      return
    }

    let cancelled = false

    apiFetch('/orders/preview', {
      method: 'POST',
      body: JSON.stringify({
        items: items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
      }),
    })
      .then((data: PreviewResponse) => {
        if (!cancelled) setPreview(data)
      })
      .catch(() => {
        if (!cancelled) setPreview(null)
      })

    return () => {
      cancelled = true
    }
  }, [items])

  const isStaff = preview?.isStaff === true
  const discountedSubtotal = isStaff && preview?.total !== undefined ? preview.total : cartTotal

  const deliveryFee = fulfillmentType === 'DELIVERY'
    ? (DELIVERY_OPTIONS.find((o) => o.value === deliveryMethod)?.fee ?? 0)
    : 0
  const orderTotal = discountedSubtotal + deliveryFee

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
        if (hour === CLOSE_HOUR && minute > 0) continue

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
          deliveryMethod: fulfillmentType === 'DELIVERY' ? deliveryMethod : undefined,
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
        {isStaff && preview?.totalDiscountedTubsThisOrder! > 0 && (
          <div className="mb-3 bg-green-50 border border-green-300 text-green-800 rounded px-3 py-2 text-sm font-medium">
            Staff Discount Applied
          </div>
        )}
        {isStaff && preview?.dailyLimitReached && (
          <div className="mb-3 bg-amber-50 border border-amber-300 text-amber-800 rounded px-3 py-2 text-sm">
            <p className="font-medium">Daily Staff Discount Limit Reached</p>
            <p>You've used your 3 discounted tubs for today. Additional tubs will be charged at regular price.</p>
          </div>
        )}

        {items.map((item) => {
          const breakdown = preview?.items?.find((i) => i.productId === item.productId)
          const lineTotal = isStaff && breakdown ? breakdown.lineTotal : item.price * item.quantity

          return (
            <div key={item.productId} className="flex justify-between text-sm mb-1 text-gray-700">
              <span>
                {item.name} × {item.quantity}
                {isStaff && breakdown && breakdown.discountedQuantity > 0 && (
                  <span className="text-xs text-green-700 ml-1">
                    ({breakdown.discountedQuantity} @ 20% off)
                  </span>
                )}
              </span>
              <span>₱{lineTotal.toFixed(2)}</span>
            </div>
          )
        })}

        <div className="flex justify-between text-sm pt-2 border-t border-amber-200 text-gray-700">
          <span>Subtotal</span>
          <span>₱{discountedSubtotal.toFixed(2)}</span>
        </div>
        {fulfillmentType === 'DELIVERY' && (
          <div className="flex justify-between text-sm text-gray-700">
            <span>Delivery Fee</span>
            <span>₱{deliveryFee}</span>
          </div>
        )}
        <div className="flex justify-between font-bold mt-2 pt-2 border-t border-amber-200 text-amber-900">
          <span>Total</span>
          <span>₱{orderTotal.toFixed(2)}</span>
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

        {fulfillmentType === 'DELIVERY' && (
          <div>
            <label className="block text-sm font-medium mb-2 text-amber-900">
              How would you like your delivery handled?
            </label>
            <div className="space-y-2">
              {DELIVERY_OPTIONS.map((option) => {
                const isSelected = deliveryMethod === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setDeliveryMethod(option.value)}
                    className={`w-full text-left border-2 rounded-lg p-3 bg-white transition-colors ${
                      isSelected ? 'border-amber-500 ring-2 ring-amber-200' : 'border-amber-200 hover:border-amber-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          isSelected ? 'border-amber-500' : 'border-gray-300'
                        }`}
                      >
                        {isSelected && <span className="w-2 h-2 rounded-full bg-amber-500" />}
                      </span>
                      <span className="font-medium text-amber-900 text-sm">
                        {option.label} {option.fee > 0 ? `(+₱${option.fee})` : '(₱0)'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 ml-6">{option.description}</p>
                  </button>
                )
              })}
            </div>
          </div>
        )}

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