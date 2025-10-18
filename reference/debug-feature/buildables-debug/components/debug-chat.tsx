"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, Paperclip, FileText, Loader2, Cpu, CheckCircle2, FileDown, Download, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLibrary } from "@/lib/library-context"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

type Message = {
  id: string
  role: "user" | "assistant"
  content: string
  hasProjectDoc?: boolean
  showGenerateButton?: boolean
}

export function DebugChat() {
  const { addFiles, files } = useLibrary()
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [inputValue, setInputValue] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [showProjectDocModal, setShowProjectDocModal] = useState(false)
  const [projectDocContent, setProjectDocContent] = useState("")
  const [isGeneratingDoc, setIsGeneratingDoc] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    setIsUploading(true)

    setTimeout(() => {
      setUploadedFiles((prev) => [...prev, ...files])
      addFiles(files)
      setIsUploading(false)
      setUploadSuccess(true)

      setTimeout(() => setUploadSuccess(false), 2000)
    }, 500)
  }

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleViewProjectDoc = (messageId: string) => {
    const message = messages.find((m) => m.id === messageId)
    if (message) {
      setProjectDocContent(message.content)
      setShowProjectDocModal(true)
    }
  }

  const handleDownloadPDF = () => {
    // Create a new window with the document content
    const printWindow = window.open("", "_blank")
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Project Documentation</title>
          <style>
            body {
              font-family: 'Courier New', monospace;
              padding: 40px;
              line-height: 1.6;
              color: #000;
              background: #fff;
            }
            pre {
              white-space: pre-wrap;
              word-wrap: break-word;
              font-size: 11px;
            }
            @media print {
              body { padding: 20px; }
            }
          </style>
        </head>
        <body>
          <pre>${projectDocContent}</pre>
        </body>
      </html>
    `)
    printWindow.document.close()

    // Trigger print dialog
    setTimeout(() => {
      printWindow.print()
    }, 250)
  }

  const handleGenerateProjectDoc = async () => {
    setIsGeneratingDoc(true)

    // Step 1: Pre-analysis - ask clarifying questions
    const preAnalysisPrompt = `I want to generate a comprehensive project document. Please ask me clarifying questions about:
- Project objectives and constraints
- Operating environment and conditions
- Target use cases and users
- Budget and timeline constraints
- Specific requirements or preferences

Ask 3-5 focused questions to gather the information needed for a complete technical specification.`

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: preAnalysisPrompt,
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue("")
    setIsLoading(true)

    const assistantMessageId = (Date.now() + 1).toString()
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
    }

    setMessages((prev) => [...prev, assistantMessage])

    try {
      const libraryContext =
        files.length > 0 ? `\n\nAvailable reference documents in library: ${files.map((f) => f.name).join(", ")}` : ""

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((msg) => ({
            role: msg.role,
            content: msg.content + libraryContext,
          })),
        }),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error("No reader available")
      }

      let buffer = ""
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (line.startsWith("0:")) {
            try {
              const text = JSON.parse(line.slice(2))
              setMessages((prev) =>
                prev.map((msg) => (msg.id === assistantMessageId ? { ...msg, content: msg.content + text } : msg)),
              )
            } catch (e) {
              console.error("[v0] Parse error:", e)
            }
          }
        }
      }
    } catch (error) {
      console.error("[v0] Error:", error)
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId ? { ...msg, content: "Sorry, I encountered an error. Please try again." } : msg,
        ),
      )
    } finally {
      setIsLoading(false)
      setIsGeneratingDoc(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue.trim(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue("")
    setIsLoading(true)

    const assistantMessageId = (Date.now() + 1).toString()
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
    }

    setMessages((prev) => [...prev, assistantMessage])

    try {
      const libraryContext =
        files.length > 0 ? `\n\nAvailable reference documents in library: ${files.map((f) => f.name).join(", ")}` : ""

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((msg) => ({
            role: msg.role,
            content: msg.content + (msg.role === "user" ? libraryContext : ""),
          })),
        }),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error("No reader available")
      }

      let buffer = ""
      let fullContent = ""
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (line.startsWith("0:")) {
            try {
              const text = JSON.parse(line.slice(2))
              fullContent += text
              setMessages((prev) =>
                prev.map((msg) => (msg.id === assistantMessageId ? { ...msg, content: msg.content + text } : msg)),
              )
            } catch (e) {
              console.error("[v0] Parse error:", e)
            }
          }
        }
      }

      const showGenerateButton =
        (fullContent.toLowerCase().includes("design") ||
          fullContent.toLowerCase().includes("build") ||
          fullContent.toLowerCase().includes("create")) &&
        (fullContent.toLowerCase().includes("system") ||
          fullContent.toLowerCase().includes("product") ||
          fullContent.toLowerCase().includes("device")) &&
        !fullContent.includes("## 1. EXECUTIVE SUMMARY")

      const hasProjectDoc =
        fullContent.includes("## 1. EXECUTIVE SUMMARY") ||
        fullContent.includes("## 2. TECHNICAL BACKGROUND") ||
        (fullContent.includes("## ") && fullContent.length > 1000)

      if (hasProjectDoc) {
        setMessages((prev) =>
          prev.map((msg) => (msg.id === assistantMessageId ? { ...msg, hasProjectDoc: true } : msg)),
        )
      } else if (showGenerateButton) {
        setMessages((prev) =>
          prev.map((msg) => (msg.id === assistantMessageId ? { ...msg, showGenerateButton: true } : msg)),
        )
      }
    } catch (error) {
      console.error("[v0] Error:", error)
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId ? { ...msg, content: "Sorry, I encountered an error. Please try again." } : msg,
        ),
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <div className="flex h-full flex-col">
        <ScrollArea ref={scrollRef} className="h-0 flex-1 px-6 py-4">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <div className="max-w-2xl text-center">
                <div className="mb-6 flex justify-center">
                  <div className="rounded-2xl bg-primary/10 p-6">
                    <Cpu className="h-12 w-12 text-primary" />
                  </div>
                </div>
                <h2 className="mb-3 text-2xl font-semibold text-foreground">Welcome to Debug</h2>
                <p className="mb-8 text-balance leading-relaxed text-muted-foreground">
                  Your AI-powered hardware engineering assistant. Ask me to search for components, perform calculations,
                  analyze documents, or generate full project documentation for your hardware ideas.
                </p>
                <div className="grid gap-3 text-left">
                  <Card className="p-4">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">"Find me a 10kΩ resistor with 1% tolerance"</span>
                    </p>
                  </Card>
                  <Card className="p-4">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">"Calculate the current for 12V across 100Ω"</span>
                    </p>
                  </Card>
                  <Card className="p-4">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">
                        "I want to design a portable water filtration system"
                      </span>
                    </p>
                  </Card>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 pb-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn("flex gap-3", message.role === "user" ? "justify-end" : "justify-start")}
                >
                  {message.role === "assistant" && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
                      <Cpu className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                  <div className="flex max-w-[80%] flex-col gap-2">
                    <Card
                      className={cn("p-4", message.role === "user" ? "bg-primary text-primary-foreground" : "bg-card")}
                    >
                      <div className="whitespace-pre-wrap break-words font-mono text-sm leading-relaxed">
                        {message.content}
                      </div>
                    </Card>
                    {message.role === "assistant" && message.showGenerateButton && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleGenerateProjectDoc}
                        disabled={isGeneratingDoc}
                        className="gap-2 self-start bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                      >
                        {isGeneratingDoc ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4" />
                            Generate Full Project Document
                          </>
                        )}
                      </Button>
                    )}
                    {message.role === "assistant" && message.hasProjectDoc && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewProjectDoc(message.id)}
                        className="gap-2 self-start"
                      >
                        <FileDown className="h-4 w-4" />
                        View Project Doc
                      </Button>
                    )}
                  </div>
                  {message.role === "user" && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <span className="text-xs font-medium text-muted-foreground">You</span>
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
                    <Cpu className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <Card className="p-4">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </Card>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        <div className="shrink-0 border-t border-border bg-card p-4">
          {uploadedFiles.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {uploadedFiles.map((file, index) => (
                <div key={index} className="flex items-center gap-2 rounded-lg bg-muted px-3 py-1.5 text-xs">
                  <FileText className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">{file.name}</span>
                  <button onClick={() => removeFile(index)} className="text-muted-foreground hover:text-foreground">
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="*/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              className="shrink-0"
              disabled={isUploading}
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : uploadSuccess ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <Paperclip className="h-4 w-4" />
              )}
            </Button>
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask about components, calculations, or request full project documentation..."
              className="flex-1"
              disabled={isLoading}
            />
            <Button type="submit" size="icon" disabled={isLoading || !inputValue.trim()}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </div>
      </div>

      <Dialog open={showProjectDocModal} onOpenChange={setShowProjectDocModal}>
        <DialogContent className="max-w-5xl h-[80vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>Project Documentation</DialogTitle>
            <DialogDescription>Comprehensive Engineering Specification</DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 h-0 mt-4">
            <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-foreground p-4">
              {projectDocContent}
            </pre>
          </ScrollArea>
          <div className="flex justify-end gap-2 mt-4 pt-4 border-t shrink-0">
            <Button variant="outline" onClick={() => setShowProjectDocModal(false)}>
              Close
            </Button>
            <Button onClick={handleDownloadPDF} className="gap-2">
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
