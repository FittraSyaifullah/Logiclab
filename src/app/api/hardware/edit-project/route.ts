import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    console.log('[EDIT-PROJECT] Received request')
    const supabase = createSupabaseServerClient()
    const { projectId, userId, message } = (await request.json()) as {
      projectId: string
      userId?: string
      message: string
    }
    console.log('[EDIT-PROJECT] Request body:', { projectId, userId, message })

    if (!projectId || !message) {
      console.error('[EDIT-PROJECT] Missing required fields:', { projectId: !!projectId, message: !!message })
      return NextResponse.json({ error: "Missing projectId or message" }, { status: 400 })
    }

    // Load canonical project details
    const { data: projectRow } = await supabase
      .from('projects')
      .select('id, name, description')
      .eq('id', projectId)
      .maybeSingle()

    // Load latest hardware_projects row for context
    const { data: latestHardware } = await supabase
      .from('hardware_projects')
      .select('id, title, "3d_components", assembly_parts, firmware_code, full_json')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    // Build full context matching reference/master json schema/ai_output.json
    const context = latestHardware?.full_json ?? {
      project: projectRow?.name ?? latestHardware?.title ?? "",
      description: (typeof projectRow?.description === 'string' ? projectRow.description : ""),
      reports: {
        "3DComponents": latestHardware?.["3d_components"] ?? null,
        "AssemblyAndParts": latestHardware?.assembly_parts ?? null,
        "FirmwareAndCode": latestHardware?.firmware_code ?? null,
      },
    }

    const edgeUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '')
    if (!edgeUrl) {
      return NextResponse.json({ error: "Supabase URL not configured" }, { status: 500 })
    }

    console.log('[EDIT-PROJECT] Calling edge function with:', {
      projectId,
      userId,
      hardwareId: latestHardware?.id,
      userMessage: message,
      contextExists: !!context
    })

    const resp = await fetch(`${edgeUrl}/functions/v1/edit-project`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY}`,
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '',
      },
      body: JSON.stringify({
        projectId,
        userId,
        hardwareId: latestHardware?.id,
        userMessage: message,
        context,
      }),
    })

    console.log('[EDIT-PROJECT] Edge function response status:', resp.status)
    const data = await resp.json()
    console.log('[EDIT-PROJECT] Edge function response data:', data)

    if (!resp.ok) {
      console.error('[EDIT-PROJECT] Edge function failed:', data?.error)
      return NextResponse.json({ error: data?.error || 'Edge function error' }, { status: resp.status })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('[API] edit-project error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


