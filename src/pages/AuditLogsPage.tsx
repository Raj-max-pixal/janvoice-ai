import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Shield,
  AlertTriangle,
  RefreshCw,
  Download,
  FileText,
} from 'lucide-react'
import { DashboardLayout } from '../components/DashboardLayout'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { getActivityLogs } from '../services/firebase'
import { useDebounce } from '../hooks/useDebounce'
import type { AuditLog } from '../types'

const ITEMS_PER_PAGE = 20

const ACTION_ICONS: Record<string, React.ReactNode> = {
  Login: <User className="h-4 w-4" />,
  'Complaint created': <FileText className="h-4 w-4 text-blue-500" />,
  'Complaint updated': <FileText className="h-4 w-4 text-yellow-500" />,
  'Complaint assigned': <Shield className="h-4 w-4 text-purple-500" />,
  'Complaint resolved': <Shield className="h-4 w-4 text-green-500" />,
  'Complaint rejected': <AlertTriangle className="h-4 w-4 text-red-500" />,
}

export function AuditLogsPage() {
  const navigate = useNavigate()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAction, setSelectedAction] = useState<string>('all')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const debouncedSearch = useDebounce(searchQuery, 300)

  useEffect(() => {
    loadLogs()
  }, [])

  const loadLogs = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getActivityLogs()
      setLogs(data)
    } catch (err) {
      console.error('Failed to load audit logs:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const uniqueActions = useMemo(() => {
    const actions = new Set(logs.map((l) => l.action))
    return Array.from(actions).sort()
  }, [logs])

  const filteredLogs = useMemo(() => {
    let result = [...logs]

    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase()
      result = result.filter(
        (log) =>
          log.action.toLowerCase().includes(q) ||
          log.userName.toLowerCase().includes(q) ||
          log.userRole.toLowerCase().includes(q) ||
          (log.complaintId && log.complaintId.toLowerCase().includes(q))
      )
    }

    if (selectedAction !== 'all') {
      result = result.filter((log) => log.action === selectedAction)
    }

    result.sort((a, b) => {
      const dateA = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime()
      const dateB = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime()
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB
    })

    return result
  }, [logs, debouncedSearch, selectedAction, sortOrder])

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / ITEMS_PER_PAGE))
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearch, selectedAction])

  const formatTimestamp = (timestamp: Date) => {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp)
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getRoleBadgeVariant = (role: string): 'info' | 'success' | 'warning' | 'error' | 'default' => {
    switch (role) {
      case 'administrator':
      case 'superAdmin':
        return 'error'
      case 'municipality':
      case 'officer':
        return 'warning'
      case 'mp':
        return 'info'
      default:
        return 'default'
    }
  }

  const getActionIcon = (action: string) => {
    return ACTION_ICONS[action] || <FileText className="h-4 w-4 text-gray-400" />
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Audit Logs</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Track all administrative actions and system activities
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadLogs}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => {
                const csv = [
                  ['Timestamp', 'Action', 'User', 'Role', 'Complaint ID'],
                  ...filteredLogs.map((log) => [
                    formatTimestamp(log.timestamp),
                    log.action,
                    log.userName,
                    log.userRole,
                    log.complaintId || '',
                  ]),
                ]
                  .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
                  .join('\n')
                const blob = new Blob([csv], { type: 'text/csv' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`
                a.click()
                URL.revokeObjectURL(url)
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search actions, users, roles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Actions</option>
            {uniqueActions.map((action) => (
              <option key={action} value={action}>
                {action}
              </option>
            ))}
          </select>

          <button
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            className="inline-flex items-center gap-2 px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <ArrowUpDown className="h-4 w-4" />
            {sortOrder === 'desc' ? 'Newest' : 'Oldest'}
          </button>
        </div>

        {/* Stats summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <div className="p-4">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Logs</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{logs.length}</p>
            </div>
          </Card>
          <Card>
            <div className="p-4">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Unique Users</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {new Set(logs.map((l) => l.userId)).size}
              </p>
            </div>
          </Card>
          <Card>
            <div className="p-4">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Unique Actions</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{uniqueActions.length}</p>
            </div>
          </Card>
          <Card>
            <div className="p-4">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Filtered</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{filteredLogs.length}</p>
            </div>
          </Card>
        </div>

        {/* Logs Table */}
        <Card>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : paginatedLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Clock className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">No audit logs found</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {debouncedSearch ? 'Try adjusting your search or filters' : 'No activities have been logged yet'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      User
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Complaint ID
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {paginatedLogs.map((log) => (
                    <tr
                      key={log.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {formatTimestamp(log.timestamp)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {getActionIcon(log.action)}
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {log.action}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                            <span className="text-white text-[10px] font-bold">
                              {log.userName?.charAt(0)?.toUpperCase() || '?'}
                            </span>
                          </div>
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {log.userName}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          label={log.userRole}
                          variant={getRoleBadgeVariant(log.userRole)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        {log.complaintId ? (
                          <button
                            onClick={() => navigate(`/complaint/${log.complaintId}`)}
                            className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
                          >
                            #{log.complaintId.slice(0, 8)}
                          </button>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Page {currentPage} of {totalPages} ({filteredLogs.length} total)
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    </button>
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      const start = Math.max(1, currentPage - 2)
                      const page = start + i
                      if (page > totalPages) return null
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${
                            page === currentPage
                              ? 'bg-blue-600 text-white'
                              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                          }`}
                        >
                          {page}
                        </button>
                      )
                    })}
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  )
}