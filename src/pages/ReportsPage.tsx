import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  FileText,
  User,
  Filter,
  BarChart3,
  FileSpreadsheet,
  FileDown,
  FileBarChart,
  Loader2,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Clock,
} from 'lucide-react'
import { Card } from '../components/ui/Card'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { useToast } from '../contexts/ToastContext'
import { getAllComplaints, getDepartments } from '../services/firebase'
import { exportToPdf } from '../lib/exportPdf'
import { exportToExcel } from '../lib/exportExcel'
import { exportToCsv } from '../lib/exportCsv'
import { COMPLAINT_STATUSES, type Complaint, type Department, type ReportFilter } from '../types'

type ReportType = 'daily' | 'weekly' | 'monthly'
type ExportFormat = 'pdf' | 'excel' | 'csv'

interface ReportData {
  title: string
  period: string
  generatedAt: string
  totalComplaints: number
  resolvedComplaints: number
  pendingComplaints: number
  inProgressComplaints: number
  rejectedComplaints: number
  averageResolutionTime: number
  complaintsByCategory: Array<{ category: string; count: number; percentage: number }>
  complaintsByDepartment: Array<{ department: string; count: number; percentage: number }>
  departmentPerformance: Array<{ department: string; resolved: number; pending: number; total: number }>
  officerPerformance: Array<{ officer: string; resolved: number; total: number }>
  dailyTrend: Array<{ date: string; count: number }>
}

