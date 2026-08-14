import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ReactNode } from 'react'

function RequireRole({ roles, children }: { roles: string[]; children: ReactNode }) {
  const { user } = useAuth()

  if (!user) {
    return <Navigate to="/login" replace />
  }
  if (!roles.includes(user.role)) {
    return <div className="p-8 text-red-600">You don't have permission to view this page.</div>
  }

  return <>{children}</>
}

export default RequireRole