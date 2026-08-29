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
  stock: number
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

function DollopWatermark() {
  return (
    <svg
      width="220"
      height="220"
      viewBox="0 0 28 28"
      fill="none"
      aria-hidden="true"
      className="absolute -top-6 -right-6 opacity-[0.08] pointer-events-none select-none hidden sm:block"
    >
      <path
        d="M14 4C9 4 5.5 8 6.2 12.5C4 13.3 3 15.6 4.3 17.7C5.6 19.8 8.3 20.3 10.3 19C11.6 21.6 15.3 22.5 18 20.7C21.3 22 24.7 19.3 24 15.8C25.6 14.3 25.2 11.6 23.2 10.7C23.4 6.8 19 3.4 14.9 5.1C14.6 4.4 14.3 4 14 4Z"
        fill="var(--color-espresso)"
      />
    </svg>
  )
}

function ProductCardSkeleton() {
  return (
    <div className="bg-card rounded-2xl overflow-hidden shadow-sm border border-caramel-light/60 animate-pulse">
      <div className="aspect-[4/3] bg-cream-deep" />
      <div className="p-4 space-y-2">
        <div className="h-3 w-16 bg-cream-deep rounded-full" />
        <div className="h-5 w-3/4 bg-cream-deep rounded" />
        <div className="h-3 w-full bg-cream-deep rounded" />
        <div className="h-9 w-full bg-cream-deep rounded-full mt-3" />
      </div>
    </div>
  )
}

