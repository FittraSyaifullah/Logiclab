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
  const subscribeTimeoutMs = 7000
  let isSubscribed = false
  const subscribeTimeoutId = setTimeout(() => {
    if (!isSubscribed) {
      console.warn('[Realtime] Subscribe timeout waiting for channel SUBSCRIBED', { jobId, subscribeTimeoutMs })
    }
  }, subscribeTimeoutMs)
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
        console.log('[Realtime] Parsed job update', { jobId, status: next?.status, hasResult: !!next?.result, error: next?.error })
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
      if (status === 'SUBSCRIBED') {
        isSubscribed = true
        clearTimeout(subscribeTimeoutId)
      }
      if (status === 'CHANNEL_ERROR') {
        console.error('[Realtime] channel error state', { jobId })
      }
      if (status === 'TIMED_OUT') {
        console.warn('[Realtime] channel timed out', { jobId })
      }
    })

  return {
    unsubscribe: async () => {
      try {
        console.log('[Realtime] Unsubscribing job channel', { jobId })
        await supabase.removeChannel(channel)
        clearTimeout(subscribeTimeoutId)
        console.log('[Realtime] Unsubscribed job channel', { jobId })
      } catch {
        // no-op
      }
    },
  }
}


