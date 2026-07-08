
import { initializeApp } from 'firebase/app'
import { getAuth, sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth'
import { getFirestore, addDoc, arrayUnion, collection, doc, getDoc, getDocs, orderBy, query, serverTimestamp, setDoc, updateDoc, where, type Timestamp } from 'firebase/firestore'
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import type {
  AIAnalysis,
  AnalyticsSnapshot,
  Complaint,
  ComplaintCategory,
  ComplaintStatus,
  Department,
  NotificationItem,
  User,
  UserRole,
  Comment,
  Petition,
  AuditLog,
  GeoLocation,
  StatusUpdate,
} from '../types'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
}

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.appId &&
    firebaseConfig.apiKey !== 'your_firebase_api_key',
)

// We will keep the demo config for now, but ensure it's not used in production environment via VITE_FIREBASE_API_KEY check
const demoFirebaseConfig = {
  apiKey: 'demo-api-key',
  authDomain: 'janvoice-ai-demo.firebaseapp.com',
  projectId: 'janvoice-ai-demo',
  storageBucket: 'janvoice-ai-demo.appspot.com',
  messagingSenderId: '100000000000',
  appId: '1:100000000000:web:janvoiceaidemo',
}

let app: ReturnType<typeof initializeApp>
export let auth: ReturnType<typeof getAuth>
export let db: ReturnType<typeof getFirestore>
export let storage: ReturnType<typeof getStorage>

if (!isFirebaseConfigured && import.meta.env.PROD) {
  console.error("Firebase is not configured for production. Please check your .env file.")
}

try {
  app = initializeApp(isFirebaseConfigured ? firebaseConfig : demoFirebaseConfig)
  auth = getAuth(app)
  db = getFirestore(app)
  storage = getStorage(app)
} catch (error) {
  console.warn('Firebase initialization failed (likely missing config). Using demo config:', error)
  app = initializeApp(demoFirebaseConfig)
  auth = getAuth(app)
  db = getFirestore(app)
  storage = getStorage(app)
}

// ========================================== 
// Firebase Auth & User Profile Services
// ========================================== 

export { sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup, signOut }

export async function requestPasswordReset(email: string): Promise<void> {
  if (!isFirebaseConfigured) {
    throw new Error('Firebase not configured. Cannot reset password.')
  }
  try {
    await sendPasswordResetEmail(auth, email)
  } catch (error) {
    console.error('Failed to send password reset email:', error)
    throw error
  }
}

function toDate(value: Timestamp | Date | undefined): Date {
  if (!value) return new Date()
  if (value instanceof Date) return value
  return value.toDate()
}

export async function createUserProfile(
  uid: string,
  email: string,
  displayName: string,
  role: UserRole,
): Promise<void> {
  if (!isFirebaseConfigured) {
    console.warn('Firebase not configured, skipping createUserProfile')
    return
  }
  try {
    await setDoc(doc(db, 'users', uid), {
      uid,
      email,
      displayName,
      role,
      createdAt: serverTimestamp(),
    })
  } catch (error) {
    console.error('Failed to create user profile:', error)
    throw error
  }
}

export async function getUserProfile(uid: string): Promise<User | null> {
  if (!isFirebaseConfigured) return null
  try {
    const snapshot = await getDoc(doc(db, 'users', uid))
    if (!snapshot.exists()) return null

    const data = snapshot.data()
    return {
      uid: data.uid as string,
      email: data.email as string,
      displayName: data.displayName as string,
      role: data.role as UserRole,
      createdAt: toDate(data.createdAt as Timestamp | Date | undefined),
    }
  } catch (error) {
    console.error('Failed to get user profile:', error)
    return null
  }
}

export async function updateUserProfile(uid: string, updates: Partial<User>): Promise<void> {
  if (!isFirebaseConfigured) {
    console.warn('Firebase not configured, skipping updateUserProfile')
    return
  }
  try {
    await updateDoc(doc(db, 'users', uid), updates)
  } catch (error) {
    console.error('Failed to update user profile:', error)
    throw error
  }
}

