import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Footer } from './components/Footer'
import { Navbar } from './components/Navbar'
import { BottomNav } from './components/BottomNav'
import { ProtectedRoute } from './components/ProtectedRoute'
import { ErrorBoundary } from './components/ui/ErrorBoundary'
import { Skeleton } from './components/ui/Skeleton'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { ToastProvider } from './contexts/ToastContext'
import { NotificationProvider } from './components/NotificationProvider'
import { useAuth } from './contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  FileText,
  BarChart3,
  Lightbulb,
  ShieldCheck,
  User,
  Settings,
  LogOut,
} from 'lucide-react'
import { CommandPalette, useCommandPalette } from './components/CommandPalette'

const LandingPage = lazy(() =>
  import('./pages/LandingPage').then((m) => ({ default: m.LandingPage }))
)
const LoginPage = lazy(() =>
  import('./pages/LoginPage').then((m) => ({ default: m.LoginPage }))
)
const RegisterPage = lazy(() =>
  import('./pages/RegisterPage').then((m) => ({ default: m.RegisterPage }))
)
const CitizenDashboard = lazy(() =>
  import('./pages/CitizenDashboard').then((m) => ({ default: m.CitizenDashboard }))
)
const MPDashboard = lazy(() =>
  import('./pages/MPDashboard').then((m) => ({ default: m.MPDashboard }))
)
const RecommendationsPage = lazy(() =>
  import('./pages/RecommendationsPage').then((m) => ({ default: m.RecommendationsPage }))
)
const AnalyticsPage = lazy(() =>
  import('./pages/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage }))
)
const ProfilePage = lazy(() =>
  import('./pages/ProfilePage').then((m) => ({ default: m.ProfilePage }))
)
const SettingsPage = lazy(() =>
  import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage }))
)
const PublicFeedPage = lazy(() =>
  import('./pages/PublicFeedPage').then((m) => ({ default: m.PublicFeedPage }))
)
const AdminPage = lazy(() =>
  import('./pages/AdminPage').then((m) => ({ default: m.AdminPage }))
)
const ComplaintDetailsPage = lazy(() =>
  import('./pages/ComplaintDetailsPage').then((m) => ({ default: m.ComplaintDetailsPage }))
)
const MunicipalityDashboard = lazy(() =>
  import('./pages/MunicipalityDashboard').then((m) => ({ default: m.MunicipalityDashboard }))
)
const ReportsPage = lazy(() =>
  import('./pages/ReportsPage').then((m) => ({ default: m.ReportsPage }))
)
const MapPage = lazy(() =>
  import('./pages/MapPage').then((m) => ({ default: m.MapPage }))
)
const AuditLogsPage = lazy(() =>
  import('./pages/AuditLogsPage').then((m) => ({ default: m.AuditLogsPage }))
)
const ComplaintsListPage = lazy(() =>
  import('./pages/ComplaintsListPage').then((m) => ({ default: m.ComplaintsListPage }))
)
const NotFoundPage = lazy(() =>
  import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage }))
)

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-4 border-blue-200 dark:border-blue-800" />
          <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
        </div>
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
  )
}

