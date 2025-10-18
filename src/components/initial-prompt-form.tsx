"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Search, ArrowRight, Wrench, Cpu, Zap, Palette, Code, Box, Settings, MessageSquare, Loader2 } from "lucide-react"
import type { Creation } from "@/lib/types"
import { useLandingStore } from "@/hooks/use-landing-store"
import { useTypingPlaceholder } from "@/hooks/use-typing-placeholder"
import { TYPING_PLACEHOLDER_PROMPTS } from "@/constants/typing-prompts"

interface InitialPromptFormProps {
  onSubmit: (creationData: Omit<Creation, "id" | "chatHistory" | "modelParams" | "generatedCode" | "viewMode">) => void
}

export function InitialPromptForm({ onSubmit }: InitialPromptFormProps) {
  const [title, setTitle] = useState("")
  const [prompt, setPrompt] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const animatedPlaceholder = useTypingPlaceholder(TYPING_PLACEHOLDER_PROMPTS, { isActive: !prompt })

  // Consume and prefill prompt from landing store once
  useEffect(() => {
    const value = useLandingStore.getState().consumePendingPrompt()
    if (value && !prompt) {
      setPrompt(value)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !prompt.trim()) return

    setIsSubmitting(true)
    
    const creationData: Omit<Creation, "id" | "chatHistory" | "modelParams" | "generatedCode" | "viewMode"> = {
      title: title.trim(),
      prompt: prompt.trim(),
      mode: "hardware",
      components: [],
      customParams: [],
      microcontroller: "arduino",
    }

    try {
      await onSubmit(creationData)
    } finally {
      setIsSubmitting(false)
    }
  }


  // Styling helpers and floating icon positions reused to match landing hero
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

  const iconPositions: Array<{ top: string; left?: string; right?: string }> = [
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
  ]

  const isSubmitDisabled = isSubmitting || !title.trim() || !prompt.trim()

  return (
    <div className="min-h-svh bg-white relative overflow-hidden grid-background">
      {/* Floating innovation icons */}
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
      <div className="relative z-10 px-4 sm:px-6 pt-12 sm:pt-20 pb-10 text-center max-w-4xl mx-auto">
        {/* Centered Logo and Title */}
        <div className="flex flex-col items-center justify-center mb-8">
          <Image src="/images/Buildables-Logo.png" alt="Buildables" width={64} height={64} className="w-16 h-16 mb-2" />
          <span className="text-5xl font-bold text-black">Buildables</span>
        </div>

        {/* Rainbow Hero Heading */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold mb-4 leading-tight">
          {"Hey! I know what we're gonna build today".split(" ").map((word, index) => (
            <span key={index} className={getRandomColorClass(index)}>
              {word}{" "}
            </span>
          ))}
        </h1>
        <p className="text-base sm:text-xl text-gray-700 mb-8">Create hardware and printable 3d models by chatting with AI.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Prompt textarea styled like hero input */}
          <div className="max-w-2xl mx-auto">
            <div className="relative group">
              <Search className="absolute left-4 top-4 h-5 w-5 text-gray-400 transition-colors duration-300 group-hover:text-orange-500" />
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={animatedPlaceholder}
                rows={5}
                className="w-full pl-12 pr-16 py-4 border-2 border-gray-200 rounded-xl text-left hover:border-orange-300 transition-all duration-300 bg-white shadow-[0_0_12px_rgba(249,115,22,0.25)] hover:shadow-[0_0_20px_rgba(249,115,22,0.4)] focus:shadow-[0_0_20px_rgba(249,115,22,0.4)] focus:border-orange-400 focus:outline-none text-base sm:text-lg resize-y"
                required
              />
              <button
                type="submit"
                disabled={isSubmitDisabled}
                className="absolute right-2 bottom-2 h-10 w-10 p-2 text-white bg-orange-500 rounded-lg border-2 border-orange-500 transition-all duration-300 hover:bg-orange-600 hover:border-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Start building"
              >
                {isSubmitting ? <Loader2 className="h-6 w-6 animate-spin" /> : <ArrowRight className="h-6 w-6" />}
              </button>
            </div>
          </div>

          {/* Project name input */}
          <div className="max-w-2xl mx-auto">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Project name (e.g., Smart Water Dispenser)"
              className="w-full h-14 text-center text-lg px-4 border-2 border-gray-200 rounded-xl bg-white hover:border-orange-300 transition-all duration-300 focus:border-orange-400 focus:outline-none"
              required
            />
          </div>
        </form>
      </div>
    </div>
  )
}
