export type UserRole = 'citizen' | 'officer' | 'departmentAdmin' | 'superAdmin' | 'mp' | 'municipality' | 'administrator'

export type ComplaintCategory =
  | 'Road'
  | 'Water'
  | 'Healthcare'
  | 'Education'
  | 'Electricity'
  | 'Sanitation'
  | 'Transport'
  | 'Others'

export type Priority = 'High' | 'Medium' | 'Low'
export type Sentiment = 'Positive' | 'Neutral' | 'Negative'
export type ComplaintStatus = 'Submitted' | 'Pending' | 'Under Review' | 'AI Verification' | 'Admin Review' | 'Accepted' | 'Assigned' | 'Assigned to Department' | 'Sent to Authority' | 'Officer Accepted' | 'Work Started' | 'In Progress' | 'Work Completed' | 'Citizen Verification' | 'Resolved' | 'Closed' | 'Archived' | 'Reopened' | 'Rejected'

export interface User {
  uid: string
  email: string
  displayName: string
  role: UserRole
  createdAt: Date
  emailVerified?: boolean
  phoneNumber?: string
  ward?: string
  departmentId?: string
}

export interface AIAnalysis {
  language: string
  summary: string
  category: ComplaintCategory
  priority: Priority
  sentiment: Sentiment
  recommendedAction: string
  departmentRecommendation?: string
  isSpam?: boolean
  isDuplicate?: boolean
  duplicateOf?: string
  isEmergency?: boolean
  estimatedResolutionDays?: number
}

export interface GeoLocation {
  type: 'Point'
  coordinates: [number, number] // [longitude, latitude]
  address?: string
}

export interface StatusUpdate {
  status: ComplaintStatus
  timestamp: Date
  notes?: string
  updatedBy?: string
  updatedByName?: string
}

export interface Attachment {
  type: 'image' | 'video' | 'document'
  url: string
  name: string
  size?: number
  uploadedAt?: Date
}

export interface OfficerNote {
  officerName: string
  officerId?: string
  text: string
  timestamp: Date
}

export interface Complaint {
  _id?: string
  id: string
  userId: string
  userName: string
  userEmail?: string
  userPhone?: string
  title: string
  description: string
  location: string
  address: {
    street?: string
    city?: string
    district: string
    state: string
    country: string
    zipCode?: string
  }
  gpsCoordinates?: GeoLocation
  category: ComplaintCategory
  priority?: Priority
  status: ComplaintStatus
  imageUrl?: string
  imageUrls?: string[]
  videoUrls?: string[]
  documentUrls?: string[]
  attachments?: Attachment[]
  audioUrl?: string
  aiAnalysis?: AIAnalysis
  createdAt: Date
  updatedAt: Date
  upvotes?: number
  upvotedUsers?: string[]
  forwardedDepartment?: string
  assignedDepartment?: string
  assignedOfficer?: string
  assignedOfficerName?: string
  rejectedReason?: string
  closedAt?: Date
  statusHistory: StatusUpdate[]
  officerNotes?: string
  officerNotesList?: OfficerNote[]
  resolutionNotes?: string
  resolvedAt?: Date
  citizenFeedback?: string
  rating?: number
  archivedAt?: Date
  ward?: string
}

export interface Comment {
  id: string
  complaintId: string
  userId: string
  userName: string
  userRole: UserRole
  text: string
  createdAt: Date
}

export interface Petition {
  id: string
  title: string
  description: string
  category: ComplaintCategory
  signaturesCount: number
  targetSignatures: number
  creatorName: string
  createdAt: Date
  signedUsers: string[]
}

export interface AuditLog {
  id: string
  action: string
  userId: string
  userName: string
  userRole: string
  complaintId?: string
  details?: string
  timestamp: Date
}

export interface Department {
  id: string
  name: string
  head: string
  headId?: string
  contactEmail: string
  contactPhone?: string
  description?: string
  createdAt: Date
  officers?: string[]
  ward?: string
}

export interface NotificationItem {
  id: string
  userId: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  complaintId?: string
  read: boolean
  createdAt: Date
}

export interface AnalyticsSnapshot {
  totalComplaints: number
  resolvedComplaints: number
  pendingComplaints: number
  activeComplaints: number
  highPriorityComplaints: number
  resolutionRate: number
  averageResponseTime: number
  averageResolutionTime: number
  weeklyReports: Array<{ label: string; value: number }>
  monthlyReports: Array<{ label: string; value: number }>
  categoryDistribution: Array<{ category: ComplaintCategory; count: number }>
  departmentPerformance: Array<{ department: string; count: number }>
  officerPerformance: Array<{ officer: string; count: number }>
  complaintsByWard: Array<{ ward: string; count: number }>
  complaintsByMonth: Array<{ month: string; count: number }>
}

export interface Recommendation {
  id: string
  title: string
  description: string
  priority: Priority
  category: ComplaintCategory
  affectedCount: number
  createdAt: Date
}

export interface ReportFilter {
  dateFrom: string
  dateTo: string
  department?: string
  officer?: string
  status?: string
  category?: ComplaintCategory
}

export const COMPLAINT_CATEGORIES: ComplaintCategory[] = [
  'Road',
  'Water',
  'Healthcare',
  'Education',
  'Electricity',
  'Sanitation',
  'Transport',
  'Others',
]

export const COMPLAINT_STATUSES: ComplaintStatus[] = [
  'Pending',
  'Under Review',
  'Assigned',
  'In Progress',
  'Resolved',
  'Closed',
  'Rejected',
]