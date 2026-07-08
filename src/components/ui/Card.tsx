import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-white/20 bg-white/70 p-6 shadow-glass backdrop-blur-md dark:border-gray-700/50 dark:bg-gray-900/70 ${className}`}
    >
      {children}
    </div>
  )
}
