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
  console.log('[Realtime] Subscribing to job updates', { jobId })
  const channel = supabase
    .channel(`jobs:${jobId}`)
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "jobs", filter: `id=eq.${jobId}` },
      (payload) => {
        console.log('[Realtime] jobs UPDATE payload received', {
          table: 'jobs',
          jobId,
          old: payload.old,
          new: payload.new,
        })
        const next = payload.new as unknown as JobRowUpdate
        handlers.onUpdate?.(next)
        if (next.status === "completed") {
          console.log('[Realtime] job completed', { jobId, result: next.result })
          handlers.onCompleted?.(next)
        } else if (next.status === "failed") {
          console.warn('[Realtime] job failed', { jobId, error: next.error })
          handlers.onFailed?.(next)
        }
      },
    )
    .subscribe((status) => {
      console.log('[Realtime] channel status', { jobId, status })
    })

  return {
    unsubscribe: async () => {
      try {
        console.log('[Realtime] Unsubscribing job channel', { jobId })
        await supabase.removeChannel(channel)
      } catch {
        // no-op
      }
    },
  }
}


