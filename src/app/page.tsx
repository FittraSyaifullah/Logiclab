'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Search, Wrench, Cpu, Zap, Palette, Code, Box, Settings, MessageSquare } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/contexts/AuthContext'

export default function LandingPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  if (user) {
    return null // Will redirect to dashboard
  }
  return (
    <div className="min-h-screen bg-white relative overflow-hidden grid-background">
      {/* Animated Background Icons */}
      <div className="absolute inset-0 pointer-events-none">
        <Wrench className="absolute text-red-500 animate-pulse" style={{top: '2%', left: '2%', width: '4rem', height: '4rem', opacity: 1, animationDelay: '0s', animationDuration: '3s'}} />
        <Cpu className="absolute text-green-500 animate-pulse" style={{top: '2%', right: '2%', width: '4rem', height: '4rem', opacity: 1, animationDelay: '0.2s', animationDuration: '3s'}} />
        <Zap className="absolute text-purple-500 animate-pulse" style={{top: '15%', left: '10%', width: '4rem', height: '4rem', opacity: 1, animationDelay: '0.4s', animationDuration: '3s'}} />
        <Palette className="absolute text-blue-500 animate-pulse" style={{top: '15%', right: '10%', width: '4rem', height: '4rem', opacity: 1, animationDelay: '0.6s', animationDuration: '3s'}} />
        <Code className="absolute text-orange-500 animate-pulse" style={{top: '30%', left: '3%', width: '4rem', height: '4rem', opacity: 1, animationDelay: '0.8s', animationDuration: '3s'}} />
        <Box className="absolute text-red-500 animate-pulse" style={{top: '30%', right: '3%', width: '4rem', height: '4rem', opacity: 1, animationDelay: '1s', animationDuration: '3s'}} />
        <Settings className="absolute text-green-500 animate-pulse" style={{top: '45%', left: '12%', width: '4rem', height: '4rem', opacity: 1, animationDelay: '1.2s', animationDuration: '3s'}} />
        <MessageSquare className="absolute text-purple-500 animate-pulse" style={{top: '45%', right: '12%', width: '4rem', height: '4rem', opacity: 1, animationDelay: '1.4s', animationDuration: '3s'}} />
        <Wrench className="absolute text-red-500 animate-pulse" style={{top: '60%', left: '5%', width: '4rem', height: '4rem', opacity: 1, animationDelay: '1.6s', animationDuration: '3s'}} />
        <Cpu className="absolute text-green-500 animate-pulse" style={{top: '60%', right: '5%', width: '4rem', height: '4rem', opacity: 1, animationDelay: '1.8s', animationDuration: '3s'}} />
        <Zap className="absolute text-purple-500 animate-pulse" style={{top: '75%', left: '8%', width: '4rem', height: '4rem', opacity: 1, animationDelay: '2s', animationDuration: '3s'}} />
        <Palette className="absolute text-blue-500 animate-pulse" style={{top: '75%', right: '8%', width: '4rem', height: '4rem', opacity: 1, animationDelay: '2.2s', animationDuration: '3s'}} />
        <Code className="absolute text-orange-500 animate-pulse" style={{top: '90%', left: '2%', width: '4rem', height: '4rem', opacity: 1, animationDelay: '2.4s', animationDuration: '3s'}} />
        <Box className="absolute text-red-500 animate-pulse" style={{top: '90%', right: '2%', width: '4rem', height: '4rem', opacity: 1, animationDelay: '2.6s', animationDuration: '3s'}} />
      </div>

      {/* Header */}
      <header className="p-6 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <img src="/images/logo.svg" alt="LogicLab" className="w-8 h-8" />
          <span className="text-xl font-bold text-black">LogicLab</span>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" asChild>
            <Link href="/login">Log In</Link>
          </Button>
          <Button className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white hover:shadow-lg hover:shadow-orange-300 transition-all duration-300 hover:scale-105" asChild>
            <Link href="/signup">Sign Up</Link>
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-6 py-20 text-center">
        <div className="max-w-4xl mx-auto space-y-8">
          <h1 className="text-5xl md:text-6xl font-bold mb-4">
            <span className="text-red-500">AI-powered</span> product creation
            <br />
            <span className="text-orange-500">we're </span><span className="text-red-500">gonna </span>build something amazing
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Build hardware or software prototypes, run business analysis, and generate 3D visualizations without coding.
          </p>
          
          {/* Search Input */}
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-hover:text-orange-500" />
            <Input 
              type="text" 
              placeholder="What do you want to build today?"
              className="pl-10"
            />
          </div>

          <Button className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-orange-300 max-w-xs mx-auto w-full">
            Get Started Today
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-6 py-20">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Everything you need to build</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {/* Hardware Prototyping */}
            <Card className="hover:border-orange-300 hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Wrench className="h-8 w-8 text-orange-500" />
                  <CardTitle>Hardware Prototyping</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Generate 3D models and component lists using AI. Perfect for product designers and engineers.
                </CardDescription>
              </CardContent>
            </Card>

            {/* Software Development */}
            <Card className="hover:border-orange-300 hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Code className="h-8 w-8 text-blue-500" />
                  <CardTitle>Software Development</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Build working demo apps and prototypes without writing a single line of code.
                </CardDescription>
              </CardContent>
            </Card>

            {/* Business Analysis */}
            <Card className="hover:border-orange-300 hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-8 w-8 text-green-500" />
                  <CardTitle>Business Analysis</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Get AI-powered market research and business insights for your product ideas.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  )
}