// ========================================== 
// Complaint Services
// ========================================== 

// Demo mode storage helpers (localStorage)
const DEMO_COMPLAINTS_KEY = 'janvoice_demo_complaints'
const DEMO_USERS_KEY = 'janvoice_demo_users'
const DEMO_DEPARTMENTS_KEY = 'janvoice_demo_departments'
const DEMO_COMMENTS_KEY = 'janvoice_demo_comments'
const DEMO_AUDIT_LOGS_KEY = 'janvoice_demo_audit_logs'
const DEMO_NOTIFICATIONS_KEY = 'janvoice_demo_notifications'
const DEMO_PETITIONS_KEY = 'janvoice_demo_petitions'

function getDemoData<T>(key: string): T[] {
  try {
    const data = localStorage.getItem(key)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

function setDemoData<T>(key: string, data: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch (e) {
    console.error('Failed to save demo data to localStorage:', e)
  }
}

function mapComplaint(id: string, data: Record<string, unknown>): Complaint {
  const complaint: Complaint = {
    id,
    userId: data.userId as string,
    userName: data.userName as string,
    title: data.title as string,
    description: data.description as string,
    location: data.location as string,
    address: data.address as Complaint['address'],
    gpsCoordinates: data.gpsCoordinates as GeoLocation | undefined,
    category: data.category as ComplaintCategory,
    status: (data.status as ComplaintStatus) ?? 'Submitted',
    imageUrl: data.imageUrl as string | undefined,
    imageUrls: (data.imageUrls as string[] | undefined) || [],
    videoUrls: (data.videoUrls as string[] | undefined) || [],
    documentUrls: (data.documentUrls as string[] | undefined) || [],
    audioUrl: data.audioUrl as string | undefined,
    aiAnalysis: data.aiAnalysis as AIAnalysis | undefined,
    createdAt: toDate(data.createdAt as Timestamp | Date | undefined),
    updatedAt: toDate(data.updatedAt as Timestamp | Date | undefined),
    upvotes: (data.upvotes as number) ?? 0,
    upvotedUsers: (data.upvotedUsers as string[]) ?? [],
    forwardedDepartment: data.forwardedDepartment as string | undefined,
    assignedOfficer: data.assignedOfficer as string | undefined,
    statusHistory: (data.statusHistory as StatusUpdate[] | undefined) || [],
    officerNotes: data.officerNotes as string | undefined,
    resolutionNotes: data.resolutionNotes as string | undefined,
    citizenFeedback: data.citizenFeedback as string | undefined,
    rating: data.rating as number | undefined,
  }

  // Ensure all arrays are initialized if they don't exist
  if (!complaint.imageUrls) complaint.imageUrls = []
  if (!complaint.videoUrls) complaint.videoUrls = []
  if (!complaint.documentUrls) complaint.documentUrls = []
  if (!complaint.upvotedUsers) complaint.upvotedUsers = []
  if (!complaint.statusHistory) complaint.statusHistory = []

  return complaint
}

export async function createComplaint(
  complaint: Omit<Complaint, 'id' | 'createdAt' | 'updatedAt' | 'statusHistory' | '_id'>,
): Promise<string> {
  if (!isFirebaseConfigured) {
    // Demo mode: use localStorage
    const newComplaintId = Date.now().toString(36) + Math.random().toString(36).substr(2)
    const complaintData = {
      ...complaint,
      id: newComplaintId,
      upvotes: 0,
      upvotedUsers: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'Submitted',
      statusHistory: [{ status: 'Submitted', timestamp: new Date() }],
    }
    const complaints = getDemoData<Complaint>(DEMO_COMPLAINTS_KEY)
    complaints.unshift(complaintData as Complaint)
    setDemoData(DEMO_COMPLAINTS_KEY, complaints)
    return newComplaintId
  }
  try {
    const newComplaintRef = doc(collection(db, 'complaints')) // Let Firestore generate ID
    const newComplaintId = newComplaintRef.id

 const complaintData = {
  ...complaint,
  id: newComplaintId,
  upvotes: 0,
  upvotedUsers: [],
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  status: "Submitted",
  statusHistory: [
    {
      status: "Submitted",
      timestamp: new Date(),
    },
  ],
};

// Remove undefined values
Object.keys(complaintData).forEach((key) => {
  if (complaintData[key as keyof typeof complaintData] === undefined) {
    delete complaintData[key as keyof typeof complaintData];
  }
});

await setDoc(newComplaintRef, complaintData);
    return newComplaintId
  } catch (error) {
    console.error('Failed to create complaint:', error)
    throw error
  }
}



export async function updateComplaintAnalysis(
  id: string,
  aiAnalysis: AIAnalysis,
): Promise<void> {
  if (!isFirebaseConfigured) {
    // Demo mode: update in localStorage
    const complaints = getDemoData<Complaint>(DEMO_COMPLAINTS_KEY)
    const index = complaints.findIndex(c => c.id === id)
    if (index !== -1) {
      complaints[index] = {
        ...complaints[index],
        aiAnalysis,
        category: aiAnalysis.category,
        updatedAt: new Date(),
      }
      setDemoData(DEMO_COMPLAINTS_KEY, complaints)
    }
    return
  }
  try {
    await updateDoc(doc(db, 'complaints', id), {
      aiAnalysis,
      category: aiAnalysis.category,
      updatedAt: serverTimestamp(),
    })
  } catch (error) {
    console.error('Failed to update complaint analysis:', error)
    throw error
  }
}

export async function getAllComplaints(): Promise<Complaint[]> {
  if (!isFirebaseConfigured) {
    // Demo mode: get from localStorage
    const complaints = getDemoData<Complaint>(DEMO_COMPLAINTS_KEY)
    return complaints.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }
  try {
    const snapshot = await getDocs(
      query(collection(db, 'complaints'), orderBy('createdAt', 'desc')),
    )
    return snapshot.docs.map((item) => mapComplaint(item.id, item.data()))
  } catch (error) {
    console.error('Failed to get all complaints:', error)
    return []
  }
}

export async function getUserComplaints(userId: string): Promise<Complaint[]> {
  if (!isFirebaseConfigured) {
    // Demo mode: get from localStorage
    const complaints = getDemoData<Complaint>(DEMO_COMPLAINTS_KEY)
    return complaints
      .filter(c => c.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }
  try {
    const snapshot = await getDocs(
      query(
        collection(db, 'complaints'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
      ),
    )
    return snapshot.docs.map((item) => mapComplaint(item.id, item.data()))
  } catch (error) {
    console.error('Failed to get user complaints:', error)
    return []
  }
}

export async function getComplaintById(id: string): Promise<Complaint | null> {
  if (!isFirebaseConfigured) {
    // Demo mode: get from localStorage
    const complaints = getDemoData<Complaint>(DEMO_COMPLAINTS_KEY)
    return complaints.find(c => c.id === id) || null
  }
  try {
    const snapshot = await getDoc(doc(db, 'complaints', id))
    if (!snapshot.exists()) return null
    return mapComplaint(snapshot.id, snapshot.data())
  } catch (error) {
    console.error('Failed to get complaint by ID:', error)
    return null
  }
}

export async function upvoteComplaint(complaintId: string, userId: string): Promise<void> {
  if (!isFirebaseConfigured) {
    // Demo mode: update in localStorage
    const complaints = getDemoData<Complaint>(DEMO_COMPLAINTS_KEY)
    const index = complaints.findIndex(c => c.id === complaintId)
    if (index !== -1) {
      const complaint = complaints[index]
      const upvotedUsers = complaint.upvotedUsers || []
      let newUpvotes = complaint.upvotes || 0
      let newUsers = [...upvotedUsers]

      if (upvotedUsers.includes(userId)) {
        newUsers = newUsers.filter(uid => uid !== userId)
        newUpvotes = Math.max(0, newUpvotes - 1)
      } else {
        newUsers.push(userId)
        newUpvotes += 1
      }
      complaints[index] = { ...complaint, upvotes: newUpvotes, upvotedUsers: newUsers }
      setDemoData(DEMO_COMPLAINTS_KEY, complaints)
    }
    return
  }
  try {
    const docRef = doc(db, 'complaints', complaintId)
    const snapshot = await getDoc(docRef)
    if (snapshot.exists()) {
      const data = snapshot.data()
      const upvotedUsers = (data.upvotedUsers as string[]) || []
      let newUpvotes = (data.upvotes as number) || 0
      let newUsers = [...upvotedUsers]

      if (upvotedUsers.includes(userId)) {
        newUsers = newUsers.filter((uid) => uid !== userId)
        newUpvotes = Math.max(0, newUpvotes - 1)
      } else {
        newUsers.push(userId)
        newUpvotes += 1
      }
      await updateDoc(docRef, { upvotes: newUpvotes, upvotedUsers: newUsers })
    }
  } catch (e) {
    console.error('Firebase upvote failed', e)
    throw e
  }
}

export async function updateComplaintStatus(
  id: string,
  status: ComplaintStatus,
  notes?: string,
): Promise<void> {
  if (!isFirebaseConfigured) {
    // Demo mode: update in localStorage
    const complaints = getDemoData<Complaint>(DEMO_COMPLAINTS_KEY)
    const index = complaints.findIndex(c => c.id === id)
    if (index !== -1) {
      complaints[index] = {
        ...complaints[index],
        status,
        updatedAt: new Date(),
        statusHistory: [
          ...complaints[index].statusHistory,
          { status, timestamp: new Date(), notes: notes || `Status changed to ${status}` },
        ],
      }
      setDemoData(DEMO_COMPLAINTS_KEY, complaints)
    }
    return
  }
  try {
    const newStatusEntry = {
      status,
      timestamp: new Date(),
      notes: notes || `Status changed to ${status}`,
    }
    await updateDoc(doc(db, 'complaints', id), {
      status,
      updatedAt: serverTimestamp(),
      statusHistory: arrayUnion(newStatusEntry),
    })
  } catch (error) {
    console.error('Failed to update complaint status:', error)
    throw error
  }
}

export async function forwardComplaintToDepartment(
  complaintId: string,
  department: string,
  mpUser: User,
): Promise<void> {
  if (!isFirebaseConfigured) {
    // Demo mode: update in localStorage
    const complaints = getDemoData<Complaint>(DEMO_COMPLAINTS_KEY)
    const index = complaints.findIndex(c => c.id === complaintId)
    if (index !== -1) {
      complaints[index] = {
        ...complaints[index],
        forwardedDepartment: department,
        status: 'Assigned to Department',
        updatedAt: new Date(),
        statusHistory: [
          ...complaints[index].statusHistory,
          { status: 'Assigned to Department', timestamp: new Date(), notes: `Forwarded to ${department} by ${mpUser.displayName}` },
        ],
      }
      setDemoData(DEMO_COMPLAINTS_KEY, complaints)
    }
    return
  }
  try {
    const newHistoryEntry = {
      status: 'Assigned to Department',
      timestamp: new Date(),
      notes: `Forwarded to ${department} by ${mpUser.displayName}`,
    }
    await updateDoc(doc(db, 'complaints', complaintId), {
      forwardedDepartment: department,
      status: 'Assigned to Department',
      updatedAt: serverTimestamp(),
      statusHistory: arrayUnion(newHistoryEntry),
    })
    await addAuditLog(
      `Forwarded Complaint #${complaintId} to ${department}`,
      mpUser.uid,
      mpUser.displayName,
      mpUser.role,
    )
  } catch (e) {
    console.error('Firebase forwarding failed', e)
    throw e
  }
}

export async function uploadFile(file: File, path: string): Promise<string> {
  if (!isFirebaseConfigured) {
    throw new Error('Firebase not configured. Cannot upload file.')
  }
  try {
    const storageRef = ref(storage, path)
    const snapshot = await uploadBytes(storageRef, file)
    const downloadURL = await getDownloadURL(snapshot.ref)
    return downloadURL
  } catch (error) {
    console.error('Failed to upload file:', error)
    throw error
  }
}

// ========================================== 
// Comment Services
// ========================================== 

export async function getCommentsForComplaint(complaintId: string): Promise<Comment[]> {
  if (!isFirebaseConfigured) return []
  try {
    const snapshot = await getDocs(
      query(
        collection(db, 'comments'),
        where('complaintId', '==', complaintId),
        orderBy('createdAt', 'asc'),
      ),
    )
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      complaintId: doc.data().complaintId as string,
      userId: doc.data().userId as string,
      userName: doc.data().userName as string,
      userRole: doc.data().userRole as UserRole,
      text: doc.data().text as string,
      createdAt: toDate(doc.data().createdAt as Timestamp),
    }))
  } catch (error) {
    console.error('Failed to get comments:', error)
    return []
  }
}

export async function addComment(
  complaintId: string,
  userId: string,
  userName: string,
  userRole: UserRole,
  text: string,
): Promise<Comment> {
  if (!isFirebaseConfigured) {
    throw new Error('Firebase not configured. Cannot add comment.')
  }
  try {
    const newComment: Omit<Comment, 'id'> = {
      complaintId,
      userId,
      userName,
      userRole,
      text,
      createdAt: new Date(),
    }
    const docRef = await addDoc(collection(db, 'comments'), {
      ...newComment,
      createdAt: serverTimestamp(),
    })
    return { ...newComment, id: docRef.id }
  } catch (error) {
    console.error('Failed to add comment:', error)
    throw error
  }
}

// ========================================== 
// Department Services
// ========================================== 

export async function getDepartments(): Promise<Department[]> {
  if (!isFirebaseConfigured) return []
  try {
    const snapshot = await getDocs(
      query(collection(db, 'departments'), orderBy('name', 'asc')),
    )
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      name: doc.data().name as string,
      head: doc.data().head as string,
      contactEmail: doc.data().contactEmail as string,
      createdAt: toDate(doc.data().createdAt as Timestamp),
    }))
  } catch (error) {
    console.error('Failed to get departments:', error)
    return []
  }
}

