"use client"
import { Button } from "@/components/ui/button"
import { Plus, TrendingUp, Settings, HelpCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { useCreationStore } from "@/hooks/use-creation-store"

interface LogoHoverSidebarProps {
  isVisible: boolean
  onNewCreation?: () => void
  onGrowthMarketing?: () => void
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}

export function LogoHoverSidebar({
  isVisible,
  onNewCreation,
  onGrowthMarketing,
  onMouseEnter,
  onMouseLeave,
}: LogoHoverSidebarProps) {
  const { creations, activeCreationId, setActiveCreationId } = useCreationStore()

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
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
            Creations
          </div>

          <div className="space-y-1 overflow-y-auto max-h-[calc(100vh-16rem)]">
            {creations && creations.length > 0 ? (
              creations.map((creation) => (
                <Button
                  key={creation.id}
                  variant="ghost"
                  onClick={() => setActiveCreationId(creation.id)}
                  className={cn(
                    "w-full justify-start text-left p-3 h-auto",
                    activeCreationId === creation.id
                      ? "bg-orange-100 dark:bg-orange-950/50 text-orange-900 dark:text-orange-100"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800",
                  )}
                >
                  <div className="flex flex-col items-start w-full">
                    <div className="font-medium text-sm truncate w-full">{creation.title}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate w-full">
                      {creation.mode === "software" ? "Software" : "Hardware"} •{" "}
                      {new Date(Number.parseInt(creation.id)).toLocaleDateString()}
                    </div>
                  </div>
                </Button>
              ))
            ) : (
              <div className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">
                No creations yet. Start by creating your first project!
              </div>
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

