import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { LoadingSpinner } from './ui/LoadingSpinner'
import type { UserRole } from '../types'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: UserRole[]
}

export function ProtectedRoute({
  children,
  allowedRoles,
}: ProtectedRouteProps) {
  const { currentUser, loading } = useAuth()

  if (loading) {
    console.log('[auth] ProtectedRoute waiting for auth state')
    return <LoadingSpinner />
  }

  if (!currentUser) {
    console.log('[auth] ProtectedRoute redirect to /login')
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    console.log('[auth] ProtectedRoute role mismatch', { role: currentUser.role, allowedRoles })
    const redirect =
      currentUser.role === 'mp' || currentUser.role === 'departmentAdmin' || currentUser.role === 'superAdmin'
        ? '/mp-dashboard'
        : '/citizen-dashboard'
    return <Navigate to={redirect} replace />
  }

  return children
}
