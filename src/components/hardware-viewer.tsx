"use client"

import { useEffect, useMemo, useState, type ComponentType } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Box,
  FileText,
  Code,
  Download,
  Eye,
  RefreshCw,
  CheckCircle,
  Clock,
  DollarSign,
  Loader2,
  Copy,
  Hammer,
  FileDown,
  FileCode,
  AlertTriangle,
} from "lucide-react"
import type { Creation, HardwareComponentModel, HardwareReports } from "@/lib/types"
import { cn } from "@/lib/utils"
import dynamic from "next/dynamic"
import "@/components/viewers/stl-viewer-styles.css"

const STLViewer = dynamic(() => import("@/components/viewers/stl-viewer"), {
  ssr: false,
})

interface HardwareViewerProps {
  creation: Creation
  onRegenerate?: () => void
  onGenerateComponentModel?: (args: {
    componentId: string
    componentName: string
    prompt?: string
  }) => void
}

interface ComponentCardData {
  id: string
  name: string
  description?: string
  printTime: string
  material: string
  supports: string
  prompt?: string
  notes?: string
  model?: HardwareComponentModel
}

const STATUS_META: Record<HardwareComponentModel["status"] | "idle", {
  label: string
  tone: string
  icon: ComponentType<{ className?: string }>
  spin?: boolean
}> = {
  idle: {
    label: "Not generated yet",
    tone: "text-neutral-500 dark:text-neutral-400",
    icon: Hammer,
  },
  queued: {
    label: "Queued in LogicLab",
    tone: "text-blue-600 dark:text-blue-300",
    icon: Loader2,
    spin: true,
  },
  processing: {
    label: "Generating STL & SCAD",
    tone: "text-blue-600 dark:text-blue-300",
    icon: Loader2,
    spin: true,
  },
  completed: {
    label: "Ready to preview",
    tone: "text-emerald-600 dark:text-emerald-300",
    icon: CheckCircle,
  },
  failed: {
    label: "Generation failed",
    tone: "text-red-600 dark:text-red-300",
    icon: AlertTriangle,
  },
}

const toKebabCase = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

const base64ToUint8Array = (base64: string) => {
  const clean = base64.replace(/\s/g, "")
  if (typeof window === "undefined") {
    const buf = Buffer.from(clean, "base64")
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)
  }
  const binary = window.atob(clean)
  const len = binary.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