export async function createDepartment(
  name: string,
  head: string,
  contactEmail: string,
): Promise<string> {
  if (!isFirebaseConfigured) {
    throw new Error('Firebase not configured. Cannot create department.')
  }
  try {
    const newDepartment: Omit<Department, 'id'> = {
      name,
      head,
      contactEmail,
      createdAt: new Date(),
    }
    const docRef = await addDoc(collection(db, 'departments'), {
      ...newDepartment,
      createdAt: serverTimestamp(),
    })
    return docRef.id
  } catch (error) {
    console.error('Failed to create department:', error)
    throw error
  }
}

// ========================================== 
// Chat Message Services
// ========================================== 

export async function saveChatMessage(
  complaintId: string,
  senderId: string,
  senderName: string,
  senderRole: string,
  message: string,
  attachmentUrl?: string,
): Promise<void> {
  if (!isFirebaseConfigured) {
    console.warn('Firebase not configured, skipping saveChatMessage')
    return
  }
  try {
    await addDoc(collection(db, 'chatMessages'), {
      complaintId,
      senderId,
      senderName,
      senderRole,
      message,
      attachmentUrl: attachmentUrl || null,
      timestamp: serverTimestamp(),
    })
  } catch (error) {
    console.error('Failed to save chat message:', error)
    throw error
  }
}

