import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const maxDuration = 360

export async function POST(request: NextRequest) {
  try {
    console.log('[EDIT-PROJECT] Received request')
    const supabase = createSupabaseServerClient()
    const { projectId, hardwareId, userId, message } = (await request.json()) as {
      projectId: string
      hardwareId?: string
      userId?: string
      message: string
    }
    console.log('[EDIT-PROJECT] Request body:', { projectId, hardwareId, userId, message })

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

    // Load specific hardware for context when provided, else latest by project
    type HardwareRow = {
      id: string
      project_id?: string
      title: string | null
      [k: string]: unknown
    }
    let contextHardwareId: string | null = null
    let hardwareContext: HardwareRow | null = null
    if (hardwareId) {
      const { data: hw } = await supabase
        .from('hardware_projects')
        .select('id, project_id, title, "3d_components", assembly_parts, firmware_code, full_json')
        .eq('id', hardwareId)
        .maybeSingle()
      if (hw && (hw as { project_id?: string }).project_id === projectId) {
        const typed = (hw as unknown) as HardwareRow
        contextHardwareId = typed.id
        hardwareContext = typed
      }
    }
    if (!hardwareContext) {
      const { data: latestHardware } = await supabase
        .from('hardware_projects')
        .select('id, title, "3d_components", assembly_parts, firmware_code, full_json')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (latestHardware) {
        const typed = (latestHardware as unknown) as HardwareRow
        contextHardwareId = typed.id
        hardwareContext = typed
      }
    }

    // Build full context matching reference/master json schema/ai_output.json
    const context = (hardwareContext as { full_json?: unknown } | null)?.full_json ?? {
      project: projectRow?.name ?? (hardwareContext as { title?: string } | null)?.title ?? "",
      description: (typeof projectRow?.description === 'string' ? projectRow.description : ""),
      reports: {
        "3DComponents": (hardwareContext as { [k: string]: unknown } | null)?.["3d_components"] ?? null,
        "AssemblyAndParts": (hardwareContext as { assembly_parts?: unknown } | null)?.assembly_parts ?? null,
        "FirmwareAndCode": (hardwareContext as { firmware_code?: unknown } | null)?.firmware_code ?? null,
      },
    }

    const directFunctionUrl = process.env.SUPABASE_EDIT_PROJECT_FUNCTION_URL?.replace(/\/$/, '')
    const edgeBaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '')
    if (!directFunctionUrl && !edgeBaseUrl) {
      return NextResponse.json({ error: "Edit project function URL not configured" }, { status: 500 })
    }

    console.log('[EDIT-PROJECT] Calling edge function with:', {
      projectId,
      userId,
      hardwareId: contextHardwareId,
      userMessage: message,
      contextExists: !!context
    })

    const targetUrl = directFunctionUrl || `${edgeBaseUrl}/functions/v1/edit-project`
    const resp = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY}`,
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '',
      },
      body: JSON.stringify({
        projectId,
        userId,
        hardwareId: contextHardwareId,
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


