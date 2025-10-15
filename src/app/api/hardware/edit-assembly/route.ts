import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    const { projectId, userId, message } = (await request.json()) as {
      projectId: string
      userId?: string
      message: string
    }

    if (!projectId || !message) {
      return NextResponse.json({ error: "Missing projectId or message" }, { status: 400 })
    }

    // Fetch canonical project details
    const { data: projectRow } = await supabase
      .from('projects')
      .select('id, name, description')
      .eq('id', projectId)
      .maybeSingle()

    // Fetch latest hardware_reports row for this project to assemble full context
    const { data: latestHardware } = await supabase
      .from('hardware_projects')
      .select('id, title, "3d_components", assembly_parts, firmware_code')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const context = {
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

    const resp = await fetch(`${edgeUrl}/functions/v1/edit-assembly`, {
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

    const data = await resp.json()
    if (!resp.ok) {
      return NextResponse.json({ error: data?.error || 'Edge function error' }, { status: resp.status })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('[API] edit-assembly error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


