"use client"

import { useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { useUserStore } from "@/hooks/use-user-store"
import { useHardwareStore } from "@/hooks/use-hardware-store"
import { useCreationStore } from "@/hooks/use-creation-store"
import { useToast } from "@/hooks/use-toast"

export function useHardwareRealtime() {
	const { user, project } = useUserStore()
  const { setReportsForProject } = useHardwareStore()
	const { toast } = useToast()
	const audioRef = useRef<HTMLAudioElement | null>(null)

	useEffect(() => {
		if (!audioRef.current) {
			try {
				const audio = new Audio("/soundeffects/ding-36029.mp3")
				audioRef.current = audio
			} catch {}
		}
	}, [])

	useEffect(() => {
		if (!user?.id) return

		const channel = supabase
			.channel("hardware-updates")
			.on(
				"postgres_changes",
				{ event: "INSERT", schema: "public", table: "hardware_projects" },
				(payload) => {
					void handleProjectsChange(payload.new as Record<string, unknown>)
				},
			)
			.on(
				"postgres_changes",
				{ event: "UPDATE", schema: "public", table: "hardware_projects" },
				(payload) => {
					void handleProjectsChange(payload.new as Record<string, unknown>)
				},
			)
			.on(
				"postgres_changes",
				{ event: "*", schema: "public", table: "hardware_models" },
				(_payload) => {
					// Models are hydrated through existing list endpoint; rely on project updates for viewer
				},
			)
			.subscribe()

    async function handleProjectsChange(row: Record<string, unknown>) {
			const projId = (row.project_id as string) || project?.id
			if (!projId || !user?.id) return
			try {
				const reportsResp = await fetch(`/api/hardware/reports?projectId=${projId}&userId=${user.id}&reportId=${row.id as string}`, { cache: "no-store" })
				if (reportsResp.ok) {
					const reportsData = await reportsResp.json()
					setReportsForProject(projId, reportsData.reports || {})

          // Update hover sidebar recent projects list with this report
          try {
            const current = useHardwareStore.getState().reportsList || []
            const itemIndex = current.findIndex((i) => i.reportId === (row.id as string))
            const nextItem = {
              reportId: String(row.id || ""),
              projectId: String(projId),
              title: (row.title as string | undefined) || undefined,
              createdAt: String(row.created_at || new Date().toISOString()),
            }
            const nextList = itemIndex >= 0
              ? current.map((it, idx) => (idx === itemIndex ? nextItem : it))
              : [nextItem, ...current].slice(0, 20)
            useHardwareStore.getState().setReportsList(nextList)
          } catch {}

					const activeId = useCreationStore.getState().activeCreationId
					const active = activeId ? useCreationStore.getState().creations.find((c) => c.id === activeId) : null
					const isViewingHardware = active && active.mode === "hardware" && (active.projectId === projId)
					if (!isViewingHardware) {
						// Play ding + toast without navigation
						try { await audioRef.current?.play() } catch {}
						toast({ title: "New hardware reports ready", description: "Open your project to view the latest results." })
					} else if (active) {
						useCreationStore.getState().updateCreation(active.id, { hardwareReports: reportsData.reports || {} })
					}
				}
			} catch {}
		}

		return () => {
			void supabase.removeChannel(channel)
		}
	}, [user?.id, project?.id, setReportsForProject, toast])
}


