'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { getSession, destroySession } from '@/lib/auth-service'

interface User {
  id: string
  email: string
  display_name: string
  metadata?: Record<string, unknown>
  created_at?: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<{ error: string | null }>
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<{ error: string | null }>
  signInWithGoogle: () => Promise<{ error: string | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session from custom session management
    const getInitialSession = async () => {
      const session = await getSession()
      if (session) {
        setUser({
          id: session.userId,
          email: session.email,
          display_name: session.displayName,
        })
      } else {
        setUser(null)
      }
      setLoading(false)
    }

    getInitialSession()

    // Listen for storage changes (when user logs in/out in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'session') {
        getInitialSession()
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          firstName,
          lastName,
        }),
      })

      const data = await response.json()

      if (data.success) {
        // Update user state after successful signup
        setUser({
          id: data.user.id,
          email: data.user.email,
          display_name: data.user.display_name,
        })
        return { error: null }
      } else {
        return { error: data.error || 'Signup failed' }
      }
    } catch (error) {
      return { error: 'An unexpected error occurred' }
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      })

      const data = await response.json()

      if (data.success) {
        // Update user state after successful login
        setUser({
          id: data.user.id,
          email: data.user.email,
          display_name: data.user.display_name,
        })
        return { error: null }
      } else {
        return { error: data.error || 'Login failed' }
      }
    } catch (error) {
      return { error: 'An unexpected error occurred' }
    }
  }

  const signOut = async () => {
    try {
      await destroySession()
      setUser(null)
      return { error: null }
    } catch (error) {
      return { error: 'An unexpected error occurred' }
    }
  }

  const signInWithGoogle = async () => {
    try {
      // For now, redirect to a Google OAuth flow
      // In a real implementation, you'd set up Google OAuth with your API routes
      window.location.href = '/api/auth/google'
      return { error: null }
    } catch (error) {
      return { error: 'An unexpected error occurred' }
    }
  }

  const value = {
    user,
    loading,
    signUp,
    signIn,
    signOut,
    signInWithGoogle,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

