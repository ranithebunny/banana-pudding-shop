import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'

function Cart() {
  const { items, removeItem, updateQuantity, total } = useCart()

  if (items.length === 0) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center">
        <p className="text-gray-600 mb-4">Your cart is empty.</p>
        <Link to="/" className="text-blue-600">Browse the menu</Link>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Your Cart</h1>

      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.productId} className="flex items-center justify-between border-b pb-4">
            <div>
              <p className="font-medium">{item.name}</p>
              <p className="text-sm text-gray-600">₱{item.price} each</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                className="w-7 h-7 border rounded"
              >
                −
              </button>
              <span>{item.quantity}</span>
              <button
                onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                className="w-7 h-7 border rounded"
              >
                +
              </button>
              <button
                onClick={() => removeItem(item.productId)}
                className="text-red-600 text-sm ml-2"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <p className="text-lg font-bold">Total: ₱{total}</p>
        <Link
          to="/checkout"
          className="bg-blue-600 text-white rounded px-6 py-2 font-medium"
        >
          Checkout
        </Link>
      </div>
    </div>
  )
}

export default Cart