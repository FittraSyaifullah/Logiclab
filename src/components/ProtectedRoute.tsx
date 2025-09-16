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
  const { user, clearUser } = useUserStore()

  useEffect(() => {
    const checkAuth = async () => {
      const session = await getSession()
      const isAuth = !!session && !!user
      setIsAuthenticated(isAuth)
      
      if (!session || !user) {
        // Clear user state if no session
        if (session && !user) {
          clearUser()
        }
        router.push(redirectTo)
      }
    }

    checkAuth()
  }, [router, redirectTo, user, clearUser])

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

