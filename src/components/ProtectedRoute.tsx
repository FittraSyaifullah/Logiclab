'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getSession } from '@/lib/auth-service'
import { useUserStore } from '@/hooks/use-user-store'

interface ProtectedRouteProps {
  children: React.ReactNode
  redirectTo?: string
}

export function ProtectedRoute({ children, redirectTo = '/login' }: ProtectedRouteProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const router = useRouter()
  const { user, setUser, clearUser } = useUserStore()

  useEffect(() => {
    const checkAuth = async () => {
      const session = await getSession()
      // If we have a session but the user store is empty, hydrate it minimally
      if (session && !user) {
        setUser({ id: session.userId, email: session.email, display_name: session.displayName })
      }
      const isAuth = !!session
      setIsAuthenticated(isAuth)
      if (!session) {
        clearUser()
        router.push(redirectTo)
      }
    }

    checkAuth()
  }, [router, redirectTo, user, setUser, clearUser])

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}