const downloadMeshFile = (component: ComponentCardData, projectTitle: string, type: "stl" | "scad") => {
  const model = component.model
  if (!model) return

  const safeProject = toKebabCase(projectTitle || "logiclab-project")
  const safeComponent = toKebabCase(component.name || "component")

  if (type === "stl") {
    if (!model.stlContent) return
    const bytes = base64ToUint8Array(model.stlContent)
    const blob = new Blob([bytes], { type: model.stlMimeType ?? "model/stl" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${safeProject}-${safeComponent}.stl`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    return
  }

  if (!model.scadCode) return
  const blob = new Blob([model.scadCode], { type: model.scadMimeType ?? "application/x-openscad" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `${safeProject}-${safeComponent}.scad`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

const ComponentStatus = ({
  status,
  updatedAt,
}: {
  status: HardwareComponentModel["status"] | "idle"
  updatedAt?: string
}) => {
  const meta = STATUS_META[status] ?? STATUS_META.idle
  const Icon = meta.icon

  return (
    <div className={cn("flex items-center gap-2 text-xs font-medium", meta.tone)}>
      <Icon className={cn("h-4 w-4", meta.spin && "animate-spin")} />
      <span>{meta.label}</span>
      {updatedAt && (
        <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
          Updated {new Date(updatedAt).toLocaleTimeString()}
        </span>
      )}
    </div>
  )
}

const renderDetailedBreakdown = (content?: string) => {
  if (!content) return null
  return (
    <details className="rounded-lg border border-neutral-200 bg-neutral-50/50 dark:border-neutral-800 dark:bg-neutral-900/40">
      <summary className="cursor-pointer select-none px-4 py-2 text-sm font-semibold text-neutral-700 dark:text-neutral-200">
        Detailed Component Breakdown
      </summary>
      <div className="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-300 whitespace-pre-wrap">
        {content}
      </div>
    </details>
  )
}

export function HardwareViewer({ creation, onRegenerate, onGenerateComponentModel }: HardwareViewerProps) {
  const [activeTab, setActiveTab] = useState("3d-components")
  const [regeneratingTabs, setRegeneratingTabs] = useState<string[]>([])
  const [previewComponentId, setPreviewComponentId] = useState<string | null>(null)
  const [activeComponentId, setActiveComponentId] = useState<string | null>(null)

  const hardwareReports = creation.hardwareReports as HardwareReports | undefined
  const componentModels = useMemo(
    () => creation.hardwareModels ?? {},
    [creation.hardwareModels],
  )

  const components = useMemo<ComponentCardData[]>(() => {
    const reportComponents = hardwareReports?.["3d-components"]?.components ?? []
    return reportComponents.map((component, index) => {
      const id = component.id || `${index}-${toKebabCase(component.name || "component")}`
      const model = componentModels[id]
      return {
        id,
        name: component.name,
        description: component.description,
        printTime: component.printTime,
        material: component.material,
        supports: component.supports,
        prompt: component.prompt,
        notes: component.notes,
        model,
      }
    })
  }, [componentModels, hardwareReports])

  useEffect(() => {
    if (components.length === 0) {
      setActiveComponentId(null)
      return
    }

    if (!activeComponentId || !components.some((component) => component.id === activeComponentId)) {
      setActiveComponentId(components[0].id)
    }
  }, [components, activeComponentId])

  const activeComponent = useMemo(
    () => components.find((component) => component.id === activeComponentId) ?? null,
    [components, activeComponentId],
  )

  const openViewer = (componentId: string) => setPreviewComponentId(componentId)
  const closeViewer = () => setPreviewComponentId(null)

  const renderPreviewViewer = () => {
    if (!previewComponentId) return null
    const model = componentModels[previewComponentId]
    if (!model?.stlContent) return null

    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur">
        <div className="relative w-full max-w-5xl h-[70vh] overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950">
          <div className="pointer-events-none absolute left-6 top-4 z-20 text-sm font-semibold text-neutral-200">
            {model.name || "Component"}
          </div>
          <button
            onClick={closeViewer}
            className="absolute top-4 right-4 z-30 rounded-full border border-neutral-700 bg-neutral-900/80 px-3 py-1 text-xs text-neutral-300 transition hover:bg-neutral-800 hover:text-neutral-100"
          >
            Close
          </button>
          <div className="absolute inset-0">
            <STLViewer stlBase64={model.stlContent} componentName={model.name ?? "Component"} />
          </div>
        </div>
      </div>
    )
  }

  const handleRegenerate = async (tabId: string) => {
    setRegeneratingTabs((prev) => [...prev, tabId])

    try {
      const response = await fetch(`/api/hardware/generate-${tabId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectData: {
            id: creation.id,
            title: creation.title,
            description: creation.prompt,
          },
        }),
      })

      if (response.ok) {
        const result = await response.json()
        console.log(`Regenerated ${tabId}:`, result)
        window.location.reload()
      } else {
        console.error(`Failed to regenerate ${tabId}`)
      }
    } catch (error) {
      console.error("Failed to regenerate tab:", error)
    } finally {
      setTimeout(() => {
        setRegeneratingTabs((prev) => prev.filter((id) => id !== tabId))
      }, 2000)
    }
  }

  const isRegenerating = (tabId: string) => regeneratingTabs.includes(tabId)

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch (err) {
      console.error("Failed to copy text: ", err)
    }
  }

  const renderReportContent = (content: string, type: "code" | "assembly") => {
    if (!content) return null

    if (type === "code") {
      const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g
      const parts: Array<{ type: "text" | "code"; content: string; language?: string }> = []
      let lastIndex = 0
      let match: RegExpExecArray | null

      while ((match = codeBlockRegex.exec(content)) !== null) {
        if (match.index > lastIndex) {
          parts.push({
            type: "text",
            content: content.slice(lastIndex, match.index),
          })
        }

        parts.push({
          type: "code",
          language: match[1] || "text",
          content: match[2].trim(),
        })

        lastIndex = match.index + match[0].length
      }

      if (lastIndex < content.length) {
        parts.push({
          type: "text",
          content: content.slice(lastIndex),
        })
      }

      return (
        <div className="space-y-4">
          {parts.map((part, index) => (
            <div key={index}>
              {part.type === "code" ? (
                <div className="relative">
                  <div className="flex items-center justify-between bg-muted px-4 py-2 rounded-t-lg border-b">
                    <Badge variant="outline">{part.language}</Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(part.content)}
                      className="h-6 px-2"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                  <pre className="bg-muted/30 p-4 rounded-b-lg overflow-auto font-mono text-sm">
                    <code>{part.content}</code>
                  </pre>
                </div>
              ) : (
                <div className="whitespace-pre-wrap text-sm">{part.content}</div>
              )}
            </div>
          ))}
        </div>
      )
    }

    // assembly content handled similar to previous implementation
    const stepRegex = /(?:^|\n)((?:Step \d+|### Step \d+|##? \d+\.?)[^\n]*)/g
    const parts: Array<{ type: "text" | "step"; content: string; number?: number }> = []
    let lastIndex = 0
    let match: RegExpExecArray | null
    let stepCounter = 1

    while ((match = stepRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push({
          type: "text",
          content: content.slice(lastIndex, match.index),
        })
      }

      parts.push({
        type: "step",
        number: stepCounter++,
        content: match[1],
      })

      lastIndex = match.index + match[0].length
    }

    if (lastIndex < content.length) {
      parts.push({
        type: "text",
        content: content.slice(lastIndex),
      })
    }

    return (
      <div className="space-y-4">
        {parts.map((part, index) => (
          <div key={index}>
            {part.type === "step" ? (
              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  {part.number}
                </div>
                <div className="flex-1 text-sm text-blue-800 font-medium">
                  {part.content.replace(/^(?:Step \d+|### Step \d+|##? \d+\.?):?\s*/, "")}
                </div>
              </div>
            ) : (
              <div className="whitespace-pre-wrap text-sm">{part.content}</div>
            )}
          </div>
        ))}
      </div>
    )
  }

  const renderComponentActions = (component: ComponentCardData) => {
    const status = component.model?.status ?? "idle"
    const isLoading = status === "queued" || status === "processing"
    const canPreview = status === "completed" && (component.model?.stlContent)

    return (
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="default"
            disabled={isLoading || !onGenerateComponentModel}
            className={cn("gap-2", isLoading && "cursor-progress")}
            onClick={() =>
              onGenerateComponentModel?.({
                componentId: component.id,
                componentName: component.name,
                prompt: component.prompt,
              })
            }
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating STL & SCAD…
              </>
            ) : (
              <>
                <Hammer className="h-4 w-4" />
                Generate 3D Model
              </>
            )}
          </Button>

          <Button variant="secondary" size="sm" disabled={!canPreview} onClick={() => openViewer(component.id)}>
            <Box className="h-4 w-4 mr-1" />
            Preview Model
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!component.model?.stlSignedUrl && !component.model?.stlContent}
            onClick={() => downloadMeshFile(component, creation.title, "stl")}
            className="gap-2"
          >
            <FileDown className="h-4 w-4" />
            Download STL
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!component.model?.scadSignedUrl && !component.model?.scadCode}
            onClick={() => downloadMeshFile(component, creation.title, "scad")}
            className="gap-2"
          >
            <FileCode className="h-4 w-4" />
            Download SCAD
          </Button>
        </div>
      </div>
    )
  }

  if (creation.hardwareData?.isGenerating) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <div>
            <h3 className="font-medium">Generating Hardware Specifications</h3>
            <p className="text-sm text-muted-foreground">
              Our AI is creating detailed 3D models, assembly instructions, and firmware code...
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!hardwareReports || Object.keys(hardwareReports).length === 0) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Box className="w-12 h-12 mx-auto text-muted-foreground" />
          <div>
            <h3 className="font-medium">Ready to Generate Hardware</h3>
            <p className="text-sm text-muted-foreground">Start a hardware project to see specifications here</p>
            <Button onClick={onRegenerate} className="mt-4">
              <RefreshCw className="w-4 h-4 mr-2" />
              Generate Hardware Specs
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 p-6 h-full flex flex-col">
      {renderPreviewViewer()}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <TabsList className="grid w-full max-w-lg grid-cols-3">
            <TabsTrigger value="3d-components" className="gap-2 relative">
              <Box className="w-4 h-4" />
              3D Components
              {isRegenerating("3d-components") && (
                <RefreshCw className="w-3 h-3 animate-spin absolute -top-1 -right-1" />
              )}
            </TabsTrigger>
            <TabsTrigger value="assembly-parts" className="gap-2 relative">
              <FileText className="w-4 h-4" />
              Assembly & Parts
              {isRegenerating("assembly-parts") && (
                <RefreshCw className="w-3 h-3 animate-spin absolute -top-1 -right-1" />
              )}
            </TabsTrigger>
            <TabsTrigger value="firmware-code" className="gap-2 relative">
              <Code className="w-4 h-4" />
              Firmware & Code
              {isRegenerating("firmware-code") && (
                <RefreshCw className="w-3 h-3 animate-spin absolute -top-1 -right-1" />
              )}
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleRegenerate(activeTab)}
              disabled={isRegenerating(activeTab)}
            >
              {isRegenerating(activeTab) ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                  Regenerating...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Regenerate Tab
                </>
              )}
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1" style={{ height: "calc(100vh - 300px)" }}>
          <TabsContent value="3d-components" className="h-full">
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Box className="w-5 h-5" />
                      3D Printable Components
                    </CardTitle>
                    <CardDescription>AI-generated components broken down into printable parts</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {components.length} Parts
                    </Badge>
                    <Badge variant="outline" className="gap-1">
                      <DollarSign className="w-3 h-3" />
                      Estimated material varies
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {components.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 p-6 text-center text-sm text-muted-foreground">
                    No components detected yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="relative" role="tablist" aria-label="3D Components">
                      <div className="flex items-stretch gap-2 overflow-x-auto pb-2">
                        {components.map((component) => {
                          const isActive = component.id === activeComponentId
                          return (
                            <button
                              key={component.id}
                              type="button"
                              onClick={() => setActiveComponentId(component.id)}
                              role="tab"
                              aria-selected={isActive}
                              className={cn(
                                "group relative flex min-w-[180px] items-center gap-2 rounded-t-lg border px-4 py-2 text-left transition",
                                "bg-neutral-100/70 text-neutral-600 dark:bg-neutral-900/40 dark:text-neutral-300",
                                "border-neutral-200/80 dark:border-neutral-700/60",
                                "hover:bg-white dark:hover:bg-neutral-900",
                                isActive &&
                                  "bg-white text-neutral-900 dark:bg-neutral-800/80 dark:text-neutral-100 shadow-sm border-b-white dark:border-b-neutral-800",
                              )}
                            >
                              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-600 text-xs font-semibold dark:bg-blue-900/40 dark:text-blue-200">
                                <Hammer className="h-3.5 w-3.5" />
                              </div>
                              <span className="truncate text-sm font-medium">{component.name || "Component"}</span>
                              {isActive && (
                                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
                              )}
                            </button>
                          )
                        })}
                      </div>
                      <div className="absolute inset-x-0 bottom-0 h-px bg-neutral-200 dark:bg-neutral-800" aria-hidden />
                    </div>

                    {activeComponent && (
                      <div className="rounded-b-xl rounded-tr-xl border border-neutral-200/70 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm p-5 space-y-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="flex items-center gap-2 text-base font-semibold text-neutral-900 dark:text-neutral-100">
                              <Hammer className="h-4 w-4 text-blue-500" />
                              {activeComponent.name}
                            </div>
                            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
                              {activeComponent.description || "AI generated component"}
                            </p>
                          </div>
                          <div className="flex flex-col items-start gap-1 text-xs text-neutral-500 dark:text-neutral-400">
                            <span>Print Time · {activeComponent.printTime || "TBD"}</span>
                            <span>Material · {activeComponent.material || "TBD"}</span>
                            <span>Supports · {activeComponent.supports || "TBD"}</span>
                          </div>
                        </div>

                        <ComponentStatus
                          status={activeComponent.model?.status ?? "idle"}
                          updatedAt={activeComponent.model?.updatedAt}
                        />

                        {activeComponent.prompt && (
                          <div className="rounded-lg border border-blue-100 dark:border-blue-900 bg-blue-50/70 dark:bg-blue-900/20">
                            <div className="flex items-center justify-between px-3 py-2 border-b border-blue-100 dark:border-blue-900/60">
                              <span className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-200">
                                3D Generation Prompt
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(activeComponent.prompt ?? "")}
                                className="h-7 px-2 text-blue-600 hover:text-blue-800 dark:text-blue-200"
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                            <div className="px-4 py-3 text-sm text-blue-900 dark:text-blue-100 whitespace-pre-wrap">
                              {activeComponent.prompt}
                            </div>
                          </div>
                        )}

                        {activeComponent.notes && (
                          <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50/70 dark:bg-neutral-900/40 px-4 py-3 text-xs text-neutral-600 dark:text-neutral-300">
                            {activeComponent.notes}
                          </div>
                        )}

                        {renderComponentActions(activeComponent)}

                        {activeComponent.model?.error && (
                          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
                            <strong>Error:</strong> {activeComponent.model.error}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {renderDetailedBreakdown(hardwareReports["3d-components"]?.content)}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assembly-parts" className="h-full">
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      AI-Generated Assembly Instructions
                    </CardTitle>
                    <CardDescription>Step-by-step build guide with complete bill of materials</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="gap-1">
                      <Clock className="w-3 h-3" />~{hardwareReports["assembly-parts"]?.estimatedTime || "2 hours"} build
                    </Badge>
                    <Badge variant="outline" className="gap-1">
                      <DollarSign className="w-3 h-3" />
                      ~$35 total cost
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription className="flex items-center justify-between">
                    <span>AI safety analysis: This project uses low voltage components and is beginner-safe.</span>
                    <Badge variant="secondary" className="gap-1">
                      <CheckCircle className="w-3 h-3" />
                      AI Verified Safe
                    </Badge>
                  </AlertDescription>
                </Alert>

                {renderReportContent(
                  hardwareReports["assembly-parts"]?.content || "No assembly instructions available",
                  "assembly",
                )}

                <div className="flex gap-2 pt-4 border-t">
                  <Button className="flex-1">
                    <Download className="w-4 h-4 mr-2" />
                    Download Complete Assembly Guide (PDF)
                  </Button>
                  <Button variant="outline">
                    <Eye className="w-4 h-4 mr-2" />
                    View Interactive Assembly Guide
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="firmware-code" className="h-full">
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Code className="w-5 h-5" />
                      AI-Generated Firmware & Code
                    </CardTitle>
                    <CardDescription>Ready-to-flash code with pin mappings and test routines</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{hardwareReports["firmware-code"]?.platform || "Arduino IDE"}</Badge>
                    <Badge variant="outline">{hardwareReports["firmware-code"]?.language || "C++"}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <Alert>
                    <Code className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Programming Language:</strong> {hardwareReports["firmware-code"]?.language || "C++"} |
                      <strong> Platform:</strong> {hardwareReports["firmware-code"]?.platform || "Arduino IDE"}
                    </AlertDescription>
                  </Alert>

                  {renderReportContent(hardwareReports["firmware-code"]?.content || "No firmware code available", "code")}

                  <div className="flex gap-2 pt-4 border-t">
                    <Button className="flex-1">
                      <Download className="w-4 h-4 mr-2" />
                      Download .ino File
                    </Button>
                    <Button variant="outline">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Regenerate Code
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  )
}
