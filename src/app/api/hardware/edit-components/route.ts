import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const maxDuration = 300

export async function POST(request: NextRequest) {
  try {
    console.log('[EDIT-COMPONENTS] Received request')
    const supabase = createSupabaseServerClient()
    const { projectId, userId, message, reportId } = (await request.json()) as {
      projectId: string
      userId?: string
      message: string
      reportId?: string
    }
    console.log('[EDIT-COMPONENTS] Request body:', { projectId, userId, message, reportId })

    if (!projectId || !message) {
      console.error('[EDIT-COMPONENTS] Missing required fields:', { projectId: !!projectId, message: !!message })
      return NextResponse.json({ error: "Missing projectId or message" }, { status: 400 })
    }

    // Fetch canonical project details
    const { data: projectRow } = await supabase
      .from('projects')
      .select('id, name, description')
      .eq('id', projectId)
      .maybeSingle()

    // Fetch selected or latest hardware report
    let hardwareRow: { id: string; title?: string; [k: string]: unknown } | null = null
    if (reportId) {
      const { data } = await supabase
        .from('hardware_projects')
        .select('id, title, "3d_components", assembly_parts, firmware_code')
        .eq('id', reportId)
        .maybeSingle()
      hardwareRow = data
    }
    if (!hardwareRow) {
      const { data } = await supabase
        .from('hardware_projects')
        .select('id, title, "3d_components", assembly_parts, firmware_code')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      hardwareRow = data
    }

    const context = {
      project: projectRow?.name ?? hardwareRow?.title ?? "",
      description: (typeof projectRow?.description === 'string' ? projectRow.description : ""),
      reports: {
        "3DComponents": (hardwareRow as unknown as { [k: string]: unknown })?.["3d_components"] ?? null,
        "AssemblyAndParts": (hardwareRow as unknown as { [k: string]: unknown })?.["assembly_parts"] ?? null,
        "FirmwareAndCode": (hardwareRow as unknown as { [k: string]: unknown })?.["firmware_code"] ?? null,
      },
    }

    const edgeUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '')
    if (!edgeUrl) {
      return NextResponse.json({ error: "Supabase URL not configured" }, { status: 500 })
    }

    console.log('[EDIT-COMPONENTS] Calling edge function with:', {
      projectId,
      userId,
      hardwareId: hardwareRow?.id,
      userMessage: message,
      context: { project: context.project, description: context.description }
    })

    const resp = await fetch(`${edgeUrl}/functions/v1/edit-components`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY}`,
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '',
      },
      body: JSON.stringify({
        projectId,
        userId,
        hardwareId: hardwareRow?.id,
        userMessage: message,
        context,
      }),
    })

    console.log('[EDIT-COMPONENTS] Edge function response status:', resp.status)
    const data = await resp.json()
    console.log('[EDIT-COMPONENTS] Edge function response data:', data)
    console.log('[EDIT-COMPONENTS] Edge function response headers:', Object.fromEntries(resp.headers.entries()))
    
    // Check if the edge function actually updated the database
    if (resp.ok && data?.message === 'Components updated') {
      console.log('[EDIT-COMPONENTS] Edge function reported success, checking database...')
      // Verify the update by fetching the updated record
      const { data: updatedRecord } = await supabase
        .from('hardware_projects')
        .select('id, "3d_components"')
        .eq('id', hardwareRow?.id)
        .single()
      console.log('[EDIT-COMPONENTS] Database verification:', {
        hardwareId: hardwareRow?.id,
        has3dComponents: !!updatedRecord?.["3d_components"],
        componentCount: Array.isArray(updatedRecord?.["3d_components"]?.components) ? updatedRecord["3d_components"].components.length : 0
      })
    }

    if (!resp.ok) {
      console.error('[EDIT-COMPONENTS] Edge function failed:', data?.error)
      return NextResponse.json({ error: data?.error || 'Edge function error' }, { status: resp.status })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('[API] edit-components error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


