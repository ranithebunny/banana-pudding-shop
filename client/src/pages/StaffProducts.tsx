import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

interface Product {
  id: string
  name: string
  description: string | null
  price: string
  cost: string
  image: string | null
  isActive: boolean
  category: { id: string; name: string } | null
}

function StaffProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [cost, setCost] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function loadProducts() {
    setLoading(true)
    try {
      const data = await apiFetch('/products')
      setProducts(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProducts()
  }, [])

  function startEdit(product: Product) {
    setEditingId(product.id)
    setName(product.name)
    setDescription(product.description || '')
    setPrice(product.price)
    setCost(product.cost)
    setImage(null)
  }

  function startCreate() {
    setEditingId('new')
    setName('')
    setDescription('')
    setPrice('')
    setCost('')
    setImage(null)
  }

  function cancelEdit() {
    setEditingId(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!name || !price || !cost) {
      setError('Name, price, and cost are required.')
      return
    }

    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('name', name)
      formData.append('description', description)
      formData.append('price', price)
      formData.append('cost', cost)
      if (image) formData.append('image', image)

      const token = localStorage.getItem('token')
      const url = editingId === 'new' ? `${API_URL}/products` : `${API_URL}/products/${editingId}`
      const method = editingId === 'new' ? 'POST' : 'PATCH'

      const response = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to save product.')

      setEditingId(null)
      loadProducts()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save product.')
    } finally {
      setSubmitting(false)
    }
  }

  async function toggleActive(product: Product) {
    try {
      await apiFetch(`/products/${product.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !product.isActive }),
      })
      loadProducts()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update product.')
    }
  }

  if (loading) return <div className="p-8">Loading products...</div>

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Products</h1>
        {editingId === null && (
          <button onClick={startCreate} className="bg-blue-600 text-white rounded px-4 py-2 text-sm font-medium">
            Add Product
          </button>
        )}
      </div>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      {editingId !== null && (
        <form onSubmit={handleSubmit} className="border rounded-lg p-4 mb-6 space-y-3">
          <h2 className="font-semibold">{editingId === 'new' ? 'New Product' : 'Edit Product'}</h2>

          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Product name"
            className="w-full border rounded px-3 py-2 text-sm"
          />
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            className="w-full border rounded px-3 py-2 text-sm"
          />
          <div className="flex gap-3">
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Price"
              className="border rounded px-3 py-2 text-sm w-28"
            />
            <input
              type="number"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="Cost"
              className="border rounded px-3 py-2 text-sm w-28"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Product Image</label>
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={(e) => setImage(e.target.files?.[0] || null)}
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="bg-blue-600 text-white rounded px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save'}
            </button>
            <button type="button" onClick={cancelEdit} className="text-sm text-gray-600">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {products.map((product) => (
          <div key={product.id} className="border rounded-lg p-4">
            {product.image && (
              <img src={product.image} alt={product.name} className="w-full h-32 object-cover rounded mb-2" />
            )}
            <p className="font-semibold">{product.name}</p>
            <p className="text-sm text-gray-600">₱{product.price} · Cost ₱{product.cost}</p>
            <div className="flex gap-2 mt-2">
              <button onClick={() => startEdit(product)} className="text-sm text-blue-600">Edit</button>
              <button onClick={() => toggleActive(product)} className="text-sm text-red-600">
                {product.isActive ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default StaffProducts