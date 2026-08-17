import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'
import { useCart } from '../context/CartContext'

interface Product {
  id: string
  name: string
  description: string | null
  price: string
  image: string | null
  category: { id: string; name: string } | null
}

function Products() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
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

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Our Menu</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
       {products.map((product) => (
  <div key={product.id} className="border rounded-lg p-4">
    {product.image && (
      <img src={product.image} alt={product.name} className="w-full h-40 object-cover rounded mb-3" />
    )}
    <h2 className="font-semibold">{product.name}</h2>
            {product.category && (
              <p className="text-xs text-gray-500 mb-1">{product.category.name}</p>
            )}
            {product.description && (
              <p className="text-sm text-gray-600 mb-2">{product.description}</p>
            )}
            <p className="font-bold mb-3">₱{product.price}</p>
            <button
              onClick={() => addItem({ id: product.id, name: product.name, price: Number(product.price) })}
              className="w-full bg-blue-600 text-white rounded py-1.5 text-sm font-medium"
            >
              Add to Cart
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Products