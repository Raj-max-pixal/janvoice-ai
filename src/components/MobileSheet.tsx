import { useEffect } from 'react'
import { X } from 'lucide-react'

interface MobileSheetProps {
  open: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
}

export function MobileSheet({ open, title, onClose, children }: MobileSheetProps) {
  useEffect(() => {
    if (!open) return
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-end bg-slate-950/60 p-2 md:hidden" onClick={onClose}>
      <div className="w-full rounded-t-3xl bg-white p-4 shadow-2xl dark:bg-slate-950" onClick={(event) => event.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">{title}</h3>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900" aria-label="Close panel">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
