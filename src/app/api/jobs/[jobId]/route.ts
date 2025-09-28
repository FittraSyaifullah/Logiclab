import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest, context: { params: Promise<{ jobId: string }> }) {
  try {
    const supabase = createSupabaseServerClient()
    const { jobId } = await context.params

    if (!jobId) {
      return NextResponse.json({ error: "Job ID is required" }, { status: 400 })
    }

    const { data: job, error } = await supabase.from("jobs").select("*").eq("id", jobId).single()

    if (error || !job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 })
    }

    const basePayload = {
      jobId: job.id,
      status: job.status as string,
      startedAt: job.started_at,
      finishedAt: job.finished_at,
    }

    if (job.status === "completed") {
      const softwareData = job.result?.software
      const hardwareResult = job.kind === "hardware-model-component" ? job.result ?? {} : null

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
      })
    }

    if (job.status === "failed") {
      return NextResponse.json({
        ...basePayload,
        completed: false,
        error: job.error,
      })
    }

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
