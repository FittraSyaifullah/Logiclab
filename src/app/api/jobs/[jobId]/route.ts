import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest, context: { params: Promise<{ jobId: string }> }) {
  try {
    console.log('[JOBS] GET /api/jobs/[jobId] invoked')
    const supabase = createSupabaseServerClient()
    const { jobId } = await context.params
    console.log('[JOBS] Extracted params', { jobId })

    if (!jobId) {
      console.warn('[JOBS] Missing jobId')
      return NextResponse.json({ error: "Job ID is required" }, { status: 400 })
    }

    console.log('[JOBS] Fetching job from database', { jobId })
    const { data: job, error } = await supabase.from("jobs").select("*").eq("id", jobId).single()

    if (error || !job) {
      console.warn('[JOBS] Job not found', { jobId, error })
      return NextResponse.json({ error: "Job not found" }, { status: 404 })
    }

    console.log('[JOBS] Job loaded', { jobId, status: job.status, kind: job.kind })
    const basePayload = {
      jobId: job.id,
      status: job.status as string,
      startedAt: job.started_at,
      finishedAt: job.finished_at,
    }

    if (job.status === "completed") {
      console.log('[JOBS] Job is completed', { jobId })
      const softwareData = job.result?.software
      const hardwareResult = job.kind === "hardware-model-component" ? job.result ?? {} : null
      const hardwareInitialReportId = job.kind === 'hardware_initial_generation' ? job.result?.reportId : undefined

      console.log('[JOBS] Returning completed payload', {
        jobId,
        hasSoftware: !!softwareData,
        hasHardwareComponent: !!hardwareResult,
        reportId: hardwareInitialReportId ?? null
      })
      return NextResponse.json({
        ...basePayload,
        completed: true,
        software: softwareData
          ? {
              id: softwareData.id,
              title: softwareData.title,
              demoUrl: softwareData.demoUrl,
              chatId: softwareData.chatId,
            }
          : null,
        component: hardwareResult
          ? {
              id: hardwareResult.componentId,
              name: hardwareResult.componentName,
              stlContent: hardwareResult.stlBase64,
              scadCode: hardwareResult.scadCode,
              parameters: hardwareResult.parameters,
            }
          : null,
        reportId: hardwareInitialReportId ?? null,
      })
    }

    if (job.status === "failed") {
      console.warn('[JOBS] Job failed', { jobId, error: job.error })
      return NextResponse.json({
        ...basePayload,
        completed: false,
        error: job.error,
      })
    }

    console.log('[JOBS] Job still processing', { jobId, status: job.status })
    return NextResponse.json({
      ...basePayload,
      completed: false,
      component:
        job.kind === "hardware-model-component"
          ? {
              id: job.result?.componentId,
              status: job.status,
            }
          : null,
    })
  } catch (err) {
    console.error("[JOBS] Job status error", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
