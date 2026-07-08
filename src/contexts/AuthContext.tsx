import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth'
import {
  auth,
  createUserProfile,
  getUserProfile,
  isFirebaseConfigured,
  requestPasswordReset,
} from '../services/firebase'
import type { User, UserRole } from '../types'

interface AuthContextValue {
  currentUser: User | null
  firebaseUser: FirebaseUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<User | null>
  register: (
    email: string,
    password: string,
    displayName: string,
    role: UserRole,
  ) => Promise<void>
  logout: () => Promise<void>
  forgotPassword: (email: string) => Promise<void>
  verifyEmail: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const demoSessionKey = 'janvoice-demo-user'

function createDemoUser(email: string, displayName?: string, role?: UserRole): User {
  const inferredRole = role ?? (email.toLowerCase().includes('mp') ? 'mp' : 'citizen')
  return {
    uid: inferredRole === 'mp' ? 'demo-mp' : 'demo-citizen',
    email,
    displayName: displayName || (inferredRole === 'mp' ? 'Admin MP' : 'Demo Citizen'),
    role: inferredRole,
    createdAt: new Date(),
    emailVerified: true,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isFirebaseConfigured) {
      const storedUser = localStorage.getItem(demoSessionKey)
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser) as User
        setCurrentUser(parsedUser)
        console.log('[auth] AuthContext updated', parsedUser)
      }
      setLoading(false)
      return
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('[auth] onAuthStateChanged fired', { uid: user?.uid, email: user?.email })
      setFirebaseUser(user)
      if (user) {
        try {
          const profile = await getUserProfile(user.uid)
          const nextUser = profile ?? {
            uid: user.uid,
            email: user.email ?? '',
            displayName: user.displayName ?? 'Authenticated User',
            role: 'citizen' as UserRole,
            createdAt: new Date(),
            emailVerified: user.emailVerified,
          }
          setCurrentUser(nextUser)
          console.log('[auth] AuthContext updated', nextUser)
        } catch (error) {
          console.error('[auth] Failed to resolve profile after auth state change', error)
          setCurrentUser(null)
        }
      } else {
        setCurrentUser(null)
      }
      setLoading(false)
    })
    return unsubscribe
  }, [])

  const login = useCallback(async (email: string, password: string): Promise<User | null> => {
    console.log('[auth] Sign-in started', { email })

    if (!isFirebaseConfigured) {
      const user = createDemoUser(email)
      localStorage.setItem(demoSessionKey, JSON.stringify(user))
      setCurrentUser(user)
      setFirebaseUser(null)
      setLoading(false)
      console.log('[auth] Sign-in success', user)
      console.log('[auth] AuthContext updated', user)
      return user
    }

    const credential = await signInWithEmailAndPassword(auth, email, password)
    const signedInUser = credential.user
    console.log('[auth] Sign-in success', { uid: signedInUser.uid, email: signedInUser.email })

    const profile = await getUserProfile(signedInUser.uid)
    const nextUser = profile ?? {
      uid: signedInUser.uid,
      email: signedInUser.email ?? '',
      displayName: signedInUser.displayName ?? 'Authenticated User',
      role: 'citizen' as UserRole,
      createdAt: new Date(),
      emailVerified: signedInUser.emailVerified,
    }

    setFirebaseUser(signedInUser)
    setCurrentUser(nextUser)
    setLoading(false)
    console.log('[auth] User object received', nextUser)
    console.log('[auth] AuthContext updated', nextUser)
    return nextUser
  }, [])

  const forgotPassword = useCallback(async (email: string) => {
    if (!isFirebaseConfigured) {
      return
    }
    await requestPasswordReset(email)
  }, [])

  const verifyEmail = useCallback(async () => {
    if (!isFirebaseConfigured || !auth.currentUser) {
      return
    }
    await sendEmailVerification(auth.currentUser)
  }, [])

  const register = useCallback(
    async (
      email: string,
      password: string,
      displayName: string,
      role: UserRole,
    ) => {
      if (!isFirebaseConfigured) {
        const user = createDemoUser(email, displayName, role)
        localStorage.setItem(demoSessionKey, JSON.stringify(user))
        setCurrentUser(user)
        return
      }
      const credential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      )
      await createUserProfile(credential.user.uid, email, displayName, role)
    },
    [],
  )

  const logout = useCallback(async () => {
    if (!isFirebaseConfigured) {
      localStorage.removeItem(demoSessionKey)
      setCurrentUser(null)
      setFirebaseUser(null)
      setLoading(false)
      return
    }
    await signOut(auth)
  }, [])

  const value = useMemo(
    () => ({ currentUser, firebaseUser, loading, login, register, logout, forgotPassword, verifyEmail }),
    [currentUser, firebaseUser, loading, login, register, logout, forgotPassword, verifyEmail],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
