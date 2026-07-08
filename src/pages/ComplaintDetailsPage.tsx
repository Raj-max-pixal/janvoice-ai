import { useCallback, useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, MapPin, Calendar, User, AlertTriangle, FileText, Paperclip, Camera, Video, Download, MessageSquare, Send, MapPinned, Clock, Building2, ShieldCheck, ExternalLink } from 'lucide-react'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { StatusTimeline } from '../components/StatusTimeline'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorBoundary } from '../components/ui/ErrorBoundary'
import { useToast } from '../contexts/ToastContext'
import { getAllComplaints, getCommentsForComplaint, addComment } from '../services/firebase'
import { useAuth } from '../contexts/AuthContext'
import { exportComplaintPdf } from '../lib/exportPdf'
import { exportComplaintsExcel } from '../lib/exportExcel'
import type { Complaint, Comment, GeoLocation } from '../types'

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    Submitted: 'text-blue-600 bg-blue-100 dark:bg-blue-900/40 dark:text-blue-300',
    'AI Verification': 'text-purple-600 bg-purple-100 dark:bg-purple-900/40 dark:text-purple-300',
    'Admin Review': 'text-amber-600 bg-amber-100 dark:bg-amber-900/40 dark:text-amber-300',
    'Assigned to Department': 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/40 dark:text-indigo-300',
    'Sent to Authority': 'text-cyan-600 bg-cyan-100 dark:bg-cyan-900/40 dark:text-cyan-300',
    'Officer Accepted': 'text-teal-600 bg-teal-100 dark:bg-teal-900/40 dark:text-teal-300',
    'Work Started': 'text-sky-600 bg-sky-100 dark:bg-sky-900/40 dark:text-sky-300',
    'Work Completed': 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-300',
    'Citizen Verification': 'text-lime-600 bg-lime-100 dark:bg-lime-900/40 dark:text-lime-300',
    Resolved: 'text-green-600 bg-green-100 dark:bg-green-900/40 dark:text-green-300',
    Archived: 'text-slate-600 bg-slate-100 dark:bg-slate-900/40 dark:text-slate-300',
    Reopened: 'text-rose-600 bg-rose-100 dark:bg-rose-900/40 dark:text-rose-300',
  }
  return colors[status] || 'text-slate-600 bg-slate-100 dark:bg-slate-900/40 dark:text-slate-300'
}

