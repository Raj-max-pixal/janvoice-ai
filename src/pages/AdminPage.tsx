import { useCallback, useEffect, useMemo, useState } from 'react'
import { Building2, ShieldCheck, FileText, Activity, PlusCircle } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { useToast } from '../contexts/ToastContext'
import {
  createDepartment,
  getActivityLogs,
  getAllComplaints,
  getAnalytics,
  getDepartments,
  updateComplaintStatus,
} from '../services/firebase'
import type { AnalyticsSnapshot, Complaint, ComplaintStatus, Department, AuditLog } from '../types'

export function AdminPage() {
  const { showToast } = useToast()
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [analytics, setAnalytics] = useState<AnalyticsSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [departmentName, setDepartmentName] = useState('')
  const [departmentHead, setDepartmentHead] = useState('')
  const [contactEmail, setContactEmail] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [complaintData, departmentData, logData, analyticsData] = await Promise.all([
        getAllComplaints(),
        getDepartments(),
        getActivityLogs(),
        getAnalytics(),
      ])
      setComplaints(complaintData)
      setDepartments(departmentData)
      setLogs(logData)
      setAnalytics(analyticsData)
    } catch {
      showToast('Failed to load admin data', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    loadData()
  }, [loadData])

  const filteredComplaints = useMemo(() => {
    const term = searchTerm.toLowerCase()
    return complaints.filter((complaint) => {
      return [complaint.title, complaint.description, complaint.location, complaint.id].some((value) =>
        value.toLowerCase().includes(term),
      )
    })
  }, [complaints, searchTerm])

  const handleCreateDepartment = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!departmentName || !departmentHead || !contactEmail) {
      showToast('Please fill out the department form', 'error')
      return
    }
    try {
      await createDepartment(departmentName, departmentHead, contactEmail)
      setDepartmentName('')
      setDepartmentHead('')
      setContactEmail('')
      await loadData()
      showToast('Department created', 'success')
    } catch {
      showToast('Failed to create department', 'error')
    }
  }

  const handleStatusChange = async (complaintId: string, status: ComplaintStatus) => {
    try {
      await updateComplaintStatus(complaintId, status)
      setComplaints((prev) => prev.map((complaint) => complaint.id === complaintId ? { ...complaint, status } : complaint))
      showToast('Complaint workflow updated', 'success')
    } catch {
      showToast('Failed to update complaint workflow', 'error')
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-cyan-600">
          <ShieldCheck size={16} /> Admin console
        </div>
        <h1 className="text-3xl font-black text-slate-950 dark:text-white">Operations Control Center</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">Moderate complaints, manage departments, review analytics, and track audit activity in one place.</p>
      </div>

      <div className="mb-8 grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="text-sm text-slate-500">Total complaints</div>
          <div className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{analytics?.totalComplaints ?? complaints.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-slate-500">Resolution rate</div>
          <div className="mt-2 text-2xl font-black text-emerald-600">{analytics?.resolutionRate ?? 0}%</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-slate-500">Active departments</div>
          <div className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{departments.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-slate-500">Recent activity</div>
          <div className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{logs.length}</div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <Card className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <FileText size={18} className="text-cyan-600" />
            <h2 className="text-lg font-bold text-slate-950 dark:text-white">Complaint moderation</h2>
          </div>
          <div className="mb-4">
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by title, ID, or location"
              className="bg-slate-50 dark:bg-slate-900"
            />
          </div>
          <div className="space-y-3">
            {filteredComplaints.slice(0, 6).map((complaint) => (
              <div key={complaint.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">{complaint.title}</div>
                    <div className="mt-1 text-xs text-slate-500">{complaint.location} • {complaint.id}</div>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600 dark:bg-slate-900 dark:text-slate-400">{complaint.status}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleStatusChange(complaint.id, 'Accepted')}>Accept</Button>
                  <Button size="sm" variant="outline" onClick={() => handleStatusChange(complaint.id, 'In Progress')}>Progress</Button>
                  <Button size="sm" variant="outline" onClick={() => handleStatusChange(complaint.id, 'Resolved')}>Resolve</Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <Building2 size={18} className="text-cyan-600" />
              <h2 className="text-lg font-bold text-slate-950 dark:text-white">Department management</h2>
            </div>
            <form onSubmit={handleCreateDepartment} className="space-y-3">
              <Input label="Department name" value={departmentName} onChange={(event) => setDepartmentName(event.target.value)} />
              <Input label="Department head" value={departmentHead} onChange={(event) => setDepartmentHead(event.target.value)} />
              <Input label="Contact email" type="email" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} />
              <Button type="submit" className="flex items-center gap-2">
                <PlusCircle size={16} /> Create department
              </Button>
            </form>
            <div className="mt-4 space-y-2">
              {departments.map((department) => (
                <div key={department.id} className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800">
                  <div className="font-semibold text-slate-900 dark:text-white">{department.name}</div>
                  <div className="mt-1 text-slate-500">Head: {department.head}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <Activity size={18} className="text-cyan-600" />
              <h2 className="text-lg font-bold text-slate-950 dark:text-white">Audit activity</h2>
            </div>
            <div className="space-y-2">
              {logs.slice(0, 6).map((log) => (
                <div key={log.id} className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800">
                  <div className="font-semibold text-slate-900 dark:text-white">{log.action}</div>
                  <div className="mt-1 text-slate-500">{log.userName} • {log.userRole}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
