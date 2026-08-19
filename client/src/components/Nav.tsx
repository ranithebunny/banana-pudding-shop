import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'

function Nav() {
  const { user, logout } = useAuth()
  const { items } = useCart()
  const navigate = useNavigate()

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)

  function handleLogout() {
    logout()
    navigate('/login')
  }

function handleViewStore() {
  const confirmed = confirm('Viewing the store will log you out of your Owner account. Continue?')
  if (!confirmed) return
  logout()
  navigate('/')
}

  const isOwner = user?.role === 'OWNER'

  return (
    <nav className="bg-amber-100 border-b border-amber-200 px-6 py-4 flex items-center justify-between">
      <Link to="/" className="font-bold text-lg">@rnb.akes</Link>

      <div className="flex items-center gap-4">
        {!isOwner && (
          <Link to="/cart" className="text-sm text-gray-700">
            Cart {itemCount > 0 && <span className="font-semibold">({itemCount})</span>}
          </Link>
        )}

        {user ? (
          <>
            {!isOwner && <Link to="/orders" className="text-sm text-gray-700">My Orders</Link>}

            {(user.role === 'STAFF' || user.role === 'OWNER') && (
              <>
                <Link to="/staff/payments" className="text-sm text-gray-700">Payments</Link>
                <Link to="/staff/inventory" className="text-sm text-gray-700">Inventory</Link>
                <Link to="/staff/orders" className="text-sm text-gray-700">Orders</Link>
                <Link to="/staff/products" className="text-sm text-gray-700">Products</Link>
                <Link to="/dashboard" className="text-sm text-gray-700">Dashboard</Link>
              </>
            )}
            {isOwner && (
              <>
                <Link to="/owner/expenses" className="text-sm text-gray-700">Expenses</Link>
                <Link to="/owner/audit-logs" className="text-sm text-gray-700">Audit Log</Link>
                <button onClick={handleViewStore} className="text-sm text-amber-700 font-medium">
                  View Store
                </button>
              </>
            )}

            <span className="text-sm text-gray-600">Hi, {user.name}</span>
            <button onClick={handleLogout} className="text-sm text-red-600">
              Log out
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="text-sm text-blue-600">Log in</Link>
            <Link to="/register" className="text-sm text-blue-600">Register</Link>
          </>
        )}
      </div>
    </nav>
  )
}

export default Nav