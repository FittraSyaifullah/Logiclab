"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
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

  return (
    <div className="h-full w-full flex items-center justify-center p-6">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
            Create Something Amazing
          </CardTitle>
          <p className="text-slate-600 dark:text-slate-400">
            Describe your idea and let AI help you build it
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Mode Selection */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                What do you want to build?
              </label>
              <ToggleGroup
                type="single"
                value={mode}
                onValueChange={(value) => value && setMode(value as "hardware" | "software")}
                className="justify-center"
              >
                <ToggleGroupItem value="hardware" className="data-[state=on]:bg-orange-500 data-[state=on]:text-white">
                  <HardDrive className="h-4 w-4 mr-2" />
                  Hardware
                </ToggleGroupItem>
                <ToggleGroupItem value="software" className="data-[state=on]:bg-orange-500 data-[state=on]:text-white">
                  <Monitor className="h-4 w-4 mr-2" />
                  Software
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            {/* Project Title */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Project Title
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a descriptive title for your project"
                required
              />
            </div>

            {/* Project Description */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Project Description
              </label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe what you want to build in detail. Include features, functionality, and any specific requirements..."
                className="min-h-[120px] resize-none"
                required
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isSubmitting || !title.trim() || !prompt.trim()}
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white transition-all duration-300 hover:scale-105 hover:shadow-lg"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Create Project
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