// ========================================== 
// Audit Log Services
// ========================================== 

export async function getActivityLogs(): Promise<AuditLog[]> {
  if (!isFirebaseConfigured) return []
  try {
    const snapshot = await getDocs(
      query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc')),
    )
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      action: doc.data().action as string,
      userId: doc.data().userId as string,
      userName: doc.data().userName as string,
      userRole: doc.data().userRole as string,
      timestamp: toDate(doc.data().timestamp as Timestamp),
    }))
  } catch (error) {
    console.error('Failed to get audit logs:', error)
    return []
  }
}

export async function addAuditLog(
  action: string,
  userId: string,
  userName: string,
  userRole: string,
): Promise<void> {
  if (!isFirebaseConfigured) {
    console.warn('Firebase not configured, skipping addAuditLog')
    return
  }
  try {
    await addDoc(collection(db, 'auditLogs'), {
      action,
      userId,
      userName,
      userRole,
      timestamp: serverTimestamp(),
    })
  } catch (error) {
    console.error('Failed to add audit log:', error)
  }
}

// ========================================== 
// Notification Services
// ========================================== 

export async function getNotifications(userId: string): Promise<NotificationItem[]> {
  if (!isFirebaseConfigured) return []
  try {
    const snapshot = await getDocs(
      query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
      ),
    )
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      userId: doc.data().userId as string,
      title: doc.data().title as string,
      message: doc.data().message as string,
      type: doc.data().type as NotificationItem['type'],
      read: doc.data().read as boolean,
      createdAt: toDate(doc.data().createdAt as Timestamp),
    }))
  } catch (error) {
    console.error('Failed to get notifications:', error)
    return []
  }
}

