import { useMemo, useState } from 'react'
import { User, Mail, Calendar, Shield, Sparkles, Bell, Star } from 'lucide-react'
import { updateUserProfile } from '../services/firebase'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'

export function ProfilePage() {
  const { currentUser } = useAuth()
  const { showToast } = useToast()
  const [editing, setEditing] = useState(false)
  const [displayName, setDisplayName] = useState(currentUser?.displayName ?? '')
  const memberSince = useMemo(() => currentUser?.createdAt ? currentUser.createdAt.toLocaleDateString() : 'Recently joined', [currentUser?.createdAt])

  const handleSave = async () => {
    if (!currentUser) return
    try {
      await updateUserProfile(currentUser.uid, { displayName, email: currentUser.email })
      setEditing(false)
      showToast('Profile updated successfully!', 'success')
    } catch {
      showToast('Unable to update profile right now', 'error')
    }
  }

  if (!currentUser) return null

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 p-6 text-white shadow-2xl dark:border-slate-800">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300">Account Overview</p>
            <h1 className="mt-2 text-3xl font-black">{displayName}</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">Keep your profile polished and your notifications tuned for fast civic response.</p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
            <div className="flex items-center gap-2 text-sm font-semibold text-cyan-200">
              <Star size={16} /> Verified contributor
            </div>
            <p className="mt-1 text-xs text-slate-300">Role: {currentUser.role}</p>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1 border border-slate-200/70 bg-white/80 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-3xl font-bold text-white shadow-lg">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <h2 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">{displayName}</h2>
            <p className="mt-2 text-sm text-slate-500">{currentUser.email}</p>
            <div className="mt-4 flex items-center gap-2 rounded-full bg-cyan-50 px-3 py-1 text-sm font-semibold text-cyan-700 dark:bg-cyan-950/30 dark:text-cyan-400">
              <Shield size={14} /> {currentUser.role === 'mp' ? 'Authority' : 'Citizen'} access
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-2 border border-slate-200/70 bg-white/80 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Account Information</h2>
              <p className="text-sm text-slate-500">Update your public identity and keep your account current.</p>
            </div>
            {!editing && (
              <Button size="sm" onClick={() => setEditing(true)}>
                Edit
              </Button>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
              <User size={20} className="text-cyan-500" />
              <div className="flex-1">
                <label className="text-sm text-gray-500">Full Name</label>
                {editing ? (
                  <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="mt-1" />
                ) : (
                  <p className="font-medium text-gray-900 dark:text-white">{displayName}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
              <Mail size={20} className="text-cyan-500" />
              <div className="flex-1">
                <label className="text-sm text-gray-500">Email</label>
                <p className="font-medium text-gray-900 dark:text-white">{currentUser.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
              <Calendar size={20} className="text-cyan-500" />
              <div className="flex-1">
                <label className="text-sm text-gray-500">Member Since</label>
                <p className="font-medium text-gray-900 dark:text-white">{memberSince}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400"><Sparkles size={16} className="text-violet-500" />AI assistance enabled</div>
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400"><Bell size={16} className="text-amber-500" />Smart alerts ready</div>
          </div>

          {editing && (
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
              <Button onClick={handleSave}>Save Changes</Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
