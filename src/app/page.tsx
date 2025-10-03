'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Search, Wrench, Cpu, Zap, Palette, Code, Box, Settings, MessageSquare, Check, Loader2, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/AuthContext'
import { useUserStore } from '@/hooks/use-user-store'
import { useToast } from '@/hooks/use-toast'
import { useLandingStore } from '@/hooks/use-landing-store'
import { ModelGenerationSection } from '@/components/ModelGenerationSection'

export default function LandingPage() {
  const { user, loading } = useAuth()
  const { user: userStore, clearUser } = useUserStore()
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [firstName, setFirstName] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchInput, setSearchInput] = useState("")
  const { toast } = useToast()

  useEffect(() => {
    // Clear user state on landing page to ensure clean logout
    if (!loading && !user) {
      clearUser()
    }
    
    if (!loading && user) {
      router.push('/dashboard')
    }
  }, [user, loading, router, clearUser])

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

  const handleLogin = () => {
    window.location.href = "/login"
  }

  const handleSignUp = () => {
    window.location.href = "/signup"
  }

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !firstName) {
      toast({
        title: "Please fill in all fields",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      // For now, just show success message since we don't have the API endpoint
      toast({
        title: "Thanks for joining!",
        description: "You're now on the waitlist. We'll be in touch soon!",
      })
      setEmail("")
      setFirstName("")
    } catch (error) {
      console.error("Waitlist submission error:", error)
      toast({
        title: "Network error",
        description: "Could not connect to the server. Please check your internet connection.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSearchClick = () => {
    const value = searchInput.trim()
    if (!value) {
      toast({ title: "Please enter a prompt", variant: "destructive" })
      return
    }
    useLandingStore.getState().setPendingPrompt(value)
    window.location.href = "/signup"
  }

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value)
  }

  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleSearchClick()
    }
  }

  const colors = ["text-red-500", "text-blue-500", "text-green-500", "text-purple-500", "text-orange-500"]

  function getRandomColorClass(index: number) {
    return colors[index % colors.length]
  }

  const gridIcons = [
    { icon: Wrench, color: "text-red-500" },
    { icon: Cpu, color: "text-green-500" },
    { icon: Zap, color: "text-purple-500" },
    { icon: Palette, color: "text-blue-500" },
    { icon: Code, color: "text-orange-500" },
    { icon: Box, color: "text-red-500" },
    { icon: Settings, color: "text-green-500" },
    { icon: MessageSquare, color: "text-purple-500" },
  ]

  const iconPositions = [
    { top: "2%", left: "2%" },
    { top: "2%", right: "2%" },
    { top: "15%", left: "10%" },
    { top: "15%", right: "10%" },
    { top: "30%", left: "3%" },
    { top: "30%", right: "3%" },
    { top: "45%", left: "12%" },
    { top: "45%", right: "12%" },
    { top: "60%", left: "5%" },
    { top: "60%", right: "5%" },
    { top: "75%", left: "10%" },
    { top: "75%", right: "10%" },
    { top: "90%", left: "2%" },
    { top: "90%", right: "2%" },
    { top: "50%", left: "48%" },
  ]

  // Removed waitlist UI
  return (
    <div className="min-h-screen bg-white relative overflow-hidden grid-background">
      {/* Innovation Icons (positioned absolutely in the background) */}
      <div className="absolute inset-0 pointer-events-none">
        {iconPositions.map((pos, i) => {
          const IconComponent = gridIcons[i % gridIcons.length]
          const size = "4rem"
          return (
            <IconComponent.icon
              key={i}
              className={`absolute ${IconComponent.color} animate-pulse`}
              style={{
                top: pos.top,
                left: pos.left,
                right: pos.right,
                width: size,
                height: size,
                opacity: 1,
                animationDelay: `${i * 0.2}s`,
                animationDuration: "3s",
              }}
            />
          )
        })}
      </div>

      {/* Content */}
      <div className="relative z-10">
      {/* Header */}
      <header className="p-6 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Image src="/images/Buildables-Logo.png" alt="Buildables" width={32} height={32} className="w-8 h-8" />
            <span className="text-xl font-bold text-black">Buildables</span>
        </div>

        <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={handleLogin}
              className="text-gray-700 hover:text-orange-600 hover:bg-orange-50 transition-all duration-300 hover:scale-105 font-medium"
            >
              Log In
          </Button>
            <Button
              onClick={handleSignUp}
              className="!bg-gradient-to-r !from-orange-500 !to-red-500 hover:!from-orange-600 hover:!to-red-600 !text-white hover:!text-white focus:!text-white !px-6 !py-2 !rounded-full !transition-all !duration-300 hover:!scale-105 hover:!shadow-lg hover:!shadow-orange-300 !font-medium !border-0"
            >
              Sign Up
          </Button>
        </div>
      </header>

      {/* Hero Section */}
        <section className="px-6 pt-20 pb-5 text-center max-w-4xl mx-auto">
          {/* Centered Logo and Black Buildables Text */}
          <div className="flex flex-col items-center justify-center mb-8">
            <Image src="/images/Buildables-Logo.png" alt="Buildables" width={64} height={64} className="w-16 h-16 mb-2" />
            <span className="text-5xl font-bold text-black">Buildables</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-4">
            {"Hey! I know what we're gonna build today".split(" ").map((word, index) => (
              <span key={index} className={getRandomColorClass(index)}>
                {word}{" "}
              </span>
            ))}
          </h1>
          <p className="text-xl text-gray-700 mb-6">create hardware and software by chatting with AI</p>
          <div className="max-w-2xl mx-auto mb-8 cursor-pointer">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 transition-colors duration-300 group-hover:text-orange-500" />
            <Input 
              type="text" 
                value={searchInput}
                onChange={handleSearchInputChange}
                onKeyPress={handleSearchKeyPress}
                placeholder="Start building with Buildables..."
                className="w-full pl-12 pr-16 py-4 border-2 border-gray-200 rounded-full text-left hover:border-orange-300 transition-all duration-300 bg-white bg-opacity-80 shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:shadow-[0_0_30px_rgba(249,115,22,0.5)] focus:shadow-[0_0_30px_rgba(249,115,22,0.5)] hover:scale-105 focus:scale-105 focus:border-orange-400 focus:outline-none"
              />
              <ArrowRight
                className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-orange-500 transition-transform duration-300 group-hover:translate-x-1 cursor-pointer"
                onClick={handleSearchClick}
              />
            </div>
          </div>
          <Button
            onClick={handleSearchClick}
            className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-full text-lg transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-orange-300 active:scale-95"
          >
            Start Creating
          </Button>
          <div className="flex flex-col items-center justify-center gap-2 mt-8 text-black">
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5" />
              <span className="text-lg">Get ready to print 3D models in 6 minutes</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5" />
              <span className="text-lg">Built for innovators</span>
            </div>
        </div>
      </section>

        {/* New Model Generation Section */}
        <div className="mt-5">
          <ModelGenerationSection />
        </div>

        {/* How Buildables Works */}
        <section className="px-6 pt-5 pb-20 max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-16">How Buildables works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {/* Card 1 */}
            <Card className="border-2 border-gray-100 hover:border-orange-200 transition-all duration-300 hover:scale-105 hover:shadow-lg">
              <CardContent className="p-8 text-center">
                <div className="w-full h-48 bg-gray-100 rounded-lg mb-6 flex items-center justify-center overflow-hidden">
                  <Image
                    src="/images/makerspace-1.png"
                    alt="Natural language input examples"
                    width={640}
                    height={384}
                    className="w-full h-full object-contain rounded-lg transition-transform duration-300 hover:scale-110"
                  />
                </div>
                <Badge className="mb-4 bg-orange-100 text-orange-800">1</Badge>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Talk in plain English</h3>
                <p className="text-black">
                  Use prompts in Buildables to describe and edit the prototype you want to create.
                </p>
              </CardContent>
            </Card>

            {/* Card 2 */}
            <Card className="border-2 border-gray-100 hover:border-orange-200 transition-all duration-300 hover:scale-105 hover:shadow-lg">
              <CardContent className="p-8 text-center">
                <div className="w-full h-48 bg-gray-100 rounded-lg mb-6 flex items-center justify-center overflow-hidden">
                  <Image
                    src="/images/cad-box.jpg"
                    alt="CAD Box"
                    width={640}
                    height={384}
                    className="w-full h-full object-cover rounded-lg transition-transform duration-300 hover:scale-110"
                  />
                </div>
                <Badge className="mb-4 bg-orange-100 text-orange-800">2</Badge>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  Print and deploy your printable prototype with firmware code
                </h3>
                <p className="text-black">
                  Buildables will generate a printable 3D prototype or its components to be assembled. Works on
                  microcontrollers (ESP32, Raspberry Pi and Arduino)
                </p>
              </CardContent>
            </Card>

            {/* Card 3 */}
            <Card className="border-2 border-gray-100 hover:border-orange-200 transition-all duration-300 hover:scale-105 hover:shadow-lg">
              <CardContent className="p-8 text-center">
                <div className="w-full h-48 bg-gray-100 rounded-lg mb-6 flex items-center justify-center overflow-hidden">
                  <Image
                    src="/images/makerspace-2.png"
                    alt="Dimension control panel with sliders"
                    width={640}
                    height={384}
                    className="w-full h-full object-contain rounded-lg transition-transform duration-300 hover:scale-110"
                  />
                </div>
                <Badge className="mb-4 bg-orange-100 text-orange-800">3</Badge>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Learn and iterate</h3>
                <p className="text-black">
                  Perfect for students exploring CAD and firmware AI products. Get hands-on experience with real
                  hardware prototyping while learning engineering fundamentals through practical application.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Footer CTA */}
        <section className="px-6 py-20 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Build the future of hardware with natural language</h2>
          <p className="text-black mb-8">
            Be some of the first 923+ users to bring their product dreams to life when we launch
          </p>
          <Button
            onClick={handleSearchClick}
            size="lg"
            className="bg-orange-500 hover:bg-orange-600 text-white px-12 py-4 rounded-full text-xl transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-orange-300 active:scale-95"
          >
            Get Started Today
          </Button>
        </section>
        </div>
    </div>
  )
}