function CommandPaletteWrapper() {
  const { isOpen, setIsOpen } = useCommandPalette()
  const { currentUser, logout } = useAuth()
  const navigate = useNavigate()

  const commandItems = [
    {
      id: 'dashboard',
      icon: LayoutDashboard,
      label: 'Dashboard',
      description: 'Go to dashboard',
      action: () => navigate(currentUser?.role === 'mp' ? '/mp-dashboard' : '/citizen-dashboard'),
    },
    {
      id: 'complaints',
      icon: FileText,
      label: 'My Complaints',
      description: 'View your complaints',
      action: () => navigate(currentUser?.role === 'mp' ? '/mp-dashboard' : '/citizen-dashboard'),
    },
    {
      id: 'analytics',
      icon: BarChart3,
      label: 'Analytics',
      description: 'View analytics',
      action: () => navigate('/analytics'),
      ...(currentUser?.role !== 'mp' ? { hidden: true } : {}),
    },
    {
      id: 'recommendations',
      icon: Lightbulb,
      label: 'Recommendations',
      description: 'AI-powered recommendations',
      action: () => navigate('/recommendations'),
      ...(currentUser?.role !== 'mp' ? { hidden: true } : {}),
    },
    {
      id: 'profile',
      icon: User,
      label: 'Profile',
      description: 'Edit your profile',
      action: () => navigate('/profile'),
    },
    {
      id: 'settings',
      icon: Settings,
      label: 'Settings',
      description: 'App settings',
      action: () => navigate('/settings'),
    },
    {
      id: 'admin',
      icon: ShieldCheck,
      label: 'Admin Console',
      description: 'Manage operations',
      action: () => navigate('/admin'),
      ...(currentUser?.role !== 'superAdmin' && currentUser?.role !== 'departmentAdmin' && currentUser?.role !== 'mp' ? { hidden: true } : {}),
    },
    {
      id: 'logout',
      icon: LogOut,
      label: 'Logout',
      description: 'Sign out of your account',
      action: () => {
        logout()
        navigate('/')
      },
    },
  ].filter((item) => !('hidden' in item && item.hidden))

  return (
    <CommandPalette
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      items={commandItems}
    />
  )
}

export default function App() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <NotificationProvider>
              <BrowserRouter>
                <div className="jv-app-bg flex min-h-screen flex-col">
                  <Navbar />
                  <main className="flex-1">
                    <Suspense fallback={<PageLoader />}>
                      <Routes>
                        <Route path="/" element={<LandingPage />} />
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/register" element={<RegisterPage />} />
                        <Route path="/public-feed" element={<PublicFeedPage />} />
                        <Route
                          path="/citizen-dashboard"
                          element={
                            <ProtectedRoute allowedRoles={['citizen']}>
                              <CitizenDashboard />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/mp-dashboard"
                          element={
                            <ProtectedRoute allowedRoles={['mp']}>
                              <MPDashboard />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/recommendations"
                          element={
                            <ProtectedRoute allowedRoles={['mp']}>
                              <RecommendationsPage />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/analytics"
                          element={
                            <ProtectedRoute allowedRoles={['mp']}>
                              <AnalyticsPage />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/profile"
                          element={
                            <ProtectedRoute>
                              <ProfilePage />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/settings"
                          element={
                            <ProtectedRoute>
                              <SettingsPage />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/admin"
                          element={
                            <ProtectedRoute allowedRoles={['mp', 'departmentAdmin', 'superAdmin']}>
                              <AdminPage />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/municipality-dashboard"
                          element={
                            <ProtectedRoute allowedRoles={['municipality', 'administrator', 'superAdmin', 'departmentAdmin']}>
                              <MunicipalityDashboard />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/complaints"
                          element={
                            <ProtectedRoute allowedRoles={['municipality', 'administrator', 'superAdmin', 'departmentAdmin', 'officer']}>
                              <ComplaintsListPage />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/complaint/:id"
                          element={
                            <ProtectedRoute>
                              <ComplaintDetailsPage />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/reports"
                          element={
                            <ProtectedRoute allowedRoles={['municipality', 'administrator', 'superAdmin', 'mp', 'departmentAdmin']}>
                              <ReportsPage />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/map"
                          element={
                            <ProtectedRoute allowedRoles={['municipality', 'administrator', 'superAdmin', 'departmentAdmin', 'officer']}>
                              <MapPage />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/audit-logs"
                          element={
                            <ProtectedRoute allowedRoles={['administrator', 'superAdmin']}>
                              <AuditLogsPage />
                            </ProtectedRoute>
                          }
                        />
                        <Route path="*" element={<NotFoundPage />} />
                      </Routes>
                    </Suspense>
                  </main>
                  <Footer />
                  <BottomNav />
                  <CommandPaletteWrapper />
                </div>
              </BrowserRouter>
            </NotificationProvider>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}