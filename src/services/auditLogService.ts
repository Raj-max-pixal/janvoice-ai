import { db, isFirebaseConfigured } from './firebase'
import { collection, addDoc, serverTimestamp, query, orderBy, limit, getDocs, where, type Timestamp } from 'firebase/firestore'

interface AuditEntry {
  action: string
  userId: string
  userName: string
  userRole: string
  complaintId?: string
  details?: string
  timestamp: Date
}

export async function logAuditAction(entry: Omit<AuditEntry, 'timestamp'>): Promise<void> {
  if (!isFirebaseConfigured) {
    const stored = localStorage.getItem('janvoice-audit-logs')
    const logs: AuditEntry[] = stored ? JSON.parse(stored) : []
    logs.push({ ...entry, timestamp: new Date() })
    localStorage.setItem('janvoice-audit-logs', JSON.stringify(logs.slice(-500)))
    return
  }

  try {
    await addDoc(collection(db, 'auditLogs'), {
      ...entry,
      timestamp: serverTimestamp(),
    })
  } catch (error) {
    console.error('Failed to log audit action:', error)
  }
}

export async function getAuditLogs(options?: {
  limitCount?: number
  userId?: string
  action?: string
}): Promise<AuditEntry[]> {
  if (!isFirebaseConfigured) {
    const stored = localStorage.getItem('janvoice-audit-logs')
    return stored ? JSON.parse(stored).reverse() : []
  }

  try {
    const constraints: any[] = [orderBy('timestamp', 'desc')]
    if (options?.limitCount) constraints.push(limit(options.limitCount))
    if (options?.userId) constraints.push(where('userId', '==', options.userId))
    if (options?.action) constraints.push(where('action', '==', options.action))

    const q = query(collection(db, 'auditLogs'), ...constraints)
    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        timestamp: (data.timestamp as Timestamp)?.toDate?.() || data.timestamp || new Date(),
      } as unknown as AuditEntry & { id: string }
    })
  } catch (error) {
    console.error('Failed to fetch audit logs:', error)
    return []
  }
}