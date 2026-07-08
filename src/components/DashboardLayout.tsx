import { useState, useEffect, type ReactNode } from 'react'
import { NavLink, useNavigate, Outlet } from 'react-router-dom'
import {
  LayoutDashboard,
  FileText,
  BarChart3,
  Users,
  Building2,
  MapPin,
  Settings,
  LogOut,
  Menu,
  X,
  Shield,
  Bell,
  Search,
  ChevronDown,
  Moon,
  Sun,
  FileBarChart,
  ClipboardList,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { NotificationBell } from './NotificationBell'
import { cn } from '../lib/utils'
import type { UserRole } from '../types'

interface NavItem {
  label: string
  path: string
  icon: React.ReactNode
  roles: UserRole[]
}

interface DashboardLayoutProps {
  children?: ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { currentUser, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('janvoice-dark-mode') === 'true'
    }
    return false
  })
  const [profileOpen, setProfileOpen] = useState(false)

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('janvoice-dark-mode', String(darkMode))
  }, [darkMode])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  if (!currentUser) return null

  const navItems: NavItem[] = [
    {
      label: 'Dashboard',
      path: '/citizen-dashboard',
      icon: <LayoutDashboard className="h-5 w-5" />,
      roles: ['citizen', 'officer', 'departmentAdmin', 'superAdmin', 'mp', 'municipality', 'administrator'],
    },
    {
      label: 'Municipality Dashboard',
      path: '/municipality-dashboard',
      icon: <Building2 className="h-5 w-5" />,
      roles: ['municipality', 'administrator', 'superAdmin', 'departmentAdmin'],
    },
    {
      label: 'MP Dashboard',
      path: '/mp-dashboard',
      icon: <Users className="h-5 w-5" />,
      roles: ['mp', 'superAdmin'],
    },
    {
      label: 'Complaints',
      path: '/complaints',
      icon: <FileText className="h-5 w-5" />,
      roles: ['municipality', 'administrator', 'superAdmin', 'departmentAdmin', 'officer'],
    },
    {
      label: 'Reports',
      path: '/reports',
      icon: <FileBarChart className="h-5 w-5" />,
      roles: ['municipality', 'administrator', 'superAdmin', 'mp', 'departmentAdmin'],
    },
    {
      label: 'Analytics',
      path: '/analytics',
      icon: <BarChart3 className="h-5 w-5" />,
      roles: ['municipality', 'administrator', 'superAdmin', 'mp', 'departmentAdmin'],
    },
    {
      label: 'Audit Logs',
      path: '/audit-logs',
      icon: <ClipboardList className="h-5 w-5" />,
      roles: ['administrator', 'superAdmin'],
    },
    {
      label: 'Map View',
      path: '/map',
      icon: <MapPin className="h-5 w-5" />,
      roles: ['municipality', 'administrator', 'superAdmin', 'departmentAdmin', 'officer'],
    },
    {
      label: 'Admin Panel',
      path: '/admin',
      icon: <Shield className="h-5 w-5" />,
      roles: ['administrator', 'superAdmin'],
    },
    {
      label: 'Settings',
      path: '/settings',
      icon: <Settings className="h-5 w-5" />,
      roles: ['citizen', 'officer', 'departmentAdmin', 'superAdmin', 'mp', 'municipality', 'administrator'],
    },
  ]

  const filteredNav = navItems.filter((item) => item.roles.includes(currentUser.role))

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:z-auto',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">JV</span>
            </div>
            <span className="font-bold text-gray-900 dark:text-white">JanVoice AI</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <nav className="p-3 space-y-1 overflow-y-auto h-[calc(100%-64px)]">
          {filteredNav.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800',
                )
              }
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main content area */}
      <div className="lg:pl-64">
        {/* Top navigation */}
        <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <Menu className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              </button>
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <Search className="h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="bg-transparent border-none outline-none text-sm text-gray-600 dark:text-gray-300 placeholder-gray-400 w-48"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Toggle dark mode"
              >
                {darkMode ? (
                  <Sun className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                ) : (
                  <Moon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                )}
              </button>

              <NotificationBell />

              {/* Profile dropdown */}
              <div className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">
                      {currentUser.displayName?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  </div>
                  <span className="hidden sm:block text-sm font-medium text-gray-700 dark:text-gray-200">
                    {currentUser.displayName}
                  </span>
                  <ChevronDown className="hidden sm:block h-4 w-4 text-gray-400" />
                </button>

                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50">
                    <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{currentUser.displayName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{currentUser.role}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{currentUser.email}</p>
                    </div>
                    <div className="p-1">
                      <button
                        onClick={() => { navigate('/settings'); setProfileOpen(false) }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                      >
                        Settings
                      </button>
                      <button
                        onClick={() => { navigate('/public-feed'); setProfileOpen(false) }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                      >
                        Public Feed
                      </button>
                      <hr className="my-1 border-gray-200 dark:border-gray-700" />
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg flex items-center gap-2"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  )
}