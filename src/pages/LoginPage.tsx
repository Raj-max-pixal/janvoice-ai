import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Shield, KeyRound, ArrowLeft } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState<'login' | 'forgot'>('login')

  const { login, currentUser, forgotPassword } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    if (currentUser && window.location.pathname === '/login') {
      const destination = currentUser.role === 'mp' ? '/mp-dashboard' : '/citizen-dashboard'
      console.log('[auth] Navigation executed', { destination, role: currentUser.role })
      navigate(destination, { replace: true })
    }
  }, [currentUser, navigate])

  const handleCredentialSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    console.log('[auth] Button clicked', { email })
    setLoading(true)
    try {
      if (!email || !password) {
        showToast('Please fill in all fields', 'error')
        setLoading(false)
        return
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showToast('Please enter a valid email address', 'error')
        setLoading(false)
        return
      }

      const user = await login(email, password)
      console.log('[auth] Sign-in success', user)
      const destination = user?.role === 'mp' ? '/mp-dashboard' : '/citizen-dashboard'
      console.log('[auth] Navigation executed', { destination, role: user?.role })
      showToast('Authentication successful!', 'success')
      navigate(destination, { replace: true })
    } catch (error) {
      console.error('[auth] Sign-in failed', error)
      showToast('Invalid email or password', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      showToast('Please enter your email first', 'error')
      return
    }
    setLoading(true)
    try {
      await forgotPassword(email)
      showToast(`Password reset link sent to ${email}`, 'success')
      setView('login')
    } catch {
      showToast('Unable to send reset email right now', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-16 overflow-hidden bg-slate-50 dark:bg-slate-900 transition-colors duration-200">
      
      {/* Background glow graphics */}
      <div className="absolute h-96 w-96 rounded-full bg-gradient-to-tr from-[#002b55]/20 to-cyan-500/20 blur-3xl opacity-40 -top-32 -left-20 pointer-events-none" />
      <div className="absolute h-96 w-96 rounded-full bg-gradient-to-tr from-purple-500/10 to-indigo-500/15 blur-3xl opacity-30 -bottom-36 -right-20 pointer-events-none" />

      {/* Glass Card */}
      <Card className="relative z-10 w-full max-w-md p-8 backdrop-blur-md bg-white/70 dark:bg-slate-950/70 border border-slate-200/50 dark:border-slate-800/40 shadow-glass rounded-2xl">
        
        {/* VIEW 1: LOGIN FORM */}
        {view === 'login' && (
          <div className="text-left">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#002b55]/10 text-[#002b55] dark:bg-cyan-500/10 dark:text-cyan-400 mb-6">
              <Shield size={24} />
            </div>
            
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">
              Welcome Back
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Sign in to your JanVoice AI account to manage civic priorities.
            </p>

            <form onSubmit={handleCredentialSubmit} className="mt-6 space-y-4">
              <Input
                label="Email Address"
                type="email"
                placeholder="you@constituency.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-350">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setView('forgot')}
                    className="text-xs font-bold text-cyan-600 hover:text-cyan-700 dark:text-cyan-400"
                  >
                    Forgot Password?
                  </button>
                </div>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </div>

              <Button type="submit" className="w-full bg-[#002b55] text-white dark:bg-cyan-500 dark:text-slate-950 hover:opacity-90 font-bold shadow-lg py-3 mt-2 cursor-pointer" disabled={loading}>
                {loading ? 'Validating credentials...' : 'Verify Identity'}
              </Button>
            </form>

            <p className="mt-6 text-center text-xs font-semibold text-slate-500 dark:text-slate-450">
              New to the platform?{' '}
              <Link
                to="/register"
                className="font-bold text-cyan-650 hover:underline dark:text-cyan-400"
              >
                Register Account
              </Link>
            </p>
          </div>
        )}

        {/* VIEW 3: FORGOT PASSWORD */}
        {view === 'forgot' && (
          <div className="text-left">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500 mb-6">
              <KeyRound size={24} />
            </div>

            <button
              onClick={() => setView('login')}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white mb-4"
            >
              <ArrowLeft size={14} /> Back to Sign In
            </button>

            <h1 className="text-2xl font-black text-slate-900 dark:text-white">
              Reset Password
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Enter your email and we will send you instructions to reset your password.
            </p>

            <form onSubmit={handleForgotPassword} className="mt-6 space-y-4">
              <Input
                label="Registered Email Address"
                type="email"
                placeholder="you@constituency.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
              <Button type="submit" className="w-full bg-[#002b55] text-white dark:bg-cyan-500 dark:text-slate-950 hover:opacity-90 font-bold py-3 mt-2 cursor-pointer" disabled={loading}>
                {loading ? 'Sending link...' : 'Send Recovery Email'}
              </Button>
            </form>
          </div>
        )}

      </Card>
    </div>
  )
}