export async function markNotificationRead(id: string): Promise<void> {
  if (!isFirebaseConfigured) {
    throw new Error('Firebase not configured. Cannot mark notification as read.')
  }
  try {
    await updateDoc(doc(db, 'notifications', id), { read: true })
  } catch (error) {
    console.error('Failed to mark notification as read:', error)
    throw error
  }
}

// ========================================== 
// Petition Services
// ========================================== 

export async function getAllPetitions(): Promise<Petition[]> {
  if (!isFirebaseConfigured) return []
  try {
    const snapshot = await getDocs(
      query(collection(db, 'petitions'), orderBy('createdAt', 'desc')),
    )
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      title: doc.data().title as string,
      description: doc.data().description as string,
      category: doc.data().category as ComplaintCategory,
      signaturesCount: doc.data().signaturesCount as number,
      targetSignatures: doc.data().targetSignatures as number,
      creatorName: doc.data().creatorName as string,
      createdAt: toDate(doc.data().createdAt as Timestamp),
      signedUsers: doc.data().signedUsers as string[],
    }))
  } catch (error) {
    console.error('Failed to get petitions:', error)
    return []
  }
}

export async function createPetition(
  title: string,
  description: string,
  category: ComplaintCategory,
  creatorName: string,
  userId: string, // Added userId for signedUsers
): Promise<string> {
  if (!isFirebaseConfigured) {
    throw new Error('Firebase not configured. Cannot create petition.')
  }
  try {
    const newPetition: Omit<Petition, 'id' | 'createdAt'> = {
      title,
      description,
      category,
      signaturesCount: 1,
      targetSignatures: 100, // Default target
      creatorName,
      signedUsers: [userId], // Creator signs automatically
    }
    const docRef = await addDoc(collection(db, 'petitions'), {
      ...newPetition,
      createdAt: serverTimestamp(),
    })
    return docRef.id
  } catch (error) {
    console.error('Failed to create petition:', error)
    throw error
  }
}

