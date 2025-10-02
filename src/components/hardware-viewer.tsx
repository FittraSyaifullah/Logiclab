"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Slider } from "@/components/ui/slider"
import { useToast } from "@/components/ui/use-toast"
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
import { useOpenScadWorker } from "@/hooks/useOpenScadWorker"
import { updateScadParameters } from "@/lib/scad/parameters"

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

type ComponentParameter = {
  name: string
  value: number
  unit?: string
  metadata?: Record<string, unknown>
  sliderMin: number
  sliderMax: number
  sliderStep: number
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
  parameters: ComponentParameter[]
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

// Declared inside component to access local state such as currentScadByComponent
let downloadMeshFile: (
  component: ComponentCardData,
  projectTitle: string,
  type: "stl" | "scad",
  overrideStlContent?: string,
  meta?: { triangleCount?: number; warnings?: string[] },
  onInvalid?: (message: string) => void,
) => void

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
        Detailed component breakdown
      </summary>
      <div className="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-300 whitespace-pre-wrap">
        {content}
      </div>
    </details>
  )
}

export function HardwareViewer({ creation, onRegenerate, onGenerateComponentModel }: HardwareViewerProps) {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("3d-components")
  const [regeneratingTabs, setRegeneratingTabs] = useState<string[]>([])
  const [previewComponentId, setPreviewComponentId] = useState<string | null>(null)
  const [activeComponentId, setActiveComponentId] = useState<string | null>(null)
  const [parameterOverrides, setParameterOverrides] = useState<Record<string, Record<string, number>>>({})
  const [computedStlContent, setComputedStlContent] = useState<Record<string, string>>({})
  const [currentScadByComponent, setCurrentScadByComponent] = useState<Record<string, string>>({})
  const [conversionErrors, setConversionErrors] = useState<Record<string, string>>({})
  const [conversionMetadata, setConversionMetadata] = useState<
    Record<string, { warnings: string[]; triangleCount?: number }>
  >({})
  const [activeConversionTarget, setActiveConversionTarget] = useState<string | null>(null)
  const [conversionStatus, setConversionStatus] = useState<Record<string, "idle" | "loading" | "error">>({})
  const conversionRequestIds = useRef<Record<string, number>>({})
  const conversionSequence = useRef(0)
  const conversionTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const { compile: compileScadWorker } = useOpenScadWorker()
  const autoCompileInFlight = useRef<Set<string>>(new Set())
  downloadMeshFile = (
    component,
    projectTitle,
    type,
    overrideStlContent,
    meta,
    onInvalid,
  ) => {
    const model = component.model
    if (!model) return

    const safeProject = toKebabCase(projectTitle || "logiclab-project")
    const safeComponent = toKebabCase(component.name || "component")

    if (type === "stl") {
      const stlPayload = overrideStlContent ?? model.stlContent
      if (!stlPayload) return
      const bytes = base64ToUint8Array(stlPayload)
      if (bytes.byteLength < 84) {
        onInvalid?.("Generated STL shorter than binary header (84 bytes). Download aborted.")
        return
      }
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

    const scad = currentScadByComponent[component.id] ?? model.scadCode
    if (!scad) return
    const blob = new Blob([scad], { type: model.scadMimeType ?? "application/x-openscad" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${safeProject}-${safeComponent}.scad`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const blobToBase64 = useCallback(
    (blob: Blob) =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const result = typeof reader.result === "string" ? reader.result : ""
          const commaIndex = result.indexOf(",")
          resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result)
        }
        reader.onerror = () => reject(reader.error || new Error("Failed to read STL blob"))
        reader.readAsDataURL(blob)
      }),
    [],
  )

  const hardwareReports = creation.hardwareReports as HardwareReports | undefined
  const componentModels = useMemo(
    () => creation.hardwareModels ?? {},
    [creation.hardwareModels],
  )

  const triggerConversion = useCallback(
    (component: ComponentCardData, parameterName: string, nextValue: number) => {
      if (!component.model?.scadCode) {
        toast({
          title: "Missing SCAD source",
          description: "Cannot regenerate STL without original SCAD code.",
          variant: "destructive",
        })
        return
      }

      const lookupKey = `${component.id}:${parameterName}`
      const requestId = ++conversionSequence.current
      conversionRequestIds.current[component.id] = requestId

      setActiveConversionTarget(lookupKey)
      setConversionStatus((prev) => ({ ...prev, [component.id]: "loading" }))
      setConversionErrors((prev) => {
        const next = { ...prev }
        delete next[lookupKey]
        return next
      })

      if (conversionTimers.current[component.id]) {
        clearTimeout(conversionTimers.current[component.id]!)
      }

      conversionTimers.current[component.id] = setTimeout(async () => {
        const overrides = parameterOverrides[component.id] ?? {}
        const finalOverrides = { ...overrides, [parameterName]: nextValue }

        try {
          // Rewrite SCAD source in-place based on parameters
          const existingCode = currentScadByComponent[component.id] ?? component.model!.scadCode!
          const nextCode = updateScadParameters(
            existingCode,
            Object.entries(finalOverrides).map(([name, value]) => ({ name, type: 'number', value })),
          )
          setCurrentScadByComponent((prev) => ({ ...prev, [component.id]: nextCode }))

          // Compile rewritten SCAD (no -D defines)
          const result = await compileScadWorker(nextCode, {})
          // Convert blob to base64 for viewer and download re-use
          const base64 = await blobToBase64(result.blob)

          if (conversionRequestIds.current[component.id] !== requestId) return

          setComputedStlContent((prev) => ({ ...prev, [component.id]: base64 }))
          setConversionMetadata((prev) => ({
            ...prev,
            [component.id]: {
              warnings: result.warnings,
              triangleCount: result.triangleCount,
            },
          }))
          setParameterOverrides((prev) => ({
            ...prev,
            [component.id]: finalOverrides,
          }))
          setConversionStatus((prev) => ({ ...prev, [component.id]: "idle" }))
        } catch (error) {
          if (conversionRequestIds.current[component.id] !== requestId) {
            return
          }

          const message = error instanceof Error ? error.message : "Unknown conversion error"
          setConversionErrors((prev) => ({ ...prev, [lookupKey]: message }))
          setConversionStatus((prev) => ({ ...prev, [component.id]: "error" }))
        }
      }, 400)
    },
    [parameterOverrides, toast, compileScadWorker, blobToBase64],
  )

  const autoCompileComponent = useCallback(
    async (component: ComponentCardData) => {
      if (!component.model?.scadCode) return
      if (autoCompileInFlight.current.has(component.id)) return

      autoCompileInFlight.current.add(component.id)

      setConversionStatus((prev) => ({ ...prev, [component.id]: "loading" }))
      setConversionErrors((prev) => {
        const next = { ...prev }
        delete next[`${component.id}:__auto__`]
        return next
      })

      const defaultOverrides = component.parameters.reduce<Record<string, number>>((acc, parameter) => {
        acc[parameter.name] = Number.isFinite(Number(parameter.value)) ? Number(parameter.value) : 0
        return acc
      }, {})

      try {
        const startingCode = component.model.scadCode
        const nextCode = updateScadParameters(
          startingCode,
          Object.entries(defaultOverrides).map(([name, value]) => ({ name, type: 'number', value })),
        )
        setCurrentScadByComponent((prev) => ({ ...prev, [component.id]: nextCode }))
        const result = await compileScadWorker(nextCode, {})
        const base64 = await blobToBase64(result.blob)

        setComputedStlContent((prev) => ({ ...prev, [component.id]: base64 }))
        setConversionMetadata((prev) => ({
          ...prev,
          [component.id]: {
            warnings: result.warnings,
            triangleCount: result.triangleCount,
          },
        }))
        setParameterOverrides((prev) => ({
          ...prev,
          [component.id]: prev[component.id] ?? defaultOverrides,
        }))
        setConversionStatus((prev) => ({ ...prev, [component.id]: "idle" }))
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown conversion error"
        console.error(`[HARDWARE] Auto compile failed for ${component.id}`, error)
        setConversionErrors((prev) => ({ ...prev, [`${component.id}:__auto__`]: message }))
        setConversionStatus((prev) => ({ ...prev, [component.id]: "error" }))
      } finally {
        autoCompileInFlight.current.delete(component.id)
      }
    },
    [blobToBase64, compileScadWorker],
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
        parameters: ((model?.parameters ?? []) as Array<{ name?: string; value?: number; unit?: string; metadata?: any }>).map(
          (parameter, paramIndex) => {
            const baseValue = Number(parameter?.value ?? 0) || 0
            const metadata = (parameter?.metadata ?? {}) as Record<string, unknown>
            const sliderMin =
              typeof metadata.min !== "undefined" && Number.isFinite(Number(metadata.min))
                ? Number(metadata.min)
                : 0
            const sliderMax =
              typeof metadata.max !== "undefined" && Number.isFinite(Number(metadata.max))
                ? Number(metadata.max)
                : Math.max(baseValue * 2, baseValue + 10)
            const sliderStep =
              typeof metadata.step !== "undefined" && Number.isFinite(Number(metadata.step))
                ? Number(metadata.step)
                : Math.max((baseValue || 10) / 20, 0.5)

            const name = (parameter?.name && parameter.name.trim()) || `Parameter ${paramIndex + 1}`

            return {
              name,
              value: baseValue,
              unit: parameter?.unit,
              metadata,
              sliderMin,
              sliderMax,
              sliderStep,
            } as ComponentParameter
          },
        ),
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

  useEffect(() => {
    if (!activeComponent) return

    const existing = computedStlContent[activeComponent.id]
    if (existing && existing.length > 0) {
      // Already have a worker-generated STL cached
      return
    }

    // Initialize current SCAD from model if not present
    if (!currentScadByComponent[activeComponent.id] && activeComponent.model?.scadCode) {
      setCurrentScadByComponent((prev) => ({ ...prev, [activeComponent.id]: activeComponent.model!.scadCode! }))
    }

    if (activeComponent.model?.scadCode) {
      autoCompileComponent(activeComponent)
    }
  }, [activeComponent, computedStlContent, autoCompileComponent, currentScadByComponent])

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
      // Map tabId to correct API endpoint
      const endpointMap: Record<string, string> = {
        "3d-components": "generate-3d",
        "assembly-parts": "generate-assembly", 
        "firmware-code": "generate-firmware"
      }
      
      const apiEndpoint = endpointMap[tabId] || `generate-${tabId}`
      const reportId = (hardwareReports?.[tabId as keyof HardwareReports] as any)?.reportId as string | undefined
      const response = await fetch(`/api/hardware/${apiEndpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectData: {
            id: creation.id,
            title: creation.title,
            description: creation.prompt,
          },
          reportId,
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

const renderComponentActions = (
  component: ComponentCardData,
  meta: { warnings?: string[]; triangleCount?: number } | undefined,
  onInvalidDownload?: (message: string) => void,
) => {
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
            disabled={!component.model?.stlContent && !computedStlContent[component.id]}
            onClick={() =>
              downloadMeshFile(
                component,
                creation.title,
                "stl",
                computedStlContent[component.id],
                meta,
                (message) =>
                  toast({
                    title: "Invalid STL",
                    description: message,
                    variant: "destructive",
                  }),
              )
            }
            className="gap-2"
          >
            <FileDown className="h-4 w-4" />
            Download STL
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!component.model?.scadCode}
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
                {renderDetailedBreakdown(hardwareReports["3d-components"]?.content)}

                {components.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-neutral-800 bg-neutral-900/60 p-6 text-center text-sm text-neutral-400">
                      No components detected yet.
                    </div>
                ) : (
                  <div className="space-y-5">
                    <div className="relative" role="tablist" aria-label="3D Components">
                      <div className="flex items-stretch gap-3 overflow-x-auto pb-3">
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
                                "group relative flex min-w-[200px] items-center gap-2 rounded-t-xl border px-4 py-2.5 text-left transition",
                                "bg-neutral-950/70 text-neutral-400",
                                "border-neutral-800",
                                "hover:bg-neutral-900",
                                isActive &&
                                  "bg-neutral-900 text-white shadow-sm border-b-transparent",
                              )}
                            >
                              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/20 text-blue-400">
                                <Hammer className="h-3.5 w-3.5" />
                              </div>
                              <span className="truncate text-sm font-medium tracking-wide">
                                {component.name || "Component"}
                              </span>
                              {isActive && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />}
                            </button>
                          )
                        })}
                      </div>
                      <div className="absolute inset-x-0 bottom-0 h-px bg-neutral-800" aria-hidden />
                    </div>

                    {activeComponent && (
                      <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 shadow-lg">
                        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px]">
                          <div className="relative h-[420px] bg-neutral-900/80">
                            {activeComponent.model?.status === "completed" &&
                            (computedStlContent[activeComponent.id] || activeComponent.model.stlContent) ? (
                              <STLViewer
                                stlBase64={computedStlContent[activeComponent.id] || activeComponent.model.stlContent!}
                                componentName={activeComponent.name || "Component"}
                              />
                            ) : (
                              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-neutral-300">
                                <Hammer className="h-6 w-6 animate-pulse text-blue-400" />
                                <p className="text-sm font-medium">
                                  {activeComponent.model?.status === "processing"
                                    ? "Generating 3D preview..."
                                    : "3D preview available after generation"}
                                </p>
                              </div>
                            )}

                            <div className="pointer-events-none absolute bottom-4 left-4 z-10 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white/90">
                              {activeComponent.name || "Component"}
                            </div>
                          </div>

                          <div className="flex flex-col gap-6 bg-neutral-950 p-6">
                            <header className="flex flex-col gap-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-lg font-semibold text-white">
                                  <Hammer className="h-4 w-4 text-blue-400" />
                                  {activeComponent.name}
                                </div>
                                <ComponentStatus
                                  status={activeComponent.model?.status ?? "idle"}
                                  updatedAt={activeComponent.model?.updatedAt}
                                />
                              </div>
                              <p className="text-sm text-neutral-400">
                                {activeComponent.description || "AI generated component"}
                              </p>
                            </header>

                            <section className="grid grid-cols-3 gap-3">
                              {["Print Time", "Material", "Supports"].map((label, index) => {
                                const value = [
                                  activeComponent.printTime || "TBD",
                                  activeComponent.material || "TBD",
                                  activeComponent.supports || "TBD",
                                ][index]
                    return (
                      <div
                                    key={label}
                                    className="rounded-xl border border-neutral-800 bg-neutral-900/70 px-4 py-3 text-xs text-neutral-400"
                                  >
                                    <p className="uppercase tracking-wide text-[11px] text-neutral-500">{label}</p>
                                    <p className="mt-1 text-sm font-medium text-white">{value}</p>
                                  </div>
                                )
                              })}
                            </section>

                            <section className="flex flex-col gap-3">
                              <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-white">Parameters</h3>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-neutral-500 hover:text-white"
                                  onClick={() => {
                                    if (!activeComponent) return
                                    setParameterOverrides((prev) => {
                                      const next = { ...prev }
                                      delete next[activeComponent.id]
                                      return next
                                    })
                                    setComputedStlContent((prev) => {
                                      const next = { ...prev }
                                      delete next[activeComponent.id]
                                      return next
                                    })
                                    setConversionErrors((prev) => {
                                      const next = { ...prev }
                                      delete next[activeComponent.id]
                                      return next
                                    })
                                    if (activeComponent.model?.stlContent) {
                                      setComputedStlContent((prev) => ({
                                        ...prev,
                                        [activeComponent.id]: activeComponent.model?.stlContent ?? prev[activeComponent.id],
                                      }))
                                    }
                                  }}
                                >
                                  <RefreshCw className="h-4 w-4" />
                                </Button>
                              </div>
                              <div className="space-y-3">
                                {activeComponent.parameters.length ? (
                                  activeComponent.parameters.map((parameter, paramIndex) => {
                                    const overridesForComponent = parameterOverrides[activeComponent.id] ?? {}
                                    const currentOverride = overridesForComponent[parameter.name]
                                    const rawDisplay = currentOverride ?? parameter.value
                                    const displayValue = Number.isFinite(Number(rawDisplay)) ? Number(rawDisplay) : 0
                                    const min = Number.isFinite(Number(parameter.sliderMin)) ? Number(parameter.sliderMin) : 0
                                    const max = Number.isFinite(Number(parameter.sliderMax)) ? Number(parameter.sliderMax) : (displayValue > 0 ? Math.max(displayValue * 2, displayValue + 10) : 10)
                                    const step = Number.isFinite(Number(parameter.sliderStep)) ? Number(parameter.sliderStep) : Math.max((displayValue || 10) / 20, 0.5)
                                    return (
                                      <div
                                        key={`${activeComponent.id}-${parameter.name ?? paramIndex}`}
                                        className="rounded-xl border border-neutral-800 bg-neutral-900/70 p-4 text-xs text-neutral-400"
                                      >
                                        <div className="flex items-center justify-between gap-3">
                          <div>
                                            <p className="text-sm font-semibold text-white/90">{parameter.name}</p>
                                            {parameter.unit && (
                                              <span className="text-[11px] uppercase tracking-wide text-neutral-500">
                                                Adjust {parameter.unit}
                                              </span>
                                            )}
                            </div>
                                          <div className="flex items-center gap-2">
                                            <div className="rounded-full bg-neutral-900 px-3 py-1 text-sm font-semibold text-neutral-100">
                                              {Number.isFinite(displayValue) ? displayValue.toFixed(2) : "0.00"}
                          </div>
                                            <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-blue-200">
                                              {parameter.unit ?? "units"}
                                            </span>
                          </div>
                        </div>

                                        <div className="mt-4">
                                          <Slider
                                            min={min}
                                            max={max}
                                            step={step}
                                            value={[Number.isFinite(displayValue) ? displayValue : 0]}
                                            aria-label={parameter.name}
                                            className="group"
                                            onValueChange={(value) => {
                                              const nextValue = Number(value[0])
                                              setParameterOverrides((prev) => ({
                                                ...prev,
                                                [activeComponent.id]: {
                                                  ...(prev[activeComponent.id] ?? {}),
                                                  [parameter.name]: nextValue,
                                                },
                                              }))
                                            }}
                                            onValueCommit={(value) => {
                                              const nextValue = Number(value[0])
                                              triggerConversion(activeComponent, parameter.name, nextValue)
                                            }}
                                          />
                                          <div className="mt-2 flex justify-between text-[11px] text-neutral-500">
                                            <span>{min.toFixed(2)}</span>
                                            <span>{max.toFixed(2)}</span>
                                          </div>
                                        </div>

                                        {conversionStatus[activeComponent.id] === "loading" &&
                                          activeConversionTarget === `${activeComponent.id}:${parameter.name}` && (
                                          <div className="mt-2 flex items-center gap-2 text-xs text-blue-300">
                                            <Loader2 className="h-3 w-3 animate-spin" /> Updating 3D preview…
                                          </div>
                                        )}

                                        {conversionErrors[`${activeComponent.id}:${parameter.name}`] && (
                                          <div className="mt-2 rounded-lg border border-red-500/40 bg-red-950/40 px-3 py-2 text-[11px] text-red-200">
                                            {conversionErrors[`${activeComponent.id}:${parameter.name}`]}
                                          </div>
                                        )}
                                      </div>
                                    )
                                  })
                                ) : (
                                  <div className="rounded-xl border border-dashed border-neutral-800 bg-neutral-900/40 p-4 text-xs text-neutral-500">
                                    No adjustable parameters detected.
                                  </div>
                                )}
                              </div>
                            </section>

                            {activeComponent.prompt && (
                              <section className="rounded-xl border border-blue-900 bg-blue-950/40">
                                <header className="flex items-center justify-between border-b border-blue-900/60 px-4 py-2">
                                  <span className="text-xs font-semibold uppercase tracking-wide text-blue-200">
                                3D Generation Prompt
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                    onClick={() => copyToClipboard(activeComponent.prompt ?? "")}
                                    className="h-7 px-2 text-blue-300 hover:text-blue-100"
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                                </header>
                                <div className="px-4 py-3 text-sm text-blue-100/90 whitespace-pre-wrap">
                                  {activeComponent.prompt}
                            </div>
                              </section>
                            )}

                            {activeComponent.notes && (
                              <section className="rounded-xl border border-neutral-800 bg-neutral-900/50 px-4 py-3 text-xs text-neutral-400">
                                {activeComponent.notes}
                              </section>
                            )}

                            <section className="flex flex-col gap-3 border-t border-neutral-900 pt-4">
            {renderComponentActions(
              activeComponent,
              conversionMetadata[activeComponent.id],
              (message) =>
                toast({
                  title: "Invalid STL",
                  description: message,
                  variant: "destructive",
                }),
            )}
                              {activeComponent.model?.error && (
                                <div className="rounded-lg border border-red-500/40 bg-red-950/40 px-3 py-2 text-xs text-red-200">
                                  <strong className="font-semibold">Error:</strong> {activeComponent.model.error}
                          </div>
                        )}
                            </section>
                      </div>
                </div>
                      </div>
                    )}
                </div>
                )}
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
