import { Heart } from 'lucide-react'
import { Link } from 'react-router-dom'

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-slate-900/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-6 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-slate-400">
          © {new Date().getFullYear()} JanVoice AI. Built for transparent civic engagement.
        </p>
        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
          <Link to="/public-feed" className="transition hover:text-cyan-400">
            Public feed
          </Link>
          <Link to="/analytics" className="transition hover:text-cyan-400">
            Analytics
          </Link>
          <span className="flex items-center gap-1.5">
            Made with <Heart className="h-4 w-4 text-accent-400 fill-accent-400" /> for citizens
          </span>
        </div>
      </div>
    </footer>
  )
}