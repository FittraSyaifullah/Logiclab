import { supabase } from "./supabase"

export type Unsubscribe = () => Promise<void>

export interface JobRowUpdate {
  id: string
  status: string
  result?: { reportId?: string } | null
  error?: string | null
}

export function subscribeToJobStatus(
  jobId: string,
  handlers: {
    onUpdate?: (row: JobRowUpdate) => void
    onCompleted?: (row: JobRowUpdate) => void
    onFailed?: (row: JobRowUpdate) => void
  },
): { unsubscribe: Unsubscribe } {
  const channel = supabase
    .channel(`jobs:${jobId}`)
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "jobs", filter: `id=eq.${jobId}` },
      (payload) => {
        const next = payload.new as unknown as JobRowUpdate
        handlers.onUpdate?.(next)
        if (next.status === "completed") {
          handlers.onCompleted?.(next)
        } else if (next.status === "failed") {
          handlers.onFailed?.(next)
        }
      },
    )
    .subscribe()

  return {
    unsubscribe: async () => {
      try {
        await supabase.removeChannel(channel)
      } catch {
        // no-op
      }
    },
  }
}