function Products() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedVariant, setSelectedVariant] = useState<Record<string, string>>({})
  const [pendingItem, setPendingItem] = useState<{ id: string; name: string; price: number } | null>(null)
  const [selectedAddOnIds, setSelectedAddOnIds] = useState<string[]>([])
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [quickViewKey, setQuickViewKey] = useState<string | null>(null)
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

  useEffect(() => {
    if (!toastMsg) return
    const timer = setTimeout(() => setToastMsg(null), 2200)
    return () => clearTimeout(timer)
  }, [toastMsg])

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="h-8 w-56 bg-cream-deep rounded animate-pulse mb-8" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <p className="font-display text-lg text-espresso mb-1">The menu couldn't load.</p>
        <p className="text-sm text-espresso-soft">{error}</p>
      </div>
    )
  }

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
    if (product.stock <= 0) return

    const cartName = item.variants.length > 1 ? `${item.name} (${product.variantLabel})` : item.name

    if (addOns.length > 0) {
      setPendingItem({ id: product.id, name: cartName, price: Number(product.price) })
      setSelectedAddOnIds([])
    } else {
      addItem({ id: product.id, name: cartName, price: Number(product.price) })
      setToastMsg(`${cartName} added to cart`)
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
    setToastMsg(`${pendingItem.name} added to cart`)
    setPendingItem(null)
    setSelectedAddOnIds([])
  }

  function closeModal() {
    setPendingItem(null)
    setSelectedAddOnIds([])
  }

  const quickViewItem = displayItems.find((item) => item.key === quickViewKey) || null

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-16">
      {/* Hero */}
      <div className="relative overflow-hidden bg-cream-deep rounded-3xl px-6 sm:px-10 py-10 sm:py-14 mt-6 mb-10 text-center">
        <DollopWatermark />
        <p className="font-display italic text-espresso-soft text-base sm:text-lg mb-2 relative">
          Made with love, one pudding at a time.
        </p>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold text-espresso relative">
          Pick your favorite flavor
        </h1>
      </div>

      {displayItems.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-3">🍮</p>
          <p className="font-display text-xl text-espresso mb-1">Nothing on the menu right now</p>
          <p className="text-sm text-espresso-soft">Check back soon — we're mixing up something new.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {displayItems.map((item) => {
            const selected = getSelectedProduct(item)
            const outOfStock = selected.stock <= 0
            return (
              <div
                key={item.key}
                onClick={() => setQuickViewKey(item.key)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') setQuickViewKey(item.key)
                }}
                aria-label={`View details for ${item.name}`}
                className={`group bg-card rounded-2xl overflow-hidden shadow-sm border border-caramel-light/60 transition-all duration-200 hover:shadow-lg hover:-translate-y-1 cursor-pointer ${
                  outOfStock ? 'opacity-70' : ''
                }`}
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-cream-deep">
                  {item.image && (
                    <img
                      src={item.image}
                      alt={item.name}
                      className={`w-full h-full object-cover transition-transform duration-300 ${
                        outOfStock ? 'grayscale' : 'group-hover:scale-105'
                      }`}
                    />
                  )}
                  {outOfStock && (
                    <span className="absolute top-3 left-3 bg-espresso/90 text-cream text-[11px] font-semibold tracking-wide px-2.5 py-1 rounded-full">
                      Out of stock
                    </span>
                  )}
                </div>

                <div className="p-4">
                  {item.category && (
                    <span className="inline-block bg-banana-light text-espresso-soft text-[11px] font-semibold px-2 py-0.5 rounded-full mb-1.5">
                      {item.category.name}
                    </span>
                  )}

                  <h2 className="font-display text-lg font-semibold text-espresso leading-tight">{item.name}</h2>

                  {item.description && (
                    <p className="text-sm text-espresso-soft mt-1 mb-3 line-clamp-2">
                      {item.description}{' '}
                      <span className="text-caramel-dark font-semibold whitespace-nowrap">Read more</span>
                    </p>
                  )}

                  {item.variants.length > 1 && (
                    <div
                      className="flex flex-wrap gap-1.5 mb-3"
                      role="group"
                      aria-label={`${item.name} flavor`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {item.variants.map((v) => {
                        const isSelected = selected.id === v.id
                        const variantOut = v.stock <= 0
                        return (
                          <button
                            key={v.id}
                            type="button"
                            disabled={variantOut}
                            onClick={() => setSelectedVariant((prev) => ({ ...prev, [item.key]: v.id }))}
                            className={`text-xs font-semibold px-2.5 py-1 rounded-full border transition-colors ${
                              variantOut
                                ? 'border-caramel-light text-espresso-soft/40 line-through cursor-not-allowed'
                                : isSelected
                                ? 'bg-caramel border-caramel text-white'
                                : 'border-caramel-light text-espresso-soft hover:border-caramel'
                            }`}
                          >
                            {v.variantLabel}
                          </button>
                        )
                      })}
                    </div>
                  )}

                  <div className="flex items-center justify-between mb-3 mt-1">
                    <p className="font-display text-xl font-bold text-espresso">₱{selected.price}</p>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleAddClick(item)
                    }}
                    disabled={outOfStock}
                    className="w-full bg-caramel hover:bg-caramel-dark text-white rounded-full py-2.5 text-sm font-semibold shadow-sm hover:shadow-md active:scale-[0.98] transition-all disabled:bg-cream-deep disabled:text-espresso-soft/50 disabled:shadow-none disabled:cursor-not-allowed disabled:active:scale-100"
                  >
                    {outOfStock ? 'Out of Stock' : 'Add to Cart'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Quick view modal — full description */}
      {quickViewItem && (() => {
        const selected = getSelectedProduct(quickViewItem)
        const outOfStock = selected.stock <= 0
        return (
          <div
            className="fixed inset-0 bg-espresso/40 flex items-center justify-center p-4 z-50"
            onClick={() => setQuickViewKey(null)}
          >
            <div
              className="bg-card rounded-3xl max-w-md w-full shadow-xl overflow-hidden max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative">
                {quickViewItem.image && (
                  <img
                    src={quickViewItem.image}
                    alt={quickViewItem.name}
                    className={`w-full h-56 object-cover ${outOfStock ? 'grayscale' : ''}`}
                  />
                )}
                <button
                  onClick={() => setQuickViewKey(null)}
                  className="absolute top-3 right-3 bg-card/90 hover:bg-card text-espresso rounded-full w-8 h-8 flex items-center justify-center text-lg leading-none shadow-sm"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>

              <div className="p-5">
                {quickViewItem.category && (
                  <span className="inline-block bg-banana-light text-espresso-soft text-[11px] font-semibold px-2 py-0.5 rounded-full mb-1.5">
                    {quickViewItem.category.name}
                  </span>
                )}
                <h2 className="font-display text-2xl font-semibold text-espresso mb-2">{quickViewItem.name}</h2>
                {quickViewItem.description && (
                  <p className="text-sm text-espresso-soft mb-4 leading-relaxed">{quickViewItem.description}</p>
                )}

                {quickViewItem.variants.length > 1 && (
                  <div className="flex flex-wrap gap-1.5 mb-4" role="group" aria-label={`${quickViewItem.name} flavor`}>
                    {quickViewItem.variants.map((v) => {
                      const isSelected = selected.id === v.id
                      const variantOut = v.stock <= 0
                      return (
                        <button
                          key={v.id}
                          type="button"
                          disabled={variantOut}
                          onClick={() => setSelectedVariant((prev) => ({ ...prev, [quickViewItem.key]: v.id }))}
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full border transition-colors ${
                            variantOut
                              ? 'border-caramel-light text-espresso-soft/40 line-through cursor-not-allowed'
                              : isSelected
                              ? 'bg-caramel border-caramel text-white'
                              : 'border-caramel-light text-espresso-soft hover:border-caramel'
                          }`}
                        >
                          {v.variantLabel}
                        </button>
                      )
                    })}
                  </div>
                )}

                <div className="flex items-center justify-between mb-4">
                  <p className="font-display text-2xl font-bold text-espresso">₱{selected.price}</p>
                  {outOfStock && (
                    <span className="bg-espresso/90 text-cream text-[11px] font-semibold tracking-wide px-2.5 py-1 rounded-full">
                      Out of stock
                    </span>
                  )}
                </div>

                <button
                  onClick={() => {
                    handleAddClick(quickViewItem)
                    setQuickViewKey(null)
                  }}
                  disabled={outOfStock}
                  className="w-full bg-caramel hover:bg-caramel-dark text-white rounded-full py-2.5 text-sm font-semibold shadow-sm hover:shadow-md active:scale-[0.98] transition-all disabled:bg-cream-deep disabled:text-espresso-soft/50 disabled:shadow-none disabled:cursor-not-allowed"
                >
                  {outOfStock ? 'Out of Stock' : 'Add to Cart'}
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {pendingItem && addOns.length > 0 && (
        <div className="fixed inset-0 bg-espresso/40 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-3xl p-6 max-w-sm w-full relative shadow-xl">
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-espresso-soft hover:text-espresso text-xl leading-none"
              aria-label="Close"
            >
              ×
            </button>
            <p className="font-display text-lg font-semibold text-espresso mb-4">Add any extras?</p>

            <div className="space-y-2.5 mb-5">
              {addOns.map((addOn) => (
                <label
                  key={addOn.id}
                  className="flex items-center gap-3 text-sm text-espresso bg-cream rounded-xl px-3 py-2.5 cursor-pointer hover:bg-cream-deep transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedAddOnIds.includes(addOn.id)}
                    onChange={() => toggleAddOn(addOn.id)}
                    className="w-4 h-4 accent-caramel"
                  />
                  <span className="flex-1">{addOn.name}</span>
                  <span className="text-espresso-soft font-medium">+₱{addOn.price}</span>
                </label>
              ))}
            </div>

            <button
              onClick={confirmAdd}
              className="w-full bg-caramel hover:bg-caramel-dark text-white rounded-full py-2.5 text-sm font-semibold shadow-sm hover:shadow-md active:scale-[0.98] transition-all"
            >
              Add to Cart
            </button>
          </div>
        </div>
      )}

      {/* Toast */}
      <div
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0 z-50 transition-all duration-300 ${
          toastMsg ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
        }`}
      >
        <div className="bg-espresso text-cream text-sm font-medium rounded-full px-4 py-2.5 shadow-lg flex items-center gap-2 whitespace-nowrap">
          <span className="text-banana">✓</span>
          {toastMsg}
        </div>
      </div>
    </div>
  )
}

export default Products