'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
// Removed Google auth integration
import { useUserStore } from '@/hooks/use-user-store'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

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
        // Store session in localStorage on client side
        const sessionData = {
          userId: data.user.id,
          email: data.user.email,
          displayName: data.user.display_name,
          expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
        }
        
        localStorage.setItem('session', JSON.stringify(sessionData))
        
        // Update user store with project data if available
        if (data.project) {
          const { setUserAndProject } = useUserStore.getState()
          setUserAndProject(data.user, data.project)
        }
        
        router.push('/dashboard')
      } else {
        setError(data.error || 'Login failed')
      }
    } catch (error) {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  // Google sign-in removed per requirement

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Background pattern similar to landing page */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-10 left-10 w-8 h-8 bg-orange-500 rounded-full animate-pulse"></div>
        <div
          className="absolute top-20 right-20 w-6 h-6 bg-red-500 rounded-full animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>
        <div
          className="absolute bottom-20 left-20 w-10 h-10 bg-orange-400 rounded-full animate-pulse"
          style={{ animationDelay: "2s" }}
        ></div>
        <div
          className="absolute bottom-10 right-10 w-7 h-7 bg-red-400 rounded-full animate-pulse"
          style={{ animationDelay: "0.5s" }}
        ></div>
      </div>

      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-gray-600 hover:text-orange-600 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to home
            </Link>
            <div className="flex flex-col items-center">
              <img src="/images/overhaul-logo.png" alt="Overhaul" className="w-12 h-12 mb-2" />
              <h1 className="text-2xl font-bold text-black">Welcome back to Overhaul</h1>
              <p className="text-gray-600">Sign in to continue building</p>
            </div>
          </div>

          <Card className="border-2 border-gray-100 shadow-lg">
            <CardHeader>
              <CardTitle className="text-center text-xl text-gray-900">Sign In</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">{error}</div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full transition-all duration-300 hover:scale-105 focus:scale-105 focus:shadow-lg focus:shadow-orange-200"
                    required
                  />
                </div>
                <div>
                  <Input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full transition-all duration-300 hover:scale-105 focus:scale-105 focus:shadow-lg focus:shadow-orange-200"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-orange-300"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>

              {/* Google sign-in button removed */}

              <div className="text-center text-sm">
                <span className="text-gray-600">Don&apos;t have an account? </span>
                <Link href="/signup" className="text-orange-600 hover:text-orange-700 font-medium hover:underline">
                  Sign up
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}