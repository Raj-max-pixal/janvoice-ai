 import { useState } from 'react'
import { Bell, Moon, Shield, Globe, User, Trash2, LogOut, ChevronRight, Palette, Volume2, Sparkles } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { useTheme } from '../contexts/ThemeContext'
import { useToast } from '../contexts/ToastContext'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

function ToggleSwitch({ enabled, onToggle, label, description }: { enabled: boolean; onToggle: () => void; label: string; description: string }) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="font-medium text-gray-900 dark:text-white">{label}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
      </div>
      <button
        type="button"
        onClick={onToggle}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${enabled ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'}`}
        role="switch"
        aria-checked={enabled}
        aria-label={label}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  )
}

function SettingsSection({ icon: Icon, title, children }: { icon: typeof Moon; title: string; children: React.ReactNode }) {
  return (
    <Card className="overflow-hidden">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
        <Icon size={20} className="text-primary-500" />
        {title}
      </h2>
      {children}
    </Card>
  )
}

export function SettingsPage() {
  const { theme, toggleTheme } = useTheme()
  const { showToast } = useToast()
  const { currentUser, logout } = useAuth()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState(true)
  const [emailAlerts, setEmailAlerts] = useState(true)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [language, setLanguage] = useState('English')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleSave = () => {
    showToast('Settings saved successfully!', 'success')
  }

  const handleLogout = async () => {
    try {
      await logout()
      showToast('Signed out successfully', 'success')
      navigate('/')
    } catch {
      showToast('Error signing out', 'error')
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 p-6 text-white shadow-2xl dark:border-slate-800">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300">Preference Center</p>
            <h1 className="mt-2 text-3xl font-black">Settings</h1>
            <p className="mt-2 text-sm text-slate-300">Fine-tune the app for fast civic engagement, stronger alerts, and a premium experience.</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-sm font-semibold text-cyan-200">
            <Sparkles size={16} /> Smart mode enabled
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Profile */}
        <SettingsSection icon={User} title="Account">
          <div className="flex items-center gap-4 rounded-xl bg-gray-50 p-4 dark:bg-gray-800/50">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-accent-500 text-lg font-bold text-white">
              U
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 dark:text-white truncate">{currentUser?.displayName ?? 'User'}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{currentUser?.email ?? 'user@example.com'}</p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <button className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50">
              <span className="text-gray-900 dark:text-white">Edit Profile</span>
              <ChevronRight size={16} className="text-gray-400" />
            </button>
            <button className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50">
              <span className="text-gray-900 dark:text-white">Change Password</span>
              <ChevronRight size={16} className="text-gray-400" />
            </button>
          </div>
        </SettingsSection>

        {/* Appearance */}
        <SettingsSection icon={Palette} title="Appearance">
          <div className="space-y-1 divide-y divide-gray-100 dark:divide-gray-800">
            <ToggleSwitch
              enabled={theme === 'dark'}
              onToggle={toggleTheme}
              label="Dark Mode"
              description="Toggle between light and dark theme"
            />
          </div>
          <div className="mt-4">
            <p className="text-xs text-gray-400 dark:text-gray-500">Current theme: <span className="font-medium capitalize">{theme}</span></p>
          </div>
        </SettingsSection>

        {/* Notifications */}
        <SettingsSection icon={Bell} title="Notifications">
          <div className="space-y-1 divide-y divide-gray-100 dark:divide-gray-800">
            <ToggleSwitch
              enabled={notifications}
              onToggle={() => setNotifications(!notifications)}
              label="Push Notifications"
              description="Receive notifications for complaint updates"
            />
            <ToggleSwitch
              enabled={emailAlerts}
              onToggle={() => setEmailAlerts(!emailAlerts)}
              label="Email Alerts"
              description="Receive email summaries of your complaints"
            />
            <ToggleSwitch
              enabled={soundEnabled}
              onToggle={() => setSoundEnabled(!soundEnabled)}
              label="Sound Effects"
              description="Play sounds for notifications and actions"
            />
          </div>
        </SettingsSection>

        {/* Sound */}
        <SettingsSection icon={Volume2} title="Sound">
          <div className="space-y-1 divide-y divide-gray-100 dark:divide-gray-800">
            <ToggleSwitch
              enabled={soundEnabled}
              onToggle={() => setSoundEnabled(!soundEnabled)}
              label="Notification Sounds"
              description="Play a sound when receiving notifications"
            />
          </div>
        </SettingsSection>

        {/* Language */}
        <SettingsSection icon={Globe} title="Language & Region">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Display Language
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-gray-900 transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              <option>English</option>
              <option>Hindi</option>
              <option>Tamil</option>
              <option>Telugu</option>
              <option>Bengali</option>
              <option>Marathi</option>
            </select>
          </div>
        </SettingsSection>

        {/* Security */}
        <SettingsSection icon={Shield} title="Privacy & Security">
          <div className="space-y-1 divide-y divide-gray-100 dark:divide-gray-800">
            <ToggleSwitch
              enabled={false}
              onToggle={() => showToast('Two-factor authentication coming soon!', 'info')}
              label="Two-Factor Authentication"
              description="Add an extra layer of security to your account"
            />
          </div>
          <div className="mt-4 space-y-2">
            <button className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50">
              <span className="text-gray-900 dark:text-white">Privacy Policy</span>
              <ChevronRight size={16} className="text-gray-400" />
            </button>
            <button className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50">
              <span className="text-gray-900 dark:text-white">Terms of Service</span>
              <ChevronRight size={16} className="text-gray-400" />
            </button>
          </div>
        </SettingsSection>

        {/* Account Actions */}
        <Card className="border border-red-100 dark:border-red-900/30">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-red-600 dark:text-red-400">
            <LogOut size={20} />
            Account Actions
          </h2>
          <div className="space-y-3">
            <Button variant="outline" className="w-full justify-center" onClick={handleLogout}>
              <LogOut size={16} className="mr-2" />
              Sign Out
            </Button>
            {!showDeleteConfirm ? (
              <Button
                variant="outline"
                className="w-full justify-center border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 size={16} className="mr-2" />
                Delete Account
              </Button>
            ) : (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/50">
                <p className="mb-3 text-sm text-red-700 dark:text-red-300">
                  Are you sure? This action cannot be undone. All your data will be permanently deleted.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 bg-red-600 hover:bg-red-700"
                    onClick={() => {
                      showToast('Account deletion is not available yet', 'info')
                      setShowDeleteConfirm(false)
                    }}
                  >
                    Yes, Delete
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end pb-8">
          <Button onClick={handleSave} className="min-w-[160px]">
            Save All Settings
          </Button>
        </div>
      </div>
    </div>
  )
}