function formatDate(date: Date | string | undefined): string {
  if (!date) return 'N/A'
  const d = date instanceof Date ? date : new Date(date)
  return d.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getGpsLat(gps?: GeoLocation): number | null {
  if (!gps?.coordinates || gps.coordinates.length < 2) return null
  return gps.coordinates[1] // [lng, lat]
}

function getGpsLng(gps?: GeoLocation): number | null {
  if (!gps?.coordinates || gps.coordinates.length < 2) return null
  return gps.coordinates[0] // [lng, lat]
}

export function ComplaintDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const { showToast } = useToast()
  const { currentUser } = useAuth()
  const [complaint, setComplaint] = useState<Complaint | null>(null)
  const [loading, setLoading] = useState(true)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentText, setCommentText] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [activeLightboxImage, setActiveLightboxImage] = useState<string | null>(null)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [exportingExcel, setExportingExcel] = useState(false)

  // Collect all image attachments
  const allImages = (complaint?.attachments?.filter(a => a.type === 'image') || []).map(a => a.url)
  // Also check imageUrls fallback
  const allImageUrls = complaint?.imageUrls?.length ? complaint.imageUrls : allImages

  const currentLightboxIndex = activeLightboxImage ? allImageUrls.indexOf(activeLightboxImage) : -1

  const loadComplaint = useCallback(async () => {
    if (!id) return
    try {
      const allComplaints = await getAllComplaints()
      const found = allComplaints.find((c) => c.id === id)
      setComplaint(found ?? null)
      if (found) {
        const cmts = await getCommentsForComplaint(found.id)
        setComments(cmts)
      }
    } catch {
      showToast('Failed to load complaint details', 'error')
    } finally {
      setLoading(false)
    }
  }, [id, showToast])

  useEffect(() => {
    loadComplaint()
  }, [loadComplaint])

  const handleAddComment = async () => {
    if (!commentText.trim() || !complaint || !currentUser) return
    setSubmittingComment(true)
    try {
      const newComment = await addComment(
        complaint.id,
        currentUser.uid,
        currentUser.displayName || 'Anonymous',
        currentUser.role || 'citizen',
        commentText.trim(),
      )
      setComments((prev) => [...prev, newComment])
      setCommentText('')
      showToast('Comment added', 'success')
    } catch {
      showToast('Failed to add comment', 'error')
    } finally {
      setSubmittingComment(false)
    }
  }

  const handleExportPdf = async () => {
    if (!complaint) return
    setExportingPdf(true)
    try {
      await exportComplaintPdf(complaint)
      showToast('PDF exported successfully', 'success')
    } catch {
      showToast('Failed to export PDF', 'error')
    } finally {
      setExportingPdf(false)
    }
  }

  const handleExportExcel = async () => {
    if (!complaint) return
    setExportingExcel(true)
    try {
      exportComplaintsExcel([complaint], `complaint-${complaint.id}.csv`)
      showToast('Excel exported successfully', 'success')
    } catch {
      showToast('Failed to export Excel', 'error')
    } finally {
      setExportingExcel(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleAddComment()
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="animate-pulse space-y-6" role="status" aria-label="Loading complaint details">
          <div className="h-8 w-64 rounded-lg bg-slate-200 dark:bg-slate-700" />
          <div className="h-4 w-96 rounded-lg bg-slate-200 dark:bg-slate-700" />
          <div className="h-64 w-full rounded-xl bg-slate-200 dark:bg-slate-700" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-12 rounded-lg bg-slate-200 dark:bg-slate-700" />
            <div className="h-12 rounded-lg bg-slate-200 dark:bg-slate-700" />
          </div>
        </div>
      </div>
    )
  }

  if (!complaint) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <EmptyState
          icon={<AlertTriangle className="h-12 w-12 text-slate-400" />}
          title="Complaint Not Found"
          description="The complaint you're looking for doesn't exist or has been removed."
          action={
            <Link to="/">
              <Button variant="primary">
                <ArrowLeft size={16} className="mr-2" />
                Go Home
              </Button>
            </Link>
          }
        />
      </div>
    )
  }

  const gpsLat = getGpsLat(complaint.gpsCoordinates)
  const gpsLng = getGpsLng(complaint.gpsCoordinates)

  return (
    <ErrorBoundary>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Navigation */}
        <nav aria-label="Breadcrumb" className="mb-6">
          <Link
            to={complaint.userId ? '/citizen-dashboard' : '/mp-dashboard'}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Back to Dashboard
          </Link>
        </nav>

        {/* Header Section */}
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  <ShieldCheck size={12} aria-hidden="true" />
                  ID: {complaint.id?.slice(0, 8)}...
                </span>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold ${getStatusColor(complaint.status)}`}>
                  {complaint.status}
                </span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white break-words">
                {complaint.title}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                {complaint.description}
              </p>
            </div>
          </div>

          {/* Meta Info Grid */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <User size={16} className="shrink-0 text-slate-400" aria-hidden="true" />
              <span className="truncate" title={complaint.userName}>{complaint.userName || 'Anonymous'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <MapPin size={16} className="shrink-0 text-slate-400" aria-hidden="true" />
              <span className="truncate">{complaint.location || 'Not specified'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <Calendar size={16} className="shrink-0 text-slate-400" aria-hidden="true" />
              <span>{formatDate(complaint.createdAt)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <Building2 size={16} className="shrink-0 text-slate-400" aria-hidden="true" />
              <Badge label={complaint.category} variant="category" />
            </div>
          </div>

          {/* GPS Coordinates */}
          {gpsLat !== null && gpsLng !== null && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-800/50">
              <MapPinned size={16} className="shrink-0 text-emerald-500" aria-hidden="true" />
              <span className="text-slate-700 dark:text-slate-300">
                GPS: {gpsLat.toFixed(6)}, {gpsLng.toFixed(6)}
              </span>
              <a
                href={`https://www.google.com/maps?q=${gpsLat},${gpsLng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300"
                aria-label="Open GPS coordinates in Google Maps (opens in new tab)"
              >
                Open in Maps
                <ExternalLink size={12} aria-hidden="true" />
              </a>
            </div>
          )}

          {/* Export Buttons */}
          <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPdf}
              disabled={exportingPdf}
              aria-label="Export complaint as PDF document"
            >
              <Download size={14} className="mr-1.5" aria-hidden="true" />
              {exportingPdf ? 'Exporting PDF...' : 'Export PDF'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              disabled={exportingExcel}
              aria-label="Export complaint as Excel spreadsheet"
            >
              <Download size={14} className="mr-1.5" aria-hidden="true" />
              {exportingExcel ? 'Exporting Excel...' : 'Export Excel'}
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Attachments Gallery */}
            {complaint.attachments && complaint.attachments.length > 0 && (
              <Card className="p-6">
                <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                  <Paperclip size={18} aria-hidden="true" />
                  Attachments ({complaint.attachments.length})
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {complaint.attachments.map((att, idx) => (
                    <div key={idx} className="group relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                      {att.type === 'image' && (
                        <button
                          onClick={() => setActiveLightboxImage(att.url)}
                          className="block w-full"
                          aria-label={`View image: ${att.name}`}
                        >
                          <img
                            src={att.url}
                            alt={att.name || `Attachment ${idx + 1}`}
                            className="h-40 w-full object-cover transition-transform group-hover:scale-105"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
                            <Camera size={24} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
                          </div>
                        </button>
                      )}
                      {att.type === 'video' && (
                        <div className="relative">
                          <video
                            src={att.url}
                            className="h-40 w-full object-cover"
                            controls
                            aria-label={`Video: ${att.name}`}
                          >
                            Your browser does not support the video tag.
                          </video>
                          <div className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-0.5 text-[10px] text-white">
                            <Video size={12} className="inline mr-1" aria-hidden="true" />
                            Video
                          </div>
                        </div>
                      )}
                      {att.type === 'document' && (
                        <a
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex h-40 flex-col items-center justify-center gap-2 bg-slate-50 text-center transition-colors hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700"
                          aria-label={`Open document: ${att.name}`}
                        >
                          <FileText size={32} className="text-slate-400" aria-hidden="true" />
                          <span className="px-2 text-xs font-medium text-slate-600 dark:text-slate-400 line-clamp-2">
                            {att.name}
                          </span>
                        </a>
                      )}
                      <span className="absolute right-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                        {att.type === 'image' ? 'Photo' : att.type === 'video' ? 'Video' : 'Document'}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Status Timeline */}
            <Card className="p-6">
              <StatusTimeline
                statusHistory={complaint.statusHistory || []}
                currentStatus={complaint.status}
              />
            </Card>

            {/* AI Analysis */}
            {complaint.aiAnalysis && (
              <Card className="p-6 border-l-4 border-l-cyan-500">
                <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                  <AlertTriangle size={18} className="text-cyan-500" aria-hidden="true" />
                  AI Analysis
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Summary
                    </label>
                    <p className="mt-1 text-sm text-slate-900 dark:text-white leading-relaxed">
                      {complaint.aiAnalysis.summary}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge label={complaint.aiAnalysis.priority} variant="priority" value={complaint.aiAnalysis.priority} />
                    <Badge label={complaint.aiAnalysis.sentiment} variant="category" />
                    <Badge label={complaint.aiAnalysis.language} variant="category" />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Recommended Action
                    </label>
                    <p className="mt-1 text-sm text-slate-900 dark:text-white leading-relaxed">
                      {complaint.aiAnalysis.recommendedAction}
                    </p>
                  </div>
                  {complaint.aiAnalysis.departmentRecommendation && (
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Recommended Department
                      </label>
                      <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-cyan-600 dark:text-cyan-400">
                        <Building2 size={14} aria-hidden="true" />
                        {complaint.aiAnalysis.departmentRecommendation}
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Officer Notes (string fallback) */}
            {complaint.officerNotes && (
              <Card className="p-6">
                <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                  <ShieldCheck size={18} className="text-indigo-500" aria-hidden="true" />
                  Officer Notes
                </h2>
                <div className="space-y-3">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                    <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{complaint.officerNotes}</p>
                  </div>
                </div>
              </Card>
            )}

            {/* Officer Notes List (array) */}
            {complaint.officerNotesList && complaint.officerNotesList.length > 0 && (
              <Card className="p-6">
                <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                  <ShieldCheck size={18} className="text-indigo-500" aria-hidden="true" />
                  Officer Notes
                </h2>
                <div className="space-y-3">
                  {complaint.officerNotesList.map((note, idx) => (
                    <div key={idx} className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {note.officerName || 'Officer'}
                        </span>
                        <span className="text-[10px] text-slate-500">{formatDate(note.timestamp)}</span>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">{note.text}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Resolution Notes */}
            {complaint.resolutionNotes && (
              <Card className="p-6 border-l-4 border-l-emerald-500">
                <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                  <ShieldCheck size={18} className="text-emerald-500" aria-hidden="true" />
                  Resolution Notes
                </h2>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {complaint.resolutionNotes}
                </p>
                {complaint.resolvedAt && (
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                    <Clock size={12} aria-hidden="true" />
                    Resolved on {formatDate(complaint.resolvedAt)}
                  </p>
                )}
              </Card>
            )}

            {/* Comments Section */}
            <Card className="p-6">
              <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                <MessageSquare size={18} aria-hidden="true" />
                Comments ({comments.length})
              </h2>

              {comments.length === 0 ? (
                <EmptyState
                  icon={<MessageSquare className="h-8 w-8 text-slate-300" />}
                  title="No comments yet"
                  description="Be the first to comment on this complaint."
                />
              ) : (
                <div className="space-y-3 mb-6 max-h-80 overflow-y-auto" role="log" aria-label="Comments">
                  {comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {comment.userName}
                        </span>
                        <span className="text-[10px] text-slate-500">{formatDate(comment.createdAt)}</span>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">{comment.text}</p>
                    </div>
                  ))}
                </div>
              )}

              {currentUser ? (
                <div className="flex gap-2">
                  <Input
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Write a comment..."
                    aria-label="Add a comment"
                    className="flex-1"
                  />
                  <Button
                    onClick={handleAddComment}
                    disabled={!commentText.trim() || submittingComment}
                    aria-label="Submit comment"
                  >
                    <Send size={16} className={commentText.trim() ? 'mr-1.5' : ''} aria-hidden="true" />
                    {submittingComment ? 'Sending...' : commentText.trim() ? 'Send' : ''}
                  </Button>
                </div>
              ) : (
                <p className="text-center text-sm text-slate-500">
                  <Link to="/login" className="font-semibold text-cyan-600 hover:text-cyan-700 dark:text-cyan-400">
                    Sign in
                  </Link>{' '}
                  to leave a comment
                </p>
              )}
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Details */}
            <Card className="p-5">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                Details
              </h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-[10px] font-semibold uppercase text-slate-400">Complaint ID</dt>
                  <dd className="mt-0.5 font-mono text-xs text-slate-700 dark:text-slate-300">{complaint.id}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold uppercase text-slate-400">Category</dt>
                  <dd className="mt-0.5"><Badge label={complaint.category} variant="category" /></dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold uppercase text-slate-400">Submitted</dt>
                  <dd className="mt-0.5 text-xs text-slate-700 dark:text-slate-300">{formatDate(complaint.createdAt)}</dd>
                </div>
                {complaint.forwardedDepartment && (
                  <div>
                    <dt className="text-[10px] font-semibold uppercase text-slate-400">Forwarded To</dt>
                    <dd className="mt-0.5 text-xs font-semibold text-slate-700 dark:text-slate-300">{complaint.forwardedDepartment}</dd>
                  </div>
                )}
                {complaint.assignedOfficer && (
                  <div>
                    <dt className="text-[10px] font-semibold uppercase text-slate-400">Assigned Officer</dt>
                    <dd className="mt-0.5 text-xs text-slate-700 dark:text-slate-300">{complaint.assignedOfficer}</dd>
                  </div>
                )}
              </dl>
            </Card>

            {/* Status Timeline Summary */}
            <Card className="p-5">
              <StatusTimeline
                statusHistory={complaint.statusHistory || []}
                currentStatus={complaint.status}
              />
            </Card>
          </div>
        </div>

        {/* Lightbox for images - inline implementation */}
        {activeLightboxImage && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
            role="dialog"
            aria-label="Image lightbox"
            onClick={() => setActiveLightboxImage(null)}
          >
            <button
              onClick={() => setActiveLightboxImage(null)}
              className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
              aria-label="Close lightbox"
            >
              ✕
            </button>

            {currentLightboxIndex > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setActiveLightboxImage(allImageUrls[currentLightboxIndex - 1])
                }}
                className="absolute left-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
                aria-label="Previous image"
              >
                ‹
              </button>
            )}

            <img
              src={activeLightboxImage}
              alt={`Image ${currentLightboxIndex + 1} of ${allImageUrls.length}`}
              className="max-h-[90vh] max-w-[90vw] object-contain"
              onClick={(e) => e.stopPropagation()}
            />

            {currentLightboxIndex < allImageUrls.length - 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setActiveLightboxImage(allImageUrls[currentLightboxIndex + 1])
                }}
                className="absolute right-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
                aria-label="Next image"
              >
                ›
              </button>
            )}

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-4 py-2 text-sm text-white">
              {currentLightboxIndex + 1} / {allImageUrls.length}
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  )
}