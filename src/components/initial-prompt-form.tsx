"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { HardDrive, Monitor, Sparkles } from "lucide-react"
import type { Creation } from "@/lib/types"

interface InitialPromptFormProps {
  onSubmit: (creationData: Omit<Creation, "id" | "chatHistory" | "modelParams" | "generatedCode" | "viewMode">) => void
}

export function InitialPromptForm({ onSubmit }: InitialPromptFormProps) {
  const [mode, setMode] = useState<"hardware" | "software">("hardware")
  const [title, setTitle] = useState("")
  const [prompt, setPrompt] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !prompt.trim()) return

    setIsSubmitting(true)
    
    const creationData: Omit<Creation, "id" | "chatHistory" | "modelParams" | "generatedCode" | "viewMode"> = {
      title: title.trim(),
      prompt: prompt.trim(),
      mode,
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

  const handleModeToggle = (checked: boolean) => {
    setMode(checked ? "software" : "hardware")
  }

  return (
    <div className="h-full w-full flex items-center justify-center p-8">
      <div className="w-full max-w-4xl mx-auto text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-6xl font-bold text-gray-900 dark:text-white">Create. Build. Deploy.</h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            {mode === "hardware"
              ? "Transform your ideas into physical products with AI-powered 3D modeling and assembly instructions"
              : "Build real, working software just by describing it"}
          </p>
        </div>

        <div className="flex items-center justify-center space-x-4 p-4 bg-white/50 dark:bg-gray-800/50 rounded-full backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 w-fit mx-auto">
          <Label
            className={`font-medium cursor-pointer ${mode === "hardware" ? "text-indigo-600 dark:text-indigo-400" : "text-gray-500 dark:text-gray-400"}`}
          >
            🔧 Hardware
          </Label>
          <Switch checked={mode === "software"} onCheckedChange={handleModeToggle} />
          <Label
            className={`font-medium cursor-pointer ${mode === "software" ? "text-indigo-600 dark:text-indigo-400" : "text-gray-500 dark:text-gray-400"}`}
          >
            💻 Software
          </Label>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                mode === "hardware"
                  ? "Ask AI to build... (e.g., a contactless water dispenser that activates when your hand is close to the sensor)"
                  : "Ask AI to build... (e.g., a task management app that helps teams collaborate and track project progress)"
              }
              rows={4}
              className="w-full text-lg p-6 rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 resize-none shadow-lg"
              required
            />
          </div>

          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={
              mode === "hardware"
                ? "Project name (e.g., Smart Water Dispenser)"
                : "Project name (e.g., Team Task Manager)"
            }
            className="text-center text-lg p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm focus:border-indigo-500 dark:focus:border-indigo-400"
            required
          />

          <Button
            type="submit"
            disabled={isSubmitting || !title.trim() || !prompt.trim()}
            className="w-full max-w-md mx-auto bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xl py-6 font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Creating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Start Building
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}
