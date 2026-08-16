import { Routes, Route } from 'react-router-dom'
import Nav from './components/Nav'
import RequireRole from './components/RequireRole'
import Login from './pages/Login'
import Register from './pages/Register'
import Products from './pages/Products'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import OrderDetail from './pages/OrderDetail'
import StaffPayments from './pages/StaffPayments'
import PaymentUpload from './pages/PaymentUpload'
import StaffInventory from './pages/StaffInventory'
import StaffOrders from './pages/StaffOrders'
import OwnerExpenses from './pages/OwnerExpenses'
import Dashboard from './pages/Dashboard'
import AuditLogs from './pages/AuditLogs'
import MyOrders from './pages/MyOrders'
function App() {
  return (
    <>
      <Nav />
      <Routes>
        <Route path="/" element={<Products />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/orders/:id" element={<OrderDetail />} />
        <Route path="/orders/:id/pay" element={<PaymentUpload />} />
        <Route path="/orders" element={<MyOrders />} />
        <Route
          path="/staff/payments"
          element={
            <RequireRole roles={['STAFF', 'OWNER']}>
              <StaffPayments />
            </RequireRole>
          }
        />
        <Route
          path="/staff/inventory"
          element={
            <RequireRole roles={['STAFF', 'OWNER']}>
              <StaffInventory />
            </RequireRole>
          }
        />
        <Route
          path="/staff/orders"
          element={
            <RequireRole roles={['STAFF', 'OWNER']}>
              <StaffOrders />
            </RequireRole>
          }
        />
        <Route
          path="/owner/expenses"
          element={
            <RequireRole roles={['OWNER']}>
              <OwnerExpenses />
            </RequireRole>
          }
        />
        <Route
  path="/dashboard"
  element={
    <RequireRole roles={['STAFF', 'OWNER']}>
      <Dashboard />
    </RequireRole>
  }
/>
<Route
  path="/owner/audit-logs"
  element={
    <RequireRole roles={['OWNER']}>
      <AuditLogs />
    </RequireRole>
  }
/>
      </Routes>
    </>
  )
}

export default App