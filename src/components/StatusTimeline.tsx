import { Check, Clock, AlertCircle, ChevronRight, Loader2 } from 'lucide-react'
import type { StatusUpdate, ComplaintStatus } from '../types'

const STATUS_STEPS: ComplaintStatus[] = [
  'Submitted',
  'AI Verification',
  'Admin Review',
  'Assigned to Department',
  'Sent to Authority',
  'Officer Accepted',
  'Work Started',
  'Work Completed',
  'Citizen Verification',
  'Resolved',
]

interface StatusTimelineProps {
  statusHistory: StatusUpdate[]
  currentStatus: ComplaintStatus
}

export function StatusTimeline({ statusHistory, currentStatus }: StatusTimelineProps) {
  const currentIndex = STATUS_STEPS.indexOf(currentStatus)

  if (!statusHistory || statusHistory.length === 0) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Status Timeline</h3>
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 p-6 dark:border-slate-700">
          <Clock className="mb-2 h-6 w-6 text-slate-300" />
          <p className="text-sm text-slate-400">No status updates yet</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Status Timeline</h3>
      <div className="relative">
        {STATUS_STEPS.slice(0, Math.max(currentIndex + 1, 1)).map((status, index) => {
          const historyItem = statusHistory.find((h) => h.status === status)
          const isActive = index === currentIndex
          const isCompleted = index < currentIndex

          return (
            <div key={status} className="relative flex gap-4 pb-4 last:pb-0">
              {/* Vertical line */}
              {index < Math.max(currentIndex, 0) && (
                <div className="absolute left-[11px] top-6 h-full w-0.5 bg-emerald-200 dark:bg-emerald-800" />
              )}

              {/* Status dot */}
              <div className="relative z-10 mt-1 flex-shrink-0">
                {isCompleted ? (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500">
                    <Check className="h-3.5 w-3.5 text-white" />
                  </div>
                ) : isActive ? (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 ring-4 ring-blue-100 dark:ring-blue-900">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                  </div>
                ) : (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800">
                    <div className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-600" />
                  </div>
                )}
              </div>

              {/* Status info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm font-semibold ${
                      isActive
                        ? 'text-blue-600 dark:text-blue-400'
                        : isCompleted
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-400'
                    }`}
                  >
                    {status}
                  </span>
                  {historyItem?.notes && (
                    <span className="hidden sm:inline text-xs text-slate-400 truncate">
                      — {historyItem.notes}
                    </span>
                  )}
                </div>
                {historyItem?.timestamp && (
                  <p className="mt-0.5 text-xs text-slate-400">
                    {new Date(historyItem.timestamp).toLocaleDateString('en-IN', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                )}
                {historyItem?.notes && (
                  <p className="mt-1 text-xs text-slate-500 sm:hidden">{historyItem.notes}</p>
                )}
                {historyItem?.updatedBy && (
                  <p className="mt-0.5 text-xs text-slate-400">by {historyItem.updatedBy}</p>
                )}
              </div>

              {isActive && (
                <div className="flex-shrink-0 self-center">
                  <ChevronRight className="h-4 w-4 text-blue-500" />
                </div>
              )}
            </div>
          )
        })}

        {/* Archived / Reopened indicators */}
        {currentStatus === 'Archived' && (
          <div className="relative flex gap-4 pt-2">
            <div className="relative z-10 mt-1 flex-shrink-0">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-500">
                <AlertCircle className="h-3.5 w-3.5 text-white" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-semibold text-slate-500">Archived</span>
            </div>
          </div>
        )}
        {currentStatus === 'Reopened' && (
          <div className="relative flex gap-4 pt-2">
            <div className="relative z-10 mt-1 flex-shrink-0">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500">
                <AlertCircle className="h-3.5 w-3.5 text-white" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-semibold text-amber-500">Reopened</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}