"use client"

import type React from "react"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowRight,
  Box,
  CheckCircle2,
  Code,
  Cpu,
  Factory,
  MessageCircle,
  Palette,
  Search,
  Shield,
  Wrench,
  Zap,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/contexts/AuthContext"
import { useUserStore } from "@/hooks/use-user-store"
import { useToast } from "@/hooks/use-toast"
import { useLandingStore } from "@/hooks/use-landing-store"
import { useTypingPlaceholder } from "@/hooks/use-typing-placeholder"
import { TYPING_PLACEHOLDER_PROMPTS } from "@/constants/typing-prompts"

const floatingIconData = [
  { icon: Wrench, className: "top-[10%] left-[8%]", color: "text-red-300", delay: 0 },
  { icon: Zap, className: "top-[25%] left-[12%]", color: "text-purple-300", delay: 0.5 },
  { icon: Code, className: "top-[45%] left-[5%]", color: "text-orange-300", delay: 1 },
  { icon: Wrench, className: "bottom-[20%] left-[10%]", color: "text-red-300", delay: 1.5 },
  { icon: Zap, className: "bottom-[35%] left-[15%]", color: "text-purple-300", delay: 2 },
  { icon: Cpu, className: "top-[8%] right-[10%]", color: "text-green-300", delay: 0.3 },
  { icon: Palette, className: "top-[35%] right-[5%]", color: "text-blue-300", delay: 0.8 },
  { icon: Box, className: "top-[55%] right-[12%]", color: "text-pink-300", delay: 1.3 },
  { icon: MessageCircle, className: "bottom-[25%] right-[8%]", color: "text-purple-300", delay: 1.8 },
  { icon: Cpu, className: "bottom-[10%] right-[15%]", color: "text-green-300", delay: 2.3 },
]

const socialProofProjects = [
  {
    img: "/images/drone.jpg",
    title: "3D Prototype 1",
    description: "Built in minutes with AI assistance",
  },
  {
    img: "/images/washing-machine.png",
    title: "3D Prototype 2",
    description: "Built in minutes with AI assistance",
  },
  {
    img: "/images/smart-planter.png",
    title: "3D Prototype 3",
    description: "Built in minutes with AI assistance",
  },
]

const testimonialCards = [
  {
    quote: "I turned my napkin sketch into a working prototype in 2 days.",
    name: "Sarah Chen",
    role: "Product Designer",
    avatar: "/images/asian-woman-professional-headshot.png",
  },
  {
    quote: "We built a smart desk lamp without hiring a single engineer.",
    name: "Marcus Lee",
    role: "Startup Founder",
    avatar: "/images/asian-male-entrepreneur-professional-headshot.jpg",
  },
  {
    quote: "Our client demo was built and printed overnight. Unreal.",
    name: "Alex Rivera",
    role: "Hardware Consultant",
    avatar: "/images/caucasian-man-consultant-professional-headshot.jpg",
  },
]

const scrollShowcase = [
  {
    img: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot_2025-10-03_135257-removebg-preview-jnDQmDsNiBT24ivcfzlx957M3N8sAK.png",
    label: "Storage Drawer CAD",
  },
  {
    img: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot_2025-10-12_105555-removebg-preview-DxC2KrAeLirEya6EMOshdF5ExI2na8.png",
    label: "Round Container CAD",
  },
  {
    img: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot_2025-10-12_105040-removebg-preview-I4JpjTEe6mMvd1TOxjENxoSLpkst5P.png",
    label: "Desk Lamp Stand CAD",
  },
  {
    img: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot_2025-10-03_135257-removebg-preview-jnDQmDsNiBT24ivcfzlx957M3N8sAK.png",
    label: "Storage Drawer CAD",
  },
  {
    img: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot_2025-10-12_105555-removebg-preview-DxC2KrAeLirEya6EMOshdF5ExI2na8.png",
    label: "Round Container CAD",
  },
  {
    img: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot_2025-10-12_105040-removebg-preview-I4JpjTEe6mMvd1TOxjENxoSLpkst5P.png",
    label: "Desk Lamp Stand CAD",
  },
]

