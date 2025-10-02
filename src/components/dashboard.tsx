"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { ChatSidebar } from "@/components/chat-sidebar"
import { ViewerPanel } from "@/components/viewer-panel"
import { SoftwareViewer } from "@/components/software-viewer"
import { CodeViewer } from "@/components/code-viewer"
import { HardwareViewer } from "@/components/hardware-viewer"
import { InitialPromptForm } from "@/components/initial-prompt-form"
import { IntegrationPanel } from "@/components/integration-panel"
import { GrowthMarketingPanel } from "@/components/growth-marketing-panel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { LogoHoverSidebar, type SoftwareItem } from "@/components/logo-hover-sidebar"
import { useHardwareStore } from "@/hooks/use-hardware-store"
import { useOpenScadWorker } from "@/hooks/useOpenScadWorker"
import {
  Monitor,
  Share,
  Layers,
  Code,
  Rocket,
  Database,
  TrendingUp,
  Link,
  ChevronDown,
  Settings,
  HelpCircle,
  CreditCard,
  RotateCcw,
} from "lucide-react"
import type { Creation } from "@/lib/types"
import { useCreationStore } from "@/hooks/use-creation-store"
import { useUserStore } from "@/hooks/use-user-store"
import { cn } from "@/lib/utils"
import { createSupabaseClient } from "@/lib/supabase/server"
import { useToast } from "@/hooks/use-toast"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

interface DashboardProps {
  onLogout: () => void
  initialSearchInput?: string
}

function PersistentHeader({
  activeCreation,
  creationMode,
  hardwareTab,
  setHardwareTab,
  setShowGrowthMarketing,
  setShowIntegrations,
  handleDeploy,
  onLogout,
  showLogoSidebar,
  setShowLogoSidebar,
  hoverTimeoutRef,
}: {
  activeCreation: Creation | undefined
  creationMode: string
  hardwareTab: "3d" | "code"
  setHardwareTab: (tab: "3d" | "code") => void
  setShowGrowthMarketing: (show: boolean) => void
  setShowIntegrations: (show: boolean) => void
  handleDeploy: () => void
  onLogout: () => void
  showLogoSidebar: boolean
  setShowLogoSidebar: (show: boolean) => void
  hoverTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>
}) {
  const { toast } = useToast()
  const [urlInput, setUrlInput] = useState("")
  const { user } = useUserStore()

  useEffect(() => {
    console.log("[v0] PersistentHeader - User store debug:", {
      user,
      hasUser: !!user,
      displayName: user?.display_name,
      email: user?.email,
      userKeys: user ? Object.keys(user) : [],
      fullUserStore: useUserStore.getState(),
    })
  }, [user])

  const getUserInitials = () => {
    if (user?.display_name) {
      return user.display_name
        .split(" ")
        .map((name) => name.charAt(0))
        .join("")
        .toUpperCase()
        .slice(0, 2)
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase()
    }
    return "U"
  }

  const getDisplayName = () => {
    const displayName = user?.display_name || user?.email?.split("@")[0] || "User"
    console.log("[v0] getDisplayName calculation:", {
      userDisplayName: user?.display_name,
      userEmail: user?.email,
      emailPrefix: user?.email?.split("@")[0],
      finalDisplayName: displayName,
    })
    return displayName
  }

  const handleLogoMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }
    setShowLogoSidebar(true)
  }

  const handleLogoMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setShowLogoSidebar(false)
    }, 150)
  }

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth/signout", {
        method: "POST",
        credentials: "include",
      })

      if (response.ok) {
        onLogout()
        window.location.href = "/"
      } else {
        toast({
          title: "Logout failed",
          description: "Please try again",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Logout error",
        description: "An error occurred during logout",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="fixed top-0 left-0 right-0 h-16 border-b border-slate-200/30 dark:border-slate-700/30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-sm px-6 flex items-center justify-between z-50">
      <div className="flex items-center gap-4">
        <div
          className="relative cursor-pointer transition-all duration-200 hover:scale-110 hover:drop-shadow-lg"
          onMouseEnter={handleLogoMouseEnter}
          onMouseLeave={handleLogoMouseLeave}
        >
          <img
            src="/images/2025_Overhaul_Logo-transparent.png"
            alt="Overhaul"
            className="w-8 h-8 transition-all duration-200 hover:brightness-110"
          />
          <div className="absolute inset-0 rounded-full bg-orange-500/20 scale-0 hover:scale-150 transition-transform duration-300 -z-10" />
        </div>

        {activeCreation && creationMode === "hardware" && (
          <div className="flex items-center gap-3">
            <Button
              variant={hardwareTab === "3d" ? "default" : "outline"}
              size="sm"
              onClick={() => setHardwareTab("3d")}
              className={cn(
                "transition-all duration-200 font-medium px-4 py-2 rounded-lg",
                hardwareTab === "3d"
                  ? "bg-orange-500 hover:bg-orange-600 text-white shadow-md"
                  : "border-slate-300 hover:border-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/50",
              )}
            >
              <Layers className="mr-2 h-4 w-4" /> 3D View
            </Button>
            <Button
              variant={hardwareTab === "code" ? "default" : "outline"}
              size="sm"
              onClick={() => setHardwareTab("code")}
              className={cn(
                "transition-all duration-200 font-medium px-4 py-2 rounded-lg",
                hardwareTab === "code"
                  ? "bg-orange-500 hover:bg-orange-600 text-white shadow-md"
                  : "border-slate-300 hover:border-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/50",
              )}
            >
              <Code className="mr-2 h-4 w-4" /> Code
            </Button>
          </div>
        )}
        {activeCreation && creationMode === "software" && (
          <Button
            variant="default"
            size="sm"
            className="bg-orange-500 hover:bg-orange-600 text-white shadow-md font-medium px-4 py-2 rounded-lg"
          >
            <Monitor className="mr-2 h-4 w-4" /> Preview
          </Button>
        )}
      </div>

      <div className="flex-1 max-w-md mx-6">
        <div className="relative">
          <Link className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Enter URL to preview..."
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            className="pl-10 bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 rounded-lg"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowGrowthMarketing(true)}
          className="border-emerald-300 hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 font-medium px-4 py-2 rounded-lg"
        >
          <TrendingUp className="mr-2 h-4 w-4 text-emerald-600" />
          Growth Marketing
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowIntegrations(true)}
          className="border-blue-300 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 font-medium px-4 py-2 rounded-lg"
        >
          <Database className="mr-2 h-4 w-4 text-blue-600" />
          Integration
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="border-amber-300 hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50 font-medium px-4 py-2 rounded-lg bg-transparent"
            >
              <Share className="mr-2 h-4 w-4 text-amber-600" />
              Share
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="bg-white/95 backdrop-blur-xl border-slate-200/40 shadow-xl rounded-lg"
          >
            <DropdownMenuItem
              onClick={() => {
                if (activeCreation?.softwareData?.demoUrl) {
                  window.open(activeCreation.softwareData.demoUrl, "_blank")
                } else {
                  toast({
                    title: "No demo available",
                    description: "Generate software first to get a shareable demo link",
                    variant: "destructive",
                  })
                }
              }}
              className="hover:bg-amber-50 dark:hover:bg-amber-950"
            >
              Share preview link
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="outline"
          size="sm"
          onClick={handleDeploy}
          className="border-green-300 hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-950/50 font-medium px-4 py-2 rounded-lg bg-transparent"
        >
          <Rocket className="mr-2 h-4 w-4 text-green-600" />
          Deploy
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-3 py-2 h-auto">
              <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white font-medium text-sm">
                {getUserInitials()}
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{getDisplayName()}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Free plan</div>
              </div>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-3 py-2 border-b">
              <div className="font-medium">{getDisplayName()}</div>
              <div className="text-sm text-muted-foreground">Credits: 5 left</div>
              <div className="w-full bg-blue-200 rounded-full h-2 mt-1">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: "20%" }}></div>
              </div>
              <div className="text-xs text-muted-foreground mt-1">Daily credits reset at midnight UTC</div>
            </div>
            <DropdownMenuItem>
              <CreditCard className="mr-2 h-4 w-4" />
              Get free credits
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem>
              <RotateCcw className="mr-2 h-4 w-4" />
              Rename project
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Monitor className="mr-2 h-4 w-4" />
              Appearance
            </DropdownMenuItem>
            <DropdownMenuItem>
              <HelpCircle className="mr-2 h-4 w-4" />
              Help
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-red-600 dark:text-red-400">
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

