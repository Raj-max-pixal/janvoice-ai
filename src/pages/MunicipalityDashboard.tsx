import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import {
  AlertTriangle,
  BarChart3,
  Bell,
  Building,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Download,
  FileText,
  Filter,
  LogOut,
  MapPin,
  MessageSquare,
  RefreshCw,
  Search,
  Settings,
  ShieldAlert,
  Sliders,
  UserCheck,
  UserX,
  X,
  Eye,
  XCircle,
  ArrowUpDown,
  ThumbsUp,
  ThumbsDown,
  Calendar,
  Home,
  LayoutDashboard,
  Users,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { EmptyState } from '../components/ui/EmptyState'
import { useToast } from '../contexts/ToastContext'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'
import {
  getAllComplaints,
  db,
  getDepartments,
} from '../services/firebase'
import { doc, updateDoc, collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore'
import { COMPLAINT_CATEGORIES, COMPLAINT_STATUSES, type Complaint, type Department, type Priority, type ComplaintStatus } from '../types'

type SortField = 'createdAt' | 'priority' | 'status' | 'category'
type SortOrder = 'asc' | 'desc'

const PRIORITY_ORDER: Record<string, number> = { High: 3, Medium: 2, Low: 1 }

export function MunicipalityDashboard() {
  const { showToast } = useToast()
  const { theme } = useTheme()
  const { currentUser, logout } = useAuth()
  const navigate = useNavigate()
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)

  // Sidebar / View state
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeView, setActiveView] = useState<'dashboard' | 'complaints' | 'departments'>('dashboard')

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('All')
  const [categoryFilter, setCategoryFilter] = useState<string>('All')
  const [priorityFilter, setPriorityFilter] = useState<string>('All')
  const [departmentFilter, setDepartmentFilter] = useState<string>('All')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [showFilters, setShowFilters] = useState(false)

  // Complaint detail modal
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const itemsPerPage = 10

  const loadData = useCallback(async () => {
    try {
      const [complaintsData, departmentsData] = await Promise.all([
        getAllComplaints(),
        getDepartments(),
      ])
      setComplaints(complaintsData)
      setDepartments(departmentsData)
    } catch {
      showToast('Failed to load data', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Filter & Sort
  const filteredComplaints = useMemo(() => {
    let result = [...complaints]

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter((c) =>
        c.id.toLowerCase().includes(q) ||
        c.userName.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.location.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        (c.assignedDepartment || '').toLowerCase().includes(q) ||
        (c.assignedOfficerName || '').toLowerCase().includes(q)
      )
    }

    // Status filter
    if (statusFilter !== 'All') {
      result = result.filter((c) => c.status === statusFilter)
    }

    // Category filter
    if (categoryFilter !== 'All') {
      result = result.filter((c) => c.category === categoryFilter)
    }

    // Priority filter
    if (priorityFilter !== 'All') {
      result = result.filter((c) => (c.aiAnalysis?.priority || 'Medium') === priorityFilter)
    }

    // Department filter
    if (departmentFilter !== 'All') {
      result = result.filter((c) => c.assignedDepartment === departmentFilter || c.forwardedDepartment === departmentFilter)
    }

    // Date range
    if (dateFrom) {
      const from = new Date(dateFrom)
      result = result.filter((c) => new Date(c.createdAt) >= from)
    }
    if (dateTo) {
      const to = new Date(dateTo)
      to.setHours(23, 59, 59, 999)
      result = result.filter((c) => new Date(c.createdAt) <= to)
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0
      if (sortField === 'createdAt') {
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      } else if (sortField === 'priority') {
        cmp = (PRIORITY_ORDER[a.aiAnalysis?.priority || 'Medium'] || 0) - (PRIORITY_ORDER[b.aiAnalysis?.priority || 'Medium'] || 0)
      } else if (sortField === 'status') {
        cmp = a.status.localeCompare(b.status)
      } else if (sortField === 'category') {
        cmp = a.category.localeCompare(b.category)
      }
      return sortOrder === 'desc' ? -cmp : cmp
    })

    return result
  }, [complaints, searchQuery, statusFilter, categoryFilter, priorityFilter, departmentFilter, dateFrom, dateTo, sortField, sortOrder])

  const paginatedComplaints = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredComplaints.slice(start, start + itemsPerPage)
  }, [filteredComplaints, currentPage])

  const totalPages = Math.ceil(filteredComplaints.length / itemsPerPage) || 1

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, statusFilter, categoryFilter, priorityFilter, departmentFilter, dateFrom, dateTo])

  // Stats
  const stats = useMemo(() => {
    const total = complaints.length
    const pending = complaints.filter((c) => c.status === 'Pending' || c.status === 'Submitted').length
    const underReview = complaints.filter((c) => c.status === 'Under Review').length
    const assigned = complaints.filter((c) => c.status === 'Assigned' || c.status === 'Assigned to Department').length
    const inProgress = complaints.filter((c) => c.status === 'In Progress').length
    const resolved = complaints.filter((c) => c.status === 'Resolved').length
    const closed = complaints.filter((c) => c.status === 'Closed').length
    const rejected = complaints.filter((c) => c.status === 'Rejected').length
    const highPriority = complaints.filter((c) => c.aiAnalysis?.priority === 'High').length

    return { total, pending, underReview, assigned, inProgress, resolved, closed, rejected, highPriority }
  }, [complaints])

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  // Actions
  const updateComplaintField = async (complaintId: string, updates: Record<string, unknown>) => {
    setActionLoading(complaintId)
    try {
      await updateDoc(doc(db, 'complaints', complaintId), updates)
      loadData()
      if (selectedComplaint?.id === complaintId) {
        setSelectedComplaint((prev) => prev ? { ...prev, ...updates } as Complaint : null)
      }
      showToast(`Complaint #${complaintId} updated successfully`, 'success')
    } catch {
      showToast('Failed to update complaint', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const handleAcceptComplaint = async (complaintId: string) => {
    const complaint = complaints.find((c) => c.id === complaintId)
    const statusHistory = complaint?.statusHistory || []
    await updateComplaintField(complaintId, {
      status: 'Under Review',
      statusHistory: [
        ...statusHistory,
        { status: 'Under Review', timestamp: new Date(), notes: 'Complaint accepted by municipality', updatedBy: currentUser?.uid, updatedByName: currentUser?.displayName },
      ],
    })
  }

  const handleRejectComplaint = async (complaintId: string, reason?: string) => {
    const complaint = complaints.find((c) => c.id === complaintId)
    const statusHistory = complaint?.statusHistory || []
    await updateComplaintField(complaintId, {
      status: 'Rejected',
      rejectedReason: reason || 'Complaint does not fall under municipality jurisdiction',
      statusHistory: [
        ...statusHistory,
        { status: 'Rejected', timestamp: new Date(), notes: reason || 'Rejected by municipality', updatedBy: currentUser?.uid, updatedByName: currentUser?.displayName },
      ],
    })
  }

  const handleAssignDepartment = async (complaintId: string, departmentName: string) => {
    const complaint = complaints.find((c) => c.id === complaintId)
    const statusHistory = complaint?.statusHistory || []
    await updateComplaintField(complaintId, {
      assignedDepartment: departmentName,
      status: 'Assigned',
      statusHistory: [
        ...statusHistory,
        { status: 'Assigned', timestamp: new Date(), notes: `Assigned to ${departmentName}`, updatedBy: currentUser?.uid, updatedByName: currentUser?.displayName },
      ],
    })
  }

  const handleAssignOfficer = async (complaintId: string, officerName: string) => {
    await updateComplaintField(complaintId, {
      assignedOfficerName: officerName,
      assignedOfficer: officerName,
    })
  }

  const handleChangePriority = async (complaintId: string, priority: Priority) => {
    const complaint = complaints.find((c) => c.id === complaintId)
    const currentAnalysis = complaint?.aiAnalysis || { language: 'English', summary: '', category: complaint?.category || 'Others', priority: 'Medium' as Priority, sentiment: 'Neutral' as const, recommendedAction: '' }
    await updateComplaintField(complaintId, {
      aiAnalysis: { ...currentAnalysis, priority },
      priority,
    })
  }

  const handleUpdateStatus = async (complaintId: string, status: ComplaintStatus) => {
    const complaint = complaints.find((c) => c.id === complaintId)
    const statusHistory = complaint?.statusHistory || []
    await updateComplaintField(complaintId, {
      status,
      ...(status === 'Closed' ? { closedAt: new Date() } : {}),
      ...(status === 'Resolved' ? { resolvedAt: new Date() } : {}),
      statusHistory: [
        ...statusHistory,
        { status, timestamp: new Date(), notes: `Status changed to ${status}`, updatedBy: currentUser?.uid, updatedByName: currentUser?.displayName },
      ],
    })
  }

  const handleCloseComplaint = async (complaintId: string) => {
    await handleUpdateStatus(complaintId, 'Closed')
  }

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const getStatusBadgeVariant = (status: ComplaintStatus) => {
    switch (status) {
      case 'Resolved': return 'success'
      case 'Closed': return 'info'
      case 'Rejected': return 'error'
      case 'In Progress': return 'warning'
      case 'Assigned':
      case 'Assigned to Department': return 'info'
      case 'Under Review': return 'warning'
      case 'Pending':
      case 'Submitted': return 'info'
      default: return 'info'
    }
  }

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'High': return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30'
      case 'Medium': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/30'
      case 'Low': return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30'
      default: return 'text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800'
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-950 dark:text-slate-100 flex transition-colors duration-200">

      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-0'} lg:w-64 transition-all duration-300 flex-shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden`}>
        <div className="p-5">
          <div className="flex items-center gap-2 mb-8">
            <Building className="text-blue-600 dark:text-blue-400" size={24} />
            <span className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
              Municipality
            </span>
          </div>

          <nav className="space-y-1">
            <button
              onClick={() => setActiveView('dashboard')}
              className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition-all ${
                activeView === 'dashboard'
                  ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400'
                  : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900/40 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              <LayoutDashboard size={18} />
              Dashboard
            </button>
            <button
              onClick={() => setActiveView('complaints')}
              className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition-all ${
                activeView === 'complaints'
                  ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400'
                  : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900/40 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              <FileText size={18} />
              Complaints
              {stats.pending + stats.underReview > 0 && (
                <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {stats.pending + stats.underReview}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveView('departments')}
              className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition-all ${
                activeView === 'departments'
                  ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400'
                  : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900/40 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              <Building size={18} />
              Departments
            </button>
            <Link
              to="/analytics"
              className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900/40 hover:text-slate-800 dark:hover:text-white transition-all"
            >
              <BarChart3 size={18} />
              Analytics
            </Link>
            <Link
              to="/admin"
              className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900/40 hover:text-slate-800 dark:hover:text-white transition-all"
            >
              <ShieldAlert size={18} />
              Admin
            </Link>
          </nav>

          {/* Profile Section */}
          <div className="mt-auto border-t border-slate-200 dark:border-slate-800 pt-4 mt-8">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-9 w-9 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center font-bold text-blue-700 dark:text-blue-400 text-sm">
                {currentUser?.displayName?.slice(0, 2).toUpperCase() || 'MU'}
              </div>
              <div className="text-left flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{currentUser?.displayName || 'Municipality User'}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">Municipality Officer</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-slate-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20 dark:hover:text-red-400 transition-all"
            >
              <LogOut size={14} />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile sidebar toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm"
      >
        <Sliders size={18} />
      </button>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 dark:border-slate-800 dark:bg-slate-950/95 px-6 py-4 backdrop-blur flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white">
              {activeView === 'dashboard' ? 'Municipality Dashboard' : activeView === 'complaints' ? 'Complaint Management' : 'Departments'}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {activeView === 'dashboard' ? 'Overview of municipal complaints and services' : activeView === 'complaints' ? `Total: ${filteredComplaints.length} complaints` : 'Manage municipal departments'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadData()}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400"
            >
              <RefreshCw size={16} />
            </button>
            <Link
              to="/settings"
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400"
            >
              <Settings size={16} />
            </Link>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          {/* DASHBOARD VIEW */}
          {activeView === 'dashboard' && (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                <Card className="p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/70 text-left">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total</p>
                  <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{stats.total}</p>
                </Card>
                <Card className="p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/70 text-left">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-yellow-600 dark:text-yellow-400">Pending</p>
                  <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{stats.pending}</p>
                </Card>
                <Card className="p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/70 text-left">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">Under Review</p>
                  <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{stats.underReview}</p>
                </Card>
                <Card className="p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/70 text-left">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Assigned</p>
                  <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{stats.assigned}</p>
                </Card>
                <Card className="p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/70 text-left">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Resolved</p>
                  <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{stats.resolved}</p>
                </Card>
                <Card className="p-4 border border-slate-200 dark:border-slate-800 bg-red-50 dark:bg-red-950/20 text-left">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">High Priority</p>
                  <p className="mt-1 text-2xl font-black text-red-700 dark:text-red-400">{stats.highPriority}</p>
                </Card>
              </div>

              {/* Recent Complaints */}
              <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/70 text-left overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 dark:text-white">Recent Complaints</h3>
                  <button
                    onClick={() => setActiveView('complaints')}
                    className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    View All
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-[10px] uppercase font-bold tracking-wider text-slate-500">
                      <tr>
                        <th className="px-4 py-3">ID</th>
                        <th className="px-4 py-3">Citizen</th>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3">Priority</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-semibold">
                      {complaints.slice(0, 5).map((c) => (
                        <tr
                          key={c.id}
                          onClick={() => { setSelectedComplaint(c); setActiveView('complaints') }}
                          className="hover:bg-slate-50 dark:hover:bg-slate-900/20 cursor-pointer transition-colors"
                        >
                          <td className="px-4 py-3 font-bold text-blue-700 dark:text-blue-400">#{c.id.slice(0, 8)}</td>
                          <td className="px-4 py-3 text-slate-800 dark:text-slate-200">{c.userName}</td>
                          <td className="px-4 py-3">
                            <span className="flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                              {c.category}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${getPriorityColor(c.aiAnalysis?.priority)}`}>
                              {c.aiAnalysis?.priority || 'Medium'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <Badge label={c.status} variant={getStatusBadgeVariant(c.status)} />
                          </td>
                          <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                            {new Date(c.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                      {complaints.length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center py-10 text-slate-500">
                            <EmptyState title="No complaints yet" message="Complaints will appear here once citizens submit them" />
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Quick Actions */}
              <div className="grid gap-4 md:grid-cols-3">
                <Card className="p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/70 text-left">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400">
                      <FileText size={18} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">New Complaints</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{stats.pending} pending review</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setActiveView('complaints'); setStatusFilter('Pending') }}
                    className="w-full text-center py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors"
                  >
                    Review Now
                  </button>
                </Card>
                <Card className="p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/70 text-left">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400">
                      <AlertTriangle size={18} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">High Priority</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{stats.highPriority} urgent cases</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setActiveView('complaints'); setPriorityFilter('High') }}
                    className="w-full text-center py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors"
                  >
                    View Urgent
                  </button>
                </Card>
                <Card className="p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/70 text-left">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle size={18} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">Resolved</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{stats.resolved} completed</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setActiveView('complaints'); setStatusFilter('Resolved') }}
                    className="w-full text-center py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors"
                  >
                    View Resolved
                  </button>
                </Card>
              </div>
            </div>
          )}

          {/* COMPLAINTS VIEW */}
          {activeView === 'complaints' && (
            <div className="space-y-4">
              {/* Filters */}
              <Card className="p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/70 text-left">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Search size={16} className="text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by ID, citizen, category, department..."
                      className="bg-transparent border-none outline-none text-sm w-64 placeholder-slate-400 dark:text-white"
                    />
                  </div>
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white"
                  >
                    <Filter size={14} />
                    Filters
                    {showFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>

                {showFilters && (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-500">Status</label>
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full mt-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs focus:outline-none dark:text-white"
                      >
                        <option value="All">All Statuses</option>
                        {COMPLAINT_STATUSES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-500">Category</label>
                      <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="w-full mt-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs focus:outline-none dark:text-white"
                      >
                        <option value="All">All Categories</option>
                        {COMPLAINT_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-500">Priority</label>
                      <select
                        value={priorityFilter}
                        onChange={(e) => setPriorityFilter(e.target.value)}
                        className="w-full mt-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs focus:outline-none dark:text-white"
                      >
                        <option value="All">All Priorities</option>
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-500">Department</label>
                      <select
                        value={departmentFilter}
                        onChange={(e) => setDepartmentFilter(e.target.value)}
                        className="w-full mt-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs focus:outline-none dark:text-white"
                      >
                        <option value="All">All Departments</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.name}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-500">From Date</label>
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="w-full mt-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs focus:outline-none dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-500">To Date</label>
                      <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="w-full mt-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs focus:outline-none dark:text-white"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={() => {
                          setSearchQuery('')
                          setStatusFilter('All')
                          setCategoryFilter('All')
                          setPriorityFilter('All')
                          setDepartmentFilter('All')
                          setDateFrom('')
                          setDateTo('')
                          showToast('Filters cleared', 'info')
                        }}
                        className="w-full py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        Clear Filters
                      </button>
                    </div>
                  </div>
                )}
              </Card>

              {/* Sort Controls */}
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="font-bold">Sort by:</span>
                {(['createdAt', 'priority', 'status', 'category'] as const).map((field) => (
                  <button
                    key={field}
                    onClick={() => toggleSort(field)}
                    className={`flex items-center gap-1 px-2 py-1 rounded font-bold ${
                      sortField === field
                        ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {field === 'createdAt' ? 'Date' : field.charAt(0).toUpperCase() + field.slice(1)}
                    {sortField === field && (
                      sortOrder === 'desc' ? <ChevronDown size={12} /> : <ChevronUp size={12} />
                    )}
                    <ArrowUpDown size={10} />
                  </button>
                ))}
              </div>

              {/* Complaints Table */}
              <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/70 text-left overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] text-left text-sm">
                    <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-[10px] uppercase font-bold tracking-wider text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Complaint ID</th>
                        <th className="px-4 py-3">Citizen</th>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3">Location</th>
                        <th className="px-4 py-3">Priority</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Department</th>
                        <th className="px-4 py-3">Officer</th>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-semibold">
                      {paginatedComplaints.map((c) => (
                        <tr
                          key={c.id}
                          className="hover:bg-slate-50 dark:hover:bg-slate-900/20 transition-colors"
                        >
                          <td className="px-4 py-3 font-bold text-blue-700 dark:text-blue-400">
                            #{c.id.slice(0, 8)}
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <p className="text-slate-800 dark:text-slate-200">{c.userName}</p>
                              {c.userEmail && (
                                <p className="text-[10px] text-slate-500">{c.userEmail}</p>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                              {c.category}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-400 max-w-[120px] truncate">
                            {c.location}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${getPriorityColor(c.aiAnalysis?.priority)}`}>
                              {c.aiAnalysis?.priority || 'Medium'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <Badge label={c.status} variant={getStatusBadgeVariant(c.status)} />
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                            {c.assignedDepartment || c.forwardedDepartment || '-'}
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                            {c.assignedOfficerName || c.assignedOfficer || '-'}
                          </td>
                          <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                            {new Date(c.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => setSelectedComplaint(c)}
                              className="px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold transition-colors"
                            >
                              Manage
                            </button>
                          </td>
                        </tr>
                      ))}
                      {paginatedComplaints.length === 0 && (
                        <tr>
                          <td colSpan={10} className="text-center py-10 text-slate-500">
                            <EmptyState title="No complaints found" message="Try adjusting your search or filters" />
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="border-t border-slate-200 dark:border-slate-800 px-4 py-3 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between text-xs text-slate-500 font-bold">
                  <span>
                    Showing {(currentPage - 1) * itemsPerPage + 1}-
                    {Math.min(currentPage * itemsPerPage, filteredComplaints.length)} of {filteredComplaints.length}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                      disabled={currentPage === 1}
                      className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700 disabled:opacity-40"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    {Array.from({ length: Math.min(totalPages, 5) }).map((_, idx) => {
                      const pageNum = Math.max(1, Math.min(currentPage - 2, totalPages - 4)) + idx
                      if (pageNum > totalPages) return null
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`h-7 w-7 rounded-md font-bold text-xs ${
                            currentPage === pageNum
                              ? 'bg-blue-600 text-white'
                              : 'border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          {pageNum}
                        </button>
                      )
                    })}
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700 disabled:opacity-40"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* DEPARTMENTS VIEW */}
          {activeView === 'departments' && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {departments.map((dept) => (
                <Card key={dept.id} className="p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/70 text-left">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400">
                      <Building size={18} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{dept.name}</p>
                      <p className="text-[10px] text-slate-500">Head: {dept.head}</p>
                    </div>
                  </div>
                  <div className="space-y-1 text-xs text-slate-500">
                    <p>Email: {dept.contactEmail}</p>
                    {dept.contactPhone && <p>Phone: {dept.contactPhone}</p>}
                    {dept.officers && <p>Officers: {dept.officers.length}</p>}
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <p className="text-xs text-slate-500">
                      Complaints assigned: {complaints.filter((c) => c.assignedDepartment === dept.name).length}
                    </p>
                  </div>
                </Card>
              ))}
              {departments.length === 0 && (
                <div className="col-span-full">
                  <EmptyState title="No departments configured" message="Departments will appear here once added by an administrator" />
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* COMPLAINT DETAIL MODAL */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center pt-10 pb-10 overflow-y-auto" onClick={() => setSelectedComplaint(null)}>
          <div className="w-full max-w-4xl bg-white dark:bg-slate-950 rounded-2xl shadow-2xl mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-black text-slate-900 dark:text-white">
                  Complaint #{selectedComplaint.id.slice(0, 8)}
                </h2>
                <Badge label={selectedComplaint.status} variant={getStatusBadgeVariant(selectedComplaint.status)} />
              </div>
              <div className="flex items-center gap-2">
                {actionLoading === selectedComplaint.id && (
                  <span className="text-xs text-blue-600 animate-pulse">Saving...</span>
                )}
                <button
                  onClick={() => setSelectedComplaint(null)}
                  className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Citizen Information */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Citizen Name</label>
                  <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{selectedComplaint.userName}</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Email</label>
                  <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{selectedComplaint.userEmail || '-'}</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Phone</label>
                  <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{selectedComplaint.userPhone || '-'}</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Location</label>
                  <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{selectedComplaint.location}</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Address</label>
                  <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                    {selectedComplaint.address?.street ? `${selectedComplaint.address.street}, ` : ''}
                    {selectedComplaint.address?.city ? `${selectedComplaint.address.city}, ` : ''}
                    {selectedComplaint.address?.district}
                  </p>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">GPS Coordinates</label>
                  <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                    {selectedComplaint.gpsCoordinates
                      ? `${selectedComplaint.gpsCoordinates.coordinates[1].toFixed(4)}, ${selectedComplaint.gpsCoordinates.coordinates[0].toFixed(4)}`
                      : '-'}
                  </p>
                </div>
              </div>

              {/* Complaint Details */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                <h3 className="font-bold text-slate-900 dark:text-white mb-2">{selectedComplaint.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{selectedComplaint.description}</p>
              </div>

              {/* Images */}
              {(selectedComplaint.imageUrl || (selectedComplaint.imageUrls && selectedComplaint.imageUrls.length > 0)) && (
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                  <label className="text-[10px] font-bold uppercase text-slate-500 mb-2 block">Attachments</label>
                  <div className="flex gap-2 flex-wrap">
                    {selectedComplaint.imageUrl && (
                      <img src={selectedComplaint.imageUrl} alt="Complaint" className="h-24 w-24 object-cover rounded-lg border border-slate-200 dark:border-slate-700" />
                    )}
                    {selectedComplaint.imageUrls?.map((url, i) => (
                      <img key={i} src={url} alt={`Attachment ${i + 1}`} className="h-24 w-24 object-cover rounded-lg border border-slate-200 dark:border-slate-700" />
                    ))}
                  </div>
                </div>
              )}

              {/* AI Analysis */}
              {selectedComplaint.aiAnalysis && (
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                  <h3 className="font-bold text-slate-900 dark:text-white mb-3">AI Analysis</h3>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900">
                      <p className="text-[10px] font-bold uppercase text-slate-500">Summary</p>
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1">{selectedComplaint.aiAnalysis.summary}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900">
                      <p className="text-[10px] font-bold uppercase text-slate-500">Sentiment</p>
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1">{selectedComplaint.aiAnalysis.sentiment}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900">
                      <p className="text-[10px] font-bold uppercase text-slate-500">Recommendation</p>
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1">{selectedComplaint.aiAnalysis.recommendedAction}</p>
                    </div>
                    {selectedComplaint.aiAnalysis.isDuplicate && (
                      <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20">
                        <p className="text-[10px] font-bold uppercase text-orange-600">⚠ Duplicate Detected</p>
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1">
                          {selectedComplaint.aiAnalysis.duplicateOf ? `Similar to complaint #${selectedComplaint.aiAnalysis.duplicateOf.slice(0, 8)}` : 'Potential duplicate'}
                        </p>
                      </div>
                    )}
                    {selectedComplaint.aiAnalysis.isEmergency && (
                      <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20">
                        <p className="text-[10px] font-bold uppercase text-red-600">🚨 Emergency Detected</p>
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1">Immediate attention required</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Status History */}
              {selectedComplaint.statusHistory && selectedComplaint.statusHistory.length > 0 && (
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                  <h3 className="font-bold text-slate-900 dark:text-white mb-3">Status History</h3>
                  <div className="space-y-2">
                    {selectedComplaint.statusHistory.map((entry, idx) => (
                      <div key={idx} className="flex items-start gap-3 text-xs">
                        <div className="flex flex-col items-center">
                          <div className={`h-2.5 w-2.5 rounded-full mt-1 ${
                            idx === selectedComplaint.statusHistory.length - 1
                              ? 'bg-blue-500'
                              : 'bg-slate-300 dark:bg-slate-600'
                          }`} />
                          {idx < selectedComplaint.statusHistory.length - 1 && (
                            <div className="w-0.5 flex-1 bg-slate-200 dark:bg-slate-700" />
                          )}
                        </div>
                        <div className="flex-1 pb-4">
                          <p className="font-bold text-slate-800 dark:text-slate-200">{entry.status}</p>
                          <p className="text-slate-500">{new Date(entry.timestamp).toLocaleString()}</p>
                          {entry.notes && <p className="text-slate-400 mt-0.5">{entry.notes}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                <h3 className="font-bold text-slate-900 dark:text-white mb-3">Management Actions</h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {/* Accept / Reject (for pending) */}
                  {(selectedComplaint.status === 'Pending' || selectedComplaint.status === 'Submitted') && (
                    <>
                      <button
                        onClick={() => handleAcceptComplaint(selectedComplaint.id)}
                        disabled={actionLoading === selectedComplaint.id}
                        className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors disabled:opacity-50"
                      >
                        <ThumbsUp size={14} />
                        Accept Complaint
                      </button>
                      <button
                        onClick={() => {
                          const reason = window.prompt('Reason for rejection:')
                          if (reason !== null) handleRejectComplaint(selectedComplaint.id, reason)
                        }}
                        disabled={actionLoading === selectedComplaint.id}
                        className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors disabled:opacity-50"
                      >
                        <ThumbsDown size={14} />
                        Reject Complaint
                      </button>
                    </>
                  )}

                  {/* Assign Department */}
                  <div className="flex gap-2 items-center">
                    <select
                      onChange={(e) => {
                        if (e.target.value) handleAssignDepartment(selectedComplaint.id, e.target.value)
                      }}
                      className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2.5 text-xs focus:outline-none dark:text-white"
                      defaultValue=""
                    >
                      <option value="" disabled>Assign Department...</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.name}>{d.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Assign Officer */}
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      placeholder="Officer name..."
                      className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2.5 text-xs focus:outline-none dark:text-white"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
                          handleAssignOfficer(selectedComplaint.id, (e.target as HTMLInputElement).value.trim())
                          ;(e.target as HTMLInputElement).value = ''
                        }
                      }}
                    />
                    <UserCheck size={16} className="text-slate-400" />
                  </div>

                  {/* Change Priority */}
                  <div className="flex gap-2 items-center">
                    <select
                      onChange={(e) => {
                        if (e.target.value) handleChangePriority(selectedComplaint.id, e.target.value as Priority)
                      }}
                      className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2.5 text-xs focus:outline-none dark:text-white"
                      value={selectedComplaint.aiAnalysis?.priority || 'Medium'}
                    >
                      <option value="High">High Priority</option>
                      <option value="Medium">Medium Priority</option>
                      <option value="Low">Low Priority</option>
                    </select>
                  </div>

                  {/* Update Status */}
                  <div className="flex gap-2 items-center">
                    <select
                      onChange={(e) => {
                        if (e.target.value) handleUpdateStatus(selectedComplaint.id, e.target.value as ComplaintStatus)
                      }}
                      className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2.5 text-xs focus:outline-none dark:text-white"
                      defaultValue=""
                    >
                      <option value="" disabled>Change Status...</option>
                      {COMPLAINT_STATUSES.filter((s) => s !== selectedComplaint.status).map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  {/* Close Complaint */}
                  {selectedComplaint.status !== 'Closed' && selectedComplaint.status !== 'Rejected' && (
                    <button
                      onClick={() => handleCloseComplaint(selectedComplaint.id)}
                      disabled={actionLoading === selectedComplaint.id}
                      className="flex items-center justify-center gap-2 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                    >
                      <XCircle size={14} />
                      Close Complaint
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}