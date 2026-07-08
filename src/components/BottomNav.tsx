import { Link, useLocation } from 'react-router-dom'
import { BarChart3, MessageSquarePlus, ShieldCheck, User } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export function BottomNav() {
  const location = useLocation()
  const { currentUser } = useAuth()

  const items = [
    {
      to: currentUser?.role === 'mp' ? '/mp-dashboard' : currentUser ? '/citizen-dashboard' : '/login',
      label: 'Submit',
      icon: MessageSquarePlus,
    },
    {
      to: '/public-feed',
      label: 'Feed',
      icon: ShieldCheck,
    },
    {
      to: '/analytics',
      label: 'Insights',
      icon: BarChart3,
    },
    {
      to: currentUser ? '/profile' : '/login',
      label: 'Profile',
      icon: User,
    },
  ]

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/70 bg-white/90 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90 md:hidden">
      <div className="mx-auto flex max-w-5xl items-center justify-around px-2 py-2">
        {items.map(({ to, label, icon: Icon }) => {
          const isActive = location.pathname === to
          return (
            <Link
              key={`${to}-${label}`}
              to={to}
              className={`flex min-w-[64px] flex-col items-center justify-center rounded-2xl px-3 py-2 text-[11px] font-semibold transition-all ${
                isActive
                  ? 'bg-slate-900 text-white dark:bg-cyan-500 dark:text-slate-950'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900'
              }`}
            >
              <Icon size={18} />
              <span className="mt-1">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
