'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getSession } from '@/lib/auth-service'

interface ProtectedRouteProps {
  children: React.ReactNode
  redirectTo?: string
}

export function ProtectedRoute({ children, redirectTo = '/login' }: ProtectedRouteProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      const session = await getSession()
      const isAuth = !!session
      setIsAuthenticated(isAuth)
      
      if (!session) {
        router.push(redirectTo)
      }
    }

    checkAuth()
  }, [router, redirectTo])

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

