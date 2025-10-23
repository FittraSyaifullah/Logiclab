"use client"

import type React from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useState, useEffect, useRef } from "react"
import { ChatSidebar } from "@/components/chat-sidebar"
import { ViewerPanel } from "@/components/viewer-panel"
// import { CodeViewer } from "@/components/code-viewer"
import { HardwareViewer } from "@/components/hardware-viewer"
import { InitialPromptForm } from "@/components/initial-prompt-form"
import { IntegrationPanel } from "@/components/integration-panel"
import { GrowthMarketingPanel } from "@/components/growth-marketing-panel"
import { Button } from "@/components/ui/button"
import CreditLimitModal from "@/components/credit-limit-modal"
import { LogoHoverSidebar, type SoftwareItem } from "@/components/logo-hover-sidebar"
import { useHardwareStore } from "@/hooks/use-hardware-store"
// import { useOpenScadWorker } from "@/hooks/useOpenScadWorker"
import {
  Monitor,
  Sparkles,
  Layers,
  ChevronDown,
  Settings,
  HelpCircle,
  CreditCard,
  RotateCcw,
} from "lucide-react"
import type { Creation, HardwareReports } from "@/lib/types"
import { useCreationStore } from "@/hooks/use-creation-store"
import { useUserStore } from "@/hooks/use-user-store"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { useHardwareRealtime } from "@/hooks/use-hardware-realtime"
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

