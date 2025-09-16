'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Check } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/contexts/AuthContext'
import { useUserStore } from '@/hooks/use-user-store'

export default function SignUpPage() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const { signInWithGoogle } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      setIsLoading(false)
      return
    }

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
        
        setSuccess(true)
        setTimeout(() => {
          router.push('/dashboard')
        }, 2000)
      } else {
        setError(data.error || 'Signup failed')
      }
    } catch (error) {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    setError('')

    const { error } = await signInWithGoogle()
    
    if (error) {
      setError(error)
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-white relative overflow-hidden">
        <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
          <Card className="w-full max-w-md text-center">
            <CardContent className="pt-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold mb-2">Account Created!</h2>
              <p className="text-gray-600 mb-4">Please check your email to verify your account.</p>
              <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
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
              <h1 className="text-2xl font-bold text-black">Join Overhaul</h1>
              <p className="text-gray-600">Start building the future today</p>
            </div>
          </div>

          <Card className="border-2 border-gray-100 shadow-lg">
            <CardHeader>
              <CardTitle className="text-center text-xl text-gray-900">Create Account</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">{error}</div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    type="text"
                    placeholder="First name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="transition-all duration-300 hover:scale-105 focus:scale-105 focus:shadow-lg focus:shadow-orange-200"
                    required
                  />
                  <Input
                    type="text"
                    placeholder="Last name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="transition-all duration-300 hover:scale-105 focus:scale-105 focus:shadow-lg focus:shadow-orange-200"
                    required
                  />
                </div>
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
                      Creating account...
                    </>
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-500">Or continue with</span>
                </div>
              </div>

              <Button
                onClick={handleGoogleSignIn}
                variant="outline"
                className="w-full border-2 border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition-all duration-300 hover:scale-105 bg-transparent text-gray-700 hover:text-gray-900"
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </Button>

              <div className="space-y-2 text-sm pt-2">
                <div className="flex items-center gap-2 text-green-600">
                  <Check className="h-4 w-4" />
                  <span>Get ready to print 3D models in 6 minutes</span>
                </div>
                <div className="flex items-center gap-2 text-green-600">
                  <Check className="h-4 w-4" />
                  <span>No CAD experience required</span>
                </div>
                <div className="flex items-center gap-2 text-green-600">
                  <Check className="h-4 w-4" />
                  <span>Built for innovators and makers</span>
                </div>
              </div>

              <div className="text-center text-sm">
                <span className="text-gray-600">Already have an account? </span>
                <Link href="/login" className="text-orange-600 hover:text-orange-700 font-medium hover:underline">
                  Sign in
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}