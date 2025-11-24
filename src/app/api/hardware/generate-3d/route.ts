import { type NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const maxDuration = 60

// Fire-and-forget 3D generation: enqueue a job and trigger Supabase worker by jobId
export async function POST(request: NextRequest) {
  interface ProjectData {
    id: string
    description?: string
    title?: string
  }

  try {
    const body = await request.json()
    const projectData = body?.projectData as ProjectData | undefined
    const providedReportId = body?.reportId as string | undefined

    if (!projectData) {
      return NextResponse.json({ error: "Project data is required" }, { status: 400 })
    }

    const supabase = createSupabaseServerClient()

    // Create a job that describes this 3D generation request
    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .insert({
        kind: "hardware_3d_generation",
        status: "pending",
        input: {
          projectData,
          reportId: providedReportId ?? null,
        },
      })
      .select("id")
      .single()

    if (jobError || !job) {
      console.error("[3D] Failed to enqueue 3D generation job:", jobError)
      return NextResponse.json({ error: "Failed to enqueue 3D generation job" }, { status: 500 })
    }

    const HARDWARE_3D_FUNCTION_ENDPOINT = process.env.SUPABASE_HARDWARE_3D_FUNCTION_URL
    const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (HARDWARE_3D_FUNCTION_ENDPOINT && SERVICE_ROLE_KEY) {
      // Trigger Supabase edge function in the background; do not block HTTP response
      ;(async () => {
        try {
          console.log("[3D] Triggering hardware-generate-3d function for job", job.id)
          const resp = await fetch(HARDWARE_3D_FUNCTION_ENDPOINT, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ jobId: job.id }),
          })

          if (!resp.ok) {
            const text = await resp.text()
            console.warn("[3D] hardware-generate-3d edge function returned non-OK", resp.status, text)
          }
        } catch (err) {
          console.warn("[3D] Failed to trigger hardware-generate-3d edge function", err)
        }
      })()
    } else {
      console.warn("[3D] Missing SUPABASE_HARDWARE_3D_FUNCTION_URL or SUPABASE_SERVICE_ROLE_KEY; 3D worker not triggered")
    }

    // Return quickly so the client is not blocked by OpenAI / DB work
    return NextResponse.json({
      success: true,
      jobId: job.id,
    })
  } catch (error: unknown) {
    const err = error as { message?: string; stack?: string; cause?: unknown }
    console.error("[3D] Error enqueuing 3D generation job:", {
      error,
      message: err?.message,
      stack: err?.stack,
      cause: err?.cause,
    })

    const message = err?.message || "Internal server error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