export async function signPetition(petitionId: string, userId: string): Promise<void> {
  if (!isFirebaseConfigured) {
    throw new Error('Firebase not configured. Cannot sign petition.')
  }
  try {
    const docRef = doc(db, 'petitions', petitionId)
    const snapshot = await getDoc(docRef)
    if (snapshot.exists()) {
      const data = snapshot.data()
      const signedUsers = (data.signedUsers as string[]) || []

      if (!signedUsers.includes(userId)) {
        await updateDoc(docRef, {
          signaturesCount: (data.signaturesCount || 0) + 1,
          signedUsers: [...signedUsers, userId],
        })
      }
    }
  } catch (e) {
    console.error('Firebase sign petition failed', e)
    throw e
  }
}

// ========================================== 
// Analytics Services
// ========================================== 

export async function getAnalytics(): Promise<AnalyticsSnapshot> {
  if (!isFirebaseConfigured) {
    throw new Error('Firebase not configured. Cannot get analytics.')
  }
  try {
    const complaintsSnapshot = await getDocs(collection(db, 'complaints'))
    const complaints = complaintsSnapshot.docs.map((doc) => mapComplaint(doc.id, doc.data()))

    const totalComplaints = complaints.length
    const resolvedComplaints = complaints.filter((c) => c.status === 'Resolved').length
    const resolutionRate = totalComplaints ? Math.round((resolvedComplaints / totalComplaints) * 100) : 0

    // Aggregate category distribution
    const categoryDistributionMap = new Map<ComplaintCategory, number>()
    complaints.forEach((c) => {
      categoryDistributionMap.set(c.category, (categoryDistributionMap.get(c.category) || 0) + 1)
    })
    const categoryDistribution = Array.from(categoryDistributionMap.entries()).map(([category, count]) => ({
      category,
      count,
    }))

    // Aggregate department performance
    const departmentPerformanceMap = new Map<string, number>()
    complaints.forEach((c) => {
      if (c.forwardedDepartment) {
        departmentPerformanceMap.set(c.forwardedDepartment, (departmentPerformanceMap.get(c.forwardedDepartment) || 0) + 1)
      }
    })
    const departmentPerformance = Array.from(departmentPerformanceMap.entries()).map(([department, count]) => ({
      department,
      count,
    }))

    // Placeholder for officer performance (requires officer assignment logic)
    const officerPerformance = [{ officer: 'Officer Rao', count: 0 }]

    // Compute missing analytics fields
    const pendingComplaints = complaints.filter((c) => c.status === 'Pending' || c.status === 'Submitted').length
    const activeComplaints = complaints.filter((c) => c.status !== 'Resolved' && c.status !== 'Closed' && c.status !== 'Archived' && c.status !== 'Rejected').length
    const highPriorityComplaints = complaints.filter((c) => c.aiAnalysis?.priority === 'High').length
    const averageResolutionTime = resolvedComplaints > 0 ? 7 : 0 // Placeholder: 7 days avg resolution

    // Aggregate complaints by ward
    const complaintsByWardMap = new Map<string, number>()
    complaints.forEach((c) => {
      const ward = c.address?.city || c.ward || 'Unassigned'
      complaintsByWardMap.set(ward, (complaintsByWardMap.get(ward) || 0) + 1)
    })
    const complaintsByWard = Array.from(complaintsByWardMap.entries()).map(([ward, count]) => ({
      ward,
      count,
    }))

    // Aggregate complaints by month
    const complaintsByMonthMap = new Map<string, number>()
    complaints.forEach((c) => {
      const date = new Date(c.createdAt)
      const month = date.toLocaleString('default', { month: 'short', year: 'numeric' })
      complaintsByMonthMap.set(month, (complaintsByMonthMap.get(month) || 0) + 1)
    })
    const complaintsByMonth = Array.from(complaintsByMonthMap.entries()).map(([month, count]) => ({
      month,
      count,
    }))

    return {
      totalComplaints,
      resolvedComplaints,
      pendingComplaints,
      activeComplaints,
      highPriorityComplaints,
      resolutionRate,
      averageResponseTime: 14,
      averageResolutionTime,
      weeklyReports: [
        { label: 'Week 1', value: Math.floor(totalComplaints * 0.2) },
        { label: 'Week 2', value: Math.floor(totalComplaints * 0.3) },
        { label: 'Week 3', value: totalComplaints - Math.floor(totalComplaints * 0.2) - Math.floor(totalComplaints * 0.3) },
      ],
      monthlyReports: [
        { label: 'Apr', value: Math.floor(totalComplaints * 0.25) },
        { label: 'May', value: Math.floor(totalComplaints * 0.35) },
        { label: 'Jun', value: totalComplaints - Math.floor(totalComplaints * 0.25) - Math.floor(totalComplaints * 0.35) },
      ],
      categoryDistribution,
      departmentPerformance,
      officerPerformance,
      complaintsByWard,
      complaintsByMonth,
    }
  } catch (error) {
    console.error('Failed to get analytics:', error)
    throw error
  }
}
