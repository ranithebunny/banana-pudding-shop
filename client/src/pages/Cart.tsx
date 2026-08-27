import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { apiFetch } from '../lib/api'

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

function Cart() {
  const { items, removeItem, updateQuantity, total } = useCart()
  const [preview, setPreview] = useState<PreviewResponse | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  useEffect(() => {
    if (items.length === 0) {
      setPreview(null)
      return
    }

    let cancelled = false
    setPreviewLoading(true)

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
      .finally(() => {
        if (!cancelled) setPreviewLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [items])

  if (items.length === 0) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <p className="text-5xl mb-4">🍌</p>
        <h1 className="font-display text-2xl font-semibold text-espresso mb-2">Your pudding box is empty</h1>
        <p className="text-espresso-soft mb-6">Pick a flavor and we'll pack it up fresh for you.</p>
        <Link
          to="/"
          className="inline-block bg-caramel hover:bg-caramel-dark text-white rounded-full px-6 py-2.5 font-semibold shadow-sm hover:shadow-md active:scale-[0.98] transition-all"
        >
          Browse the Menu
        </Link>
      </div>
    )
  }

  const isStaff = preview?.isStaff === true
  const displayTotal = isStaff && preview?.total !== undefined ? preview.total : total

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="font-display text-3xl font-semibold text-espresso mb-6">Your Cart</h1>

      {isStaff && preview?.totalDiscountedTubsThisOrder! > 0 && (
        <div className="mb-4 bg-leaf-light border border-leaf/30 text-leaf rounded-2xl px-4 py-3 text-sm font-semibold flex items-center gap-2">
          <span>✓</span> Staff Discount Applied
        </div>
      )}

      {isStaff && preview?.dailyLimitReached && (
        <div className="mb-4 bg-banana-light border border-banana/40 text-espresso rounded-2xl px-4 py-3 text-sm">
          <p className="font-semibold">Daily Staff Discount Limit Reached</p>
          <p className="text-espresso-soft mt-0.5">
            You've used your 3 discounted tubs for today. Additional tubs will be charged at regular price.
          </p>
        </div>
      )}

      <div className="space-y-3 mb-6">
        {items.map((item) => {
          const breakdown = preview?.items?.find((i) => i.productId === item.productId)

          return (
            <div
              key={item.productId}
              className="flex items-center justify-between bg-card border border-caramel-light/60 rounded-2xl px-4 py-3.5 shadow-sm"
            >
              <div className="min-w-0 pr-3">
                <p className="font-display font-semibold text-espresso truncate">{item.name}</p>
                {isStaff && breakdown && breakdown.discountedQuantity > 0 ? (
                  <p className="text-sm mt-0.5">
                    <span className="line-through text-espresso-soft/50 mr-1.5">₱{item.price}</span>
                    <span className="text-leaf font-semibold">₱{breakdown.discountedUnitPrice.toFixed(2)}</span>
                    {breakdown.regularQuantity > 0 && (
                      <span className="ml-1.5 text-xs text-espresso-soft">
                        ({breakdown.discountedQuantity} discounted, {breakdown.regularQuantity} regular)
                      </span>
                    )}
                  </p>
                ) : (
                  <p className="text-sm text-espresso-soft mt-0.5">₱{item.price} each</p>
                )}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-1 bg-cream-deep rounded-full p-1">
                  <button
                    onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                    className="w-7 h-7 rounded-full bg-card text-espresso font-semibold hover:bg-caramel hover:text-white transition-colors flex items-center justify-center"
                    aria-label={`Decrease quantity of ${item.name}`}
                  >
                    −
                  </button>
                  <span className="w-6 text-center text-sm font-semibold text-espresso">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                    className="w-7 h-7 rounded-full bg-card text-espresso font-semibold hover:bg-caramel hover:text-white transition-colors flex items-center justify-center"
                    aria-label={`Increase quantity of ${item.name}`}
                  >
                    +
                  </button>
                </div>
                <button
                  onClick={() => removeItem(item.productId)}
                  className="text-xs text-espresso-soft/70 hover:text-red-600 underline underline-offset-2 transition-colors"
                  aria-label={`Remove ${item.name} from cart`}
                >
                  Remove
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="bg-cream-deep rounded-2xl px-5 py-5 flex items-center justify-between">
        <div>
          {isStaff && preview?.total !== undefined && preview.total !== total && (
            <p className="text-sm text-espresso-soft/60 line-through">₱{total.toFixed(2)}</p>
          )}
          <p className="text-sm text-espresso-soft mb-0.5">Total</p>
          <p className="font-display text-3xl font-bold text-espresso">
            ₱{previewLoading ? total.toFixed(2) : displayTotal.toFixed(2)}
          </p>
        </div>
        <Link
          to="/checkout"
          className="bg-caramel hover:bg-caramel-dark text-white rounded-full px-7 py-3 font-semibold shadow-sm hover:shadow-md active:scale-[0.98] transition-all"
        >
          Checkout
        </Link>
      </div>
    </div>
  )
}

export default Cart