function DashboardContent({ onLogout, initialSearchInput }: DashboardProps) {
  const { creations, activeCreationId, setActiveCreationId, addCreation, updateCreation } = useCreationStore()
  const { user, project } = useUserStore()
  const activeCreation = (creations ?? []).find((c) => c.id === activeCreationId)
  const { toast } = useToast()

  const [viewMode, setViewMode] = useState<"model" | "code">("model")
  const [hardwareTab, setHardwareTab] = useState<"3d" | "code">("3d")
  const [showIntegrations, setShowIntegrations] = useState(false)
  const [showGrowthMarketing, setShowGrowthMarketing] = useState(false)
  const [showLogoSidebar, setShowLogoSidebar] = useState(false)
  const [selectedChat, setSelectedChat] = useState<any>(null)
  const [chatMessages, setChatMessages] = useState<any[]>([])
  const [softwareList, setSoftwareList] = useState<SoftwareItem[]>([])

  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const creationMode = activeCreation?.mode || (activeCreation?.softwareData ? "software" : "hardware")

  // Removed dev-only OpenSCAD test compile button

  // Deprecated server-side conversion; client worker handles SCAD->STL
  const convertScadToStlClient = async (
    _scadCode: string,
    _parameters: Record<string, number>,
  ): Promise<{ stlContent?: string; error?: string }> => {
    return { error: 'Server conversion disabled; use client worker' }
  }

  // Poll Supabase jobs table for hardware component model completion.
  const pollHardwareModelJobOnce = async ({
    creationId,
    componentId,
    jobId,
    attempt = 0,
  }: {
    creationId: string
    componentId: string
    jobId: string
    attempt?: number
  }) => {
    try {
        const response = await fetch(`/api/jobs/${jobId}?componentId=${componentId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `Failed to fetch job status for ${componentId}`)
      }

      if (data.completed) {
        const nextCreation = useCreationStore.getState().creations.find((c) => c.id === creationId)
        if (!nextCreation) return

        let stlContent = data.component?.stlContent as string | undefined
        const scadCode = data.component?.scadCode as string | undefined
        const parameters = Array.isArray(data.component?.parameters) ? data.component?.parameters : undefined
        let conversionError: string | undefined

        // Do not attempt server-side STL conversion; SCAD is enough for client

        updateCreation(creationId, {
          ...nextCreation,
          hardwareModels: {
            ...(nextCreation.hardwareModels ?? {}),
            [componentId]: {
              componentId,
              name: data.component?.name ?? nextCreation.hardwareModels?.[componentId]?.name ?? "Component",
              status: data.status ?? "completed",
              jobId,
              stlContent,
              metadata: {
                ...(data.component?.metadata ?? {}),
              },
              scadCode: data.component?.scadCode,
              stlMimeType: data.component?.stlMimeType,
              scadMimeType: data.component?.scadMimeType,
              parameters: data.component?.parameters,
              error: data.component?.error,
              updatedAt: new Date().toISOString(),
            },
          },
        })

        if (stlContent || data.component?.scadCode) {
          toast({
            title: `${data.component?.name ?? "Component"} model ready`,
            description: "STL and SCAD assets have been generated successfully.",
          })
        }

        if (conversionError) {
          toast({
            title: "Could not generate STL preview",
            description: conversionError,
            variant: "destructive",
          })
        }

        await loadHardwareReports(creationId)
        return
      }

      if (data.status === "failed") {
        const nextCreation = useCreationStore.getState().creations.find((c) => c.id === creationId)
        if (!nextCreation) return

        updateCreation(creationId, {
          ...nextCreation,
          hardwareModels: {
            ...(nextCreation.hardwareModels ?? {}),
            [componentId]: {
              componentId,
              name: nextCreation.hardwareModels?.[componentId]?.name ?? "Component",
              status: "failed",
              jobId,
              error: data.error || "Generation failed",
              updatedAt: new Date().toISOString(),
            },
          },
        })

        toast({
          title: `Model generation failed for ${nextCreation.hardwareModels?.[componentId]?.name ?? "component"}`,
          description: data.error || "An unknown error occurred.",
          variant: "destructive",
        })

        return
      }

      if (attempt < 120) {
        setTimeout(() => pollHardwareModelJobOnce({ creationId, componentId, jobId, attempt: attempt + 1 }), 5000)
      }
    } catch (error) {
      console.error("[HARDWARE] Failed to poll model job:", error)

      const nextCreation = useCreationStore.getState().creations.find((c) => c.id === creationId)
      if (!nextCreation) return

      updateCreation(creationId, {
        ...nextCreation,
        hardwareModels: {
          ...(nextCreation.hardwareModels ?? {}),
          [componentId]: {
            componentId,
            name: nextCreation.hardwareModels?.[componentId]?.name ?? "Component",
            status: "failed",
            jobId,
            error: (error as Error).message,
            updatedAt: new Date().toISOString(),
          },
        },
      })

      toast({
        title: "Lost connection to model job",
        description: (error as Error).message,
        variant: "destructive",
      })
    }
  }

  // Load projects (software and hardware) after login
  useEffect(() => {
    const loadAllProjects = async () => {
      if (!user?.id) return
      try {
        const resp = await fetch(`/api/user/data?userId=${user.id}`, { cache: "no-store" })
        if (resp.ok) {
          const data = await resp.json()
          setSoftwareList(data.software || [])

          // Optionally, preload latest hardware reports into current creation if needed
          if (project?.id) {
            try {
              const hwResp = await fetch(`/api/hardware/reports?projectId=${project.id}&userId=${user.id}`, { cache: "no-store" })
              if (hwResp.ok) {
                const hw = await hwResp.json()
                if (hw?.reports && activeCreation && activeCreation.mode === 'hardware') {
                  updateCreation(activeCreation.id, { hardwareReports: hw.reports })
                }
              }
            } catch {}
          }

          // Populate hover-sidebar hardware projects list
          try {
            const listResp = await fetch(`/api/hardware/reports/list?userId=${user.id}`, { cache: 'no-store' })
            if (listResp.ok) {
              const listData = await listResp.json()
              const { setReportsList } = useHardwareStore.getState()
              setReportsList(listData.items || [])
            }
          } catch (e) {
            console.error('[DASHBOARD] Failed to load hardware reports list', e)
          }
        }
      } catch (e) {
        console.error('[DASHBOARD] Failed to load projects after login', e)
      }
    }
    loadAllProjects()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, project?.id])

  useEffect(() => {
    if (activeCreation) {
      setViewMode(activeCreation.viewMode || (creationMode === "software" ? "code" : "model"))
    }
  }, [activeCreation, creationMode])

  const generate3DModel = async (
    creationId: string,
    options?: {
      componentId?: string
      componentName?: string
      prompt?: string
      mode?: "component" | "full"
    }
  ) => {
    const currentCreation = useCreationStore.getState().creations.find((c) => c.id === creationId)

    if (!currentCreation) {
      console.error(`Creation ${creationId} not found – cannot generate 3D model`)
      return
    }

    const { user, project } = useUserStore.getState()

    if (!user?.id || !project?.id) {
      toast({
        title: "Missing project context",
        description: "Please reload LogicLab or re-authenticate before generating models.",
        variant: "destructive",
      })
      return
    }

    const mode = options?.mode ?? "component"

    if (mode === "component" && options?.componentId) {
      const labels = {
        queued: `Queued 3D generation for ${options.componentName ?? "component"}`,
        started: `Generating 3D model for ${options.componentName ?? "component"}`,
      }

      const componentPayload = {
        creationId,
        componentId: options.componentId,
        componentName: options.componentName,
        prompt: options.prompt || currentCreation.prompt,
        projectId: project.id,
        userId: user.id,
      }

      updateCreation(creationId, {
        ...currentCreation,
        hardwareModels: {
          ...(currentCreation.hardwareModels ?? {}),
          [options.componentId]: {
            componentId: options.componentId,
            name: options.componentName ?? "Component",
            status: "queued",
            updatedAt: new Date().toISOString(),
          },
        },
      })

      toast({
        title: labels.queued,
        description: "We will notify you when the STL and SCAD are ready.",
      })

      try {
        const response = await fetch("/api/hardware/models", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(componentPayload),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || `Failed to enqueue 3D model job for ${options.componentName}`)
        }

        const jobId = data.jobId as string | undefined

        updateCreation(creationId, {
          ...useCreationStore.getState().creations.find((c) => c.id === creationId)!,
          hardwareModels: {
            ...useCreationStore.getState().creations.find((c) => c.id === creationId)!.hardwareModels,
            [options.componentId]: {
              componentId: options.componentId,
              name: options.componentName ?? "Component",
              status: "processing",
              jobId,
              updatedAt: new Date().toISOString(),
            },
          },
        })

        if (jobId) {
          setTimeout(() => pollHardwareModelJobOnce({ creationId, componentId: options.componentId!, jobId }), 3000)
        }

        toast({
          title: labels.started,
          description: "Hang tight while we create the STL and SCAD files.",
        })
      } catch (error) {
        console.error("[HARDWARE] Failed to enqueue component model job:", error)

        const nextCreation = useCreationStore.getState().creations.find((c) => c.id === creationId)
        if (nextCreation) {
          updateCreation(creationId, {
            ...nextCreation,
            hardwareModels: {
              ...(nextCreation.hardwareModels ?? {}),
              [options.componentId]: {
                componentId: options.componentId,
                name: options.componentName ?? "Component",
                status: "failed",
                error: (error as Error).message,
                updatedAt: new Date().toISOString(),
              },
            },
          })
        }

        toast({
          title: `Could not start model generation for ${options.componentName ?? "component"}`,
          description: (error as Error).message,
          variant: "destructive",
        })
      }

      return
    }

    const imageUrl = currentCreation.imageUrl
    if (!imageUrl) {
      toast({
        title: `No image available`,
        description: "Generate an image first before creating 3D model",
        variant: "destructive",
      })
      return
    }

    console.log(`Starting PartCrafter 3D generation for project: ${currentCreation.title}`)

    updateCreation(creationId, {
      ...currentCreation,
      isGenerating3D: true,
      error: undefined,
    })

    try {
      const startResponse = await fetch("/api/generate-3d-model", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: imageUrl,
          num_parts: currentCreation.components.length || 1,
          seed: Math.floor(Math.random() * 1000000),
          num_tokens: 256,
          num_inference_steps: 1,
          guidance_scale: 1,
          use_flash_decoder: true,
          rmbg: true,
        }),
      })

      const responseData = await startResponse.json()
      if (!startResponse.ok) throw new Error(responseData.error || "Failed to start PartCrafter generation")

      const { modelUrl } = responseData
      if (!modelUrl) throw new Error("No 3D model URL received from PartCrafter")

      console.log(`PartCrafter success for project ${currentCreation.title}: ${modelUrl}`)

      const latest = useCreationStore.getState().creations.find((c) => c.id === creationId)
      if (latest) {
        updateCreation(creationId, {
          ...latest,
          isGenerating3D: false,
          modelUrl: modelUrl,
          error: undefined,
        })
      }

      toast({
        title: `3D model generated!`,
        description: "PartCrafter has created your 3D model from the image",
      })
    } catch (error) {
      console.error(`PartCrafter generation error:`, error)
      const failed = useCreationStore.getState().creations.find((c) => c.id === creationId)
      if (failed) {
        updateCreation(creationId, {
          ...failed,
          isGenerating3D: false,
          error: (error as Error).message,
        })
      }

      toast({
        title: `Failed to generate 3D model`,
        description: (error as Error).message,
        variant: "destructive",
      })
    }
  }

  const generateSoftware = async (creationId: string) => {
    const currentCreation = useCreationStore.getState().creations.find((c) => c.id === creationId)
    const { user, project } = useUserStore.getState()

    console.log("[v0] generateSoftware - Debug info:", {
      creationId,
      hasCurrentCreation: !!currentCreation,
      hasUser: !!user,
      hasProject: !!project,
      projectId: project?.id,
      userStoreState: { user, project },
    })

    if (!currentCreation) {
      console.error(`Creation ${creationId} not found – cannot generate software`)
      return
    }

    if (!project?.id) {
      console.error("[v0] Project ID missing - user store state:", { user, project })
      toast({
        title: "Project ID missing",
        description: "Failed to generate software since project id is missing",
        variant: "destructive",
      })
      return
    }

    console.log(`Starting async v0 software generation for project: ${currentCreation.title}`)

    updateCreation(creationId, {
      ...currentCreation,
      softwareData: {
        chatId: "",
        demoUrl: "",
        isGenerating: true,
        error: undefined,
      },
    })

    try {
      const requestPayload = {
        prompt: currentCreation.prompt,
        title: currentCreation.title,
        projectId: project.id,
        userId: user?.id,
      }
      console.log("[v0] generateSoftware - API request payload:", requestPayload)
      console.log("[v0] generateSoftware - User data:", user)
      console.log("[v0] generateSoftware - Project data:", project)

      const response = await fetch("/api/software/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
      })

      const responseData = await response.json()

      if (!response.ok) {
        throw new Error(responseData.error || `HTTP ${response.status}: Server error`)
      }

      if (!responseData.success || !responseData.jobId) {
        throw new Error(responseData.error || "No job ID returned")
      }

      const jobId = responseData.jobId
      console.log(`[DASHBOARD] Job enqueued successfully: ${jobId}`)

      // Start polling for job completion
      toast({
        title: "Software Generation Started",
        description: "Your software is being generated. This may take up to 5 minutes.",
      })

      // Start polling for job status
      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await fetch(`/api/jobs/${jobId}`)
          const statusData = await statusResponse.json()

          console.log(`[DASHBOARD] Job status check:`, statusData)

          if (statusData.completed) {
            clearInterval(pollInterval)

            if (statusData.software) {
              console.log(`[DASHBOARD] Job completed successfully`)

              const latest = useCreationStore.getState().creations.find((c) => c.id === creationId)
              if (latest) {
                updateCreation(creationId, {
                  ...latest,
                  softwareData: {
                    chatId: statusData.software.chatId,
                    demoUrl: statusData.software.demoUrl,
                    isGenerating: false,
                    error: undefined,
                  },
                })
              }

              // Load the chat messages to update the UI
              if (statusData.software.id) {
                console.log(`[DASHBOARD] Loading chat messages for software: ${statusData.software.id}`)
                try {
                  const messagesResponse = await fetch(`/api/software/messages?softwareId=${statusData.software.id}&userId=${user?.id}`)
                  if (messagesResponse.ok) {
                    const messagesData = await messagesResponse.json()
                    console.log(`[DASHBOARD] Loaded ${messagesData.messages?.length || 0} messages`)

                    // Update creation store with chat messages
                    const updatedCreation = {
                      chatHistory: messagesData.messages?.map((msg: any) => ({
                        id: msg.id,
                        role: msg.role,
                        content: msg.content,
                        createdAt: new Date(msg.created_at)
                      })) || []
                    }
                    updateCreation(creationId, updatedCreation)
                  }
                } catch (error) {
                  console.error(`[DASHBOARD] Failed to load chat messages:`, error)
                }
              }

              toast({
                title: statusData.software.demoUrl ? "Software Generated!" : "AI Needs More Information",
                description: statusData.software.demoUrl
                  ? `Successfully created "${currentCreation.title}"`
                  : `v0 has asked a question. Check the chat to respond and continue building.`,
              })
            } else {
              throw new Error(statusData.error || "Job completed but no software data")
            }
          } else if (statusData.status === 'failed') {
            clearInterval(pollInterval)

            const latest = useCreationStore.getState().creations.find((c) => c.id === creationId)
            const failed = latest || currentCreation

            updateCreation(creationId, {
              ...failed,
              softwareData: {
                chatId: "",
                demoUrl: "",
                isGenerating: false,
                error: statusData.error || "Job failed",
              },
            })

            toast({
              title: "Software Generation Failed",
              description: statusData.error || "An error occurred during generation",
              variant: "destructive",
            })
          }
          // Continue polling if still processing
        } catch (pollError) {
          console.error(`[DASHBOARD] Job status polling error:`, pollError)
          // Don't clear interval on polling error, keep trying
        }
      }, 5000) // Poll every 5 seconds

      // Store the polling interval so we can clean it up if needed
      return { jobId, pollInterval }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"

      const latest = useCreationStore.getState().creations.find((c) => c.id === creationId)
      const failed = latest || currentCreation

      updateCreation(creationId, {
        ...failed,
        softwareData: {
          chatId: "",
          demoUrl: "",
          isGenerating: false,
          error: errorMessage,
        },
      })

      toast({
        title: `Failed to start software generation`,
        description: errorMessage,
        variant: "destructive",
      })

      console.error(`[DASHBOARD] generateSoftware failed:`, error)
    }
  }

  const generateHardware = async (creationId: string) => {
    const currentCreation = useCreationStore.getState().creations.find((c) => c.id === creationId)
    const { user, project } = useUserStore.getState()

    console.log("[HARDWARE] generateHardware - Debug info:", {
      creationId,
      hasCurrentCreation: !!currentCreation,
      hasUser: !!user,
      hasProject: !!project,
      projectId: project?.id,
      userStoreState: { user, project },
    })

    if (!currentCreation) {
      console.error(`Creation ${creationId} not found – cannot generate hardware`)
      return
    }

    if (!project?.id) {
      console.error("[HARDWARE] Project ID missing - user store state:", { user, project })
      toast({
        title: "Project ID missing",
        description: "Failed to generate hardware since project id is missing",
        variant: "destructive",
      })
      return
    }

    console.log(`Starting async hardware generation for project: ${currentCreation.title}`)

    // Create project data for hardware generation
    const projectData = {
      id: project.id,
      title: currentCreation.title,
      description: currentCreation.prompt,
      userId: user?.id,
      v0_id: project.v0_id,
    }

    // Generate hardware specifications directly
    const jobKinds = ['3d', 'assembly', 'firmware']

    for (const jobKind of jobKinds) {
      try {
        console.log(`[HARDWARE] Generating: ${jobKind}`)

        // Call the generation endpoint directly
        const endpoint = `/api/hardware/generate-${jobKind}`
        const generationResponse = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectData }),
        })

        if (!generationResponse.ok) {
          const errorData = await generationResponse.json().catch(() => ({ error: "Unknown error" }))
          throw new Error(errorData.error || `HTTP ${generationResponse.status}: Generation failed`)
        }

        const generationData = await generationResponse.json()
        // Persist latest reportId in creation for reuse
        if (typeof generationData?.reportId === 'string') {
          const latest = useCreationStore.getState().creations.find((c) => c.id === creationId)
          if (latest) {
            updateCreation(creationId, {
              ...latest,
              hardwareReports: {
                ...((latest.hardwareReports as any) || {}),
                [jobKind === '3d' ? '3d-components' : jobKind === 'assembly' ? 'assembly-parts' : 'firmware-code']:
                  {
                    ...(((latest.hardwareReports as any)?.[jobKind === '3d' ? '3d-components' : jobKind === 'assembly' ? 'assembly-parts' : 'firmware-code']) || {}),
                    reportId: generationData.reportId,
                  },
              },
            })
          }
          // Immediately add to hover-sidebar list if it's a newly inserted hardware project (primary 3d pass)
          if (jobKind === '3d' && project?.id) {
            const { reportsList, setReportsList } = useHardwareStore.getState()
            if (!reportsList.some((i) => i.reportId === generationData.reportId)) {
              setReportsList([
                {
                  reportId: generationData.reportId as string,
                  projectId: project.id as string,
                  title: latest?.title || currentCreation.title || 'Hardware Project',
                  createdAt: new Date().toISOString(),
                },
                ...reportsList,
              ])
            }
          }
        }
        console.log(`[HARDWARE] Successfully generated ${jobKind}:`, generationData)

        // Create a job record for tracking
        if (!user || !user.id) {
          throw new Error('Missing user for job insert')
        }
        const supabase = createSupabaseClient()
        const { error: jobError } = await supabase
          .from('jobs')
          .insert({
            user_id: user.id,
            project_id: project.id,
            kind: `${jobKind}-components`,
            status: 'completed',
            priority: 50,
            input: {
              projectData,
              generationType: 'hardware',
              timestamp: new Date().toISOString(),
            },
            result: {
              success: true,
              reportId: generationData.reportId,
              content: generationData.content,
              timestamp: new Date().toISOString(),
            },
            finished_at: new Date().toISOString(),
          })

        if (jobError) {
          console.error(`[HARDWARE] Failed to create job record for ${jobKind}:`, jobError)
          // Don't throw here - continue with the process
        } else {
          console.log(`[HARDWARE] Job record created successfully for ${jobKind}`)
        }

      } catch (error: any) {
        console.error(`[HARDWARE] Failed to generate ${jobKind}:`, {
          error: error,
          message: error.message,
          stack: error.stack,
          cause: error.cause
        })

        // Check if it's an OpenAI API error
        if (error.message?.includes('OpenAI API')) {
          toast({
            title: `OpenAI API Error for ${jobKind === '3d' ? '3D components' : jobKind === 'assembly' ? 'assembly' : 'firmware'}`,
            description: error.message,
            variant: "destructive",
          })
        } else {
          toast({
            title: `Failed to generate ${jobKind === '3d' ? '3D components' : jobKind === 'assembly' ? 'assembly' : 'firmware'}`,
            description: error.message || "Unknown error occurred",
            variant: "destructive",
          })
        }
      }
    }

    // Show initial toast
    toast({
      title: "Hardware Generation Started",
      description: "Your hardware specifications are being generated. This may take up to 2 minutes.",
    })

    updateCreation(creationId, {
      ...currentCreation,
      hardwareData: {
        isGenerating: true,
        reportsGenerated: false,
      },
    })

    // Wait for all generations to complete
    setTimeout(async () => {
      // Update creation with hardware data
      updateCreation(creationId, {
        ...currentCreation,
        hardwareData: {
          isGenerating: false,
          reportsGenerated: true,
        },
      })

      toast({
        title: "Hardware Generation Complete",
        description: "Your 3D components, assembly instructions, and firmware code are ready!",
      })

      // Load hardware reports
      await loadHardwareReports(creationId)
    }, 10000) // Wait 10 seconds for generation to complete
  }

  const loadHardwareReports = async (creationId: string) => {
    const { user, project } = useUserStore.getState()

    if (!user?.id || !project?.id) {
      console.error("[HARDWARE] Cannot load reports - missing user or project data")
      return
    }

    try {
      const response = await fetch(`/api/hardware/reports?projectId=${project.id}&userId=${user.id}`)

      if (response.ok) {
        const reportsData = await response.json()
        console.log("[HARDWARE] Loaded reports:", reportsData)
        // Update creation with loaded reports
        const currentCreation = useCreationStore.getState().creations.find((c) => c.id === creationId)
        if (currentCreation) {
          updateCreation(creationId, {
            ...currentCreation,
            hardwareReports: reportsData.reports,
            hardwareModels: {
              ...(currentCreation.hardwareModels ?? {}),
              ...reportsData.models,
            },
          })
        }
      }
    } catch (error) {
      console.error("[HARDWARE] Failed to load reports:", error)
    }
  }

  const handleNewCreationSubmit = async (
    creationData: Omit<Creation, "id" | "chatHistory" | "modelParams" | "generatedCode" | "viewMode">,
  ) => {
    if (creationData.mode === "software") {
      const newCreation: Creation = {
        ...creationData,
        id: Date.now().toString(),
        chatHistory: [],
        components: [{ id: "main", name: "Application", prompt: creationData.prompt }],
        customParams: [],
        viewMode: "model",
        softwareData: {
          chatId: "",
          demoUrl: "",
          isGenerating: true,
        },
      }

      addCreation(newCreation)
      setActiveCreationId(newCreation.id)

      toast({
        title: "Generating software...",
        description: "LogicLab is creating your application with AI.",
      })

      generateSoftware(newCreation.id)
      return
    }

    if (creationData.mode === "hardware") {
      const newCreation: Creation = {
        ...creationData,
        id: Date.now().toString(),
        chatHistory: [],
        components: [],
        customParams: [],
        viewMode: "model",
        hardwareData: {
          isGenerating: true,
          reportsGenerated: false,
        },
        hardwareReports: {},
      }

      addCreation(newCreation)
      setActiveCreationId(newCreation.id)

      toast({
        title: "Generating hardware specifications...",
        description: "LogicLab is creating your 3D components, assembly instructions, and firmware code.",
      })

      generateHardware(newCreation.id)
      return
    }

    try {
      const analysisResponse = await fetch("/api/analyze-for-components-and-params", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: creationData.prompt, title: creationData.title }),
      })

      if (!analysisResponse.ok) {
        const errorData = await analysisResponse.json().catch(() => ({ error: "Unknown error" }))
        throw new Error(errorData.error || `HTTP ${analysisResponse.status}: Failed to analyze prompt`)
      }

      const analysisResult = await analysisResponse.json()

      const newCreation: Creation = {
        ...creationData,
        id: Date.now().toString(),
        chatHistory: [],
        components: analysisResult.components.map((comp: { name: string; description: string }) => ({
          id: `${Date.now()}-${comp.name}`,
          name: comp.name,
          prompt: comp.description,
        })),
        customParams: analysisResult.parameters,
        viewMode: "model",
        imageUrl: analysisResult.imageUrl,
        imagePrompt: analysisResult.imagePrompt,
        error: analysisResult.error,
      }

      addCreation(newCreation)
      setActiveCreationId(newCreation.id)

      toast({
        title: "Analysis complete!",
        description: `Identified ${newCreation.components.length} components with a generated image. Click "Generate 3D Model" to create a 3D model.`,
      })
    } catch (error) {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" })
    }
  }

  const handleRegenerate = () => {
    if (activeCreation) {
      if (creationMode === "software") {
        toast({ title: "Regenerating software with v0..." })
        generateSoftware(activeCreation.id)
      } else if (creationMode === "hardware") {
        toast({ title: "Regenerating hardware specifications..." })
        generateHardware(activeCreation.id)
      } else {
        toast({ title: "Regenerating 3D model with PartCrafter..." })
        generate3DModel(activeCreation.id)
      }
    }
  }

  const handleDeploy = () => {
    if (activeCreation?.softwareData?.demoUrl) {
      toast({
        title: "Deploy to Vercel",
        description: "Deployment functionality coming soon!",
      })
    } else {
      toast({
        title: "No app to deploy",
        description: "Generate software first to deploy",
        variant: "destructive",
      })
    }
  }

  const handleChatSelect = async (software: any) => {
    if (!user?.id) {
      console.error('User ID not available for chat selection')
      return
    }
    
    setSelectedChat(software)
    setShowLogoSidebar(false)
    
    // Load messages for this chat
    try {
      const response = await fetch(`/api/software/messages?softwareId=${software.id}&userId=${user.id}`)
      if (response.ok) {
        const data = await response.json()
        setChatMessages(data.messages || [])
        
        // Create a software creation for display
        const softwareCreation: Creation = {
          id: software.id,
          title: software.title,
          prompt: data.messages?.[0]?.content || "Software project",
          mode: "software",
          chatHistory: data.messages?.map((msg: any) => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            createdAt: new Date(msg.created_at)
          })) || [],
          components: [],
          customParams: [],
          softwareData: {
            chatId: software.software_id,
            demoUrl: software.demo_url,
            isGenerating: false
          }
        }
        
        // Add or update in creation store
        const existingCreation = creations.find(c => c.id === software.id)
        if (existingCreation) {
          updateCreation(software.id, softwareCreation)
        } else {
          addCreation(softwareCreation)
        }
        setActiveCreationId(software.id)
      }
    } catch (error) {
      console.error('Failed to load chat messages:', error)
      toast({
        title: "Error",
        description: "Failed to load chat messages",
        variant: "destructive"
      })
    }
  }

  const handleSendMessage = async (message: string) => {
    if (!selectedChat || !user?.id) {
      console.log(`[DASHBOARD] handleSendMessage - Missing required data: selectedChat=${!!selectedChat}, user.id=${!!user?.id}`)
      return
    }
    
    console.log(`[DASHBOARD] handleSendMessage - Sending message to software: ${selectedChat.id}`)
    
    try {
      const response = await fetch('/api/software/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          softwareId: selectedChat.id,
          message: message,
          userId: user.id
        })
      })
      
      console.log(`[DASHBOARD] handleSendMessage response status: ${response.status}`)
      
      let responseData
      try {
        const responseText = await response.text()
        console.log(`[DASHBOARD] handleSendMessage response text: ${responseText.substring(0, 500)}...`)
        
        if (response.headers.get("content-type")?.includes("application/json")) {
          responseData = JSON.parse(responseText)
        } else {
          throw new Error(`Server returned non-JSON response: ${responseText.substring(0, 200)}...`)
        }
      } catch (parseError) {
        console.error(`[DASHBOARD] Failed to parse handleSendMessage response:`, parseError)
        throw new Error(`Failed to parse server response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`)
      }
      
      if (response.ok) {
        console.log(`[DASHBOARD] handleSendMessage successful:`, responseData)
        
        // Update the software creation with new demo URL
        if (responseData.demoUrl) {
          console.log(`[DASHBOARD] Updating demo URL: ${responseData.demoUrl}`)
          updateCreation(selectedChat.id, {
            softwareData: {
              chatId: selectedChat.software_id,
              demoUrl: responseData.demoUrl,
              isGenerating: false
            }
          })
        }
        
        // Reload messages to get the updated conversation
        console.log(`[DASHBOARD] Reloading messages for software: ${selectedChat.id}`)
        const messagesResponse = await fetch(`/api/software/messages?softwareId=${selectedChat.id}&userId=${user.id}`)
        if (messagesResponse.ok) {
          const messagesData = await messagesResponse.json()
          console.log(`[DASHBOARD] Messages reloaded: ${messagesData.messages?.length || 0} messages`)
          setChatMessages(messagesData.messages || [])
          
          // Update creation store with new messages
          const updatedCreation = {
            chatHistory: messagesData.messages?.map((msg: any) => ({
              id: msg.id,
              role: msg.role,
              content: msg.content,
              createdAt: new Date(msg.created_at)
            })) || []
          }
          updateCreation(selectedChat.id, updatedCreation)
        } else {
          console.error(`[DASHBOARD] Failed to reload messages: ${messagesResponse.status}`)
        }
      } else {
        const errorMessage = responseData?.error || `HTTP ${response.status}: Server error`
        console.error(`[DASHBOARD] handleSendMessage failed:`, errorMessage)
        throw new Error(errorMessage)
      }
    } catch (error) {
      console.error(`[DASHBOARD] handleSendMessage error:`, error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send message",
        variant: "destructive"
      })
    }
  }

  const handleSidebarMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }
    setShowLogoSidebar(true)
  }

  const handleSidebarMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setShowLogoSidebar(false)
    }, 150)
  }

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div className="flex h-screen w-full overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-100/40 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/20 pt-16">
      <LogoHoverSidebar
        isVisible={showLogoSidebar}
        onNewCreation={() => {
          setShowLogoSidebar(false)
          setActiveCreationId(null)
          setSelectedChat(null)
        }}
        onGrowthMarketing={() => {
          setShowLogoSidebar(false)
          setShowGrowthMarketing(true)
        }}
        onMouseEnter={handleSidebarMouseEnter}
        onMouseLeave={handleSidebarMouseLeave}
        onChatSelect={handleChatSelect}
        softwareList={softwareList}
        onHardwareProjectSelect={async (selectedProjectId) => {
          const currentUser = useUserStore.getState().user
          if (!currentUser?.id) return
          try {
            // Fetch reports for selected project
            const reportsResp = await fetch(`/api/hardware/reports?projectId=${selectedProjectId}&userId=${currentUser.id}`, { cache: 'no-store' })
            if (reportsResp.ok) {
              const data = await reportsResp.json()
              const { setReportsForProject } = useHardwareStore.getState()
              setReportsForProject(selectedProjectId, data.reports || {})

              // Update or create a hardware creation to show these reports
              const activeId = useCreationStore.getState().activeCreationId
              const active = activeId ? useCreationStore.getState().creations.find(c => c.id === activeId) : null
              if (active && active.mode === 'hardware') {
                updateCreation(active.id, { hardwareReports: data.reports || {} })
              } else {
                const title = data?.title || data?.reports?.["3d-components"]?.project || 'Hardware Project'
                const newCreation: Creation = {
                  id: Date.now().toString(),
                  title,
                  prompt: '',
                  mode: 'hardware',
                  chatHistory: [],
                  components: [],
                  customParams: [],
                  viewMode: 'model',
                  hardwareData: { isGenerating: false, reportsGenerated: true },
                  hardwareReports: data.reports || {},
                }
                addCreation(newCreation)
                setActiveCreationId(newCreation.id)
              }
            }

            // Fetch component models for selected project
            const modelsResp = await fetch(`/api/hardware/models/list?projectId=${selectedProjectId}&userId=${currentUser.id}`, { cache: 'no-store' })
            if (modelsResp.ok) {
              const modelsData = await modelsResp.json()
              const { setModelsForProject } = useHardwareStore.getState()
              setModelsForProject(selectedProjectId, modelsData.models || {})

              // Merge into active creation if any
              const activeId = useCreationStore.getState().activeCreationId
              if (activeId) {
                const curr = useCreationStore.getState().creations.find(c => c.id === activeId)
                if (curr && curr.mode === 'hardware') {
                  updateCreation(activeId, { hardwareModels: { ...(curr.hardwareModels ?? {}), ...(modelsData.models || {}) } })
                }
              }
            }
          } catch (e) {
            console.error('[DASHBOARD] Failed to lazy-load hardware project', e)
          } finally {
            setShowLogoSidebar(false)
          }
        }}
      />

      <ChatSidebar onLogout={onLogout} onSendMessage={handleSendMessage} />

      <div className="flex-1 flex flex-col min-h-0">
        <PersistentHeader
          activeCreation={activeCreation}
          creationMode={creationMode}
          hardwareTab={hardwareTab}
          setHardwareTab={setHardwareTab}
          setShowGrowthMarketing={setShowGrowthMarketing}
          setShowIntegrations={setShowIntegrations}
          handleDeploy={handleDeploy}
          onLogout={onLogout}
          showLogoSidebar={showLogoSidebar}
          setShowLogoSidebar={setShowLogoSidebar}
          hoverTimeoutRef={hoverTimeoutRef}
        />

        <div className="flex-1 overflow-hidden">
          {activeCreation ? (
            <>
              {creationMode === "software" ? (
                <SoftwareViewer creation={activeCreation} onRegenerate={handleRegenerate} />
              ) : creationMode === "hardware" ? (
                <HardwareViewer
                  creation={activeCreation}
                  onRegenerate={handleRegenerate}
                  onGenerateComponentModel={({ componentId, componentName, prompt }) =>
                    generate3DModel(activeCreation.id, {
                      componentId,
                      componentName,
                      prompt,
                      mode: "component",
                    })
                  }
                />
              ) : (
                <ViewerPanel creation={activeCreation} onGenerate3D={generate3DModel} />
              )}
            </>
          ) : (
            <div className="h-full w-full overflow-hidden">
              <InitialPromptForm onSubmit={handleNewCreationSubmit} />
            </div>
          )}
        </div>

        {showIntegrations && <IntegrationPanel isOpen={showIntegrations} onClose={() => setShowIntegrations(false)} />}

        {showGrowthMarketing && (
          <GrowthMarketingPanel isOpen={showGrowthMarketing} onClose={() => setShowGrowthMarketing(false)} />
        )}
        {/* Dev test compile button removed */}
      </div>
    </div>
  )
}

export function Dashboard({ onLogout, initialSearchInput }: DashboardProps) {
  return <DashboardContent onLogout={onLogout} initialSearchInput={initialSearchInput} />
}
