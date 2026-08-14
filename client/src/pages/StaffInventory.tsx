import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'

interface StockItem {
  productId: string
  productName: string
  stock: number
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

  if (loading) return <div className="p-8">Loading inventory...</div>

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Inventory</h1>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.productId} className="border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{item.productName}</p>
                <p className={`text-sm ${item.stock <= 5 ? 'text-red-600' : 'text-gray-600'}`}>
                  Stock: {item.stock} {item.stock <= 5 && '(Low)'}
                </p>
              </div>
              <button
                onClick={() => setRestockingId(restockingId === item.productId ? null : item.productId)}
                className="bg-blue-600 text-white rounded px-4 py-1.5 text-sm font-medium"
              >
                Restock
              </button>
            </div>

            {restockingId === item.productId && (
              <div className="mt-3 flex gap-2">
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="Quantity"
                  className="w-24 border rounded px-3 py-1.5 text-sm"
                />
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Reason (optional)"
                  className="flex-1 border rounded px-3 py-1.5 text-sm"
                />
                <button
                  onClick={() => handleRestock(item.productId)}
                  className="bg-green-600 text-white rounded px-4 py-1.5 text-sm"
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

export default StaffInventory