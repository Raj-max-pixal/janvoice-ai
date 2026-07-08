import { Link, useNavigate } from 'react-router-dom'
import { LogOut, Menu, Moon, Sun, X } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useToast } from '../contexts/ToastContext'
import { Button } from './ui/Button'

export function Navbar() {
  const { currentUser, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/')
    showToast('Logged out successfully', 'success')
  }

  const handleEmergencyAlert = () => {
    showToast('EMERGENCY ALERT: Local authorities and disaster response teams have been notified.', 'error')
  }

  const navLinks = [
    { to: '/citizen-dashboard', label: 'Citizen Portal' },
    { to: '/mp-dashboard', label: 'MP Dashboard' },
    { to: '/analytics', label: 'Project Tracker' },
    { to: '/recommendations', label: 'Resources' },
  ]

  return (
    <nav className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/90 transition-colors duration-200">
      <div className="mx-auto max-w-7xl px-4 py-3.5 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              JanVoice <span className="text-red-600 dark:text-red-500">AI</span>
            </span>
          </Link>

          {/* Center Links */}
          <div className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-[15px] font-semibold text-slate-700 hover:text-slate-900 dark:text-slate-350 dark:hover:text-white transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right Actions */}
          <div className="hidden items-center gap-4 md:flex">
            {/* Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-xl p-2.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white transition-all"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <Moon size={19} /> : <Sun size={19} />}
            </button>

            {currentUser ? (
              <div className="flex items-center gap-3">
                <Link
                  to="/profile"
                  className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:underline"
                >
                  {currentUser.displayName}
                </Link>
                <Button variant="ghost" size="sm" onClick={handleLogout} className="text-slate-700 dark:text-slate-300">
                  <LogOut size={16} className="mr-1.5" />
                  Logout
                </Button>
              </div>
            ) : (
              <Link to="/login">
                <span className="text-[15px] font-bold text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white px-2 py-1 cursor-pointer">
                  Sign In
                </span>
              </Link>
            )}

            {/* Emergency Alert Button */}
            <button
              onClick={handleEmergencyAlert}
              className="flex items-center gap-1.5 rounded-lg bg-red-700 px-4 py-2 text-sm font-black text-white hover:bg-red-800 active:bg-red-900 transition-colors shadow-sm cursor-pointer"
            >
              <span className="text-[15px] font-bold leading-none">✱</span>
              <span>Emergency Alert</span>
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-955"
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <button
              type="button"
              className="rounded-lg p-2 text-slate-700 dark:text-slate-300"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="border-t border-slate-200 bg-white px-4 py-4 md:hidden dark:border-slate-800 dark:bg-slate-950 transition-colors">
          <div className="flex flex-col gap-3">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className="text-[15px] font-semibold text-slate-700 dark:text-slate-300 py-1"
              >
                {link.label}
              </Link>
            ))}
            <div className="h-px bg-slate-200 dark:bg-slate-800 my-1" />
            {currentUser ? (
              <div className="flex flex-col gap-3">
                <div className="text-sm font-medium text-slate-650 dark:text-slate-400">
                  Logged in as: {currentUser.displayName}
                </div>
                <Button variant="outline" size="sm" onClick={handleLogout} className="w-full">
                  Logout
                </Button>
              </div>
            ) : (
              <Link to="/login" onClick={() => setMobileOpen(false)}>
                <Button variant="outline" size="sm" className="w-full">
                  Sign In
                </Button>
              </Link>
            )}
            <button
              onClick={() => {
                setMobileOpen(false)
                handleEmergencyAlert()
              }}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-red-700 py-2.5 text-sm font-black text-white hover:bg-red-800"
            >
              ✱ Emergency Alert
            </button>
          </div>
        </div>
      )}
    </nav>
  )
}
