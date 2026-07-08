import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  Filter,
  ArrowUpDown,
  AlertCircle,
  MapPin,
  Calendar,
  User,
  Building2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ArrowRight,
  Inbox,
} from 'lucide-react'
import { getAllComplaints, getDepartments } from '../services/firebase'
import { DashboardLayout } from '../components/DashboardLayout'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Skeleton } from '../components/ui/Skeleton'
import { EmptyState } from '../components/ui/EmptyState'
import { cn } from '../lib/utils'
import type { Complaint, ComplaintStatus, ComplaintCategory, Department } from '../types'

const ITEMS_PER_PAGE = 10

type SortField = 'createdAt' | 'updatedAt' | 'priority' | 'status'
type SortOrder = 'asc' | 'desc'

const statusLabels: Record<ComplaintStatus, string> = {
  Submitted: 'Submitted',
  Pending: 'Pending',
  'Under Review': 'Under Review',
  'AI Verification': 'AI Verification',
  'Admin Review': 'Admin Review',
  Accepted: 'Accepted',
  Assigned: 'Assigned',
  'Assigned to Department': 'Assigned to Dept',
  'Sent to Authority': 'Sent to Authority',
  'Officer Accepted': 'Officer Accepted',
  'Work Started': 'Work Started',
  'In Progress': 'In Progress',
  'Work Completed': 'Work Completed',
  'Citizen Verification': 'Citizen Verification',
  Resolved: 'Resolved',
  Closed: 'Closed',
  Archived: 'Archived',
  Reopened: 'Reopened',
  Rejected: 'Rejected',
}

