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

  // Group products that share a variantGroup into one display item each
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
    } else {
      addItem({ id: product.id, name: cartName, price: Number(product.price) })
    }
  }

  function confirmAdd(withAddOn: boolean) {
    if (!pendingItem) return
    addItem(pendingItem)
    if (withAddOn && addOns[0]) {
      addItem({ id: addOns[0].id, name: addOns[0].name, price: Number(addOns[0].price) })
    }
    setPendingItem(null)
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

      {pendingItem && addOns[0] && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <p className="font-medium text-amber-900 mb-4">
              Add {addOns[0].name} for ₱{addOns[0].price}?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => confirmAdd(true)}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white rounded py-2 text-sm font-medium transition-colors"
              >
                Yes, add it
              </button>
              <button
                onClick={() => confirmAdd(false)}
                className="flex-1 border border-amber-300 text-amber-900 rounded py-2 text-sm font-medium"
              >
                No thanks
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Products