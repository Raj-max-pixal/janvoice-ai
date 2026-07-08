import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js'
import {
  AlertTriangle,
  BarChart3,
  Bell,
  Bot,
  Download,
  FileText,
  FolderOpen,
  Landmark,
  LayoutDashboard,
  MapPin,
  RefreshCw,
  Search,
  Settings,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  X,
  ShieldAlert
} from 'lucide-react'
import { Bar, Doughnut } from 'react-chartjs-2'
import { Link } from 'react-router-dom'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { useToast } from '../contexts/ToastContext'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'
import { 
  getAllComplaints, 
  db, 
  getCommentsForComplaint, 
  addComment, 
  forwardComplaintToDepartment,
  saveChatMessage,
} from '../services/firebase'
import { doc, updateDoc } from 'firebase/firestore'
import { generateChatResponse } from '../services/ai'
import { exportComplaintPdf } from '../lib/exportPdf'
import { exportComplaintsExcel } from '../lib/exportExcel'
import { openComplaintEmailClient } from '../lib/emailReport'
import { COMPLAINT_CATEGORIES, type Complaint, type Comment } from '../types'

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend)

export function MPDashboard() {
  const { showToast } = useToast()
  const { theme } = useTheme()
  const { currentUser } = useAuth()
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'analytics' | 'database'>('analytics')
  
  // Database view states
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [priorityFilter, setPriorityFilter] = useState('All')
  const [districtFilter, setDistrictFilter] = useState('All')
  const [currentPage, setCurrentPage] = useState(1)
  
  // Selected complaint details modal state
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null)
  
  // Extra SaaS states
  const [comments, setComments] = useState<Comment[]>([])
  const [commentInput, setCommentInput] = useState('')
  const [selectedDept, setSelectedDept] = useState('PWD / Road Works')

  // Load comments when complaint is selected
  useEffect(() => {
    console.log('[auth] Dashboard mounted', { dashboard: 'mp' })
    if (selectedComplaint) {
      getCommentsForComplaint(selectedComplaint.id).then(setComments)
    } else {
      setComments([])
    }
  }, [selectedComplaint])

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!commentInput.trim() || !selectedComplaint || !currentUser) return
    try {
      const newComment = await addComment(
        selectedComplaint.id,
        currentUser.uid,
        currentUser.displayName || 'MP Authority',
        currentUser.role,
        commentInput
      )
      setComments((prev) => [...prev, newComment])
      setCommentInput('')
      showToast('Response posted successfully!', 'success')
    } catch {
      showToast('Failed to post comment', 'error')
    }
  }

  const handleForwardDept = async () => {
    if (!selectedComplaint || !currentUser) return
    try {
      await forwardComplaintToDepartment(selectedComplaint.id, selectedDept, currentUser)
      setSelectedComplaint(prev => prev ? { ...prev, forwardedDepartment: selectedDept, status: 'In Progress' } : null)
      showToast(`Complaint forwarded to ${selectedDept}`, 'success')
      loadComplaints()
    } catch {
      showToast('Forwarding failed', 'error')
    }
  }

  // Export handlers
  const handlePdfExport = () => {
    if (!selectedComplaint) return
    try {
      exportComplaintPdf(selectedComplaint)
      showToast('Complaint exported as PDF successfully!', 'success')
    } catch {
      showToast('Failed to export PDF', 'error')
    }
  }

  // AI assistant chat drawer state
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false)
  const [aiChatInput, setAiChatInput] = useState('')
  const [aiChatLoading, setAiChatLoading] = useState(false)
  const [aiChatLog, setAiChatLog] = useState<Array<{ sender: 'user' | 'ai'; text: string }>>([
    { sender: 'ai', text: 'Hello Admin. I have grouped 18 sanitation issues and prioritized Ward 12 based on the active telemetry. How can I help you analyze the feedback today?' }
  ])

  const loadComplaints = useCallback(async () => {
    try {
      const data = await getAllComplaints()
      setComplaints(data)
    } catch {
      showToast('Failed to load complaints', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    loadComplaints()
  }, [loadComplaints])

  const handleResolve = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      setComplaints((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: 'Resolved' as const } : c))
      )
      
      const complaintToUpdate = complaints.find((c) => c.id === id)
      if (complaintToUpdate) {
        if (!id.startsWith('CIT-')) {
          await updateDoc(doc(db, 'complaints', id), { status: 'Resolved' })
        }
      }
      showToast(`Complaint #${id} marked as Resolved.`, 'success')
      if (selectedComplaint && selectedComplaint.id === id) {
        setSelectedComplaint((prev) => prev ? { ...prev, status: 'Resolved' } : null)
      }
    } catch {
      showToast('Failed to update status', 'error')
    }
  }

  // Filter complaints for the Database Tab
  const filteredComplaints = useMemo(() => {
    return complaints.filter((c) => {
      const matchesSearch =
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.id.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesCategory =
        categoryFilter === 'All' || c.category === categoryFilter
      
      const matchesPriority =
        priorityFilter === 'All' || (c.aiAnalysis?.priority ?? 'Medium') === priorityFilter

      const matchesDistrict =
        districtFilter === 'All' || c.location.toLowerCase().includes(districtFilter.toLowerCase())

      return matchesSearch && matchesCategory && matchesPriority && matchesDistrict
    })
  }, [complaints, searchQuery, categoryFilter, priorityFilter, districtFilter])

  // Pagination constants
  const itemsPerPage = 5
  const totalPages = Math.ceil(filteredComplaints.length / itemsPerPage) || 1
  
  const paginatedComplaints = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredComplaints.slice(start, start + itemsPerPage)
  }, [filteredComplaints, currentPage])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, categoryFilter, priorityFilter, districtFilter])

  // Calculate statistics
  const stats = useMemo(() => {
    const total = complaints.length
    const pending = complaints.filter((c) => c.status === 'Pending').length
    const high = complaints.filter((c) => c.aiAnalysis?.priority === 'High').length
    const resolved = complaints.filter((c) => c.status === 'Resolved').length
    
    const cats = ['Road', 'Water', 'Electricity', 'Sanitation', 'Healthcare']
    const catCounts = cats.map(
      (cat) => complaints.filter((c) => c.category.toLowerCase().includes(cat.toLowerCase())).length
    )
    
    const totalWithPriority = complaints.filter((c) => c.aiAnalysis?.priority).length || 1
    const highPct = Math.round((complaints.filter((c) => c.aiAnalysis?.priority === 'High').length / totalWithPriority) * 100) || 22
    const medPct = Math.round((complaints.filter((c) => c.aiAnalysis?.priority === 'Medium').length / totalWithPriority) * 100) || 45
    const lowPct = 100 - highPct - medPct || 33

    return {
      total: total + 1477,
      pending: pending + 84,
      highPriority: high + 42,
      resolvedToday: resolved + 86,
      sentiment: 74,
      categoryCounts: catCounts,
      highPct,
      medPct,
      lowPct
    }
  }, [complaints])

  // Export CSV handler
  const handleExportCSV = () => {
    const headers = 'Citizen ID,Title,Category,Ward/Location,AI Priority,Status,Date Filed\n'
    const rows = complaints
      .map(
        (c) =>
          `"${c.id}","${c.title.replace(/"/g, '""')}","${c.category}","${c.location}","${
            c.aiAnalysis?.priority ?? 'Medium'
          }","${c.status}","${c.createdAt.toLocaleDateString()}"`
      )
      .join('\n')
    
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `janvoice_complaints_${new Date().toISOString().slice(0,10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showToast('Exported complaint logs as CSV', 'success')
  }

  // AI chat input submit
  const handleAiChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!aiChatInput.trim() || aiChatLoading) return
    const userMsg = aiChatInput
    setAiChatLog((prev) => [...prev, { sender: 'user', text: userMsg }])
    setAiChatInput('')
    setAiChatLoading(true)
    
    try {
      const messages = [
        { sender: 'ai' as const, text: 'You are a helpful civic governance assistant for an MP constituency dashboard. Provide concise, actionable insights based on the query.' },
        { sender: 'user' as const, text: userMsg },
      ]
      
      const reply = await generateChatResponse(messages)
      
      setAiChatLog((prev) => [...prev, { sender: 'ai', text: reply }])
      
      if (currentUser) {
        try {
          await saveChatMessage('ai-assistant', currentUser.uid, currentUser.displayName || 'MP', currentUser.role, userMsg)
          await saveChatMessage('ai-assistant', currentUser.uid, 'JanVoice AI', 'ai', reply)
        } catch {
          // Firestore save is non-critical
        }
      }
    } catch {
      setAiChatLog((prev) => [
        ...prev,
        { sender: 'ai', text: 'AI service is temporarily unavailable. Please try again.' },
      ])
    } finally {
      setAiChatLoading(false)
    }
  }

  // Dynamic Chart Styling
  const gridColor = theme === 'light' ? '#e2e8f0' : '#1e293b'
  const textColor = theme === 'light' ? '#475569' : '#94a3b8'

  const barChartData = {
    labels: ['Water', 'Roads', 'Power', 'Waste', 'Health'],
    datasets: [
      {
        label: 'Active Complaints',
        data: stats.categoryCounts.map(count => count + 20),
        backgroundColor: theme === 'light' ? '#0f172a' : '#22d3ee',
        borderRadius: 6,
      },
    ],
  }

  const barChartOptions = {
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: textColor, font: { weight: 'bold' as const, size: 11 } },
      },
      y: {
        grid: { color: gridColor },
        ticks: { color: textColor },
      },
    },
  }

  const doughnutData = {
    labels: ['High', 'Med', 'Low'],
    datasets: [
      {
        data: [stats.highPct, stats.medPct, stats.lowPct],
        backgroundColor: ['#b91c1c', '#059669', '#0f172a'],
        borderWidth: 0,
        hoverOffset: 4,
      },
    ],
  }

  const doughnutOptions = {
    maintainAspectRatio: false,
    cutout: '72%',
    plugins: {
      legend: { display: false },
    },
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-950 dark:text-slate-100 flex transition-colors duration-200">
      
      {/* Sidebar Navigation */}
      <aside className="w-72 hidden lg:flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 transition-colors">
        <div className="flex items-center gap-2 mb-8">
          <span className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            JanVoice <span className="text-red-600 dark:text-red-500">AI</span>
          </span>
        </div>

        <nav className="flex-1 space-y-1.5">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`w-full flex items-center gap-3.5 rounded-xl px-4 py-3.5 text-sm font-bold transition-all ${
              activeTab === 'analytics'
                ? 'bg-slate-100 dark:bg-slate-900 text-[#002b55] dark:text-cyan-400'
                : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900/40 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <LayoutDashboard size={20} />
            MP Dashboard
          </button>
          
          <Link
            to="/citizen-dashboard"
            className="w-full flex items-center gap-3.5 rounded-xl px-4 py-3.5 text-sm font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900/40 hover:text-slate-800 dark:hover:text-white transition-all"
          >
            <Landmark size={20} />
            Citizen Portal
          </Link>
          
          <button
            onClick={() => setActiveTab('database')}
            className={`w-full flex items-center gap-3.5 rounded-xl px-4 py-3.5 text-sm font-bold transition-all ${
              activeTab === 'database'
                ? 'bg-slate-100 dark:bg-slate-900 text-[#002b55] dark:text-cyan-400'
                : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900/40 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <BarChart3 size={20} />
            Project Tracker
          </button>

          <Link
            to="/recommendations"
            className="w-full flex items-center gap-3.5 rounded-xl px-4 py-3.5 text-sm font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900/40 hover:text-slate-800 dark:hover:text-white transition-all"
          >
            <FolderOpen size={20} />
            Resources
          </Link>
        </nav>

        {/* Profile Card Widget */}
        <div className="mt-auto border-t border-slate-150 dark:border-slate-850 pt-4 flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden flex items-center justify-center font-bold text-slate-700 dark:text-slate-350">
            {currentUser?.displayName?.slice(0,2).toUpperCase() || 'MP'}
          </div>
          <div className="text-left">
            <p className="text-xs font-black text-slate-900 dark:text-white">{currentUser?.displayName || 'Admin Profile'}</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">Constituency MP</p>
          </div>
        </div>
      </aside>

      {/* Main Dashboard Panel */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Sticky Header */}
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 dark:border-slate-800 dark:bg-slate-950/95 px-6 py-4 backdrop-blur flex flex-wrap items-center justify-between gap-4 transition-colors">
          <div className="text-left">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-cyan-600 dark:text-cyan-400">
              Constituency: Central District
            </span>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
              {activeTab === 'analytics' ? 'Constituency Analytics Dashboard' : 'MP Dashboard'}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Tab Toggle Switcher */}
            <div className="bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg flex mr-2">
              <button
                onClick={() => setActiveTab('analytics')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                  activeTab === 'analytics'
                    ? 'bg-white dark:bg-slate-800 text-[#002b55] dark:text-cyan-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-850 dark:hover:text-white'
                }`}
              >
                Analytics
              </button>
              <button
                onClick={() => setActiveTab('database')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                  activeTab === 'database'
                    ? 'bg-white dark:bg-slate-800 text-[#002b55] dark:text-cyan-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-850 dark:hover:text-white'
                }`}
              >
                Database Log
              </button>
            </div>

            <button className="rounded-xl p-2.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white relative" aria-label="Notifications">
              <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-red-600" />
              <Bell size={19} />
            </button>
            <button className="rounded-xl p-2.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white" aria-label="Settings">
              <Settings size={19} />
            </button>

            <button
              onClick={() => showToast('Emergency Alert sent to Disaster Response Control.', 'error')}
              className="flex items-center gap-1.5 rounded-lg bg-red-700 px-4 py-2.5 text-xs font-black text-white hover:bg-red-800 cursor-pointer shadow-sm"
            >
              <AlertTriangle size={14} />
              <span>Emergency Alert</span>
            </button>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 p-6 md:p-8 space-y-8 overflow-y-auto">
          
          {/* TAB 1: ANALYTICS OVERVIEW */}
          {activeTab === 'analytics' && (
            <div className="space-y-8">
              
              {/* Top Stats Cards */}
              <div className="grid gap-6 sm:grid-cols-3">
                {/* Total Complaints */}
                <Card className="p-6 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/70 text-left shadow-sm flex justify-between items-start">
                  <div>
                    <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                      Total Complaints
                    </h3>
                    <p className="mt-3 text-4xl font-black text-slate-950 dark:text-white">
                      {stats.total.toLocaleString()}
                    </p>
                    <p className="mt-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      +12.5% from last month
                    </p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-350 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                    <FileText size={20} />
                  </div>
                </Card>

                {/* Pending AI Reviews */}
                <Card className="p-6 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/70 text-left shadow-sm flex justify-between items-start">
                  <div>
                    <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                      Pending AI Reviews
                    </h3>
                    <p className="mt-3 text-4xl font-black text-slate-950 dark:text-white">
                      {stats.pending}
                    </p>
                    <p className="mt-2 text-xs text-slate-550 dark:text-slate-400">
                      Processing active telemetry data...
                    </p>
                  </div>
                  <div className="bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 p-2.5 rounded-xl border border-cyan-100/50 dark:border-cyan-900/30">
                    <Sparkles size={20} />
                  </div>
                </Card>

                {/* Top Urgency Ward */}
                <Card className="p-6 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/70 text-left shadow-sm flex justify-between items-start">
                  <div>
                    <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                      Top Urgency Ward
                    </h3>
                    <p className="mt-3 text-xl font-black text-slate-950 dark:text-white leading-tight">
                      Ward 12: Heritage East
                    </p>
                    <div className="mt-3.5">
                      <span className="rounded bg-red-100 px-2 py-0.5 text-[10px] font-extrabold text-red-750 dark:bg-red-950/40 dark:text-red-400 uppercase">
                        High Priority
                      </span>
                    </div>
                  </div>
                  <div className="bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 p-2.5 rounded-xl border border-red-100/50 dark:border-red-900/30">
                    <MapPin size={20} />
                  </div>
                </Card>
              </div>

              {/* Charts row */}
              <div className="grid gap-6 md:grid-cols-12">
                {/* Complaints by Category Chart */}
                <Card className="p-6 md:col-span-7 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/70 shadow-sm text-left flex flex-col justify-between">
                  <div className="flex justify-between items-center mb-5">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Complaints by Category
                    </h3>
                    <button 
                      onClick={() => setActiveTab('database')} 
                      className="text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:underline cursor-pointer"
                    >
                      View Report
                    </button>
                  </div>
                  <div className="h-64 relative">
                    <Bar data={barChartData} options={barChartOptions} />
                  </div>
                </Card>

                {/* Priority Distribution Chart */}
                <Card className="p-6 md:col-span-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/70 shadow-sm text-left flex flex-col items-center justify-between">
                  <div className="w-full text-left mb-2">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Priority Distribution
                    </h3>
                  </div>
                  <div className="relative h-48 w-48 flex items-center justify-center">
                    <Doughnut data={doughnutData} options={doughnutOptions} />
                    {/* Centered Score */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-black text-slate-950 dark:text-white">82%</span>
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Avg Score</span>
                    </div>
                  </div>
                  
                  {/* Legend Grid */}
                  <div className="w-full grid grid-cols-3 gap-2 text-center text-xs font-bold pt-4 border-t border-slate-100 dark:border-slate-850">
                    <div>
                      <span className="inline-block h-2 w-2 rounded-full bg-red-600 mr-1.5" />
                      <span className="text-slate-505 dark:text-slate-400">High ({stats.highPct}%)</span>
                    </div>
                    <div>
                      <span className="inline-block h-2 w-2 rounded-full bg-emerald-600 mr-1.5" />
                      <span className="text-slate-505 dark:text-slate-400">Med ({stats.medPct}%)</span>
                    </div>
                    <div>
                      <span className="inline-block h-2 w-2 rounded-full bg-slate-900 dark:bg-cyan-500 mr-1.5" />
                      <span className="text-slate-505 dark:text-slate-400">Low ({stats.lowPct}%)</span>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Bottom priority list & Heatmap row */}
              <div className="grid gap-6 md:grid-cols-12">
                {/* Wards priorities Table */}
                <Card className="p-6 md:col-span-8 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/70 shadow-sm text-left flex flex-col justify-between">
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        Top AI Priorities
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Automated urgency ranking based on real-time population density & infrastructure gap analysis
                      </p>
                    </div>
                    <Button 
                      onClick={() => showToast('AI scoring metrics refreshed.', 'success')}
                      className="bg-cyan-600 hover:bg-cyan-700 text-slate-950 text-xs font-bold py-1.5"
                    >
                      <RefreshCw size={13} className="mr-1.5" />
                      Refresh AI Score
                    </Button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-bold tracking-wider text-slate-500">
                        <tr>
                          <th className="pb-3 pr-4">Ward Name</th>
                          <th className="pb-3 pr-4">Pop. Density</th>
                          <th className="pb-3 pr-4">Infrastructure Gap</th>
                          <th className="pb-3 text-right">AI Priority Score</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-850 text-xs font-semibold">
                        <tr>
                          <td className="py-4 font-bold text-slate-900 dark:text-white">Ward 12: Heritage East</td>
                          <td className="py-4 text-slate-500 dark:text-slate-400">12,400 / km²</td>
                          <td className="py-4 w-44">
                            <div className="flex items-center gap-2">
                              <span className="w-12 text-[10px] text-red-600 dark:text-red-400 font-black">Severe</span>
                              <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-red-600 rounded-full" style={{ width: '85%' }} />
                              </div>
                            </div>
                          </td>
                          <td className="py-4 text-right">
                            <span className="rounded bg-red-50 px-2 py-1 font-bold text-red-600 dark:bg-red-950/30 dark:text-red-400">98.2</span>
                          </td>
                        </tr>
                        <tr>
                          <td className="py-4 font-bold text-slate-900 dark:text-white">Ward 05: Central Hub</td>
                          <td className="py-4 text-slate-500 dark:text-slate-400">24,150 / km²</td>
                          <td className="py-4 w-44">
                            <div className="flex items-center gap-2">
                              <span className="w-12 text-[10px] text-emerald-600 dark:text-emerald-400 font-black">Moderate</span>
                              <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-600 rounded-full" style={{ width: '55%' }} />
                              </div>
                            </div>
                          </td>
                          <td className="py-4 text-right">
                            <span className="rounded bg-emerald-50 px-2 py-1 font-bold text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400">74.5</span>
                          </td>
                        </tr>
                        <tr>
                          <td className="py-4 font-bold text-slate-900 dark:text-white">Ward 21: Skyline North</td>
                          <td className="py-4 text-slate-500 dark:text-slate-400">8,900 / km²</td>
                          <td className="py-4 w-44">
                            <div className="flex items-center gap-2">
                              <span className="w-12 text-[10px] text-slate-500 dark:text-slate-400 font-black">Low</span>
                              <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-slate-500 rounded-full" style={{ width: '32%' }} />
                              </div>
                            </div>
                          </td>
                          <td className="py-4 text-right">
                            <span className="rounded bg-slate-100 px-2 py-1 font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">42.1</span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </Card>

                {/* Spatial Heatmap Visualizer */}
                <Card className="p-6 md:col-span-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/70 shadow-sm text-left flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <MapPin size={18} className="text-red-650" />
                      Spatial Heatmap
                    </h3>
                    <p className="text-xs text-slate-505 dark:text-slate-400 mt-0.5 mb-4">
                      Infrastructure stress visualization
                    </p>
                  </div>

                  <div className="relative h-48 w-full rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden flex items-center justify-center">
                    <svg className="absolute inset-0 h-full w-full opacity-30 dark:opacity-20 text-slate-400 dark:text-slate-700" viewBox="0 0 100 100" preserveAspectRatio="none">
                      <path d="M10,10 L30,20 L50,15 L70,30 L90,10" stroke="currentColor" strokeWidth="0.5" fill="none" />
                      <path d="M5,40 L25,50 L45,40 L65,55 L85,35" stroke="currentColor" strokeWidth="0.5" fill="none" />
                      <path d="M20,80 L40,75 L60,85 L80,70 L95,90" stroke="currentColor" strokeWidth="0.5" fill="none" />
                      <line x1="25" y1="0" x2="25" y2="100" stroke="currentColor" strokeWidth="0.2" />
                      <line x1="50" y1="0" x2="50" y2="100" stroke="currentColor" strokeWidth="0.2" />
                      <line x1="75" y1="0" x2="75" y2="100" stroke="currentColor" strokeWidth="0.2" />
                    </svg>
                    
                    <div className="absolute top-[35%] left-[25%] h-10 w-10 rounded-full bg-red-500/30 blur-md animate-ping" />
                    <div className="absolute top-[35%] left-[25%] h-5 w-5 rounded-full bg-red-600 border-2 border-white dark:border-slate-950 shadow-lg cursor-pointer" />
                    
                    <div className="absolute top-[60%] left-[65%] h-7 w-7 rounded-full bg-yellow-500/25 blur-sm" />
                    <div className="absolute top-[60%] left-[65%] h-3.5 w-3.5 rounded-full bg-yellow-500 border-2 border-white dark:border-slate-950 shadow-md" />
                    
                    <div className="absolute top-[15%] left-[75%] h-8 w-8 rounded-full bg-green-500/20 blur-sm" />
                    <div className="absolute top-[15%] left-[75%] h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-950 shadow-md" />
                    
                    <div className="absolute bottom-2.5 left-2.5 right-2.5 rounded-lg bg-white/95 dark:bg-slate-950/95 p-2 shadow border border-slate-100 dark:border-slate-800 flex justify-between items-center text-[10px]">
                      <div>
                        <p className="font-extrabold text-slate-900 dark:text-white">Ward 12 Heat Center</p>
                      </div>
                      <span className="font-black text-red-600 dark:text-red-400">+14% Growth</span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* TAB 2: DETAILED DATABASE LOG */}
          {activeTab === 'database' && (
            <div className="space-y-6">
              
              {/* Top Stats Row */}
              <div className="grid gap-6 sm:grid-cols-4">
                <Card className="p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/70 text-left shadow-sm">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Total Complaints</p>
                  <p className="mt-2 text-3xl font-black text-slate-950 dark:text-white">1,284</p>
                  <p className="mt-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">+12% from last week</p>
                </Card>
                <Card className="p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/70 text-left shadow-sm">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">AI High Priority</p>
                  <p className="mt-2 text-3xl font-black text-red-650 dark:text-red-500">{stats.highPriority}</p>
                  <p className="mt-1.5 text-xs text-slate-505 dark:text-slate-400">Requiring immediate action</p>
                </Card>
                <Card className="p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/70 text-left shadow-sm">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Resolved Today</p>
                  <p className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{stats.resolvedToday}</p>
                  <p className="mt-1.5 text-xs text-slate-505 dark:text-slate-400">On track for KPI</p>
                </Card>
                <Card className="p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/70 text-left shadow-sm">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Citizen Sentiment</p>
                  <p className="mt-2 text-3xl font-black text-[#0b335c] dark:text-cyan-400">{stats.sentiment}%</p>
                  <p className="mt-1.5 text-xs text-slate-550 dark:text-slate-400">Positive growth this month</p>
                </Card>
              </div>

              {/* Filters & Export Header */}
              <Card className="p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/70 shadow-sm text-left space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <h3 className="text-base font-bold text-[#002b55] dark:text-white">Filter & Search Logs</h3>
                  <div className="flex gap-2">
                    <button 
                      onClick={handleExportCSV}
                      className="inline-flex items-center justify-center rounded-lg bg-[#002b55] text-white dark:bg-cyan-500 dark:text-slate-950 px-4 py-2 text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer"
                    >
                      <Download size={14} className="mr-1.5" />
                      Export CSV
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-5 items-end">
                  {/* Search */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-450 uppercase">Search</label>
                    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900">
                      <Search size={14} className="text-slate-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search ID, title..."
                        className="bg-transparent border-none outline-none text-xs w-full placeholder-slate-450 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* District filter */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-450 uppercase">District</label>
                    <select
                      value={districtFilter}
                      onChange={(e) => setDistrictFilter(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-950 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                    >
                      <option value="All">All Districts</option>
                      <option value="Ward 12">Ward 12</option>
                      <option value="Ward 04">Ward 04</option>
                      <option value="Ward 10">Ward 10</option>
                      <option value="Ward 01">Ward 01</option>
                      <option value="Ward 08">Ward 08</option>
                    </select>
                  </div>

                  {/* Category filter */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-450 uppercase">Category</label>
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-950 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                    >
                      <option value="All">All Categories</option>
                      {COMPLAINT_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Priority Filter */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-450 uppercase">AI Priority</label>
                    <select
                      value={priorityFilter}
                      onChange={(e) => setPriorityFilter(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-950 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                    >
                      <option value="All">Any Priority</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>

                  {/* Apply/Reset Button */}
                  <Button
                    onClick={() => {
                      setSearchQuery('')
                      setCategoryFilter('All')
                      setPriorityFilter('All')
                      setDistrictFilter('All')
                      showToast('Filters cleared', 'info')
                    }}
                    variant="outline"
                    className="h-10 border-slate-200 text-slate-700 dark:border-slate-800 dark:text-slate-350 cursor-pointer"
                  >
                    Clear Filters
                  </Button>
                </div>
              </Card>

              {/* Database Table Log */}
              <Card className="border border-slate-250/65 dark:border-slate-800 bg-white dark:bg-slate-950/70 shadow-sm text-left overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[800px] text-left text-sm">
                    <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-[10px] uppercase font-bold tracking-wider text-slate-550">
                      <tr>
                        <th className="px-6 py-4">Citizen ID</th>
                        <th className="px-6 py-4">Date Filed</th>
                        <th className="px-6 py-4">Category</th>
                        <th className="px-6 py-4">Ward</th>
                        <th className="px-6 py-4">AI Priority</th>
                        <th className="px-6 py-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-850 text-xs font-semibold">
                      {paginatedComplaints.map((c) => (
                        <tr 
                          key={c.id} 
                          onClick={() => setSelectedComplaint(c)}
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 cursor-pointer transition-colors"
                        >
                          <td className="px-6 py-4 font-bold text-[#002b55] dark:text-cyan-400">
                            #{c.id}
                          </td>
                          <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                            {c.createdAt.toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </td>
                          <td className="px-6 py-4">
                            <span className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                              <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
                              {c.category}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-800 dark:text-slate-200">{c.location}</td>
                          <td className="px-6 py-4">
                            <Badge
                              label={c.aiAnalysis?.priority ?? 'Medium'}
                              variant="priority"
                              value={c.aiAnalysis?.priority ?? 'Medium'}
                            />
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2.5">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedComplaint(c)
                                }}
                                className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-850 font-bold transition-all text-[11px] cursor-pointer"
                              >
                                View Detail
                              </button>
                              {c.status !== 'Resolved' ? (
                                <button 
                                  onClick={(e) => handleResolve(c.id, e)}
                                  className="px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all text-[11px] cursor-pointer"
                                >
                                  Mark Resolved
                                </button>
                              ) : (
                                <span className="inline-flex items-center text-xs font-bold text-emerald-600 dark:text-emerald-400 gap-1 px-2.5">
                                  ✓ Resolved
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}

                      {paginatedComplaints.length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center py-10 text-slate-500">
                            No complaints match the filter selection.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Table Footer / Pagination */}
                <div className="border-t border-slate-200 dark:border-slate-800 px-6 py-4 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between text-xs text-slate-505 dark:text-slate-450 font-bold">
                  <span>
                    Showing {(currentPage - 1) * itemsPerPage + 1}-
                    {Math.min(currentPage * itemsPerPage, filteredComplaints.length)} of {filteredComplaints.length} results
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                      disabled={currentPage === 1}
                      className="p-1.5 rounded-md border border-slate-200 dark:border-slate-800 disabled:opacity-40 cursor-pointer"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    {Array.from({ length: totalPages }).map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentPage(idx + 1)}
                        className={`h-7 w-7 rounded-md font-bold text-xs cursor-pointer ${
                          currentPage === idx + 1
                            ? 'bg-[#002b55] text-white dark:bg-cyan-500 dark:text-slate-950'
                            : 'border border-slate-200 hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-850'
                        }`}
                      >
                        {idx + 1}
                      </button>
                    ))}
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="p-1.5 rounded-md border border-slate-200 dark:border-slate-800 disabled:opacity-40 cursor-pointer"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </main>
      </div>

      {/* FLOATING ACTION BUTTON: ASK AI ASSISTANT */}
      <button
        onClick={() => setAiAssistantOpen(true)}
        className="fixed bottom-6 right-6 z-40 bg-[#002b55] hover:bg-[#003c77] text-white dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-600 shadow-2xl p-4 rounded-full flex items-center gap-2 cursor-pointer group transition-all"
      >
        <Bot size={20} className="group-hover:rotate-12 transition-transform" />
        <span className="text-xs font-black uppercase tracking-wider pr-1">Ask AI Analysis</span>
      </button>

      {/* AI ASSISTANT DRAWER SIDE PANEL */}
      {aiAssistantOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex justify-end">
          {/* Backdrop Click Dismiss */}
          <div className="flex-1" onClick={() => setAiAssistantOpen(false)} />
          
          <div className="w-[450px] max-w-full bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-slate-850 h-full shadow-2xl flex flex-col justify-between text-left">
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-850 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="text-cyan-500" />
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white">AI Analysis Assistant</h3>
                  <p className="text-[10px] text-slate-500">9Router AI powered insights</p>
                </div>
              </div>
              <button onClick={() => setAiAssistantOpen(false)} className="p-1.5 rounded-lg text-slate-450 hover:bg-slate-100 dark:hover:bg-slate-900">
                <X size={18} />
              </button>
            </div>

            {/* Drawer Messages list */}
            <div className="flex-1 p-5 overflow-y-auto space-y-4">
              {aiChatLog.map((chat, idx) => (
                <div key={idx} className={`flex ${chat.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`rounded-xl p-3.5 max-w-[85%] text-xs leading-relaxed ${
                    chat.sender === 'user'
                      ? 'bg-[#002b55] text-white dark:bg-cyan-500 dark:text-slate-950 font-semibold'
                      : 'bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-350 border border-slate-100 dark:border-slate-800'
                  }`}>
                    {chat.text}
                  </div>
                </div>
              ))}
            </div>

            {/* Drawer Chat Input */}
            <form onSubmit={handleAiChatSubmit} className="p-4 border-t border-slate-200 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-900/30 flex gap-2">
              <input
                type="text"
                value={aiChatInput}
                onChange={(e) => setAiChatInput(e.target.value)}
                placeholder="Ask about high-priority wards, category distribution..."
                className="flex-1 bg-white border border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-white rounded-xl px-4 py-2.5 text-xs outline-none focus:border-cyan-500"
              />
              <button type="submit" className="bg-[#002b55] dark:bg-cyan-500 text-white dark:text-slate-950 px-4 rounded-xl text-xs font-bold hover:opacity-95">
                Send
              </button>
            </form>
          </div>
        </div>
      )}

      {/* COMPLAINT DETAIL DIALOG MODAL */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col text-left">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-855 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-cyan-600 dark:text-cyan-450 tracking-wider">
                  Complaint details
                </span>
                <h3 className="text-lg font-black text-slate-905 dark:text-white mt-1">
                  #{selectedComplaint.id}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedComplaint(null)} 
                className="p-1.5 rounded-lg text-slate-450 hover:bg-slate-100 dark:hover:bg-slate-900"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body: Split Layout */}
            <div className="p-6 overflow-y-auto">
              <div className="grid gap-6 md:grid-cols-12">
                
                {/* Left Column: Complaint Details (Col Span 7) */}
                <div className="md:col-span-7 space-y-6">
                  {/* Basic Fields */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <h4 className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Subject Title</h4>
                      <p className="text-xs font-semibold text-slate-900 dark:text-white mt-0.5">{selectedComplaint.title}</p>
                    </div>
                    <div>
                      <h4 className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Category</h4>
                      <p className="text-xs font-semibold text-slate-900 dark:text-white mt-0.5">{selectedComplaint.category}</p>
                    </div>
                    <div>
                      <h4 className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Location / Ward</h4>
                      <p className="text-xs font-semibold text-slate-900 dark:text-white mt-0.5">{selectedComplaint.location}</p>
                    </div>
                    <div>
                      <h4 className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Status</h4>
                      <div className="mt-1">
                        <Badge label={selectedComplaint.status} variant="status" value={selectedComplaint.status} />
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <h4 className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Citizen Description</h4>
                    <p className="text-xs text-slate-700 dark:text-slate-350 mt-1.5 leading-relaxed bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-850">
                      {selectedComplaint.description}
                    </p>
                  </div>

                  {/* AI Analysis Section */}
                  {selectedComplaint.aiAnalysis && (
                    <div className="border-t border-slate-150 dark:border-slate-850 pt-5 space-y-4">
                      <h4 className="text-xs font-black text-cyan-600 dark:text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Bot size={16} />
                        AI Analysis
                      </h4>

                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-xl bg-slate-50 p-3 border border-slate-100 dark:bg-slate-900 dark:border-slate-850">
                          <p className="text-[9px] font-bold text-slate-455 uppercase">Priority</p>
                          <div className="mt-1">
                            <Badge 
                              label={selectedComplaint.aiAnalysis.priority} 
                              variant="priority" 
                              value={selectedComplaint.aiAnalysis.priority} 
                            />
                          </div>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-3 border border-slate-100 dark:bg-slate-900 dark:border-slate-850">
                          <p className="text-[9px] font-bold text-slate-455 uppercase">Sentiment</p>
                          <p className="text-xs font-bold text-slate-950 dark:text-white mt-1 uppercase tracking-wide">
                            {selectedComplaint.aiAnalysis.sentiment}
                          </p>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-3 border border-slate-100 dark:bg-slate-900 dark:border-slate-850">
                          <p className="text-[9px] font-bold text-slate-455 uppercase">Language</p>
                          <p className="text-xs font-bold text-slate-950 dark:text-white mt-1">
                            {selectedComplaint.aiAnalysis.language}
                          </p>
                        </div>
                      </div>

                      <div>
                        <h5 className="text-[10px] uppercase font-bold tracking-wider text-slate-400">AI Summary</h5>
                        <p className="text-xs text-slate-700 dark:text-slate-350 mt-1 leading-relaxed">
                          {selectedComplaint.aiAnalysis.summary}
                        </p>
                      </div>

                      <div className="p-3.5 rounded-xl bg-cyan-500/5 dark:bg-cyan-500/10 border border-cyan-500/15">
                        <h5 className="text-[10px] uppercase font-extrabold tracking-widest text-[#002b55] dark:text-cyan-400 flex items-center gap-1">
                          <ShieldAlert size={12} />
                          AI Recommended Action
                        </h5>
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-300 mt-1 leading-relaxed">
                          {selectedComplaint.aiAnalysis.recommendedAction}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Media preview */}
                  {selectedComplaint.imageUrl && (
                    <div className="border-t border-slate-150 dark:border-slate-850 pt-5">
                      <h4 className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Attachments</h4>
                      <div className="mt-2 aspect-video max-h-40 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-850 shadow-sm">
                        <img src={selectedComplaint.imageUrl} alt="Attached Evidence" className="h-full w-full object-cover" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column: Department Forwarding & Chat Panel (Col Span 5) */}
                <div className="md:col-span-5 space-y-6 border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-850 pt-6 md:pt-0 md:pl-6 flex flex-col justify-between">
                  
                  {/* Part 1: Department Forwarding */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Department Assignment
                    </h4>
                    
                    {selectedComplaint.forwardedDepartment ? (
                      <div className="rounded-xl bg-cyan-500/5 p-4 border border-cyan-500/15 dark:bg-cyan-950/20 dark:border-cyan-900/30">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-405">Assigned Department</p>
                        <p className="text-sm font-black text-[#002b55] dark:text-cyan-400 mt-0.5">
                          {selectedComplaint.forwardedDepartment}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-1">Grievance is currently active in department queue.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <select
                          value={selectedDept}
                          onChange={(e) => setSelectedDept(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-950 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                        >
                          <option value="PWD / Road Engineering">PWD / Road Engineering</option>
                          <option value="Water & Sewage Board">Water & Sewage Board</option>
                          <option value="Electricity Distribution Corp">Electricity Distribution Corp</option>
                          <option value="Sanitation & Public Hygiene">Sanitation & Public Hygiene</option>
                          <option value="Primary Healthcare Board">Primary Healthcare Board</option>
                        </select>
                        <button
                          onClick={handleForwardDept}
                          className="w-full rounded-xl bg-[#002b55] text-white dark:bg-cyan-500 dark:text-slate-950 hover:opacity-90 py-2.5 text-xs font-bold transition-all cursor-pointer"
                        >
                          Forward to Department
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Part 2: Citizen Chat panel */}
                  <div className="flex-1 flex flex-col justify-between border-t border-slate-100 dark:border-slate-850 pt-5 mt-5">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3">
                      Citizen Communication Chat
                    </h4>

                    {/* Chat Messages */}
                    <div className="h-48 overflow-y-auto border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 rounded-xl p-3.5 space-y-3 mb-3 text-xs">
                      {comments.length === 0 ? (
                        <p className="text-slate-400 italic text-center py-10">No messages exchanged yet. Post a comment to message the citizen.</p>
                      ) : (
                        comments.map((comment) => (
                          <div key={comment.id} className={`flex flex-col ${comment.userRole === 'mp' ? 'items-end' : 'items-start'}`}>
                            <span className="text-[9px] font-bold text-slate-450 mb-0.5">
                              {comment.userName} ({comment.userRole === 'mp' ? 'Authority' : 'Citizen'})
                            </span>
                            <div className={`rounded-xl px-3 py-2 max-w-[85%] leading-relaxed ${
                              comment.userRole === 'mp'
                                ? 'bg-[#002b55] text-white dark:bg-cyan-500 dark:text-slate-950 font-semibold'
                                : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-350 border border-slate-200 dark:border-slate-850'
                            }`}>
                              {comment.text}
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Chat Input */}
                    <form onSubmit={handleAddComment} className="flex gap-2">
                      <input
                        type="text"
                        value={commentInput}
                        onChange={(e) => setCommentInput(e.target.value)}
                        placeholder="Type response to citizen..."
                        className="flex-1 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs bg-transparent dark:text-white focus:border-cyan-500 focus:outline-none"
                      />
                      <button
                        type="submit"
                        className="rounded-xl bg-[#002b55] dark:bg-cyan-500 text-white dark:text-slate-950 px-4 text-xs font-bold hover:opacity-90 cursor-pointer"
                      >
                        Send
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-200 dark:border-slate-855 bg-slate-50/50 dark:bg-slate-900/30 flex justify-between gap-4">
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setSelectedComplaint(null)} className="border-slate-200 text-slate-700 dark:border-slate-800 dark:text-slate-350 cursor-pointer">
                  Close
                </Button>
                <button
                  onClick={handlePdfExport}
                  className="rounded-xl border border-slate-200 dark:border-slate-805 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 px-4 py-2.5 text-xs font-bold cursor-pointer"
                >
                  Export Summary Report
                </button>
              </div>

              {selectedComplaint.status !== 'Resolved' && (
                <button
                  onClick={(e) => handleResolve(selectedComplaint.id, e)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl cursor-pointer"
                >
                  ✓ Mark Resolved
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}