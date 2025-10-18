"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Library } from "@/components/library"
import { DebugChat } from "@/components/debug-chat"
import { PersistentHeader } from "@/components/dashboard"
import { useCreationStore } from "@/hooks/use-creation-store"
import { useToast } from "@/hooks/use-toast"

export default function DebugPage() {
  const { creations, activeCreationId } = useCreationStore()
  const { toast } = useToast()

  const activeCreation = useMemo(() => (creations ?? []).find((c) => c.id === activeCreationId), [creations, activeCreationId])
  const creationMode = activeCreation?.mode || (activeCreation?.softwareData ? "software" : "hardware")

  const [hardwareTab, setHardwareTab] = useState<"3d" | "code">("3d")
  const [showGrowthMarketing, setShowGrowthMarketing] = useState(false)
  const [showIntegrations, setShowIntegrations] = useState(false)
  const [showLogoSidebar, setShowLogoSidebar] = useState(false)
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Placeholder: in dashboard we fetch credits; here keep simple and lightweight
  const creditsBalance = 0
  const isPaid = false

  const handleDeploy = () => {
    toast({ title: "No app to deploy", description: "Generate software first to deploy", variant: "destructive" })
  }

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    }
  }, [])

  return (
    <div className="min-h-svh w-full overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-100/40 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/20 pt-16">
      <PersistentHeader
        activeCreation={activeCreation}
        creationMode={creationMode}
        hardwareTab={hardwareTab}
        setHardwareTab={setHardwareTab}
        setShowGrowthMarketing={setShowGrowthMarketing}
        setShowIntegrations={setShowIntegrations}
        handleDeploy={handleDeploy}
        onLogout={() => {}}
        showLogoSidebar={showLogoSidebar}
        setShowLogoSidebar={setShowLogoSidebar}
        hoverTimeoutRef={hoverTimeoutRef}
        creditsBalance={creditsBalance}
        isPaid={isPaid}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6 md:py-8">
        <div className="mb-6 md:mb-8 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100">Debug Tools</h1>
            <p className="text-sm md:text-base text-slate-600 dark:text-slate-300">Diagnostics and developer utilities</p>
          </div>
          <Badge className="bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200">Beta</Badge>
        </div>

        <Tabs defaultValue="debug" className="w-full">
          <TabsList className="mb-4 md:mb-6">
            <TabsTrigger value="debug" className="min-w-24">Debug</TabsTrigger>
            <TabsTrigger value="library" className="min-w-24">Library</TabsTrigger>
          </TabsList>

          <TabsContent value="debug">
            <div className="h-[calc(100vh-12rem)]">
              <DebugChat />
            </div>
          </TabsContent>

          <TabsContent value="library">
            <div className="h-[calc(100vh-12rem)]">
              <Library />
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border rounded-md px-3 py-2 bg-white/70 dark:bg-slate-800/40">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className="font-medium text-slate-900 dark:text-slate-100">{value}</span>
    </div>
  )
}


