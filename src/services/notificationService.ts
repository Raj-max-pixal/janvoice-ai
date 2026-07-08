import { db, isFirebaseConfigured } from './firebase'
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  limit,
  getDocs,
  where,
  doc,
  updateDoc,
  onSnapshot,
  type Timestamp,
  type Unsubscribe,
} from 'firebase/firestore'

export interface AppNotification {
  id?: string
  userId: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  complaintId?: string
  read: boolean
  createdAt: Date
}

export async function createNotification(
  notification: Omit<AppNotification, 'id' | 'read' | 'createdAt'>,
): Promise<void> {
  if (!isFirebaseConfigured) {
    const stored = localStorage.getItem('janvoice-notifications')
    const notifications: AppNotification[] = stored ? JSON.parse(stored) : []
    notifications.push({
      ...notification,
      read: false,
      createdAt: new Date(),
    })
    localStorage.setItem('janvoice-notifications', JSON.stringify(notifications.slice(-200)))
    return
  }

  try {
    await addDoc(collection(db, 'notifications'), {
      ...notification,
      read: false,
      createdAt: serverTimestamp(),
    })
  } catch (error) {
    console.error('Failed to create notification:', error)
  }
}

export function subscribeToNotifications(
  userId: string,
  callback: (notifications: AppNotification[]) => void,
): Unsubscribe {
  if (!isFirebaseConfigured) {
    const stored = localStorage.getItem('janvoice-notifications')
    const notifications: AppNotification[] = stored
      ? JSON.parse(stored).filter((n: AppNotification) => n.userId === userId)
      : []
    callback(notifications)
    return () => {}
  }

  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(50),
  )

  return onSnapshot(q, (snapshot) => {
    const notifications = snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        createdAt: (data.createdAt as Timestamp)?.toDate?.() || data.createdAt || new Date(),
      } as AppNotification
    })
    callback(notifications)
  }, (error) => {
    console.error('Notification subscription error:', error)
  })
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  if (!isFirebaseConfigured) return

  try {
    await updateDoc(doc(db, 'notifications', notificationId), { read: true })
  } catch (error) {
    console.error('Failed to mark notification as read:', error)
  }
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  if (!isFirebaseConfigured) {
    const stored = localStorage.getItem('janvoice-notifications')
    if (!stored) return 0
    const notifications: AppNotification[] = JSON.parse(stored)
    return notifications.filter((n) => n.userId === userId && !n.read).length
  }

  try {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('read', '==', false),
    )
    const snapshot = await getDocs(q)
    return snapshot.size
  } catch (error) {
    console.error('Failed to get unread count:', error)
    return 0
  }
}