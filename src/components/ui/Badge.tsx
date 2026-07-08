import type { Priority, ComplaintStatus } from '../../types'

interface BadgeProps {
  label: string
  variant?: 'priority' | 'status' | 'category' | 'default' | 'success' | 'error' | 'warning' | 'info'
  value?: Priority | ComplaintStatus | string
}

const priorityColors: Record<string, string> = {
  High: 'bg-accent-100 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300',
  Medium:
    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  Low: 'bg-secondary-100 text-secondary-700 dark:bg-secondary-900/30 dark:text-secondary-300',
}

const statusColors: Record<string, string> = {
  Pending:
    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  'In Progress':
    'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300',
  Resolved:
    'bg-secondary-100 text-secondary-700 dark:bg-secondary-900/30 dark:text-secondary-300',
}

const variantColors: Record<string, string> = {
  success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  error: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
}

export function Badge({ label, variant = 'default', value }: BadgeProps) {
  let colorClass =
    'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'

  if (variant === 'success' || variant === 'error' || variant === 'warning' || variant === 'info') {
    colorClass = variantColors[variant] ?? colorClass
  } else if (variant === 'priority' && value) {
    colorClass = priorityColors[value] ?? colorClass
  } else if (variant === 'status' && value) {
    colorClass = statusColors[value] ?? colorClass
  } else if (variant === 'category') {
    colorClass =
      'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
  }

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${colorClass}`}
    >
      {label}
    </span>
  )
}
