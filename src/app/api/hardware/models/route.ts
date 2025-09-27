import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const {
      creationId,
      componentId,
      componentName,
      prompt,
      projectId,
      userId,
    }: {
      creationId?: string
      componentId?: string
      componentName?: string
      prompt?: string
      projectId?: string
      userId?: string
    } = await request.json()

    if (!creationId || !componentId || !projectId || !userId) {
      return NextResponse.json(
        {
          error: "creationId, componentId, projectId, and userId are required",
        },
        { status: 400 },
      )
    }

    const supabase = createSupabaseServerClient()

    const { data: job, error } = await supabase
      .from("jobs")
      .insert({
        user_id: userId,
        project_id: projectId,
        kind: "hardware-model",
        status: "pending",
        priority: 50,
        input: {
          creationId,
          componentId,
          componentName,
          prompt,
          projectId,
          userId,
        },
      })
      .select("id")
      .single()

    if (error || !job) {
      console.error("[HARDWARE] Failed to enqueue model job", error)
      return NextResponse.json({ error: "Failed to enqueue hardware model job" }, { status: 500 })
    }

    return NextResponse.json({ success: true, jobId: job.id })
  } catch (error: any) {
    console.error("[HARDWARE] Error in /api/hardware/models", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
