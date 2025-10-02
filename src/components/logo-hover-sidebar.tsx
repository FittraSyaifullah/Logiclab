"use client"
import { Button } from "@/components/ui/button"
import { Plus, TrendingUp, Settings, HelpCircle, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"
import { useCreationStore } from "@/hooks/use-creation-store"
import { useUserStore } from "@/hooks/use-user-store"
import { useHardwareStore } from "@/hooks/use-hardware-store"
import { useState, useEffect } from "react"

export interface SoftwareItem {
  id: string
  title: string
  demo_url: string
  software_id: string
  created_at: string
}

interface LogoHoverSidebarProps {
  isVisible: boolean
  onNewCreation?: () => void
  onGrowthMarketing?: () => void
  onMouseEnter?: () => void
  onMouseLeave?: () => void
  onChatSelect?: (software: SoftwareItem) => void
  softwareList?: SoftwareItem[]
  onHardwareProjectSelect?: (projectId: string) => void
}

export function LogoHoverSidebar({
  isVisible,
  onNewCreation,
  onGrowthMarketing,
  onMouseEnter,
  onMouseLeave,
  onChatSelect,
  softwareList,
  onHardwareProjectSelect,
}: LogoHoverSidebarProps) {
  const { creations, activeCreationId, setActiveCreationId } = useCreationStore()
  const { user, project } = useUserStore()
  const { reportsList } = useHardwareStore()
  const [software, setSoftware] = useState<SoftwareItem[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)

  // Load user's software (chats) when component mounts or user changes
  useEffect(() => {
    if (softwareList && softwareList.length > 0) {
      setSoftware(softwareList)
      return
    }
    if (user && project && isVisible) {
      loadUserSoftware()
    }
  }, [softwareList, user, project, isVisible])

  const loadUserSoftware = async () => {
    if (!user) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/user/data?userId=${user.id}`, { cache: 'no-store' })
      if (response.ok) {
        const data = await response.json()
        setSoftware(data.software || [])
      }
    } catch (error) {
      console.error('Failed to load user software:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleChatSelect = (software: Software) => {
    setSelectedChatId(software.id)
    onChatSelect?.(software)
  }

  return (
    <div
      className={cn(
        "fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-r border-slate-200/30 dark:border-slate-700/30 shadow-xl transition-transform duration-300 ease-out z-40",
        isVisible ? "translate-x-0" : "-translate-x-full",
      )}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="flex flex-col h-full p-4">
        {/* Quick Actions */}
        <div className="space-y-3 mb-6">
          <Button
            onClick={onNewCreation}
            className="w-full justify-start bg-orange-500 hover:bg-orange-600 text-white shadow-md"
          >
            <Plus className="mr-3 h-4 w-4" />
            New Creation
          </Button>

          <Button
            onClick={onGrowthMarketing}
            variant="outline"
            className="w-full justify-start border-emerald-300 hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 bg-transparent"
          >
            <TrendingUp className="mr-3 h-4 w-4 text-emerald-600" />
            Growth Marketing
          </Button>
        </div>

        <div className="flex-1 overflow-hidden">
          {/* Software Chats */}
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
            Software Chats
          </div>

          <div className="space-y-1 overflow-y-auto max-h-[calc(50vh-8rem)]">
            {loading ? (
              <div className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
                Loading chats...
              </div>
            ) : software && software.length > 0 ? (
              software.map((chat) => (
                <Button
                  key={chat.id}
                  variant="ghost"
                  onClick={() => handleChatSelect(chat)}
                  className={cn(
                    "w-full justify-start text-left p-3 h-auto",
                    selectedChatId === chat.id
                      ? "bg-blue-100 dark:bg-blue-950/50 text-blue-900 dark:text-blue-100"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800",
                  )}
                >
                  <div className="flex flex-col items-start w-full">
                    <div className="flex items-center gap-2 w-full">
                      <MessageSquare className="h-4 w-4 flex-shrink-0" />
                      <div className="font-medium text-sm truncate">{chat.title}</div>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate w-full ml-6">
                      {new Date(chat.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </Button>
              ))
            ) : (
              <div className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
                No software chats yet. Create your first software project!
              </div>
            )}
          </div>

          {/* Hardware Projects */}
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 mt-6">
            Hardware Projects
          </div>

          <div className="space-y-1 overflow-y-auto max-h-[calc(50vh-8rem)]">
            {reportsList && reportsList.length > 0 ? (
              reportsList.map((item) => (
                <Button
                  key={`${item.projectId}:${item.reportId}`}
                  variant="ghost"
                  onClick={() => onHardwareProjectSelect?.(item.projectId)}
                  className={cn(
                    "w-full justify-start text-left p-3 h-auto",
                    "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800",
                  )}
                >
                  <div className="flex flex-col items-start w-full">
                    <div className="font-medium text-sm truncate w-full">{item.title || 'Hardware Project'}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate w-full">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </Button>
              ))
            ) : (
              <div className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">No hardware projects yet.</div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 dark:border-slate-700 pt-4 space-y-2">
          <Button
            variant="ghost"
            className="w-full justify-start text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Settings className="mr-3 h-4 w-4" />
            Settings
          </Button>

          <Button
            variant="ghost"
            className="w-full justify-start text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <HelpCircle className="mr-3 h-4 w-4" />
            Help & Support
          </Button>
        </div>
      </div>
    </div>
  )
}

