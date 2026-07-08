import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { UserPlus, ArrowLeft, Smartphone } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import type { UserRole } from '../types'

export function RegisterPage() {
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>('citizen')
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState<'details' | 'otp'>('details')

  // OTP Verification Simulation
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', ''])
  const [otpCountdown, setOtpCountdown] = useState(59)
  const otpInputsRef = useRef<Array<HTMLInputElement | null>>([])

  const { register, currentUser } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    if (currentUser && view !== 'otp') {
      navigate(role === 'mp' ? '/mp-dashboard' : '/citizen-dashboard', { replace: true })
    }
  }, [currentUser, navigate, role, view])

  // Countdown timer for signup OTP
  useEffect(() => {
    let interval: number
    if (view === 'otp' && otpCountdown > 0) {
      interval = window.setInterval(() => {
        setOtpCountdown((c) => c - 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [view, otpCountdown])

  const handleDetailsSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!displayName || !email || !password) {
      showToast('Please fill in all details', 'error')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showToast('Please enter a valid email address', 'error')
      return
    }
    if (password.length < 6) {
      showToast('Password must be at least 6 characters', 'error')
      return
    }
    
    setView('otp')
    setOtpCountdown(59)
    showToast('Verification code sent to your registered email (demo: 123456)', 'info')
  }

  const handleRegisterConfirm = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const joinedCode = otpCode.join('')

    if (joinedCode === '123456' || joinedCode.length === 6) {
      try {
        await register(email, password, displayName, role)
        showToast('Account created successfully and email verified!', 'success')
        // Navigation is handled by useEffect or register completion
        navigate(role === 'mp' ? '/mp-dashboard' : '/citizen-dashboard', { replace: true })
      } catch {
        showToast('Registration failed. Please try again.', 'error')
        setView('details')
      } finally {
        setLoading(false)
      }
    } else {
      showToast('Invalid verification code. Enter 123456 or any 6 digits.', 'error')
      setLoading(false)
    }
  }

  const handleOtpChange = (index: number, val: string) => {
    if (isNaN(Number(val))) return
    const newOtp = [...otpCode]
    newOtp[index] = val.slice(-1)
    setOtpCode(newOtp)

    if (val && index < 5) {
      otpInputsRef.current[index + 1]?.focus()
    }
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus()
    }
  }

  return (
    <div className="relative flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-16 overflow-hidden bg-slate-50 dark:bg-slate-900 transition-colors duration-200">
      
      {/* Background radial overlays */}
      <div className="absolute h-96 w-96 rounded-full bg-gradient-to-tr from-[#002b55]/20 to-cyan-500/20 blur-3xl opacity-40 -top-32 -left-20 pointer-events-none" />
      <div className="absolute h-96 w-96 rounded-full bg-gradient-to-tr from-purple-500/10 to-indigo-500/15 blur-3xl opacity-30 -bottom-36 -right-20 pointer-events-none" />

      {/* Glass card container */}
      <Card className="relative z-10 w-full max-w-md p-8 backdrop-blur-md bg-white/70 dark:bg-slate-950/70 border border-slate-200/50 dark:border-slate-800/40 shadow-glass rounded-2xl">
        
        {/* VIEW 1: SIGNUP DETAILS */}
        {view === 'details' && (
          <div className="text-left">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#002b55]/10 text-[#002b55] dark:bg-cyan-500/10 dark:text-cyan-400 mb-6">
              <UserPlus size={24} />
            </div>

            <h1 className="text-2xl font-black text-slate-900 dark:text-white">
              Create Account
            </h1>
            <p className="mt-2 text-sm text-slate-550 dark:text-slate-400">
              Join JanVoice AI to submit issues and coordinate local initiatives.
            </p>

            <form onSubmit={handleDetailsSubmit} className="mt-6 space-y-4">
              <Input
                label="Full Name"
                placeholder="Jane Doe"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                required
              />
              <Input
                label="Email Address"
                type="email"
                placeholder="you@constituency.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
              <Input
                label="Create Password"
                type="password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={6}
              />
              
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-350">
                  Select Portal Role
                </label>
                <div className="flex gap-3">
                  {(['citizen', 'officer', 'departmentAdmin', 'superAdmin', 'mp'] as UserRole[]).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setRole(option)}
                      className={`flex-1 rounded-xl border-2 py-2.5 text-xs font-bold capitalize transition-all cursor-pointer ${
                        role === option
                          ? 'border-[#002b55] bg-slate-50 text-[#002b55] dark:border-cyan-400 dark:bg-cyan-950/20 dark:text-cyan-400'
                          : 'border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-500'
                      }`}
                    >
                      {option === 'mp' ? 'MP / Authority' : option === 'officer' ? 'Officer' : option === 'departmentAdmin' ? 'Department Admin' : option === 'superAdmin' ? 'Super Admin' : 'Citizen'}
                    </button>
                  ))}
                </div>
              </div>

              <Button type="submit" className="w-full bg-[#002b55] text-white dark:bg-cyan-500 dark:text-slate-950 hover:opacity-90 font-bold py-3 mt-4 cursor-pointer" disabled={loading}>
                Generate Verification code
              </Button>
            </form>

            <p className="mt-6 text-center text-xs font-semibold text-slate-550 dark:text-slate-450">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-bold text-cyan-650 hover:underline dark:text-cyan-400"
              >
                Log In
              </Link>
            </p>
          </div>
        )}

        {/* VIEW 2: OTP SIGNUP CONFIRMATION */}
        {view === 'otp' && (
          <div className="text-left">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-500 mb-6">
              <Smartphone size={24} />
            </div>

            <button
              onClick={() => setView('details')}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white mb-4"
            >
              <ArrowLeft size={14} /> Back to Details
            </button>

            <h1 className="text-2xl font-black text-slate-900 dark:text-white">
              Verify OTP Sign Up
            </h1>
            <p className="mt-2 text-sm text-slate-550 dark:text-slate-450 leading-relaxed">
              We sent a 6-digit verification code to <span className="font-bold text-slate-700 dark:text-slate-300">{email}</span>. Enter the code below to complete account registration.
            </p>

            <form onSubmit={handleRegisterConfirm} className="mt-8 space-y-6">
              <div className="flex justify-between gap-2.5">
                {otpCode.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => { otpInputsRef.current[idx] = el }}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    className="h-12 w-12 text-center rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900 text-lg font-bold text-slate-900 dark:text-white focus:border-cyan-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all"
                  />
                ))}
              </div>

              <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                <span>Didn&apos;t receive code?</span>
                {otpCountdown > 0 ? (
                  <span className="text-slate-400">Resend in {otpCountdown}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setOtpCountdown(59)
                      showToast('New simulated OTP code: 123456', 'info')
                    }}
                    className="text-cyan-600 dark:text-cyan-400 underline hover:no-underline"
                  >
                    Resend Code
                  </button>
                )}
              </div>

              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 mt-2 cursor-pointer" disabled={loading}>
                {loading ? 'Creating account...' : 'Verify & Register'}
              </Button>
            </form>
          </div>
        )}

      </Card>
    </div>
  )
}
