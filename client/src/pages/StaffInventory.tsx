import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'

interface StockItem {
  productId: string
  productName: string
  stock: number
}

function InventoryRowSkeleton() {
  return (
    <div className="bg-card border border-caramel-light/60 rounded-2xl p-4 animate-pulse flex items-center justify-between">
      <div>
        <div className="h-4 w-32 bg-cream-deep rounded mb-2" />
        <div className="h-3 w-20 bg-cream-deep rounded" />
      </div>
      <div className="h-8 w-20 bg-cream-deep rounded-full" />
    </div>
  )
}

function StaffInventory() {
  const [items, setItems] = useState<StockItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [restockingId, setRestockingId] = useState<string | null>(null)
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState('')

  async function loadInventory() {
    setLoading(true)
    try {
      const data = await apiFetch('/inventory')
      setItems(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load inventory.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInventory()
  }, [])

  async function handleRestock(productId: string) {
    const qty = Number(quantity)
    if (!qty || qty <= 0) {
      setError('Enter a valid quantity.')
      return
    }
    try {
      await apiFetch('/inventory/restock', {
        method: 'POST',
        body: JSON.stringify({ productId, quantity: qty, reason }),
      })
      setRestockingId(null)
      setQuantity('')
      setReason('')
      loadInventory()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restock.')
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="h-8 w-32 bg-cream-deep rounded animate-pulse mb-6" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <InventoryRowSkeleton key={i} />)}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="font-display text-3xl font-semibold text-espresso mb-6">Inventory</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-800 mb-4">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {items.map((item) => {
          const isLow = item.stock <= 5
          const isRestocking = restockingId === item.productId
          return (
            <div
              key={item.productId}
              className="bg-card border border-caramel-light/60 rounded-2xl p-4 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display font-semibold text-espresso truncate">{item.productName}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-sm text-espresso-soft">Stock: {item.stock}</span>
                    {isLow && (
                      <span className="text-[11px] font-semibold bg-red-50 text-red-700 px-2 py-0.5 rounded-full">
                        Low
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setRestockingId(isRestocking ? null : item.productId)}
                  className="shrink-0 bg-caramel hover:bg-caramel-dark text-white rounded-full px-4 py-1.5 text-sm font-semibold transition-colors"
                >
                  {isRestocking ? 'Cancel' : 'Restock'}
                </button>
              </div>

              {isRestocking && (
                <div className="mt-3 pt-3 border-t border-caramel-light/60 flex flex-col sm:flex-row gap-2">
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="Quantity"
                    className="w-full sm:w-24 border border-caramel-light rounded-xl px-3 py-2 text-sm bg-cream focus:outline-none focus:ring-2 focus:ring-caramel/40"
                  />
                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Reason (optional)"
                    className="flex-1 border border-caramel-light rounded-xl px-3 py-2 text-sm bg-cream focus:outline-none focus:ring-2 focus:ring-caramel/40"
                  />
                  <button
                    onClick={() => handleRestock(item.productId)}
                    className="bg-leaf hover:opacity-90 text-white rounded-xl px-4 py-2 text-sm font-semibold transition-opacity"
                  >
                    Confirm
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default StaffInventory