export function ReportsPage() {
  const { showToast } = useToast()
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState<ExportFormat | null>(null)
  const [reportType, setReportType] = useState<ReportType>('weekly')
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [filter, setFilter] = useState<ReportFilter>({
    dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    dateTo: new Date().toISOString().split('T')[0],
  })

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [complaintData, departmentData] = await Promise.all([
        getAllComplaints(),
        getDepartments(),
      ])
      setComplaints(complaintData)
      setDepartments(departmentData)
    } catch (error) {
      showToast('Failed to load report data', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    loadData()
  }, [loadData])

  const filteredComplaints = useMemo(() => {
    return complaints.filter((c) => {
      const date = new Date(c.createdAt)
      const from = filter.dateFrom ? new Date(filter.dateFrom) : new Date(0)
      const to = filter.dateTo ? new Date(filter.dateTo + 'T23:59:59') : new Date()
      if (date < from || date > to) return false
      if (filter.department && c.assignedDepartment !== filter.department) return false
      if (filter.status && c.status !== filter.status) return false
      if (filter.category && c.category !== filter.category) return false
      return true
    })
  }, [complaints, filter])

  const generateReport = useCallback(() => {
    const filtered = filteredComplaints
    const total = filtered.length
    const resolved = filtered.filter((c) => c.status === 'Resolved').length
    const pending = filtered.filter((c) => c.status === 'Pending' || c.status === 'Submitted').length
    const inProgress = filtered.filter((c) => c.status === 'In Progress' || c.status === 'Assigned').length
    const rejected = filtered.filter((c) => c.status === 'Rejected').length

    // Calculate average resolution time
    const resolvedWithTime = filtered.filter((c) => c.resolvedAt && c.createdAt)
    const avgResolutionTime = resolvedWithTime.length > 0
      ? resolvedWithTime.reduce((sum, c) => sum + (new Date(c.resolvedAt!).getTime() - new Date(c.createdAt).getTime()) / (1000 * 60 * 60 * 24), 0) / resolvedWithTime.length
      : 0

    // Complaints by category
    const categoryMap = new Map<string, number>()
    filtered.forEach((c) => {
      categoryMap.set(c.category, (categoryMap.get(c.category) || 0) + 1)
    })
    const complaintsByCategory = Array.from(categoryMap.entries())
      .map(([category, count]) => ({ category, count, percentage: total ? Math.round((count / total) * 100) : 0 }))
      .sort((a, b) => b.count - a.count)

    // Complaints by department
    const deptMap = new Map<string, number>()
    filtered.forEach((c) => {
      if (c.assignedDepartment) {
        deptMap.set(c.assignedDepartment, (deptMap.get(c.assignedDepartment) || 0) + 1)
      }
    })
    const complaintsByDepartment = Array.from(deptMap.entries())
      .map(([department, count]) => ({ department, count, percentage: total ? Math.round((count / total) * 100) : 0 }))
      .sort((a, b) => b.count - a.count)

    // Department performance
    const deptPerfMap = new Map<string, { resolved: number; pending: number; total: number }>()
    filtered.forEach((c) => {
      const dept = c.assignedDepartment || 'Unassigned'
      const perf = deptPerfMap.get(dept) || { resolved: 0, pending: 0, total: 0 }
      perf.total++
      if (c.status === 'Resolved') perf.resolved++
      if (c.status === 'Pending' || c.status === 'Submitted') perf.pending++
      deptPerfMap.set(dept, perf)
    })
    const departmentPerformance = Array.from(deptPerfMap.entries())
      .map(([department, perf]) => ({ department, ...perf }))
      .sort((a, b) => b.total - a.total)

    // Officer performance
    const officerMap = new Map<string, { resolved: number; total: number }>()
    filtered.forEach((c) => {
      if (c.assignedOfficerName) {
        const perf = officerMap.get(c.assignedOfficerName) || { resolved: 0, total: 0 }
        perf.total++
        if (c.status === 'Resolved') perf.resolved++
        officerMap.set(c.assignedOfficerName, perf)
      }
    })
    const officerPerformance = Array.from(officerMap.entries())
      .map(([officer, perf]) => ({ officer, ...perf }))
      .sort((a, b) => b.total - a.total)

    // Daily trend
    const dateMap = new Map<string, number>()
    filtered.forEach((c) => {
      const date = new Date(c.createdAt).toISOString().split('T')[0]
      dateMap.set(date, (dateMap.get(date) || 0) + 1)
    })
    const dailyTrend = Array.from(dateMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))

    const periodLabel = reportType === 'daily' ? 'Daily' : reportType === 'weekly' ? 'Weekly' : 'Monthly'

    setReportData({
      title: `${periodLabel} Report - ${new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}`,
      period: `${filter.dateFrom} to ${filter.dateTo}`,
      generatedAt: new Date().toLocaleString('en-IN'),
      totalComplaints: total,
      resolvedComplaints: resolved,
      pendingComplaints: pending,
      inProgressComplaints: inProgress,
      rejectedComplaints: rejected,
      averageResolutionTime: Math.round(avgResolutionTime * 10) / 10,
      complaintsByCategory,
      complaintsByDepartment,
      departmentPerformance,
      officerPerformance,
      dailyTrend,
    })
    showToast('Report generated successfully', 'success')
  }, [filteredComplaints, filter, reportType, showToast])

  const handleExport = async (format: ExportFormat) => {
    if (!reportData) {
      showToast('Please generate a report first', 'info')
      return
    }
    setExporting(format)
    try {
      if (format === 'pdf') {
        await exportToPdf(reportData)
      } else if (format === 'excel') {
        await exportToExcel(reportData)
      } else if (format === 'csv') {
        await exportToCsv(reportData)
      }
      showToast(`Report exported as ${format.toUpperCase()}`, 'success')
    } catch (error) {
      showToast(`Failed to export as ${format.toUpperCase()}`, 'error')
    } finally {
      setExporting(null)
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="mx-auto max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
          <FileBarChart className="h-4 w-4" />
          Reports
        </div>
        <h1 className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">Reports Dashboard</h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          Generate and export detailed reports on complaints, departments, and performance.
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-8">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-5 w-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Report Filters</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Date From</label>
              <input
                type="date"
                value={filter.dateFrom}
                onChange={(e) => setFilter({ ...filter, dateFrom: e.target.value })}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Date To</label>
              <input
                type="date"
                value={filter.dateTo}
                onChange={(e) => setFilter({ ...filter, dateTo: e.target.value })}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Department</label>
              <select
                value={filter.department || ''}
                onChange={(e) => setFilter({ ...filter, department: e.target.value || undefined })}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.name}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Status</label>
              <select
                value={filter.status || ''}
                onChange={(e) => setFilter({ ...filter, status: e.target.value || undefined })}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                {COMPLAINT_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Report Type:</span>
              <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                {(['daily', 'weekly', 'monthly'] as ReportType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setReportType(type)}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      reportType === type
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={generateReport}
              className="flex items-center gap-2 px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
            >
              <BarChart3 className="h-4 w-4" />
              Generate Report
            </button>
          </div>
        </div>
      </Card>

      {/* Report Results */}
      {reportData && (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            <Card>
              <div className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Complaints</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{reportData.totalComplaints}</p>
                  </div>
                  <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </div>
            </Card>
            <Card>
              <div className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Resolved</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{reportData.resolvedComplaints}</p>
                  </div>
                  <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </div>
            </Card>
            <Card>
              <div className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Pending</p>
                    <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">{reportData.pendingComplaints}</p>
                  </div>
                  <div className="h-10 w-10 rounded-lg bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                </div>
              </div>
            </Card>
            <Card>
              <div className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Avg Resolution</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{reportData.averageResolutionTime}d</p>
                  </div>
                  <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Category Distribution */}
          <div className="grid gap-6 lg:grid-cols-2 mb-8">
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Complaints by Category</h3>
                <div className="space-y-3">
                  {reportData.complaintsByCategory.map((item) => (
                    <div key={item.category}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600 dark:text-gray-400">{item.category}</span>
                        <span className="text-gray-900 dark:text-white font-medium">{item.count} ({item.percentage}%)</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* Department Performance */}
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Department Performance</h3>
                <div className="space-y-3">
                  {reportData.departmentPerformance.slice(0, 8).map((item) => (
                    <div key={item.department}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600 dark:text-gray-400">{item.department}</span>
                        <span className="text-gray-900 dark:text-white font-medium">
                          {item.resolved}/{item.total} resolved
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            item.total > 0 && item.resolved / item.total >= 0.7
                              ? 'bg-green-500'
                              : item.total > 0 && item.resolved / item.total >= 0.4
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                          }`}
                          style={{ width: `${item.total > 0 ? (item.resolved / item.total) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>

          {/* Officer Performance */}
          {reportData.officerPerformance.length > 0 && (
            <Card className="mb-8">
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <User className="h-5 w-5 text-gray-400" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Officer Performance</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-3 px-4 text-gray-600 dark:text-gray-400 font-medium">Officer</th>
                        <th className="text-center py-3 px-4 text-gray-600 dark:text-gray-400 font-medium">Total Cases</th>
                        <th className="text-center py-3 px-4 text-gray-600 dark:text-gray-400 font-medium">Resolved</th>
                        <th className="text-center py-3 px-4 text-gray-600 dark:text-gray-400 font-medium">Resolution Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.officerPerformance.map((item) => (
                        <tr key={item.officer} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900">
                          <td className="py-3 px-4 text-gray-900 dark:text-white font-medium">{item.officer}</td>
                          <td className="py-3 px-4 text-center text-gray-600 dark:text-gray-400">{item.total}</td>
                          <td className="py-3 px-4 text-center text-green-600 dark:text-green-400">{item.resolved}</td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              item.total > 0 && item.resolved / item.total >= 0.7
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                            }`}>
                              {item.total > 0 ? Math.round((item.resolved / item.total) * 100) : 0}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>
          )}

          {/* Daily Trend */}
          {reportData.dailyTrend.length > 0 && (
            <Card className="mb-8">
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="h-5 w-5 text-gray-400" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Daily Trend</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-3 px-4 text-gray-600 dark:text-gray-400 font-medium">Date</th>
                        <th className="text-center py-3 px-4 text-gray-600 dark:text-gray-400 font-medium">Complaints</th>
                        <th className="py-3 px-4"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.dailyTrend.map((item) => {
                        const maxCount = Math.max(...reportData.dailyTrend.map((d) => d.count))
                        return (
                          <tr key={item.date} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900">
                            <td className="py-2 px-4 text-gray-900 dark:text-white">{item.date}</td>
                            <td className="py-2 px-4 text-center text-gray-900 dark:text-white font-medium">{item.count}</td>
                            <td className="py-2 px-4">
                              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full"
                                  style={{ width: `${maxCount > 0 ? (item.count / maxCount) * 100 : 0}%` }}
                                />
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>
          )}

          {/* Export Buttons */}
          <div className="flex flex-wrap gap-4 items-center justify-between p-6 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Report generated: {reportData.generatedAt}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleExport('pdf')}
                disabled={exporting === 'pdf'}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                {exporting === 'pdf' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                Export PDF
              </button>
              <button
                onClick={() => handleExport('excel')}
                disabled={exporting === 'excel'}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                {exporting === 'excel' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
                Export Excel
              </button>
              <button
                onClick={() => handleExport('csv')}
                disabled={exporting === 'csv'}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                {exporting === 'csv' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                Export CSV
              </button>
            </div>
          </div>
        </>
      )}

      {!reportData && !loading && (
        <Card>
          <div className="p-12 text-center">
            <FileBarChart className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Report Generated</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Apply filters above and click "Generate Report" to create a report.
            </p>
            <button
              onClick={generateReport}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
            >
              <BarChart3 className="h-4 w-4" />
              Generate Report
            </button>
          </div>
        </Card>
      )}
    </div>
  )
}