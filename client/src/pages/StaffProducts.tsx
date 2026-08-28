import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

interface Category {
  id: string
  name: string
}

interface Product {
  id: string
  name: string
  description: string | null
  price: string
  cost: string
  image: string | null
  isActive: boolean
  variantGroup: string | null
  variantLabel: string | null
  isAddOn: boolean
  category: { id: string; name: string } | null
}

const inputClass =
  'w-full border border-caramel-light rounded-xl px-3 py-2 text-sm bg-cream text-espresso focus:outline-none focus:ring-2 focus:ring-caramel/40'

function StaffProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [cost, setCost] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [newCategoryName, setNewCategoryName] = useState('')
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [variantGroup, setVariantGroup] = useState('')
  const [variantLabel, setVariantLabel] = useState('')
  const [isAddOn, setIsAddOn] = useState(false)
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

  async function loadCategories() {
    try {
      const data = await apiFetch('/categories')
      setCategories(data)
    } catch (err) {
      console.error('Failed to load categories', err)
    }
  }

  useEffect(() => {
    loadProducts()
    loadCategories()
  }, [])

  function startEdit(product: Product) {
    setEditingId(product.id)
    setName(product.name)
    setDescription(product.description || '')
    setPrice(product.price)
    setCost(product.cost)
    setCategoryId(product.category?.id || '')
    setShowNewCategory(false)
    setNewCategoryName('')
    setVariantGroup(product.variantGroup || '')
    setVariantLabel(product.variantLabel || '')
    setIsAddOn(product.isAddOn)
    setImage(null)
  }

  function startCreate() {
    setEditingId('new')
    setName('')
    setDescription('')
    setPrice('')
    setCost('')
    setCategoryId('')
    setShowNewCategory(false)
    setNewCategoryName('')
    setVariantGroup('')
    setVariantLabel('')
    setIsAddOn(false)
    setImage(null)
  }

  function cancelEdit() {
    setEditingId(null)
  }

  async function handleCreateCategory() {
    if (!newCategoryName.trim()) return
    try {
      const category = await apiFetch('/categories', {
        method: 'POST',
        body: JSON.stringify({ name: newCategoryName.trim() }),
      })
      setCategories((prev) => [...prev, category].sort((a, b) => a.name.localeCompare(b.name)))
      setCategoryId(category.id)
      setNewCategoryName('')
      setShowNewCategory(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create category.')
    }
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
      if (categoryId) formData.append('categoryId', categoryId)
      formData.append('variantGroup', variantGroup)
      formData.append('variantLabel', variantLabel)
      formData.append('isAddOn', String(isAddOn))
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

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="h-8 w-32 bg-cream-deep rounded animate-pulse mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-card border border-caramel-light/60 rounded-2xl h-52 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-3xl font-semibold text-espresso">Products</h1>
        {editingId === null && (
          <button
            onClick={startCreate}
            className="bg-caramel hover:bg-caramel-dark text-white rounded-full px-4 py-2 text-sm font-semibold shadow-sm hover:shadow-md transition-all"
          >
            Add Product
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-800 mb-4">
          {error}
        </div>
      )}

      {editingId !== null && (
        <form onSubmit={handleSubmit} className="bg-card border border-caramel-light/60 rounded-2xl p-5 mb-6 space-y-3 shadow-sm">
          <h2 className="font-display font-semibold text-lg text-espresso mb-1">
            {editingId === 'new' ? 'New Product' : 'Edit Product'}
          </h2>

          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Product name"
            className={inputClass}
          />
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            className={inputClass}
          />
          <div className="flex gap-3">
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Price"
              className={`${inputClass} w-28`}
            />
            <input
              type="number"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="Cost"
              className={`${inputClass} w-28`}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1.5 text-espresso">Category</label>
            {!showNewCategory ? (
              <div className="flex gap-2">
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className={`${inputClass} flex-1`}
                >
                  <option value="">No category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowNewCategory(true)}
                  className="text-sm font-semibold text-caramel-dark hover:text-caramel whitespace-nowrap"
                >
                  + New category
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="New category name"
                  className={`${inputClass} flex-1`}
                />
                <button
                  type="button"
                  onClick={handleCreateCategory}
                  className="bg-caramel hover:bg-caramel-dark text-white rounded-xl px-3 py-2 text-sm font-semibold transition-colors"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewCategory(false)}
                  className="text-sm text-espresso-soft hover:text-espresso"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          <div className="border-t border-caramel-light/60 pt-3">
            <p className="text-sm font-semibold text-espresso mb-2">Variants & Add-ons (optional)</p>
            <div className="flex gap-3 mb-2">
              <input
                type="text"
                value={variantGroup}
                onChange={(e) => setVariantGroup(e.target.value)}
                placeholder="Variant group (e.g. Cookie)"
                className={`${inputClass} flex-1`}
              />
              <input
                type="text"
                value={variantLabel}
                onChange={(e) => setVariantLabel(e.target.value)}
                placeholder="Variant label (e.g. Solo)"
                className={`${inputClass} flex-1`}
              />
            </div>
            <p className="text-xs text-espresso-soft mb-2">
              Give two or more products the same group name to show them as one item with flavor options on the menu.
            </p>
            <label className="flex items-center gap-2 text-sm text-espresso">
              <input
                type="checkbox"
                checked={isAddOn}
                onChange={(e) => setIsAddOn(e.target.checked)}
                className="w-4 h-4 accent-caramel"
              />
              This is an add-on (offered as an extra when adding other products to cart)
            </label>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1.5 text-espresso">Product Image</label>
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={(e) => setImage(e.target.files?.[0] || null)}
              className={`${inputClass} file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:bg-caramel-light file:text-caramel-dark file:text-xs file:font-semibold`}
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="bg-caramel hover:bg-caramel-dark text-white rounded-full px-5 py-2 text-sm font-semibold shadow-sm hover:shadow-md transition-all disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              className="text-sm text-espresso-soft hover:text-espresso font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {products.map((product) => (
          <div
            key={product.id}
            className={`bg-card border border-caramel-light/60 rounded-2xl p-4 shadow-sm ${!product.isActive ? 'opacity-60' : ''}`}
          >
            {product.image && (
              <img src={product.image} alt={product.name} className="w-full h-32 object-cover rounded-xl mb-2.5" />
            )}
            <p className="font-display font-semibold text-espresso">
              {product.name}
              {product.variantLabel && <span className="text-espresso-soft font-normal font-body"> ({product.variantLabel})</span>}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              {product.category && (
                <span className="text-[11px] font-semibold bg-banana-light text-espresso-soft px-2 py-0.5 rounded-full">
                  {product.category.name}
                </span>
              )}
              {product.isAddOn && (
                <span className="text-[11px] font-semibold bg-caramel-light text-caramel-dark px-2 py-0.5 rounded-full">
                  Add-on
                </span>
              )}
              {!product.isActive && (
                <span className="text-[11px] font-semibold bg-red-50 text-red-700 px-2 py-0.5 rounded-full">
                  Inactive
                </span>
              )}
            </div>
            <p className="text-sm text-espresso-soft mt-1.5">₱{product.price} · Cost ₱{product.cost}</p>
            <div className="flex gap-3 mt-2.5">
              <button
                onClick={() => startEdit(product)}
                className="text-sm font-semibold text-caramel-dark hover:text-caramel"
              >
                Edit
              </button>
              <button
                onClick={() => toggleActive(product)}
                className="text-sm font-semibold text-espresso-soft/70 hover:text-red-600"
              >
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