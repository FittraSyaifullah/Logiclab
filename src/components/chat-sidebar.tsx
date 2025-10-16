"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Send, User, Loader2, Wrench, Monitor, ChevronLeft, ChevronRight, Box, FileText, Code, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { useCreationStore } from "@/hooks/use-creation-store"
import { useUserStore } from "@/hooks/use-user-store"
import { useToast } from "@/hooks/use-toast"
import type { Creation, HardwareReports } from "@/lib/types"

// Types for prepared request bodies
type ThreeDLabel = "3D Components" | "Assembly & Parts" | "Firmware & Code"

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
  const [selectedScope, setSelectedScope] = useState<string>("3D Components")
  
  // Use chat history from creation store directly
  const fallbackMessages = activeCreation?.chatHistory || []
  const { toast } = useToast()

  // Function to detect v0 responses based on content pattern
  const isV0Response = (content: string | undefined) => {
    if (!content) return false
    // Check for v0 response patterns: <Thinking> tags or <CodeProject> tags
    return content.includes('<Thinking>') || content.includes('<CodeProject>')
  }

  const mode = activeCreation?.mode || (activeCreation?.softwareData ? "software" : "hardware")
  const apiEndpoint = mode === "hardware" ? "/api/hardware/chat" : "/api/chat/software"
  
  

  const prepareChatBody = (): PreparedBody => {
    const safeCreation = activeCreation || {} as Partial<Creation>

    if (mode === "software") {
      return {
        creationId: safeCreation.id || "",
        creationTitle: safeCreation.title || "Untitled Project",
        creationPrompt: safeCreation.prompt || "",
        chatId: safeCreation.softwareData?.chatId || "",
      }
    }

    const bodyData: HardwarePreparedBody = {
      creationId: safeCreation.id || "",
      creationTitle: safeCreation.title || "Untitled Project",
      creationPrompt: safeCreation.prompt || "",
      scope: selectedScope,
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
    if (!fallbackInput.trim()) return

    const messageToSend = fallbackInput.trim()
    setFallbackInput("")
    setIsLoadingFallback(true)

    // Optimistically add the user message to the UI
    const userMessageObj = { id: Date.now().toString(), role: "user" as const, content: messageToSend }
    const optimisticMessages = [...fallbackMessages, userMessageObj]
    if (activeCreation?.id) {
      updateCreation(activeCreation.id, { ...activeCreation, chatHistory: optimisticMessages })
    }

    // For software mode, use the onSendMessage prop if available
    if (mode === "software" && onSendMessage) {
      try {
        await onSendMessage(messageToSend)
        setIsLoadingFallback(false)
        return
      } catch (error) {
        setIsLoadingFallback(false)
        return
      }
    }

    // For hardware mode or when onSendMessage is not available, use the API endpoint

    try {
      const prepared = prepareChatBody()

      if (mode === "hardware") {
        // Map selectedScope into a routing target
        const threeDLabels = ["3D Components", "Assembly & Parts", "Firmware & Code"] as const
        const isPredefined = (threeDLabels as readonly string[]).includes(selectedScope)
        const target = isPredefined
          ? selectedScope === "3D Components"
            ? { type: "3d-components" as const, reportId: activeCreation?.hardwareReports?.["3d-components"]?.reportId }
            : selectedScope === "Assembly & Parts"
            ? { type: "assembly-parts" as const, reportId: activeCreation?.hardwareReports?.["assembly-parts"]?.reportId }
            : { type: "firmware-code" as const, reportId: activeCreation?.hardwareReports?.["firmware-code"]?.reportId }
          : {
              type: "3d-component" as const,
              componentId:
                "components" in prepared
                  ? prepared.components.find((c) => c.name === selectedScope)?.id
                  : undefined,
              componentName: selectedScope,
            }

        const requestBody = {
          projectId: (activeCreation?.projectId || project?.id || ""),
          creationId: (activeCreation?.id || ""),
          userId: user?.id || "",
          message: messageToSend,
          target,
          context: {
            microcontroller: ("microcontroller" in prepared ? prepared.microcontroller : ""),
            components:
              "components" in prepared
                ? prepared.components.map((c) => ({ id: c.id, name: c.name }))
                : [],
            params: (() => {
              const empty: Record<string, number | string | boolean> = {}
              if ("customParams" in prepared) {
                const entries = prepared.customParams.map((p) => [p.key, p.value] as const)
                return Object.fromEntries(entries) as Record<string, number | string | boolean>
              }
              return empty
            })(),
            creationTitle: prepared.creationTitle,
            creationPrompt: prepared.creationPrompt,
          },
        }

        // Guard: must have a valid projectId
        if (!requestBody.projectId) {
          throw new Error("Missing project context. Please reselect the hardware project and try again.")
        }

        const response = await fetch(apiEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(requestBody),
        })

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

        // Simple approach: reload to pick up DB-updated reports/models
        if (typeof window !== "undefined") {
          setTimeout(() => window.location.reload(), 500)
        }
        return
      }

      // default software branch below
      const requestBody = {
        messages: fallbackMessages.map((msg) => ({
          id: msg?.id || Date.now().toString(),
          role: msg?.role || "user",
          content: msg?.content || "",
        })),
        ...prepared,
      }

      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(requestBody),
      })

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

      if (mode === "software") {
        const responseData = await response.json()

        if (responseData.allMessages && Array.isArray(responseData.allMessages)) {
          const formattedMessages = responseData.allMessages.map((msg: { id?: string; role?: string; content?: string; createdAt?: string }) => ({
            id: msg.id || Date.now().toString(),
            role: msg.role || "assistant",
            content: msg.content || "",
            createdAt: msg.createdAt,
          }))

          if (activeCreation?.id) {
            const updatedCreation = { ...activeCreation, chatHistory: formattedMessages }
            if (responseData.demo && activeCreation.softwareData) {
              updatedCreation.softwareData = {
                ...activeCreation.softwareData,
                demoUrl: responseData.demo,
              }
            }
            updateCreation(activeCreation.id, updatedCreation)
          }
        } else {
          const assistantContent = responseData.message || "Response received from v0"

          const assistantMessage = {
            id: (Date.now() + 1).toString(),
            role: "assistant" as const,
            content: assistantContent,
          }

          const finalMessages = [...fallbackMessages, assistantMessage]

          if (activeCreation?.id) {
            const updatedCreation = { ...activeCreation, chatHistory: finalMessages }
            if (responseData.demo && activeCreation.softwareData) {
              updatedCreation.softwareData = {
                ...activeCreation.softwareData,
                demoUrl: responseData.demo,
              }
            }
            updateCreation(activeCreation.id, updatedCreation)
          }
        }
      } else {
        const reader = response.body?.getReader()
        if (!reader) {
          throw new Error("No response body available")
        }

        let assistantContent = ""
        const assistantMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant" as const,
          content: "",
        }

        // Messages will be updated via creation store

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = new TextDecoder().decode(value)
            const lines = chunk.split("\n")

            for (const line of lines) {
              if (line.startsWith("0:")) {
                try {
                  const data = JSON.parse(line.slice(2))
                  if (data.type === "text-delta" && data.textDelta) {
                    assistantContent += data.textDelta
                    // Messages will be updated via creation store
                  }
                } catch (parseError) {
                }
              }
            }
          }
        } finally {
          reader.releaseLock()
        }

        const finalMessages = [...fallbackMessages, { ...assistantMessage, content: assistantContent }]
        if (activeCreation?.id) {
          updateCreation(activeCreation.id, { ...activeCreation, chatHistory: finalMessages })
        }
        // Messages already updated via creation store
      }
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
                    [...fallbackMessages].reverse().map((message) => (
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
                  {mode === "hardware" && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="w-full h-9 px-3 rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-sm text-neutral-700 dark:text-neutral-200 inline-flex items-center justify-between gap-2 hover:bg-neutral-50 dark:hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          aria-label="Select chat scope"
                        >
                          <span className="inline-flex items-center gap-2">
                            {selectedScope === "3D Components" && <Box className="h-4 w-4 text-indigo-500" />}
                            {selectedScope === "Assembly & Parts" && <FileText className="h-4 w-4 text-indigo-500" />}
                            {selectedScope === "Firmware & Code" && <Code className="h-4 w-4 text-indigo-500" />}
                            <span className="max-w-[12rem] truncate text-left">{selectedScope}</span>
                          </span>
                          <ChevronDown className="h-4 w-4 opacity-70" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-[18rem]">
                        <DropdownMenuLabel className="text-xs text-neutral-500">Scope</DropdownMenuLabel>
                        {(["3D Components","Assembly & Parts","Firmware & Code"] as const).map((label) => (
                          <DropdownMenuItem key={label} onClick={() => setSelectedScope(label)} className="flex items-center gap-2">
                            {label === "3D Components" && <Box className="h-4 w-4 text-indigo-500" />}
                            {label === "Assembly & Parts" && <FileText className="h-4 w-4 text-indigo-500" />}
                            {label === "Firmware & Code" && <Code className="h-4 w-4 text-indigo-500" />}
                            <span>{label}</span>
                          </DropdownMenuItem>
                        ))}
                        {(() => {
                          const reports = (activeCreation?.hardwareReports as HardwareReports | undefined)
                          const comps = (reports?.["3d-components"]?.components ?? []) as Array<{ name?: string }>
                          const names = comps.map((c) => c.name).filter(Boolean)
                          const unique = Array.from(new Set(names)) as string[]
                          return unique.length ? (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuLabel className="text-xs text-neutral-500">Components</DropdownMenuLabel>
                              {unique.map((name) => (
                                <DropdownMenuItem key={name} onClick={() => setSelectedScope(name)}>
                                  {name}
                                </DropdownMenuItem>
                              ))}
                            </>
                          ) : null
                        })()}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
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