const whatPeopleBuildCards = [
  {
    img: "/images/design-mode/photo_2025-10-28_08-46-27.jpg",
    title: "Drones & Flying Tech",
    description: "Camera drones, racing quads, delivery systems",
  },
  {
    img: "/images/design-mode/Smartwatch.png",
    title: "Wearable Tech",
    description: "Smart watches, fitness trackers, health monitors",
  },
  {
    img: "/images/design-mode/Roomba.png",
    title: "Smart Furniture",
    description: "Adjustable desks, automated storage, IoT home items",
  },
  {
    img: "/images/rc-car.jpg",
    title: "Robotics",
    description: "Automation, custom arms, educational robots",
  },
  {
    img: "/images/cat-feeder.png",
    title: "A robot that feeds your cat",
    description: "Yes, people actually build this",
  },
  {
    img: "/images/smart-planter.png",
    title: "Smart planter",
    description: "Automated watering, soil monitoring, growth tracking",
  },
]

const faqEntries = [
  { question: "Can I build electronics with this?", answer: "Yes, we support Arduino, Raspberry Pi, and ESP32 firmware generation." },
  { question: "What if I don’t know CAD?", answer: "That’s the point. You chat. We build." },
  { question: "Can I manufacture globally?", answer: "Yes, we match you with certified factories and handle compliance for small or large runs." },
  { question: "Do you store my IP?", answer: "Your data is private and protected with NDA-bound manufacturers." },
  { question: "How do I start?", answer: "Just describe what you want to build. The rest happens automatically." },
  { question: "Can I export STL/OBJ files?", answer: "Yes, and we’ll even generate printable models for you." },
  {
    question: "How much does a generation cost?",
    answer:
      "Full generation costs between 4 to 50 credits depending on complexity. Remember: 1 credit = $1 for top-ups. Start free with 8 daily credits.",
  },
]

const pricingPlans = [
  {
    title: "Free",
    price: "$0",
    period: "/month",
    description: "8 credits every day.",
    highlights: ["8 credits every day", "Basic model generation", "Community support"],
    isFeatured: false,
  },
  {
    title: "Hobbyist/Student",
    price: "$29",
    period: "/month",
    description: "$290/year (save $110)",
    highlights: ["20 credits included", "Extra credits: $1.50 each", "Slow queue", "No manufacturing support"],
    isFeatured: true,
  },
  {
    title: "Hardware Founder",
    price: "$199",
    period: "/month",
    description: "$1990/year (save $410)",
    highlights: [
      "200 credits included",
      "Unlimited edits",
      "Fast queue",
      "Firmware generation",
      "Complex components allowed",
      "Manufacturing consultation",
    ],
    isFeatured: false,
  },
]

