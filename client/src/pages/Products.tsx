import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'
import { useCart } from '../context/CartContext'

interface Product {
  id: string
  name: string
  description: string | null
  price: string
  image: string | null
  variantGroup: string | null
  variantLabel: string | null
  isAddOn: boolean
  category: { id: string; name: string } | null
}

interface DisplayItem {
  key: string
  name: string
  description: string | null
  image: string | null
  category: { id: string; name: string } | null
  variants: Product[]
}

function Products() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedVariant, setSelectedVariant] = useState<Record<string, string>>({})
  const [pendingItem, setPendingItem] = useState<{ id: string; name: string; price: number } | null>(null)
  const [selectedAddOnIds, setSelectedAddOnIds] = useState<string[]>([])
  const { addItem } = useCart()

  useEffect(() => {
    async function loadProducts() {
      try {
        const data = await apiFetch('/products')
        setProducts(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load products.')
      } finally {
        setLoading(false)
      }
    }
    loadProducts()
  }, [])

  if (loading) return <div className="p-8">Loading menu...</div>
  if (error) return <div className="p-8 text-red-600">{error}</div>

  const addOns = products.filter((p) => p.isAddOn)
  const regularProducts = products.filter((p) => !p.isAddOn)

  const displayItems: DisplayItem[] = []
  const seenGroups = new Set<string>()

  for (const product of regularProducts) {
    if (product.variantGroup) {
      if (seenGroups.has(product.variantGroup)) continue
      seenGroups.add(product.variantGroup)
      const variants = regularProducts.filter((p) => p.variantGroup === product.variantGroup)
      displayItems.push({
        key: product.variantGroup,
        name: product.variantGroup,
        description: product.description,
        image: product.image,
        category: product.category,
        variants,
      })
    } else {
      displayItems.push({
        key: product.id,
        name: product.name,
        description: product.description,
        image: product.image,
        category: product.category,
        variants: [product],
      })
    }
  }

  function getSelectedProduct(item: DisplayItem): Product {
    const selectedId = selectedVariant[item.key]
    return item.variants.find((v) => v.id === selectedId) || item.variants[0]
  }

  function handleAddClick(item: DisplayItem) {
    const product = getSelectedProduct(item)
    const cartName = item.variants.length > 1 ? `${item.name} (${product.variantLabel})` : item.name

    if (addOns.length > 0) {
      setPendingItem({ id: product.id, name: cartName, price: Number(product.price) })
      setSelectedAddOnIds([])
    } else {
      addItem({ id: product.id, name: cartName, price: Number(product.price) })
    }
  }

  function toggleAddOn(addOnId: string) {
    setSelectedAddOnIds((prev) =>
      prev.includes(addOnId) ? prev.filter((id) => id !== addOnId) : [...prev, addOnId]
    )
  }

  function confirmAdd() {
    if (!pendingItem) return
    addItem(pendingItem)
    for (const addOnId of selectedAddOnIds) {
      const addOn = addOns.find((a) => a.id === addOnId)
      if (addOn) {
        addItem({ id: addOn.id, name: addOn.name, price: Number(addOn.price) })
      }
    }
    setPendingItem(null)
    setSelectedAddOnIds([])
  }

  function closeModal() {
    setPendingItem(null)
    setSelectedAddOnIds([])
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-amber-900">Our Menu</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {displayItems.map((item) => {
          const selected = getSelectedProduct(item)
          return (
            <div key={item.key} className="bg-white border border-amber-200 rounded-lg p-4 shadow-sm">
              {item.image && (
                <img src={item.image} alt={item.name} className="w-full h-40 object-cover rounded mb-3" />
              )}
              <h2 className="font-semibold text-amber-900">{item.name}</h2>
              {item.category && (
                <p className="text-xs text-amber-600 mb-1">{item.category.name}</p>
              )}
              {item.description && (
                <p className="text-sm text-gray-600 mb-2">{item.description}</p>
              )}

              {item.variants.length > 1 && (
                <select
                  value={selected.id}
                  onChange={(e) =>
                    setSelectedVariant((prev) => ({ ...prev, [item.key]: e.target.value }))
                  }
                  className="w-full border border-amber-300 rounded px-2 py-1.5 text-sm mb-2 bg-white"
                >
                  {item.variants.map((v) => (
                    <option key={v.id} value={v.id}>{v.variantLabel}</option>
                  ))}
                </select>
              )}

              <p className="font-bold mb-3 text-amber-900">₱{selected.price}</p>
              <button
                onClick={() => handleAddClick(item)}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white rounded py-1.5 text-sm font-medium transition-colors"
              >
                Add to Cart
              </button>
            </div>
          )
        })}
      </div>

      {pendingItem && addOns.length > 0 && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full relative">
            <button
              onClick={closeModal}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-xl leading-none"
              aria-label="Close"
            >
              ×
            </button>
            <p className="font-medium text-amber-900 mb-3">Add any extras?</p>

            <div className="space-y-2 mb-4">
              {addOns.map((addOn) => (
                <label key={addOn.id} className="flex items-center gap-2 text-sm text-amber-900">
                  <input
                    type="checkbox"
                    checked={selectedAddOnIds.includes(addOn.id)}
                    onChange={() => toggleAddOn(addOn.id)}
                  />
                  {addOn.name} (+₱{addOn.price})
                </label>
              ))}
            </div>

            <button
              onClick={confirmAdd}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white rounded py-2 text-sm font-medium transition-colors"
            >
              Add to Cart
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Products