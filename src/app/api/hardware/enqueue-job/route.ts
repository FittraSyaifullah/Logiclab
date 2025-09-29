import { type NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { kind, projectId, userId, projectData } = await request.json()

    if (!kind || !projectId || !userId) {
      return NextResponse.json({ error: "Missing required fields: kind, projectId, userId" }, { status: 400 })
    }

    const supabase = createSupabaseServerClient()

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

    // Update job status to pending (will be processed by Edge Function)
    const { error: updateError } = await supabase
      .from('jobs')
      .update({
        status: 'pending',
        started_at: new Date().toISOString(),
      })
      .eq('id', job.id)

    if (updateError) {
      console.error("[HARDWARE] Failed to update job status:", updateError)
      return NextResponse.json({ error: "Failed to update job status" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      jobId: job.id,
      message: `${kind} job enqueued successfully`,
    })
  } catch (error: any) {
    console.error("[HARDWARE] Enqueue job error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