export function PersistentHeader({
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
  creditsBalance,
  isPaid,
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
  creditsBalance: number
  isPaid: boolean
}) {
  const { toast } = useToast()
  const [urlInput, setUrlInput] = useState("")
  const { user } = useUserStore()
  const router = useRouter()

  useEffect(() => {
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
        try { useCreationStore.getState().clearCreations() } catch {}
        try { useHardwareStore.getState().clear() } catch {}
        try { useCreationStore.getState().setActiveCreationId(null) } catch {}
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
    <div className="fixed top-0 left-0 right-0 h-16 border-b border-slate-200/30 dark:border-slate-700/30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-sm px-3 sm:px-4 md:px-6 flex items-center justify-between z-50">
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        <div
          className="relative cursor-pointer transition-all duration-200 hover:scale-110 hover:drop-shadow-lg"
          onMouseEnter={handleLogoMouseEnter}
          onMouseLeave={handleLogoMouseLeave}
        >
          <Image
            src="/images/Buildables-Logo.png"
            alt="Buildables"
            width={32}
            height={32}
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
            {/*<Button
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
            </Button>*/}
          </div>
        )}
      </div>

      {/*<div className="hidden md:block flex-1 max-w-md mx-4 md:mx-6">
        <div className="relative">
          <Link className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Enter URL to preview..."
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            className="pl-10 bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 rounded-lg"
          />
        </div>
      </div>*/}

      <div className="flex items-center gap-2 sm:gap-3">
        {/*<Button
          variant="outline"
          size="sm"
          onClick={() => setShowGrowthMarketing(true)}
          className="hidden sm:inline-flex border-emerald-300 hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 font-medium px-3 sm:px-4 py-2 rounded-lg"
        >
          <TrendingUp className="mr-2 h-4 w-4 text-emerald-600" />
          Growth Marketing
        </Button>*/}

        {/*<Button
          variant="outline"
          size="sm"
          onClick={() => setShowIntegrations(true)}
          className="hidden sm:inline-flex border-blue-300 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 font-medium px-3 sm:px-4 py-2 rounded-lg"
        >
          <Database className="mr-2 h-4 w-4 text-blue-600" />
          Integration
        </Button>*/}

        {/*<Button
          size="sm"
          onClick={() => {
            try { useCreationStore.getState().setActiveCreationId(null) } catch {}
            router.push('/dashboard')
          }}
          className="rounded-full px-5 sm:px-6 py-2 font-semibold text-white shadow-[0_6px_20px_rgba(249,115,22,.35)] bg-gradient-to-b from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 focus-visible:ring-orange-500/30"
        >
          <Monitor className="mr-2 h-4 w-4" />
          Dashboard
        </Button>*/}

        {/*<Button
          size="sm"
          onClick={() => router.push('/debug')}
          className="rounded-full px-5 sm:px-6 py-2 font-semibold text-white shadow-[0_6px_20px_rgba(124,58,237,.35)] bg-gradient-to-b from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 focus-visible:ring-violet-500/30"
        >
          <Sparkles className="mr-2 h-4 w-4" />
          Debug
        </Button>*/}

        {/*<Button
          variant="outline"
          size="sm"
          onClick={handleDeploy}
          className="border-green-300 hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-950/50 font-medium px-4 py-2 rounded-lg bg-transparent"
        >
          <Rocket className="mr-2 h-4 w-4 text-green-600" />
          Deploy
        </Button>*/}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2 sm:px-3 py-2 h-auto">
              <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white font-medium text-sm">
                {getUserInitials()}
              </div>
              <div className="text-left hidden md:block">
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{getDisplayName()}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Free plan</div>
              </div>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-3 py-2 border-b">
              <div className="font-medium">{getDisplayName()}</div>
              {isPaid ? (
                <div className="text-sm text-muted-foreground">Paid plan — Unlimited credits</div>
              ) : (
                <>
                  <div className="text-sm text-muted-foreground">Credits: {Math.max(0, Number(creditsBalance) || 0)} left</div>
                  <div className="w-full bg-blue-200 rounded-full h-2 mt-1">
                    {/* Assume daily cap 50 for UI meter only */}
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${Math.max(0, Math.min(100, ((Number(creditsBalance) || 0) / 50) * 100))}%` }}></div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Daily credits reset at midnight UTC</div>
                </>
              )}
            </div>
            <DropdownMenuItem>
              <CreditCard className="mr-2 h-4 w-4" />
              Get free credits
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => { window.location.href = '/settings' }}>
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
  const { creations, activeCreationId, setActiveCreationId, addCreation, updateCreation, deleteCreation } = useCreationStore()
  const { user, project } = useUserStore()
  const activeCreation = (creations ?? []).find((c) => c.id === activeCreationId)
  const { toast } = useToast()

  const [viewMode, setViewMode] = useState<"model" | "code">("model")
  const [hardwareTab, setHardwareTab] = useState<"3d" | "code">("3d")
  const [showIntegrations, setShowIntegrations] = useState(false)
  const [showGrowthMarketing, setShowGrowthMarketing] = useState(false)
  const [showLogoSidebar, setShowLogoSidebar] = useState(false)
  const [showCreditModal, setShowCreditModal] = useState(false)
  const [selectedChat, setSelectedChat] = useState<{ id: string; title?: string; software_id?: string; demo_url?: string } | null>(null)
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; role: string; content: string; created_at?: string }>>([])
  const [softwareList, setSoftwareList] = useState<SoftwareItem[]>([])
  const [credits, setCredits] = useState<{ balance: number; paid: boolean }>({ balance: 0, paid: false })

  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const prevUserIdRef = useRef<string | null>(null)

  // Subscribe to realtime updates for hardware projects/models
  useHardwareRealtime()

  const creationMode = activeCreation?.mode || (activeCreation?.softwareData ? "software" : "hardware")
  
  // Debug logging
  useEffect(() => {
    console.log('[DASHBOARD] Active creation changed:', { 
      activeCreationId, 
      activeCreation: activeCreation ? { id: activeCreation.id, mode: activeCreation.mode, title: activeCreation.title } : null,
      creationMode 
    })
  }, [activeCreationId, activeCreation, creationMode])
  // Fetch credits for current user
  const refreshCredits = async () => {
    try {
      const uid = useUserStore.getState().user?.id
      if (!uid) return
      const resp = await fetch(`/api/credits?userId=${encodeURIComponent(uid)}`, { cache: 'no-store' })
      if (!resp.ok) return
      const data = await resp.json() as { balance?: number; paid?: boolean }
      setCredits({ balance: Number(data.balance) || 0, paid: !!data.paid })
    } catch {
      // noop
    }
  }

  useEffect(() => {
    // Clear cross-user state when user changes (including logout), then load credits
    const currentUserId = user?.id ?? null
    const previousUserId = prevUserIdRef.current

    if (previousUserId && previousUserId !== currentUserId) {
      // User switched accounts; clear persisted app state tied to previous user
      try {
        useCreationStore.getState().clearCreations()
      } catch {}
      try {
        useHardwareStore.getState().clear()
      } catch {}
      try {
        setActiveCreationId(null)
        setSelectedChat(null)
        setSoftwareList([])
        setChatMessages([])
      } catch {}
    }

    if (previousUserId === null && currentUserId) {
      // Fresh login; ensure clean UI
      try {
        useCreationStore.getState().clearCreations()
        useHardwareStore.getState().clear()
        setActiveCreationId(null)
        setSelectedChat(null)
      } catch {}
    }

    prevUserIdRef.current = currentUserId

    void refreshCredits()
  }, [user?.id, setActiveCreationId])

  // Centralized credit gate: only show modal on action attempts
  const ensureCredits = () => {
    if (!credits.paid && Number(credits.balance) <= 0) {
      setShowCreditModal(true)
      return false
    }
    return true
  }

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
        const response = await fetch(`/api/jobs/${jobId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `Failed to fetch job status for ${componentId}`)
      }

      if (data.completed) {
        const nextCreation = useCreationStore.getState().creations.find((c) => c.id === creationId)
        if (!nextCreation) return

        const stlContent = data.component?.stlContent as string | undefined
        const scadCode = data.component?.scadCode as string | undefined
        const parameters = Array.isArray(data.component?.parameters)
          ? (data.component?.parameters as Array<{ name?: string; value?: number; unit?: string; metadata?: Record<string, unknown> }>)
          : undefined
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
        // refresh credits after successful hardware generation (post-deduction)
        void refreshCredits()
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

  // Load projects (software and hardware) after login; ensure initial prompt form shows by default
  useEffect(() => {
    const loadAllProjects = async () => {
      if (!user?.id) return
      try {
        const resp = await fetch(`/api/user/data?userId=${user.id}`, { cache: "no-store" })
        if (resp.ok) {
          const data = await resp.json()
          setSoftwareList(data.software || [])
          // Ensure project is available on refresh so hardware list uses scoped URL
          try {
            const { setProject } = useUserStore.getState()
            setProject(data.project ?? null)
          } catch {}

          // Optionally, preload latest hardware reports into current creation if needed
          if (project?.id) {
            try {
              const hwResp = await fetch(`/api/hardware/reports?projectId=${project.id}&userId=${user.id}`, { cache: "no-store" })
              if (hwResp.ok) {
                const hw = await hwResp.json()
                // If there is no active hardware creation yet, keep initial prompt visible
                if (hw?.reports && activeCreation && activeCreation.mode === 'hardware') {
                  updateCreation(activeCreation.id, { hardwareReports: hw.reports })
                }
              }
            } catch {}
          }

          // Populate hover-sidebar hardware projects list (prefer scoped by current project)
          try {
            console.log('[DASHBOARD] Fetching hardware reports list for userId and projectId:', { userId: user.id, projectId: project?.id })
            const listUrl = project?.id
              ? `/api/hardware/reports/list?userId=${user.id}&projectId=${project.id}`
              : `/api/hardware/reports/list?userId=${user.id}`
            const listResp = await fetch(listUrl, { cache: 'no-store' })
            console.log('[DASHBOARD] Hardware reports list response status:', listResp.status)
            if (listResp.ok) {
              const listData = await listResp.json()
              console.log('[DASHBOARD] Hardware reports list data:', { 
                success: listData.success, 
                itemsCount: listData.items?.length || 0,
                sampleItem: listData.items?.[0] || null
              })
              const { setReportsList } = useHardwareStore.getState()
              setReportsList(listData.items || [])
              console.log('[DASHBOARD] Set reportsList in store, count:', (listData.items || []).length)
            } else {
              console.error('[DASHBOARD] Hardware reports list failed:', listResp.status, await listResp.text())
            }
          } catch (e) {
            console.error('[DASHBOARD] Hardware reports list error:', e)
          }
        }
      } catch (e) {}
    }
    loadAllProjects()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, project?.id])

  useEffect(() => {
    if (activeCreation) {
      setViewMode(activeCreation.viewMode || (creationMode === "software" ? "code" : "model"))
      // Auto-select software chat when switching to a software creation that has softwareData
      if (
        creationMode === "software" &&
        activeCreation.softwareData &&
        activeCreation.id &&
        (!selectedChat || selectedChat.id !== activeCreation.id)
      ) {
        setSelectedChat({
          id: activeCreation.id,
          title: activeCreation.title,
          software_id: activeCreation.softwareData.chatId,
          demo_url: activeCreation.softwareData.demoUrl,
        })
      }
    }
  }, [activeCreation, creationMode, selectedChat])

  const generate3DModel = async (
    creationId: string,
    options?: {
      componentId?: string
      componentName?: string
      prompt?: string
      mode?: "component" | "full"
    }
  ) => {
    if (!ensureCredits()) return
    const currentCreation = useCreationStore.getState().creations.find((c) => c.id === creationId)

    if (!currentCreation) {
      return
    }

    const { user, project } = useUserStore.getState()

    if (!user?.id || !project?.id) {
      toast({
        title: "Missing project context",
        description: "Please reload Buildables or re-authenticate before generating models.",
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
    if (!ensureCredits()) return
    const currentCreation = useCreationStore.getState().creations.find((c) => c.id === creationId)
    const { user, project } = useUserStore.getState()

    

    if (!currentCreation) {
      return
    }

    if (!project?.id) {
      toast({
        title: "Project ID missing",
        description: "Failed to generate software since project id is missing",
        variant: "destructive",
      })
      return
    }


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
      

      const response = await fetch("/api/software/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
      })

      let responseData: { success?: boolean; jobId?: string; error?: string }
      try {
        const text = await response.text()
        if (response.headers.get("content-type")?.includes("application/json")) {
          responseData = JSON.parse(text)
        } else {
          throw new Error(`Server returned non-JSON response: ${text.substring(0, 200)}...`)
        }
      } catch (parseErr) {
        throw new Error(`Failed to parse server response: ${parseErr instanceof Error ? parseErr.message : 'Unknown error'}`)
      }

      if (!response.ok) {
        throw new Error(responseData.error || `HTTP ${response.status}: Server error`)
      }

      if (!responseData.success || !responseData.jobId) {
        throw new Error(responseData.error || "No job ID returned")
      }

      const jobId = responseData.jobId

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

          if (statusData.completed) {
            clearInterval(pollInterval)

            if (statusData.software) {

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
                try {
                  const messagesResponse = await fetch(`/api/software/messages?softwareId=${statusData.software.id}&userId=${user?.id}`, { cache: "no-store" })
                  if (messagesResponse.ok) {
                    const messagesData = await messagesResponse.json()

                    // Update creation store with chat messages
                    const updatedCreation = {
                      chatHistory: (messagesData.messages as Array<{ id: string; role: 'user' | 'assistant'; content: string; created_at: string }> | undefined)?.map((msg) => ({
                        id: msg.id,
                        role: msg.role,
                        content: msg.content,
                        createdAt: new Date(msg.created_at)
                      })) || []
                    }
                    updateCreation(creationId, updatedCreation)

                    // Create a dedicated software creation aligned to DB software ID and focus it
                    const softwareCreation: Creation = {
                      id: statusData.software.id,
                      title: latest?.title || currentCreation.title || 'Software',
                      prompt: (messagesData.messages?.[0]?.content as string | undefined) ?? currentCreation.prompt ?? 'Software project',
                      mode: 'software',
                      chatHistory: (messagesData.messages as Array<{ id: string; role: 'user' | 'assistant'; content: string; created_at: string }> | undefined)?.map((msg) => ({
                        id: msg.id,
                        role: msg.role,
                        content: msg.content,
                        createdAt: new Date(msg.created_at)
                      })) || [],
                      components: [],
                      customParams: [],
                      softwareData: {
                        chatId: statusData.software.chatId,
                        demoUrl: statusData.software.demoUrl,
                        isGenerating: false,
                      },
                    }
                    // Add if not present
                    const exists = useCreationStore.getState().creations.some(c => c.id === softwareCreation.id)
                    if (!exists) {
                      addCreation(softwareCreation)
                    } else {
                      updateCreation(softwareCreation.id, softwareCreation)
                    }
                    // Optionally remove the temporary pre-generation creation
                    if (creationId !== softwareCreation.id) {
                      deleteCreation(creationId)
                    }
                    setActiveCreationId(softwareCreation.id)

                    // Set selected chat so UI knows which software is active for messages
                    setSelectedChat({
                      id: statusData.software.id,
                      title: softwareCreation.title,
                      software_id: statusData.software.chatId,
                      demo_url: statusData.software.demoUrl,
                    })
                  }
                } catch (error) {
                }
              }

              toast({
                title: statusData.software.demoUrl ? "Software Generated!" : "AI Needs More Information",
                description: statusData.software.demoUrl
                  ? `Successfully created "${currentCreation.title}"`
                  : `v0 has asked a question. Check the chat to respond and continue building.`,
              })
          // refresh credits after successful software generation (post-deduction)
          void refreshCredits()
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

      
    }
  }

  const generateHardware = async (creationId: string) => {
    if (!ensureCredits()) return
    const currentCreation = useCreationStore.getState().creations.find((c) => c.id === creationId)
    const { user, project } = useUserStore.getState()

    

    if (!currentCreation) {
      return
    }

    if (!project?.id) {
      toast({
        title: "Project ID missing",
        description: "Failed to generate hardware since project id is missing",
        variant: "destructive",
      })
      return
    }

    

    // Enqueue a single initial hardware generation job
    console.log('[CLIENT] Starting hardware generation...', {
      title: currentCreation.title,
      prompt: currentCreation.prompt,
      projectId: project.id,
      userId: user?.id
    })
    
    try {
      console.log('[CLIENT] Calling /api/hardware/generate-initial...')
      const response = await fetch('/api/hardware/generate-initial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
      title: currentCreation.title,
          prompt: currentCreation.prompt,
          projectId: project.id,
      userId: user?.id,
        }),
      })

      console.log('[CLIENT] Hardware API response status:', response.status)
      console.log('[CLIENT] Hardware API response headers:', Object.fromEntries(response.headers.entries()))
      
      const payload = await response.json().catch((error) => {
        console.error('[CLIENT] Failed to parse JSON response:', error)
        return {}
      }) as { success?: boolean; jobId?: string; error?: string }
      
      console.log('[CLIENT] Hardware API response payload:', payload)
      
      if (!response.ok || !payload?.success || !payload?.jobId) {
        const errorMsg = payload?.error || `Failed to enqueue hardware generation (status: ${response.status})`
        console.error('[CLIENT] Hardware generation failed:', errorMsg)
        throw new Error(errorMsg)
      }

      const jobId = payload.jobId
      console.log('[CLIENT] Hardware job created successfully:', jobId)

      // Start polling for job completion similar to software flow
      console.log('[CLIENT] Starting job polling...')
      const pollInterval = setInterval(async () => {
        try {
          console.log('[CLIENT] Polling job status for:', jobId)
          const statusResponse = await fetch(`/api/jobs/${jobId}`)
          console.log('[CLIENT] Job status response:', statusResponse.status)
          
          const statusData = await statusResponse.json()
          console.log('[CLIENT] Job status data:', statusData)
          
          if (statusData.completed) {
            console.log('[CLIENT] Job completed!', statusData)
            clearInterval(pollInterval)

            // If a specific reportId is returned, fetch just that report to avoid stale selection
            if (statusData.reportId) {
              console.log('[CLIENT] Fetching specific report:', statusData.reportId)
              const { user, project } = useUserStore.getState()
              if (user?.id && project?.id) {
                console.log('[CLIENT] User and project found, clearing stale reports...')
                // Clear stale reports before fetch to avoid flashing previous content
                const current = useCreationStore.getState().creations.find((c) => c.id === creationId)
                if (current) {
                  updateCreation(creationId, { ...current, hardwareReports: {} })
                }
                
                const reportsUrl = `/api/hardware/reports?projectId=${project.id}&userId=${user.id}&reportId=${statusData.reportId}`
                console.log('[CLIENT] Fetching reports from:', reportsUrl)
                const reportsResp = await fetch(reportsUrl, { cache: 'no-store' })
                console.log('[CLIENT] Reports response status:', reportsResp.status)
                
                if (reportsResp.ok) {
                  const fresh = await reportsResp.json()
                  console.log('[CLIENT] Fresh reports data:', fresh)
          const latest = useCreationStore.getState().creations.find((c) => c.id === creationId)
          if (latest) {
                    console.log('[CLIENT] Updating creation with fresh reports...')
                    updateCreation(creationId, { ...latest, hardwareReports: fresh.reports })
                  }
                } else {
                  console.error('[CLIENT] Failed to fetch reports:', reportsResp.status, await reportsResp.text())
                }
              } else {
                console.error('[CLIENT] Missing user or project for report fetching')
              }
            } else {
              console.log('[CLIENT] No specific reportId, using fallback method...')
              // Fallback: Refresh latest reports for current project
              await loadHardwareReports(creationId)
            }

            updateCreation(creationId, {
              ...currentCreation,
              hardwareData: { isGenerating: false, reportsGenerated: true },
            })

            console.log('[CLIENT] Hardware generation completed successfully!')
            toast({ title: 'Hardware Generation Complete', description: 'Your reports are ready.' })
          } else if (statusData.status === 'failed') {
            console.error('[CLIENT] Job failed:', statusData.error)
            clearInterval(pollInterval)
            updateCreation(creationId, {
              ...currentCreation,
              hardwareData: { isGenerating: false, reportsGenerated: false },
            })
            toast({ title: 'Hardware Generation Failed', description: statusData.error || 'Job failed', variant: 'destructive' })
          } else {
            console.log('[CLIENT] Job still processing, status:', statusData.status)
          }
        } catch (pollError) {
          console.error('[CLIENT] Error during job polling:', pollError)
          // keep polling
        }
      }, 5000)
    } catch (err) {
      console.error('[CLIENT] Hardware generation setup failed:', err)
      const message = err instanceof Error ? err.message : 'Unknown error'
      toast({ title: 'Failed to start hardware generation', description: message, variant: 'destructive' })
      updateCreation(creationId, {
        ...currentCreation,
        hardwareData: { isGenerating: false, reportsGenerated: false },
      })
      return
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
    console.log('[CLIENT] Loading hardware reports for creation:', creationId)
    const { user, project } = useUserStore.getState()

    if (!user?.id || !project?.id) {
      console.error('[CLIENT] Missing user or project for hardware reports')
      return
    }

    try {
      const reportsUrl = `/api/hardware/reports?projectId=${project.id}&userId=${user.id}`
      console.log('[CLIENT] Fetching hardware reports from:', reportsUrl)
      const response = await fetch(reportsUrl)

      console.log('[CLIENT] Hardware reports response status:', response.status)
      if (response.ok) {
        const reportsData = await response.json()
        console.log('[CLIENT] Hardware reports data:', reportsData)
        // Update creation with loaded reports
        const currentCreation = useCreationStore.getState().creations.find((c) => c.id === creationId)
        if (currentCreation) {
          console.log('[CLIENT] Updating creation with hardware reports...')
          updateCreation(creationId, {
            ...currentCreation,
            projectId: project?.id,
            hardwareReports: reportsData.reports,
            hardwareModels: {
              ...(currentCreation.hardwareModels ?? {}),
              ...reportsData.models,
            },
          })
          // After reports load, also load hardware messages for the active report if available
          const reportIdFromSections = (
            (reportsData.reports as HardwareReports)['assembly-parts']?.reportId ||
            (reportsData.reports as HardwareReports)['3d-components']?.reportId ||
            (reportsData.reports as HardwareReports)['firmware-code']?.reportId
          ) as string | undefined
          if (reportIdFromSections) {
            void loadHardwareMessages({ hardwareId: reportIdFromSections, creationId })
          }
        } else {
          console.error('[CLIENT] Current creation not found for ID:', creationId)
        }
      } else {
        console.error('[CLIENT] Failed to fetch hardware reports:', response.status, await response.text())
      }
    } catch (error) {
      console.error('[CLIENT] Error loading hardware reports:', error)
    }
  }

  // Load hardware chat messages for latest or selected hardware report
  const loadHardwareMessages = async (args: { hardwareId?: string; creationId?: string }) => {
    const { user, project } = useUserStore.getState()
    if (!user?.id) return

    try {
      const params = args.hardwareId
        ? `hardwareId=${encodeURIComponent(args.hardwareId)}&userId=${encodeURIComponent(user.id)}`
        : project?.id
          ? `projectId=${encodeURIComponent(project.id)}&userId=${encodeURIComponent(user.id)}`
          : `userId=${encodeURIComponent(user.id)}`
      const resp = await fetch(`/api/hardware/messages?${params}`, { cache: 'no-store' })
      if (!resp.ok) return
      const data = await resp.json() as { messages?: Array<{ id: string; role: 'user' | 'assistant' | 'system'; content: string; created_at?: string }> }
      const targetCreationId = args.creationId || useCreationStore.getState().activeCreationId || activeCreation?.id
      const target = targetCreationId ? useCreationStore.getState().creations.find((c) => c.id === targetCreationId) : undefined
      if (target && target.mode === 'hardware') {
        const chatHistory = (data.messages || []).map((m) => ({ id: m.id, role: (m.role === 'system' ? 'assistant' : m.role) as 'user' | 'assistant', content: m.content, createdAt: m.created_at ? new Date(m.created_at) : undefined }))
        updateCreation(target.id, { chatHistory })
      }
    } catch {}
  }

  const handleNewCreationSubmit = async (
    creationData: Omit<Creation, "id" | "chatHistory" | "modelParams" | "generatedCode" | "viewMode">,
  ) => {
    // Only handle hardware mode now
    const newCreation: Creation = {
      ...creationData,
      id: Date.now().toString(),
      chatHistory: [],
      components: [],
      customParams: [],
      viewMode: "model",
      projectId: useUserStore.getState().project?.id,
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
      description: "Buildables is creating your 3D components, assembly instructions, and firmware code.",
    })

    generateHardware(newCreation.id)
  }

  const handleRegenerate = () => {
    if (activeCreation) {
      if (creationMode === "hardware") {
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

  const handleChatSelect = async (software: { id: string; title?: string; software_id?: string; demo_url?: string }) => {
    if (!user?.id) {
      return
    }
    
    setSelectedChat(software)
    setShowLogoSidebar(false)
    
    // Load messages for this chat
    try {
      const response = await fetch(`/api/software/messages?softwareId=${software.id}&userId=${user.id}`, { cache: "no-store" })
      if (response.ok) {
        const data = await response.json()
        setChatMessages(data.messages || [])
        
        // Create a software creation for display
          const softwareCreation: Creation = {
          id: software.id,
            title: software.title ?? "Software",
            prompt: (data.messages?.[0]?.content as string | undefined) ?? "Software project",
          mode: "software",
            chatHistory: (data.messages as Array<{ id: string; role: 'user' | 'assistant'; content: string; created_at: string }> | undefined)?.map((msg) => ({
              id: msg.id,
              role: msg.role,
              content: msg.content,
              createdAt: new Date(msg.created_at)
            })) || [],
          components: [],
          customParams: [],
          softwareData: {
              chatId: software.software_id ?? "",
              demoUrl: software.demo_url ?? "",
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
      toast({
        title: "Error",
        description: "Failed to load chat messages",
        variant: "destructive"
      })
    }
  }

  const handleSendMessage = async (message: string) => {
    
    
    if (!user?.id) {
      return
    }
    // Fallback: if selectedChat is not set, try to use activeCreation when in software mode
    const effectiveSoftwareId = selectedChat?.id || (creationMode === 'software' ? activeCreation?.id : undefined)
    if (!effectiveSoftwareId) {
      return
    }
    
    
    
    try {
      const requestBody = {
        softwareId: effectiveSoftwareId,
        message: message,
        userId: user.id
      }
      
      const response = await fetch('/api/software/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })
      
      let responseData
      try {
        const responseText = await response.text()
        
        if (response.headers.get("content-type")?.includes("application/json")) {
          responseData = JSON.parse(responseText)
        } else {
          throw new Error(`Server returned non-JSON response: ${responseText.substring(0, 200)}...`)
        }
      } catch (parseError) {
        throw new Error(`Failed to parse server response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`)
      }
      
      if (response.ok) {
        
        // Update the software creation with new demo URL
        if (responseData.demoUrl && effectiveSoftwareId) {
          updateCreation(effectiveSoftwareId, {
            softwareData: {
              chatId: selectedChat?.software_id ?? activeCreation?.softwareData?.chatId ?? "",
              demoUrl: responseData.demoUrl as string,
              isGenerating: false
            }
          })
        }
        
        // Reload messages to get the updated conversation
        const messagesResponse = await fetch(`/api/software/messages?softwareId=${effectiveSoftwareId}&userId=${user.id}`)
        if (messagesResponse.ok) {
          const messagesData = await messagesResponse.json()
          setChatMessages(messagesData.messages || [])
          
          // Update creation store with new messages
          const updatedCreation = {
            chatHistory: (messagesData.messages as Array<{ id: string; role: 'user' | 'assistant'; content: string; created_at: string }> | undefined)?.map((msg) => ({
              id: msg.id,
              role: msg.role,
              content: msg.content,
              createdAt: new Date(msg.created_at)
            })) || []
          }
          updateCreation(effectiveSoftwareId, updatedCreation)
        } else {
        }
      } else {
        const errorMessage = responseData?.error || `HTTP ${response.status}: Server error`
        throw new Error(errorMessage)
      }
    } catch (error) {
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
    <div className="flex min-h-svh w-full overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-100/40 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/20 pt-16">
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
         onHardwareProjectSelect={async ({ projectId: selectedProjectId, reportId: selectedReportId }) => {
           console.log('[DASHBOARD] Hardware project selected:', { selectedProjectId, selectedReportId })
           const currentUser = useUserStore.getState().user
           if (!currentUser?.id) {
             console.log('[DASHBOARD] No current user, aborting hardware project selection')
             return
           }
           
           try {
             // Fetch reports for selected project
             const reportsResp = await fetch(`/api/hardware/reports?projectId=${selectedProjectId}&userId=${currentUser.id}&reportId=${selectedReportId}`, { cache: 'no-store' })
             if (reportsResp.ok) {
               const data = await reportsResp.json()
               const { setReportsForProject } = useHardwareStore.getState()
               setReportsForProject(selectedProjectId, data.reports || {})

               // Update or create a hardware creation to show these reports
               const activeId = useCreationStore.getState().activeCreationId
               const active = activeId ? useCreationStore.getState().creations.find(c => c.id === activeId) : null
              const reports = data.reports || {}
              const selectedKey = selectedReportId && (reports as HardwareReports)[selectedReportId as keyof HardwareReports] ? selectedReportId : Object.keys(reports).pop()
              const selectedReport = selectedKey ? (reports as HardwareReports)[selectedKey as keyof HardwareReports] : undefined
               const title = data?.title || 'Hardware Project'

              // Use reportId as stable creation id
              const primaryReportId = (selectedReport as { reportId?: string } | undefined)?.reportId || (
                (reports as HardwareReports)['assembly-parts']?.reportId ||
                (reports as HardwareReports)['3d-components']?.reportId ||
                (reports as HardwareReports)['firmware-code']?.reportId
              )
              const creationId = primaryReportId || `${selectedProjectId}-latest`
               const existing = useCreationStore.getState().creations.find(c => c.id === creationId)
               const creationPayload: Creation = {
                 id: creationId,
                 title,
                 prompt: '',
                 mode: 'hardware',
                 chatHistory: [],
                 components: [],
                 customParams: [],
                 viewMode: 'model',
                 projectId: selectedProjectId,
                 hardwareData: { isGenerating: false, reportsGenerated: true },
                 hardwareReports: reports,
               }
               
               if (existing) {
                 updateCreation(creationId, creationPayload)
               } else {
                 addCreation(creationPayload)
               }
               
               setActiveCreationId(creationId)
               console.log('[DASHBOARD] Set active creation ID:', creationId)
               console.log('[DASHBOARD] Creation mode should be hardware:', creationPayload.mode)

               // Load chat messages for this hardware report using the actual reportId
               const reportIdFromSections = (
                 (reports as HardwareReports)['assembly-parts']?.reportId ||
                 (reports as HardwareReports)['3d-components']?.reportId ||
                 (reports as HardwareReports)['firmware-code']?.reportId
               ) as string | undefined
               const hardwareIdForMessages = (selectedReport as { reportId?: string } | undefined)?.reportId || reportIdFromSections
               if (hardwareIdForMessages) {
                 console.log('[DASHBOARD] Loading hardware messages for hardwareId:', hardwareIdForMessages)
                 void loadHardwareMessages({ hardwareId: hardwareIdForMessages, creationId })
               } else {
                 console.log('[DASHBOARD] No reportId found; loading messages by project context')
                 void loadHardwareMessages({ creationId })
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
          } finally {
            setShowLogoSidebar(false)
          }
        }}
      />

      {activeCreation && <ChatSidebar onLogout={onLogout} onSendMessage={handleSendMessage} />}

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
          creditsBalance={credits.balance}
          isPaid={credits.paid}
        />

        <div className="flex-1 overflow-hidden">
          {activeCreation ? (
            <>
              {creationMode === "hardware" ? (
                <>
                  {console.log('[DASHBOARD] Rendering HardwareViewer with creation:', activeCreation)}
                  <HardwareViewer
                    creation={activeCreation}
                    onRegenerate={handleRegenerate}
                    creditGate={ensureCredits}
                    onGenerateComponentModel={({ componentId, componentName, prompt }) =>
                      generate3DModel(activeCreation.id, {
                        componentId,
                        componentName,
                        prompt,
                        mode: "component",
                      })
                    }
                  />
                </>
              ) : (
                <>
                  {console.log('[DASHBOARD] Rendering ViewerPanel (software mode) with creation:', activeCreation)}
                  <ViewerPanel creation={activeCreation} onGenerate3D={generate3DModel} />
                </>
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
          <GrowthMarketingPanel creditGate={ensureCredits} isOpen={showGrowthMarketing} onClose={() => setShowGrowthMarketing(false)} />
        )}
        <CreditLimitModal open={showCreditModal} onClose={() => setShowCreditModal(false)} />
        {/* Dev test compile button removed */}
      </div>
    </div>
  )
}

export function Dashboard({ onLogout, initialSearchInput }: DashboardProps) {
  return <DashboardContent onLogout={onLogout} initialSearchInput={initialSearchInput} />
}