export default function LandingPage() {
  const { user, loading } = useAuth()
  const { clearUser } = useUserStore()
  const router = useRouter()
  const [searchInput, setSearchInput] = useState<string>("")
  const { toast } = useToast()
  const animatedPlaceholder = useTypingPlaceholder(TYPING_PLACEHOLDER_PROMPTS, { isActive: !searchInput })

  useEffect(() => {
    if (!loading && !user) {
      clearUser()
    }

    if (!loading && user) {
      router.push("/dashboard")
    }
  }, [user, loading, router, clearUser])

  if (loading) {
    return (
      <div className="min-h-svh flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  if (user) {
    return null
  }

  const handleLogin = () => {
    window.location.href = "/login"
  }

  const handleSignUp = () => {
    window.location.href = "/signup"
  }

  const handleSearchClick = () => {
    const prompt = searchInput.trim()
    if (!prompt) {
      toast({ title: "Please enter a prompt", variant: "destructive" })
      return
    }

    useLandingStore.getState().setPendingPrompt(prompt)
    window.location.href = "/signup"
  }

  const handleSearchKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault()
      handleSearchClick()
    }
  }

  const cookingHighlights = [
    {
      title: "For Startups",
      icon: Factory,
      accent: "blue",
      highlights: [
        "Prototype your MVP hardware",
        "Generate manufacturable CAD + firmware instantly",
        "Ship small-batch runs with MOQ as low as 1",
        "Validate and demo to investors faster",
      ],
      cta: "Build a Prototype",
      variant: "default" as const,
    },
    {
      title: "For Creators & Hobbyists",
      icon: Palette,
      accent: "purple",
      highlights: [
        "Turn viral ideas into physical builds",
        "Design for 3D print or laser cut in minutes",
        "Customize and export STL/OBJ directly",
        "Learn hardware design the fun way",
      ],
      cta: "Try a Fun Idea",
      variant: "outline" as const,
    },
  ]

  const nonTechnicalFeatures = [
    { icon: Zap, text: "Buildables was made for visionaries, not technicians." },
    {
      icon: MessageCircle,
      text: "Describe your idea and our AI creates CAD models, firmware, and assembly instructions ready to manufacture.",
    },
    { icon: CheckCircle2, text: "We handle your BOM, sourcing, and manufacturing support." },
  ]

  const reverseReasons = [
    "If you love paying $20K for prototypes, this isn’t for you.",
    "If you enjoy hiring 5 freelancers to do what one AI can, keep doing you.",
    "If waiting 3 months for your first model feels fast, stay old school.",
    "If you hate seeing your idea come to life in 24 hours, definitely don’t click below.",
  ]

  const manufacturingSequence = [
    { icon: Box, label: "Plastic" },
    { icon: Wrench, label: "Metal" },
    { icon: Cpu, label: "Assembly" },
    { icon: Box, label: "Shipping" },
  ]

  return (
    <div className="min-h-screen bg-grid-pattern relative overflow-hidden">
      {floatingIconData.map((item, index) => (
        <FloatingIcon key={index} {...item} />
      ))}

      <nav className="relative z-10 flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-2">
          <Image src="/images/buildables-20logo-20-281-29.png" alt="Buildables Logo" width={40} height={40} className="h-10 w-10" priority />
          <span className="text-2xl font-bold text-primary">Buildables</span>
        </div>
        <div className="hidden md:flex items-center gap-8">
          <Link href="https://www.instagram.com/buildables.app/" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Community
          </Link>
          <Link href="mailto:hello@overhaulsg.com" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Manufacturing
          </Link>
          <Button variant="outline" size="sm" onClick={handleLogin}>
            Sign In
          </Button>
          <Button size="sm" onClick={handleSignUp}>
            Sign Up
          </Button>
        </div>
      </nav>

      <section className="relative z-10 flex flex-col items-center justify-center min-h-[80vh] px-4 text-center">
        <div className="max-w-5xl mx-auto space-y-8">
          <h1 className="text-3xl md:text-5xl lg:text-5xl font-bold leading-tight text-balance">
            <span className="inline-block rainbow-text text-7xl">{"Hey! I know what\nwe’re gonna build today"}</span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
            Create hardware and printable 3d models by chatting with AI.
          </p>

          <div className="max-w-3xl mx-auto mt-12">
            <div className="relative p-1 rounded-full rainbow-glow-border">
              <div className="relative flex items-center gap-2 bg-white rounded-full shadow-lg p-2 border border-border">
                <div className="flex items-center pl-4 text-muted-foreground">
                  <Search className="w-5 h-5" />
                </div>
                <Input
                  type="text"
                  placeholder={animatedPlaceholder}
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  onKeyDown={handleSearchKeyPress}
                  className="flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent text-lg"
                />
                <Button size="lg" className="rounded-full bg-orange-400 hover:bg-orange-500 text-white px-8" onClick={handleSearchClick}>
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
            <Button size="lg" className="rounded-full" onClick={handleSignUp}>
              Try for Free
            </Button>
          </div>
        </div>
      </section>

      <section className="relative z-10 py-20 px-4">
        <div className="max-w-6xl mx-auto text-center space-y-6">
          <h2 className="text-4xl md:text-5xl font-bold text-balance">You’re late to the future.</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Over 140 manufacturers and 100 builders are already turning ideas into products with Buildables.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            {socialProofProjects.map((project) => (
              <div key={project.title} className="bg-card rounded-2xl p-8 shadow-lg border border-border hover:shadow-xl transition-shadow">
                <div className="aspect-square bg-muted rounded-xl mb-4 flex items-center justify-center overflow-hidden">
                  <Image src={project.img} alt={project.title} width={512} height={512} className="w-full h-full object-cover" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{project.title}</h3>
                <p className="text-sm text-muted-foreground">{project.description}</p>
              </div>
            ))}
          </div>

          <div className="mt-12">
            <Button size="lg" className="rounded-full px-8" onClick={handleSignUp}>
              Join the Waitlist →
            </Button>
          </div>
        </div>
      </section>

      <section className="relative z-10 py-20 px-4 bg-accent/30">
        <div className="max-w-6xl mx-auto text-center space-y-12">
          <h2 className="text-4xl md:text-5xl font-bold">Real people. Real prototypes.</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonialCards.map((card) => (
              <div key={card.name} className="bg-card rounded-2xl p-8 shadow-lg border border-border">
                <p className="text-lg font-medium mb-4">&quot;{card.quote}&quot;</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
                    <Image src={card.avatar} alt={card.name} width={48} height={48} className="w-full h-full object-cover" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-sm">{card.name}</p>
                    <p className="text-xs text-muted-foreground">{card.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-16 overflow-hidden">
            <div className="flex gap-6 animate-scroll-seamless">
              {scrollShowcase.map((item, index) => (
                <div key={`${item.label}-${index}`} className="flex-shrink-0 w-80">
                  <div className="bg-card rounded-2xl p-8 shadow-lg border border-border">
                    <div className="aspect-video bg-muted rounded-xl mb-4 flex items-center justify-center overflow-hidden">
                      <Image src={item.img} alt={item.label} width={640} height={360} className="w-full h-full object-contain" />
                    </div>
                    <p className="text-sm text-muted-foreground">{item.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 py-20 px-4">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          <h2 className="text-4xl md:text-5xl font-bold">The ChatGPT for Hardware</h2>
          <p className="text-xl text-muted-foreground">
            Turn ideas into real, manufacturable products — from CAD to code — just by chatting.
          </p>

          <div className="bg-card rounded-2xl p-8 shadow-xl border border-border">
            <div className="bg-muted rounded-xl overflow-hidden min-h-[400px] flex items-center justify-center relative">
              <video autoPlay loop muted playsInline className="w-full h-full object-cover rounded-xl">
                <source
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Buildables%20Demo%20Video-iVKb2jXyy04cvNBuBmvGRlcblE1pu3.mp4"
                  type="video/mp4"
                />
                Your browser does not support the video tag.
              </video>
              <div className="absolute top-8 left-1/2 transform -translate-x-1/2 z-10">
                <div className="flex items-center gap-3 bg-white dark:bg-gray-900 rounded-full px-6 py-3 shadow-lg border border-border">
                  <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-sm font-medium">“Make me a portable handheld fan”</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 py-20 px-4 bg-accent/30">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          <h2 className="text-4xl md:text-5xl font-bold">Yes, your builds are compliant.</h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Buildables works with certified manufacturers that meet ISO and RoHS standards. Every part is traceable and
            designed to meet real-world compliance needs for prototyping and limited runs.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-8 mt-12">
            <div className="flex flex-col items-center gap-2">
              <div className="w-20 h-20 rounded-full bg-card border-2 border-primary flex items-center justify-center">
                <Shield className="h-10 w-10 text-primary" />
              </div>
              <p className="text-sm font-semibold">ISO Certified</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-20 h-20 rounded-full bg-card border-2 border-primary flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10 text-primary" />
              </div>
              <p className="text-sm font-semibold">RoHS Compliant</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-20 h-20 rounded-full bg-card border-2 border-primary flex items-center justify-center">
                <Factory className="h-10 w-10 text-primary" />
              </div>
              <p className="text-sm font-semibold">Traceable Parts</p>
            </div>
          </div>

          <div className="bg-card rounded-xl p-6 shadow-lg border border-border max-w-2xl mx-auto mt-8">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">Note:</span> For high-volume compliance (FCC, CE, UL), our
              team will review your design before production.
            </p>
          </div>

          <div className="mt-12">
            <Button size="lg" className="rounded-full px-8" onClick={handleSignUp}>
              Start Building Today →
            </Button>
          </div>
        </div>
      </section>

      <section className="relative z-10 py-20 px-4">
        <div className="max-w-6xl mx-auto text-center space-y-12">
          <h2 className="text-4xl md:text-5xl font-bold">From 1 to 10,000 units.</h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            We support plastics, metals, PCBs, and mixed materials. Minimum order quantity starts at 1 unit. Whether
            you’re validating a prototype or ready for production, we match you with the right factory.
          </p>

          <div className="bg-card rounded-2xl p-12 shadow-xl border border-border mt-12">
            <div className="flex flex-col md:flex-row items-center justify-center gap-8">
              {manufacturingSequence.map((step, index) => (
                <div key={`${step.label}-${index}`} className="flex flex-col items-center gap-3">
                  <div className="w-24 h-24 rounded-2xl bg-blue-100 dark:bg-blue-950 flex items-center justify-center">
                    <step.icon className="h-12 w-12 text-blue-600" />
                  </div>
                  <p className="font-semibold">{step.label}</p>
                  {index < manufacturingSequence.length - 1 && <div className="text-4xl text-muted-foreground">→</div>}
                </div>
              ))}
            </div>
          </div>

          <Button asChild size="lg" className="mt-8">
            <Link href="mailto:hello@overhaulsg.com" className="rounded-full px-12 py-5">
              Request a Manufacturing Quote
            </Link>
          </Button>
        </div>
      </section>

      <section className="relative z-10 py-20 px-4 bg-gradient-to-b from-accent/20 to-accent/40">
        <div className="max-w-6xl mx-auto space-y-12">
          <h2 className="text-4xl md:text-5xl font-bold text-center">No engineers? No problem.</h2>
          <div className="grid md:grid-cols-3 gap-8 text-center">
            {nonTechnicalFeatures.map((feature) => (
              <div key={feature.text} className="space-y-4">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <feature.icon className="h-10 w-10 text-primary" />
                </div>
                <p className="text-xl font-semibold">{feature.text}</p>
              </div>
            ))}
          </div>

          <div className="bg-card rounded-2xl p-12 shadow-xl border border-border mt-16">
            <div className="grid md:grid-cols-2 gap-12">
              <div className="space-y-4">
                <h3 className="text-2xl font-bold text-red-600">Before Buildables</h3>
                <ul className="space-y-3 text-left">
                  {["5 freelancers to coordinate", "3 months of back-and-forth", "$15,000+ before seeing anything"].map(
                    (item) => (
                      <li key={item} className="flex items-start gap-3">
                        <span className="text-red-600 mt-1 text-xl">✗</span>
                        <span>{item}</span>
                      </li>
                    )
                  )}
                </ul>
              </div>
              <div className="space-y-4">
                <h3 className="text-2xl font-bold text-green-600">With Buildables</h3>
                {["1 chat interface", "1 day to first prototype", "Start free, pay only for manufacturing"].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="text-green-600 mt-1 flex-shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 py-20 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-12">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-balance">Here’s why you should NOT get Buildables.</h2>
          <div className="space-y-6">
            {reverseReasons.map((reason) => (
              <div key={reason} className="bg-card rounded-2xl p-8 shadow-lg border border-border transform transition-all hover:scale-105">
                <p className="text-xl text-muted-foreground">{reason}</p>
              </div>
            ))}
          </div>

          <Button size="lg" className="rounded-full px-8 text-lg mt-8" onClick={handleSignUp}>
            Fine, I’m curious →
          </Button>
          <div className="mt-8">
            <Button size="lg" variant="outline" className="rounded-full px-8 bg-transparent" onClick={handleSignUp}>
              Get Early Access
            </Button>
          </div>
        </div>
      </section>

      <section className="relative z-10 py-20 px-4 bg-accent/30">
        <div className="max-w-6xl mx-auto text-center space-y-12">
          <h2 className="text-4xl md:text-5xl font-bold">From dumb ideas to real machines.</h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Whether you’re a student, creator, or startup founder, Buildables helps you design, code, and prototype
            without touching CAD or firmware.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
            {whatPeopleBuildCards.map((item) => (
              <div key={item.title} className="bg-card rounded-2xl p-8 shadow-lg border border-border hover:shadow-xl transition-all">
                <div className="aspect-square bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-950 dark:to-blue-900 rounded-xl mb-4 flex items-center justify-center overflow-hidden">
                  <Image src={item.img} alt={item.title} width={512} height={512} className="w-full h-full object-cover" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 py-20 px-4">
        <div className="max-w-6xl mx-auto text-center space-y-12">
          <h2 className="text-4xl md:text-5xl font-bold">So what can I actually do with this?</h2>
          <div className="grid md:grid-cols-2 gap-8 mt-12">
            {cookingHighlights.map((section) => (
              <div key={section.title} className="bg-card rounded-2xl p-12 shadow-xl border border-border text-left space-y-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-950 flex items-center justify-center">
                    <section.icon className={`h-8 w-8 ${section.accent === "blue" ? "text-blue-600" : "text-purple-600"}`} />
                  </div>
                  <h3 className="text-3xl font-bold">{section.title}</h3>
                </div>
                <ul className="space-y-4">
                  {section.highlights.map((highlight) => (
                    <li key={highlight} className="flex items-start gap-3">
                      <CheckCircle2 className="text-primary mt-1 flex-shrink-0" />
                      <span className="text-lg">{highlight}</span>
                    </li>
                  ))}
                </ul>
                <Button size="lg" variant={section.variant} className="rounded-full w-full mt-8" onClick={handleSignUp}>
                  {section.cta}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 py-20 px-4 bg-accent/30">
        <div className="max-w-6xl mx-auto text-center space-y-12">
          <h2 className="text-4xl md:text-5xl font-bold">We don’t just build. We manufacture.</h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            When your prototype’s ready, we handle the messy stuff. Metals, plastics, PCBs all handled through
            certified factories. MOQ starts at 1. You own the IP, always.
          </p>

          <div className="bg-card rounded-2xl p-12 shadow-xl border border-border mt-12">
            <div className="flex flex-col md:flex-row items-center justify-center gap-8">
              <div className="flex flex-col items-center gap-3">
                <div className="w-32 h-32 rounded-2xl bg-blue-100 dark:bg-blue-950 flex items-center justify-center">
                  <MessageCircle className="h-16 w-16 text-blue-600" />
                </div>
                <p className="font-semibold text-lg">Idea</p>
              </div>
              <div className="text-4xl text-primary animate-pulse">→</div>
              <div className="flex flex-col items-center gap-3">
                <div className="w-32 h-32 rounded-2xl bg-purple-100 dark:bg-purple-950 flex items-center justify-center">
                  <Cpu className="h-16 w-16 text-purple-600" />
                </div>
                <p className="font-semibold text-lg">AI Model</p>
              </div>
              <div className="text-4xl text-primary animate-pulse">→</div>
              <div className="flex flex-col items-center gap-3">
                <div className="w-32 h-32 rounded-2xl bg-orange-100 dark:bg-orange-950 flex items-center justify-center">
                  <Factory className="h-16 w-16 text-orange-600" />
                </div>
                <p className="font-semibold text-lg">Manufacturing</p>
              </div>
              <div className="text-4xl text-primary animate-pulse">→</div>
              <div className="flex flex-col items-center gap-3">
                <div className="w-32 h-32 rounded-2xl bg-green-100 dark:bg-green-950 flex items-center justify-center">
                  <Box className="h-16 w-16 text-green-600" />
                </div>
                <p className="font-semibold text-lg">Shipped Product</p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl p-6 shadow-lg border border-border max-w-2xl mx-auto mt-8">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">Factories comply with:</span> ISO, RoHS, and CE where
              required.
            </p>
          </div>
        </div>
      </section>

      <section className="relative z-10 py-20 px-4">
        <div className="max-w-5xl mx-auto text-center space-y-12">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-balance">
            You’ve seen Cursor for code. Lovable for software. Now Buildables for hardware.
          </h2>
          <p className="text-2xl md:text-3xl text-muted-foreground max-w-3xl mx-auto">
            Everyone’s building in the cloud. You’re about to build in real life. Don’t just launch pixels. Launch atoms.
          </p>
          <div className="bg-primary text-primary-foreground rounded-2xl p-12 shadow-xl mt-12">
            <p className="text-2xl md:text-3xl font-bold leading-relaxed">
              The next generation of builders aren’t coders. They’re creators who just chat their ideas into existence.
            </p>
          </div>
        </div>
      </section>

      <section className="relative z-10 py-20 px-4 bg-accent/30">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-4">
            <h2 className="text-4xl md:text-5xl font-bold">Start Building Today</h2>
            <p className="text-xl text-muted-foreground">Choose the plan that fits your needs</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mt-12">
            {pricingPlans.map((plan) => (
              <div
                key={plan.title}
                className={`bg-card rounded-2xl p-8 shadow-lg border ${
                  plan.isFeatured ? "border-2 border-primary" : "border-border"
                } hover:shadow-xl transition-all`}
              >
                <div className="space-y-6">
                  <div>
                    <h3 className="text-2xl font-bold mb-2">{plan.title}</h3>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold">{plan.price}</span>
                      <span className="text-muted-foreground">{plan.period}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                  </div>
                  <div className="space-y-3">
                    {plan.highlights.map((highlight) => (
                      <div key={highlight} className="flex items-start gap-2">
                        <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{highlight}</span>
                      </div>
                    ))}
                  </div>
                  <Button className="w-full rounded-full" onClick={handleSignUp}>
                    {plan.isFeatured ? "Start Building" : "Get Started"}
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12">
            <div className="bg-gradient-to-r from-primary/20 to-accent/40 rounded-2xl p-12 shadow-xl border-2 border-primary/30">
              <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="space-y-4 text-center md:text-left">
                  <h3 className="text-3xl font-bold">Enterprise</h3>
                  <div className="grid md:grid-cols-2 gap-x-8 gap-y-2 mt-6">
                    {[
                      "Dedicated compute",
                      "SLA guarantees",
                      "Priority lane",
                      "Unlimited generations",
                      "Unlimited firmware",
                      "Advanced materials",
                      "Integration support",
                      "Manufacturing handover",
                    ].map((item) => (
                      <div key={item} className="flex items-start gap-2">
                        <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <Button asChild size="lg" className="rounded-full px-12 py-6 text-lg">
                  <Link href="mailto:hello@overhaulsg.com">Contact Us</Link>
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-12">
            <div className="bg-card rounded-2xl p-8 shadow-lg border border-border max-w-3xl mx-auto">
              <h3 className="text-2xl font-bold text-center mb-4">Need More Credits?</h3>
              <p className="text-center text-muted-foreground mb-6">
                Top up anytime at $1 per credit. No subscription required.
              </p>
              <div className="flex justify-center">
                <Button size="lg" className="rounded-full px-8" onClick={handleSignUp}>
                  Buy Credits
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 py-20 px-4 bg-accent/30">
        <div className="max-w-6xl mx-auto text-center space-y-12">
          <h2 className="text-4xl md:text-5xl font-bold">What our users said (unscripted).</h2>
          <div className="overflow-hidden">
            <div className="flex gap-6 animate-scroll">
              {[
                { quote: "It’s like ChatGPT built my product idea.", name: "Jamie Rodriguez", role: "Indie Maker" },
                { quote: "Never thought I’d see my robot design working this fast.", name: "Taylor Kim", role: "Student" },
                { quote: "We went from idea to investor demo in two days.", name: "Jordan Smith", role: "Founder" },
                { quote: "I canceled my CAD subscription.", name: "Casey Martinez", role: "Designer" },
                { quote: "Finally, hardware that doesn’t require a degree.", name: "Morgan Chen", role: "Creator" },
                { quote: "My weird idea is now sitting on my desk. Wild.", name: "Riley Johnson", role: "Hobbyist" },
              ].map((item) => (
                <div key={item.quote} className="flex-shrink-0 w-80">
                  <div className="bg-card rounded-2xl p-8 shadow-lg border border-border h-full">
                    <p className="text-lg font-medium mb-4">&quot;{item.quote}&quot;</p>
                    <div className="text-left">
                      <p className="font-semibold text-sm">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 py-20 px-4">
        <div className="max-w-4xl mx-auto space-y-12">
          <h2 className="text-4xl md:text-5xl font-bold text-center">Still wondering?</h2>
          <div className="space-y-6">
            {faqEntries.map((faq) => (
              <div key={faq.question} className="bg-card rounded-2xl p-8 shadow-lg border border-border">
                <h3 className="text-xl font-bold mb-3">{faq.question}</h3>
                <p className="text-muted-foreground">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 py-32 px-4 bg-gradient-to-b from-background to-primary/10">
        <div className="max-w-5xl mx-auto text-center space-y-12">
          <h2 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight text-balance">You’re imagined it long enough.</h2>
          <p className="text-3xl md:text-4xl font-semibold">
            <span className="rainbow-text">Now it’s time to build it.</span>
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 mt-12">
            <Button
              size="lg"
              className="rounded-full px-12 py-6 text-xl shadow-2xl hover:shadow-primary/50 transition-all"
              onClick={handleSignUp}
            >
              Start Building
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="rounded-full px-12 py-6 text-xl shadow-2xl hover:shadow-primary/50 transition-all bg-transparent"
            >
              <Link href="mailto:hello@overhaulsg.com">Talk to Manufacturing</Link>
            </Button>
          </div>
          <div className="mt-16 bg-card rounded-2xl p-12 shadow-2xl border-2 border-primary/20">
            <div className="aspect-video bg-muted rounded-xl flex items-center justify-center overflow-hidden">
              <video autoPlay loop muted playsInline className="w-full h-full object-cover rounded-xl">
                <source
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/White_Orb_Morphing_Animation-5SIZg8nbki0egBcJmpybZOLqcEZFA2.mp4"
                  type="video/mp4"
                />
                Your browser does not support the video tag.
              </video>
            </div>
          </div>
        </div>
      </section>

      <footer className="relative z-10 py-12 px-4 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-2 gap-8 mb-8">
            <div>
              <h4 className="font-semibold mb-3">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="https://www.instagram.com/buildables.app/" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                    Community
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="https://www.linkedin.com/company/overhaulsg" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="https://www.linkedin.com/company/overhaulsg" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                    Careers
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="text-center text-sm text-muted-foreground">
            Built with ❤️ by Buildables. © {new Date().getFullYear()}
          </div>
        </div>
      </footer>
    </div>
  )
}

function FloatingIcon({
  icon: Icon,
  className,
  color,
  delay = 0,
}: {
  icon: React.ComponentType<{ className?: string }>
  className: string
  color: string
  delay?: number
}) {
  return (
    <div
      className={`absolute ${className} ${color} opacity-40 pointer-events-none`}
      style={{
        animation: `float 6s ease-in-out infinite`,
        animationDelay: `${delay}s`,
      }}
    >
      <Icon className="h-12 w-12 md:h-16 md:w-16" />
    </div>
  )
}




