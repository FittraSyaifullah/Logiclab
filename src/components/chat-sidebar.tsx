"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Send, User, Loader2, Wrench, Monitor, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { useCreationStore } from "@/hooks/use-creation-store"
import { useUserStore } from "@/hooks/use-user-store"
import { useToast } from "@/hooks/use-toast"
import type { Creation } from "@/lib/types"

// Types for prepared request bodies

interface SoftwarePreparedBody {
  creationId: string
  creationTitle: string
  creationPrompt: string
  chatId: string
}

interface HardwarePreparedBody {
  creationId: string
  creationTitle: string
  creationPrompt: string
  scope: string
  microcontroller: string
  components: Array<{ id: string; name: string; prompt: string; description: string }>
  customParams: Array<{
    key: string
    label: string
    type: "number" | "string" | "boolean"
    value: number | string | boolean
    min: number
    max: number
    step: number
  }>
}

type PreparedBody = SoftwarePreparedBody | HardwarePreparedBody

interface ChatSidebarProps {
  onLogout: () => void
  onSendMessage?: (message: string) => void
}

export function ChatSidebar({ onLogout, onSendMessage }: ChatSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const { creations, activeCreationId, updateCreation } = useCreationStore()
  const { user, project } = useUserStore()
  const activeCreation = (creations ?? []).find((c) => c.id === activeCreationId)

  const [fallbackInput, setFallbackInput] = useState("")
  const [isLoadingFallback, setIsLoadingFallback] = useState(false)
  const [selectedScope, setSelectedScope] = useState<string>("")
  
  // Use chat history from creation store directly
  const fallbackMessages = activeCreation?.chatHistory || []
  const { toast } = useToast()

  // Function to detect v0 responses based on content pattern
  const isV0Response = (content: string | undefined) => {
    if (!content) return false
    // Check for v0 response patterns: <Thinking> tags or <CodeProject> tags
    return content.includes('<Thinking>') || content.includes('<CodeProject>')
  }

  const mode = "hardware"
  const apiEndpoint = "/api/hardware/chat"
  
  

  const prepareChatBody = (): PreparedBody => {
    const safeCreation = activeCreation || {} as Partial<Creation>

    // software mode removed

    const bodyData: HardwarePreparedBody = {
      creationId: safeCreation.id || "",
      creationTitle: safeCreation.title || "Untitled Project",
      creationPrompt: safeCreation.prompt || "",
      scope: "",
      microcontroller: safeCreation.microcontroller || "arduino",
      components: Array.isArray(safeCreation.components)
        ? safeCreation.components.map((comp) => ({
            id: comp?.id || "",
            name: comp?.name || "Unnamed",
            prompt: comp?.prompt || "",
            description: comp?.description || "",
          }))
        : [],
      customParams: Array.isArray(safeCreation.customParams)
        ? safeCreation.customParams.map((param) => ({
            key: param?.key || "",
            label: param?.label || "",
            type: param?.type || "number",
            value: param?.value ?? 0,
            min: param?.min ?? 0,
            max: param?.max ?? 100,
            step: param?.step ?? 1,
          }))
        : [],
    }

    return bodyData
  }

  const handleFallbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('[CHAT-SIDEBAR] Submit handler called:', { input: fallbackInput, mode, hasActiveCreation: !!activeCreation, activeCreationId: activeCreation?.id, activeCreationProjectId: activeCreation?.projectId })
    
    if (!fallbackInput.trim()) {
      console.log('[CHAT-SIDEBAR] Empty input, returning')
      return
    }

    const messageToSend = fallbackInput.trim()
    setFallbackInput("")
    setIsLoadingFallback(true)

    // Optimistically add the user message to the UI
    const userMessageObj = { id: Date.now().toString(), role: "user" as const, content: messageToSend }
    const optimisticMessages = [...fallbackMessages, userMessageObj]
    if (activeCreation?.id) {
      updateCreation(activeCreation.id, { ...activeCreation, chatHistory: optimisticMessages })
    }

    // software mode removed

    // For hardware mode or when onSendMessage is not available, use the API endpoint

    try {
      const prepared = prepareChatBody()

      if (mode === "hardware") {
        // Resolve the hardwareId from currently loaded reports on the creation
        const reports = activeCreation?.hardwareReports as unknown as { [k: string]: { reportId?: string } } | undefined
        const hardwareId = (
          reports?.['assembly-parts']?.reportId ||
          reports?.['3d-components']?.reportId ||
          reports?.['firmware-code']?.reportId
        ) as string | undefined

        const strictProjectId = activeCreation?.projectId || ""
        const requestBody = { projectId: strictProjectId, hardwareId, creationId: (activeCreation?.id || ""), userId: user?.id || "", message: messageToSend }

        console.log('[CHAT-SIDEBAR] Hardware chat request body:', { projectId: requestBody.projectId, hardwareId: requestBody.hardwareId, activeCreationProjectId: activeCreation?.projectId, hasUser: !!user?.id })

        if (!requestBody.projectId) {
          console.error('[CHAT-SIDEBAR] Missing projectId (no global fallback):', { activeCreationProjectId: activeCreation?.projectId, activeCreationId: activeCreation?.id })
          throw new Error("Missing project context. Please reselect the hardware project from the sidebar and try again.")
        }

        const response = await fetch(apiEndpoint, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(requestBody) })

        if (!response.ok) {
          const errorText = await response.text()
          let errorData
          try {
            errorData = JSON.parse(errorText)
          } catch {
            errorData = { error: errorText || "Unknown error" }
          }
          throw new Error(`HTTP ${response.status}: ${errorData.error || response.statusText}`)
        }

        const result = (await response.json()) as { [k: string]: unknown }
        const aiResponse = (result["AI response"] as string) || "Changes applied."

        const assistantMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant" as const,
          content: aiResponse,
        }
        const finalMessages = [...optimisticMessages, assistantMessage]
        if (activeCreation?.id) {
          updateCreation(activeCreation.id, { ...activeCreation, chatHistory: finalMessages })
        }

        // In-place refresh: fetch latest hardware reports for this project/report and update the store so viewer re-renders
        try {
          const reportsObj = activeCreation?.hardwareReports as unknown as { [k: string]: { reportId?: string } } | undefined
          const currentHardwareId = (
            reportsObj?.['assembly-parts']?.reportId ||
            reportsObj?.['3d-components']?.reportId ||
            reportsObj?.['firmware-code']?.reportId
          ) as string | undefined
          const safeProjectId = String(activeCreation?.projectId || '')
          const safeUserId = String(user?.id || '')
          const params = currentHardwareId
            ? `projectId=${encodeURIComponent(safeProjectId)}&userId=${encodeURIComponent(safeUserId)}&reportId=${encodeURIComponent(currentHardwareId)}`
            : `projectId=${encodeURIComponent(safeProjectId)}&userId=${encodeURIComponent(safeUserId)}`
          const reportsResp = await fetch(`/api/hardware/reports?${params}`, { cache: 'no-store' })
          if (reportsResp.ok && activeCreation?.id) {
            const reportsData = await reportsResp.json()
            updateCreation(activeCreation.id, { hardwareReports: reportsData.reports || {} })
          }
        } catch {}

        return
      }

      // streaming/software branch removed
    } catch (error) {

      let errorMessage = "Failed to send message. Please try again."
      if (error instanceof Error) {
        if (error.message.includes("Failed to fetch")) {
          errorMessage = "Network error. Please check your connection and try again."
        } else if (error.message.includes("500")) {
          errorMessage = "Server error. The AI service may be temporarily unavailable."
        } else if (error.message.includes("401") || error.message.includes("403")) {
          errorMessage = "Authentication error. Please contact support."
        } else if (error.message.includes("400")) {
          errorMessage = "Invalid request. Please try rephrasing your message."
        }
      }

      toast({
        title: "Chat Error",
        description: errorMessage,
        variant: "destructive",
      })

      // Messages already updated via creation store
    } finally {
      setIsLoadingFallback(false)
    }
  }

  return (
    <div
      className={cn(
        "flex flex-col h-full shrink-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-r border-slate-200/40 dark:border-slate-700/40 transition-all duration-300",
        isCollapsed ? "w-16" : "w-80",
      )}
    >
      <div className="flex items-center justify-between p-4 border-b border-slate-200/30 dark:border-slate-700/30">
        {!isCollapsed && (
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {activeCreation ? `Chat: ${activeCreation.title}` : "Select a Creation"}
          </h2>
        )}
        <Button variant="ghost" size="sm" onClick={() => setIsCollapsed(!isCollapsed)} className="h-8 w-8 p-0 ml-auto">
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {activeCreation && !isCollapsed ? (
        <div className="flex-1 flex flex-col">
          <Card className="flex-1 flex flex-col m-3 mb-0">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  {mode === "hardware" ? (
                    <>
                      <Wrench className="h-4 w-4 text-indigo-500" />
                      Hardware AI
                    </>
                  ) : (
                    <>
                      <Monitor className="h-4 w-4 text-indigo-500" />
                      Software AI
                    </>
                  )}
                </CardTitle>
                {/*<Badge variant="outline" className="text-xs">
                  {mode === "hardware" ? "GPT-4" : "v0"}
                </Badge>*/}
              </div>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col p-0">
              <ScrollArea className="flex-1 px-3" style={{ maxHeight: "calc(100dvh - 200px)" }}>
                <div className="space-y-3 py-2">
                  {fallbackMessages && fallbackMessages.length > 0 ? (
                    fallbackMessages.map((message) => (
                      <div
                        key={message?.id || Math.random()}
                        className={cn("flex gap-2 text-sm", message?.role === "user" ? "justify-end" : "justify-start")}
                      >
                        <div
                          className={cn("flex gap-2 max-w-[85%]", message?.role === "user" ? "flex-row-reverse" : "flex-row")}
                        >
                          <div
                            className={cn(
                              "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                              message?.role === "user"
                                ? "bg-indigo-500 text-white"
                                : isV0Response(message?.content)
                                ? "bg-green-500 text-white"
                                : "bg-neutral-200 dark:bg-neutral-700",
                            )}
                          >
                            {message?.role === "user" ? (
                              <User className="h-4 w-4" />
                            ) : isV0Response(message?.content) ? (
                              <Monitor className="h-4 w-4" />
                            ) : mode === "hardware" ? (
                              <Wrench className="h-4 w-4" />
                            ) : (
                              <Monitor className="h-4 w-4" />
                            )}
                          </div>
                          <div
                            className={cn(
                              "rounded-lg px-3 py-2",
                              message?.role === "user"
                                ? "bg-indigo-500 text-white"
                                : isV0Response(message?.content)
                                ? "bg-white text-gray-900 border border-gray-200"
                                : "bg-neutral-100 dark:bg-neutral-800",
                            )}
                          >
                            <p className="whitespace-pre-wrap text-sm">{message?.content || ""}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      <p className="text-sm">Start a conversation about your {mode} project</p>
                    </div>
                  )}

                  {isLoadingFallback && (
                    <div className="flex gap-2 text-sm justify-start">
                      <div className="flex gap-2 max-w-[85%]">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-neutral-200 dark:bg-neutral-700">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                        <div className="rounded-lg px-3 py-2 bg-neutral-100 dark:bg-neutral-800">
                          <span className="text-sm">AI is thinking...</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Sticky input form at the bottom - positioned outside ScrollArea */}
              <div
                className="sticky bottom-0 p-2 sm:p-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] bg-white dark:bg-slate-900 border-t border-neutral-200 dark:border-neutral-700 z-10"
                style={{
                  boxShadow: '0 -8px 16px -4px rgba(0, 0, 0, 0.1), 0 -4px 6px -2px rgba(0, 0, 0, 0.05)'
                }}
              >
                <div className="flex flex-col gap-2">
                  {/* Dropdown removed: single unified hardware edit-project flow */}
                  <form onSubmit={handleFallbackSubmit} className="flex gap-2 items-center">
                    <Input
                      value={fallbackInput}
                      onChange={(e) => setFallbackInput(e.target.value)}
                      placeholder="Ask about your project..."
                      disabled={isLoadingFallback}
                      className="flex-1 shadow-sm border-neutral-300 dark:border-neutral-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 text-sm"
                    />
                    <Button
                      type="submit"
                      size="sm"
                      disabled={isLoadingFallback || !fallbackInput.trim()}
                      className="bg-indigo-500 hover:bg-indigo-600 shadow-md transition-all duration-200 hover:shadow-lg hover:scale-105 px-2 sm:px-3"
                    >
                      {isLoadingFallback ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </form>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : !isCollapsed ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center text-muted-foreground">
            <Monitor className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">Select a creation to start chatting</p>
          </div>
        </div>
      ) : null}
    </div>
  )
}