export function ComplaintsListPage() {
  const navigate = useNavigate()
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<ComplaintStatus | 'all'>('all')
  const [categoryFilter, setCategoryFilter] = useState<ComplaintCategory | 'all'>('all')
  const [departmentFilter, setDepartmentFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'High' | 'Medium' | 'Low'>('all')
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'week' | 'month'>('all')

  // Sorting
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [complaintsData, departmentsData] = await Promise.all([
        getAllComplaints(),
        getDepartments(),
      ])
      setComplaints(complaintsData)
      setDepartments(departmentsData)
    } catch (err) {
      console.error('Failed to fetch complaints:', err)
      setError('Failed to load complaints. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Filtered & sorted complaints
  const processedComplaints = useMemo(() => {
    let filtered = [...complaints]

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (c) =>
          c.id.toLowerCase().includes(q) ||
          c.userName?.toLowerCase().includes(q) ||
          c.title?.toLowerCase().includes(q) ||
          c.description?.toLowerCase().includes(q) ||
          c.location?.toLowerCase().includes(q) ||
          c.address?.district?.toLowerCase().includes(q) ||
          c.forwardedDepartment?.toLowerCase().includes(q) ||
          c.assignedOfficer?.toLowerCase().includes(q),
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((c) => c.status === statusFilter)
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter((c) => c.category === categoryFilter)
    }

    // Department filter
    if (departmentFilter !== 'all') {
      filtered = filtered.filter(
        (c) =>
          c.forwardedDepartment === departmentFilter ||
          c.assignedDepartment === departmentFilter,
      )
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(
        (c) =>
          c.priority === priorityFilter || c.aiAnalysis?.priority === priorityFilter,
      )
    }

    // Date range filter
    if (dateRange !== 'all') {
      const now = new Date()
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      if (dateRange === 'today') {
        filtered = filtered.filter((c) => new Date(c.createdAt) >= startOfDay)
      } else if (dateRange === 'week') {
        const weekAgo = new Date(startOfDay.getTime() - 7 * 24 * 60 * 60 * 1000)
        filtered = filtered.filter((c) => new Date(c.createdAt) >= weekAgo)
      } else if (dateRange === 'month') {
        const monthAgo = new Date(startOfDay.getTime() - 30 * 24 * 60 * 60 * 1000)
        filtered = filtered.filter((c) => new Date(c.createdAt) >= monthAgo)
      }
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0
      if (sortField === 'createdAt') {
        comparison =
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      } else if (sortField === 'updatedAt') {
        comparison =
          new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
      } else if (sortField === 'priority') {
        const priorityOrder: Record<string, number> = {
          High: 3,
          Medium: 2,
          Low: 1,
        }
        const aP = a.priority || a.aiAnalysis?.priority || 'Low'
        const bP = b.priority || b.aiAnalysis?.priority || 'Low'
        comparison = (priorityOrder[aP] || 0) - (priorityOrder[bP] || 0)
      } else if (sortField === 'status') {
        comparison = a.status.localeCompare(b.status)
      }
      return sortOrder === 'desc' ? -comparison : comparison
    })

    return filtered
  }, [
    complaints,
    searchQuery,
    statusFilter,
    categoryFilter,
    departmentFilter,
    priorityFilter,
    dateRange,
    sortField,
    sortOrder,
  ])

  // Pagination
  const totalPages = Math.ceil(processedComplaints.length / ITEMS_PER_PAGE)
  const paginatedComplaints = processedComplaints.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  )

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [
    searchQuery,
    statusFilter,
    categoryFilter,
    departmentFilter,
    priorityFilter,
    dateRange,
  ])

  const activeFilterCount = [
    statusFilter !== 'all',
    categoryFilter !== 'all',
    departmentFilter !== 'all',
    priorityFilter !== 'all',
    dateRange !== 'all',
  ].filter(Boolean).length

  const clearFilters = () => {
    setStatusFilter('all')
    setCategoryFilter('all')
    setDepartmentFilter('all')
    setPriorityFilter('all')
    setDateRange('all')
    setSearchQuery('')
  }

  const getStatusColor = (status: string): string => {
    const pendingStatuses = ['Submitted', 'Pending']
    const reviewStatuses = ['Under Review', 'AI Verification', 'Admin Review']
    const acceptedStatuses = ['Accepted', 'Assigned', 'Officer Accepted']
    const progressStatuses = ['Assigned to Department', 'Sent to Authority', 'Work Started']
    const resolvedStatuses = ['Resolved', 'Work Completed', 'Citizen Verification']
    const closedStatuses = ['Closed', 'Archived']

    if (pendingStatuses.includes(status)) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
    if (reviewStatuses.includes(status)) return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
    if (acceptedStatuses.includes(status)) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
    if (progressStatuses.includes(status)) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
    if (resolvedStatuses.includes(status)) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
    if (closedStatuses.includes(status)) return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
    if (status === 'Rejected' || status === 'Reopened') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
    return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Complaints Management
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              View and manage all citizen complaints
            </p>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw
              className={cn('h-4 w-4', loading && 'animate-spin')}
            />
            Refresh
          </button>
        </div>

        {/* Search & Filters */}
        <div className="rounded-2xl border border-white/20 bg-white/70 p-4 shadow-glass backdrop-blur-md dark:border-gray-700/50 dark:bg-gray-900/70">
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by ID, citizen, department, location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Filter chips */}
            <div className="flex flex-wrap gap-3">
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as ComplaintStatus | 'all')
                }
                className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Under Review">Under Review</option>
                <option value="Assigned">Assigned</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
                <option value="Rejected">Rejected</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) =>
                  setCategoryFilter(e.target.value as ComplaintCategory | 'all')
                }
                className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Categories</option>
                <option value="Road">Road</option>
                <option value="Water">Water</option>
                <option value="Healthcare">Healthcare</option>
                <option value="Education">Education</option>
                <option value="Electricity">Electricity</option>
                <option value="Sanitation">Sanitation</option>
                <option value="Transport">Transport</option>
                <option value="Others">Others</option>
              </select>

              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.name}>
                    {dept.name}
                  </option>
                ))}
              </select>

              <select
                value={priorityFilter}
                onChange={(e) =>
                  setPriorityFilter(
                    e.target.value as 'all' | 'High' | 'Medium' | 'Low',
                  )
                }
                className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Priorities</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>

              <select
                value={dateRange}
                onChange={(e) =>
                  setDateRange(
                    e.target.value as 'all' | 'today' | 'week' | 'month',
                  )
                }
                className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>

              {/* Sort controls */}
              <div className="flex items-center gap-2 ml-auto">
                <select
                  value={sortField}
                  onChange={(e) => setSortField(e.target.value as SortField)}
                  className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="createdAt">Date Created</option>
                  <option value="updatedAt">Last Updated</option>
                  <option value="priority">Priority</option>
                  <option value="status">Status</option>
                </select>
                <button
                  onClick={() =>
                    setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')
                  }
                  className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  title={sortOrder === 'desc' ? 'Newest first' : 'Oldest first'}
                >
                  <ArrowUpDown
                    className={cn(
                      'h-4 w-4 text-gray-600 dark:text-gray-400',
                      sortOrder === 'asc' && 'rotate-180',
                    )}
                  />
                </button>
              </div>
            </div>

            {activeFilterCount > 0 && (
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Filter className="h-4 w-4" />
                <span>
                  {activeFilterCount} active filter
                  {activeFilterCount > 1 ? 's' : ''}
                </span>
                <button
                  onClick={clearFilters}
                  className="text-blue-600 dark:text-blue-400 hover:underline ml-2"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {loading
              ? 'Loading...'
              : `${processedComplaints.length} complaint${processedComplaints.length !== 1 ? 's' : ''} found`}
          </p>
        </div>

        {/* Error state */}
        {error && (
          <Card>
            <div className="flex flex-col items-center text-center py-8">
              <AlertCircle className="h-12 w-12 text-red-400 mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                Error Loading Complaints
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                {error}
              </p>
              <button
                onClick={fetchData}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </button>
            </div>
          </Card>
        )}

        {/* Loading state */}
        {loading && !error && (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="p-5">
                <div className="flex items-start gap-4">
                  <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-3">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-96" />
                    <div className="flex gap-3 mt-2">
                      <Skeleton className="h-6 w-20 rounded-full" />
                      <Skeleton className="h-6 w-20 rounded-full" />
                      <Skeleton className="h-6 w-20 rounded-full" />
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && processedComplaints.length === 0 && (
          <Card>
            <EmptyState
              icon={<Inbox className="h-10 w-10" />}
              title="No Complaints Found"
              description={
                searchQuery || activeFilterCount > 0
                  ? 'No complaints match your search criteria. Try adjusting your filters.'
                  : 'No complaints have been submitted yet.'
              }
              action={
                (activeFilterCount > 0 || searchQuery) ? (
                  <button
                    onClick={clearFilters}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
                  >
                    Clear Filters
                  </button>
                ) : undefined
              }
            />
          </Card>
        )}

        {/* Complaints list */}
        {!loading && !error && paginatedComplaints.length > 0 && (
          <div className="space-y-3">
            {paginatedComplaints.map((complaint) => {
              const priority =
                complaint.priority || complaint.aiAnalysis?.priority
              const pColor = priority === 'High' ? 'error' : priority === 'Medium' ? 'warning' : 'default'

              return (
                <div
                  key={complaint.id}
                  onClick={() => navigate(`/complaint/${complaint.id}`)}
                  className="rounded-2xl border border-white/20 bg-white/70 p-5 shadow-glass backdrop-blur-md dark:border-gray-700/50 dark:bg-gray-900/70 cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
                >
                  <div className="flex items-start gap-4">
                    {/* Complaint ID */}
                    <div className="hidden sm:flex flex-col items-center justify-center w-16 h-16 rounded-xl bg-blue-50 dark:bg-blue-900/20 shrink-0">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        #
                      </span>
                      <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                        {complaint.id.slice(-6).toUpperCase()}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                            {complaint.title}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                            {complaint.description}
                          </p>
                        </div>
                        {priority && (
                          <Badge
                            label={priority}
                            variant={pColor}
                          />
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 mt-3">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
                            getStatusColor(complaint.status),
                          )}
                        >
                          {statusLabels[complaint.status] || complaint.status}
                        </span>

                        <Badge
                          label={complaint.category}
                          variant="category"
                        />

                        <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                          <User className="h-3 w-3" />
                          {complaint.userName}
                        </span>

                        <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                          <Calendar className="h-3 w-3" />
                          {new Date(complaint.createdAt).toLocaleDateString()}
                        </span>

                        {complaint.location && (
                          <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                            <MapPin className="h-3 w-3" />
                            {complaint.location}
                          </span>
                        )}

                        {complaint.forwardedDepartment && (
                          <span className="flex items-center gap-1 text-xs text-blue-500">
                            <Building2 className="h-3 w-3" />
                            {complaint.forwardedDepartment}
                          </span>
                        )}
                      </div>
                    </div>

                    <ArrowRight className="hidden sm:block h-5 w-5 text-gray-300 dark:text-gray-600 shrink-0 mt-2" />
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 pb-8">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                const pageNum =
                  Math.max(1, Math.min(currentPage - 2, totalPages - 4)) + i
                if (pageNum > totalPages) return null
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={cn(
                      'w-8 h-8 rounded-xl text-sm font-medium transition-colors',
                      pageNum === currentPage
                        ? 'bg-blue-600 text-white'
                        : 'border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700',
                    )}
                  >
                    {pageNum}
                  </button>
                )
              })}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}