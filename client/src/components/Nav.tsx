import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'

function DollopMark() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <path
        d="M14 4C9 4 5.5 8 6.2 12.5C4 13.3 3 15.6 4.3 17.7C5.6 19.8 8.3 20.3 10.3 19C11.6 21.6 15.3 22.5 18 20.7C21.3 22 24.7 19.3 24 15.8C25.6 14.3 25.2 11.6 23.2 10.7C23.4 6.8 19 3.4 14.9 5.1C14.6 4.4 14.3 4 14 4Z"
        fill="var(--color-banana)"
      />
    </svg>
  )
}

function CartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 4h2l2.4 12.4a2 2 0 002 1.6h8.4a2 2 0 002-1.6L21 8H6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="21" r="1.4" fill="currentColor" />
      <circle cx="18" cy="21" r="1.4" fill="currentColor" />
    </svg>
  )
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {open ? (
        <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      ) : (
        <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      )}
    </svg>
  )
}

function Nav() {
  const { user, logout } = useAuth()
  const { items } = useCart()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)

  function handleLogout() {
    setMenuOpen(false)
    logout()
    navigate('/login')
  }

  function handleViewStore() {
    const confirmed = confirm('Viewing the store will log you out of your Owner account. Continue?')
    if (!confirmed) return
    setMenuOpen(false)
    logout()
    navigate('/')
  }

  const isOwner = user?.role === 'OWNER'
  const isStaffOrOwner = user?.role === 'STAFF' || user?.role === 'OWNER'

  const linkClass =
    'text-sm font-medium text-espresso-soft hover:text-espresso transition-colors px-2 py-1.5 rounded-lg hover:bg-cream-deep'

  return (
    <nav className="sticky top-0 z-50 bg-cream-deep/95 backdrop-blur-sm border-b border-caramel-light shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 shrink-0" onClick={() => setMenuOpen(false)}>
            <DollopMark />
            <span className="font-display text-xl font-semibold text-espresso italic">rnb.akes</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-1">
            {!isOwner && (
              <Link to="/cart" className={`${linkClass} relative flex items-center gap-1.5`}>
                <CartIcon />
                Cart
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-caramel text-white text-[11px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </Link>
            )}

            {user ? (
              <>
                {!isOwner && <Link to="/orders" className={linkClass}>My Orders</Link>}

                {isStaffOrOwner && (
                  <>
                    <span className="w-px h-5 bg-caramel-light mx-1" aria-hidden="true" />
                    <Link to="/staff/payments" className={linkClass}>Payments</Link>
                    <Link to="/staff/inventory" className={linkClass}>Inventory</Link>
                    <Link to="/staff/orders" className={linkClass}>Orders</Link>
                    <Link to="/staff/products" className={linkClass}>Products</Link>
                    <Link to="/dashboard" className={linkClass}>Dashboard</Link>
                  </>
                )}

                {isOwner && (
                  <>
                    <span className="w-px h-5 bg-caramel-light mx-1" aria-hidden="true" />
                    <Link to="/owner/expenses" className={linkClass}>Expenses</Link>
                    <Link to="/owner/audit-logs" className={linkClass}>Audit Log</Link>
                    <button
                      onClick={handleViewStore}
                      className="text-sm font-semibold text-caramel-dark hover:text-caramel px-2 py-1.5 rounded-lg hover:bg-caramel-light transition-colors"
                    >
                      View Store
                    </button>
                  </>
                )}

                <div className="flex items-center gap-2 ml-2 pl-3 border-l border-caramel-light">
                  <div className="w-7 h-7 rounded-full bg-banana flex items-center justify-center text-xs font-bold text-espresso shrink-0">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs text-espresso-soft whitespace-nowrap">{user.name}</span>
                  <button
                    onClick={handleLogout}
                    className="text-xs text-espresso-soft/70 hover:text-red-600 underline underline-offset-2 transition-colors ml-1"
                  >
                    Log out
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className={linkClass}>Log in</Link>
                <Link
                  to="/register"
                  className="text-sm font-semibold text-white bg-caramel hover:bg-caramel-dark px-4 py-2 rounded-full transition-colors ml-1"
                >
                  Register
                </Link>
              </>
            )}
          </div>

          {/* Mobile trigger */}
          <div className="flex items-center gap-3 lg:hidden">
            {!isOwner && (
              <Link to="/cart" className="relative text-espresso p-1.5" aria-label="View cart">
                <CartIcon />
                {itemCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-caramel text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </Link>
            )}
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="text-espresso p-1.5"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
            >
              <MenuIcon open={menuOpen} />
            </button>
          </div>
        </div>

        {/* Mobile panel */}
        {menuOpen && (
          <div className="lg:hidden pb-4 flex flex-col gap-1 border-t border-caramel-light pt-3">
            {user ? (
              <>
                <div className="flex items-center gap-2 px-2 pb-2 mb-1 border-b border-caramel-light">
                  <div className="w-8 h-8 rounded-full bg-banana flex items-center justify-center text-sm font-bold text-espresso shrink-0">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm text-espresso font-medium">{user.name}</span>
                </div>

                {!isOwner && (
                  <Link to="/orders" className={linkClass} onClick={() => setMenuOpen(false)}>My Orders</Link>
                )}

                {isStaffOrOwner && (
                  <>
                    <Link to="/staff/payments" className={linkClass} onClick={() => setMenuOpen(false)}>Payments</Link>
                    <Link to="/staff/inventory" className={linkClass} onClick={() => setMenuOpen(false)}>Inventory</Link>
                    <Link to="/staff/orders" className={linkClass} onClick={() => setMenuOpen(false)}>Orders</Link>
                    <Link to="/staff/products" className={linkClass} onClick={() => setMenuOpen(false)}>Products</Link>
                    <Link to="/dashboard" className={linkClass} onClick={() => setMenuOpen(false)}>Dashboard</Link>
                  </>
                )}

                {isOwner && (
                  <>
                    <Link to="/owner/expenses" className={linkClass} onClick={() => setMenuOpen(false)}>Expenses</Link>
                    <Link to="/owner/audit-logs" className={linkClass} onClick={() => setMenuOpen(false)}>Audit Log</Link>
                    <button onClick={handleViewStore} className={`${linkClass} text-left text-caramel-dark`}>
                      View Store
                    </button>
                  </>
                )}

                <button onClick={handleLogout} className={`${linkClass} text-left text-red-600 mt-1`}>
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className={linkClass} onClick={() => setMenuOpen(false)}>Log in</Link>
                <Link
                  to="/register"
                  className="text-sm font-semibold text-white bg-caramel hover:bg-caramel-dark px-4 py-2.5 rounded-full transition-colors text-center mt-1"
                  onClick={() => setMenuOpen(false)}
                >
                  Register
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}

export default Nav