import { type NextRequest, NextResponse } from "next/server"
import { createSupabaseClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { kind, projectId, userId, projectData } = await request.json()

    if (!kind || !projectId || !userId) {
      return NextResponse.json({ error: "Missing required fields: kind, projectId, userId" }, { status: 400 })
    }

    const supabase = createSupabaseClient()

    // Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, owner_id')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    if (project.owner_id !== userId) {
      return NextResponse.json({ error: "Unauthorized - not project owner" }, { status: 403 })
    }

    // Create job record
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert({
        user_id: userId,
        project_id: projectId,
        kind: kind,
        status: 'pending',
        input: {
          projectData,
          generationType: 'hardware',
          timestamp: new Date().toISOString(),
        },
      })
      .select()
      .single()

    if (jobError) {
      console.error("[HARDWARE] Failed to create job:", jobError)
      return NextResponse.json({ error: "Failed to create job" }, { status: 500 })
    }

    console.log(`[HARDWARE] Job created successfully: ${job.id} for ${kind}`)

    // Trigger the appropriate generation endpoint
    let endpoint = ""
    switch (kind) {
      case '3d-components':
        endpoint = "/api/hardware/generate-3d"
        break
      case 'assembly-parts':
        endpoint = "/api/hardware/generate-assembly"
        break
      case 'firmware-code':
        endpoint = "/api/hardware/generate-firmware"
        break
      default:
        return NextResponse.json({ error: "Invalid job kind" }, { status: 400 })
    }

    // Call the generation endpoint (this will be processed by the Edge Function)
    try {
      const generationResponse = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectData, jobId: job.id }),
      })

      if (generationResponse.ok) {
        const generationData = await generationResponse.json()

        // Update job status to completed and store result
        const { error: updateError } = await supabase
          .from('jobs')
          .update({
            status: 'completed',
            result: {
              success: true,
              reportId: generationData.reportId,
              content: generationData.content,
              timestamp: new Date().toISOString(),
            },
            finished_at: new Date().toISOString(),
          })
          .eq('id', job.id)

        if (updateError) {
          console.error("[HARDWARE] Failed to update job status:", updateError)
        }

        return NextResponse.json({
          success: true,
          jobId: job.id,
          message: `${kind} generation completed`,
        })
      } else {
        // Generation failed
        const errorData = await generationResponse.json().catch(() => ({ error: "Unknown error" }))

        await supabase
          .from('jobs')
          .update({
            status: 'failed',
            error: errorData.error,
            finished_at: new Date().toISOString(),
          })
          .eq('id', job.id)

        return NextResponse.json({
          success: false,
          error: `Generation failed: ${errorData.error}`,
        }, { status: 500 })
      }
    } catch (error: any) {
      console.error(`[HARDWARE] Failed to process ${kind} generation:`, error)

      await supabase
        .from('jobs')
        .update({
          status: 'failed',
          error: error.message,
          finished_at: new Date().toISOString(),
        })
        .eq('id', job.id)

      return NextResponse.json({
        success: false,
        error: `Processing failed: ${error.message}`,
      }, { status: 500 })
    }
  } catch (error: any) {
    console.error("[HARDWARE] Enqueue job error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
