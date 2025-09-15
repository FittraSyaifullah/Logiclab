"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Copy, Download, FileCode, Clock, Loader2 } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { Creation, CodeVersion } from "@/lib/types"

interface CodeViewerProps {
  creation: Creation
  onCodeUpdate: (code: string) => void
  isGenerating?: boolean
}

export function CodeViewer({ creation, onCodeUpdate, isGenerating = false }: CodeViewerProps) {
  const [activeCode, setActiveCode] = useState("")
  const [activeVersion, setActiveVersion] = useState<CodeVersion | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    const versions = creation.codeVersions ?? []

    if (creation.activeCodeVersion && versions.length > 0) {
      const version = versions.find((v) => v.id === creation.activeCodeVersion)
      if (version) {
        setActiveCode(version.code)
        setActiveVersion(version)
        return
      }
    }

    if (creation.generatedCode) {
      setActiveCode(creation.generatedCode)
      setActiveVersion(null)
    } else if (versions.length > 0) {
      const latest = versions[versions.length - 1]
      setActiveCode(latest.code)
      setActiveVersion(latest)
    }
  }, [creation.generatedCode, creation.codeVersions, creation.activeCodeVersion])

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(activeCode)
      toast({ title: "Code copied!", description: "The code has been copied to your clipboard." })
    } catch (_err) {
      toast({ title: "Failed to copy", description: "Could not copy code to clipboard.", variant: "destructive" })
    }
  }

  const handleDownloadCode = () => {
    const filename = activeVersion
      ? `${creation.title.toLowerCase().replace(/\s+/g, "-")}-${activeVersion.component.toLowerCase().replace(/\s+/g, "-")}${creation.outputFormat}`
      : `${creation.title.toLowerCase().replace(/\s+/g, "-")}${creation.outputFormat}`

    const blob = new Blob([activeCode], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({ title: "Code downloaded!", description: `File saved as ${filename}` })
  }

  const getLanguage = () => {
    if (activeVersion) return activeVersion.language
    switch (creation.outputFormat) {
      case ".ino":
        return "cpp"
      case ".py":
        return "python"
      case ".c":
        return "c"
      default:
        return "text"
    }
  }

  const formatTimestamp = (timestamp: number) => new Date(timestamp).toLocaleString()

  return (
    <>
      <div className="h-full bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCode className="h-5 w-5 text-indigo-500" />
            <div>
              <h3 className="font-semibold">Code Viewer</h3>
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground">
                  {creation.microcontroller?.toUpperCase() || "ARDUINO"} • {creation.outputFormat || ".ino"}
                </p>
                {activeVersion && (
                  <>
                    <Badge variant="outline" className="text-xs">{activeVersion.component}</Badge>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatTimestamp(activeVersion.timestamp)}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleCopyCode} variant="outline" size="sm" disabled={!activeCode || isGenerating}>
              <Copy className="mr-2 h-4 w-4" />
              Copy
            </Button>
            <Button onClick={handleDownloadCode} variant="outline" size="sm" disabled={!activeCode || isGenerating}>
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          </div>
        </div>

        <div className="flex-1 relative">
          {isGenerating ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin text-indigo-500" />
                <p className="text-lg font-medium">Generating code...</p>
                <p className="text-sm text-muted-foreground">AI is writing your hardware code</p>
              </div>
            </div>
          ) : activeCode ? (
            <ScrollArea className="h-full">
              <pre className="p-4 text-sm font-mono bg-neutral-50 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 overflow-x-auto whitespace-pre-wrap">
                <code className={`language-${getLanguage()}`}>{activeCode}</code>
              </pre>
            </ScrollArea>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <FileCode className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No code generated yet</p>
                <p className="text-sm">Chat with the AI to generate code for your project</p>
                <p className="text-xs mt-2 text-indigo-600">Try asking: &quot;Generate the {creation.microcontroller} code for this project&quot;</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <Dialog open={isGenerating}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
              Generating Code
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-4">
            <p className="text-muted-foreground">
              AI is analyzing your project and writing custom {creation.microcontroller} code...
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}


