import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"

interface ChatRequestBody {
  projectId: string
  hardwareId?: string
  creationId?: string
  userId?: string
  message: string
}

interface ChatResponseBody {
  "AI response": string
  "AI content": unknown
}

export async function POST(request: NextRequest) {
	const supabase = createSupabaseServerClient()

	try {
		console.log('[HARDWARE CHAT] Received request')
    const body = (await request.json()) as ChatRequestBody
    console.log('[HARDWARE CHAT] Request body:', { 
      projectId: body?.projectId, 
      hardwareId: body?.hardwareId,
      creationId: body?.creationId, 
      userId: body?.userId, 
      message: body?.message
    })
		
		const {
      projectId,
      hardwareId,
      creationId,
      userId,
      message
		} = body || ({} as ChatRequestBody)

    if (!projectId || !message) {
			console.error('[HARDWARE CHAT] Missing required fields:', { 
				projectId: !!projectId, 
        message: !!message
			})
			return NextResponse.json(
        { error: "Missing required fields: projectId, message" },
				{ status: 400 },
			)
		}

    // Optional: verify project ownership when userId provided
		if (userId) {
			const { data: project, error: projectError } = await supabase
				.from("projects")
				.select("id, owner_id")
				.eq("id", projectId)
				.single()
			if (projectError || !project) {
				return NextResponse.json({ error: "Project not found" }, { status: 404 })
			}
			if (project.owner_id !== userId) {
				return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
			}
		}

    // If hardwareId provided, validate it belongs to the project
    if (hardwareId) {
      const { data: hwRow, error: hwErr } = await supabase
        .from('hardware_projects')
        .select('id, project_id')
        .eq('id', hardwareId)
        .single()
      if (hwErr || !hwRow) {
        return NextResponse.json({ error: 'Hardware not found' }, { status: 404 })
      }
      if (hwRow.project_id !== projectId) {
        return NextResponse.json({ error: 'Hardware does not belong to project' }, { status: 400 })
      }
    }

    // Single flow: call edit-project API which invokes the Edge Function
    console.log('[HARDWARE CHAT] Calling edit-project API with:', { projectId, hardwareId, userId })
    const resp = await fetch(`${request.nextUrl.origin}/api/hardware/edit-project`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, hardwareId, userId, message })
    })
    const data = await resp.json()
    if (!resp.ok) {
      return NextResponse.json({ error: data?.error ?? 'Failed to edit project' }, { status: resp.status })
    }

    const responseBody: ChatResponseBody = {
      "AI response": (typeof data?.summary_of_changes === 'string' ? data.summary_of_changes : 'Changes applied.').trim(),
      "AI content": data?.data ?? data
    }
    return NextResponse.json(responseBody)
	} catch (error) {
		console.error("[HARDWARE CHAT] Error:", error)
		return NextResponse.json({ error: "Internal server error" }, { status: 500 })
	}
}


