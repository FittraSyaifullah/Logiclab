import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"

const HARDWARE_FUNCTION_ENDPOINT = process.env.SUPABASE_HARDWARE_FUNCTION_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

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
        kind: "hardware-model-component",
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

    if (HARDWARE_FUNCTION_ENDPOINT && SERVICE_ROLE_KEY) {
      try {
        console.log(`[HARDWARE] Triggering hardware-processor function at ${HARDWARE_FUNCTION_ENDPOINT}`)
        const functionResponse = await fetch(HARDWARE_FUNCTION_ENDPOINT, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        })
        
        if (functionResponse.ok) {
          const result = await functionResponse.json()
          console.log(`[HARDWARE] Successfully triggered hardware-processor:`, result)
        } else {
          console.error(`[HARDWARE] Hardware-processor function returned ${functionResponse.status}:`, await functionResponse.text())
        }
      } catch (functionError) {
        console.error("[HARDWARE] Failed to trigger hardware-processor function", functionError)
      }
    } else {
      console.warn("[HARDWARE] Missing SUPABASE_HARDWARE_FUNCTION_URL or SUPABASE_SERVICE_ROLE_KEY - function not triggered")
    }

    return NextResponse.json({ success: true, jobId: job.id })
  } catch (error: any) {
    console.error("[HARDWARE] Error in /api/hardware/models", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

