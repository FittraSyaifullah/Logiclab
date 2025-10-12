import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"

const HARDWARE_FUNCTION_ENDPOINT = process.env.SUPABASE_HARDWARE_FUNCTION_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

export const maxDuration = 60

type InitialRequestBody = {
  title: string
  prompt: string
  projectId: string
  userId: string
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    const body = (await request.json()) as Partial<InitialRequestBody>
    const { title, prompt, projectId, userId } = body

    if (!userId) return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    if (!title || !prompt || !projectId) return NextResponse.json({ error: "Missing required fields" }, { status: 400 })

    // Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('owner_id', userId)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Create job (pending)
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert({
        user_id: userId,
        project_id: projectId,
        kind: 'hardware_initial_generation',
        status: 'pending',
        input: { title, prompt, projectId },
      })
      .select()
      .single()

    if (jobError || !job) {
      return NextResponse.json({ error: 'Failed to create job' }, { status: 500 })
    }

    // Trigger Supabase Edge Function to process asynchronously (fire-and-forget)
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
          const result = await functionResponse.json().catch(() => ({}))
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
  } catch (error: unknown) {
    console.error('[HARDWARE INITIAL] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


