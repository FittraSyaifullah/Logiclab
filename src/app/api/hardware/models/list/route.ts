import { type NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const userId = searchParams.get('userId')

    if (!projectId || !userId) {
      return NextResponse.json({ error: 'Missing projectId or userId' }, { status: 400 })
    }

    const supabase = createSupabaseServerClient()

    // Verify ownership
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, owner_id')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }
    if (project.owner_id !== userId) {
      return NextResponse.json({ error: 'Unauthorized - not project owner' }, { status: 403 })
    }

    const { data: models, error: modelsError } = await supabase
      .from('hardware_models')
      .select('*')
      .eq('project_id', projectId)
      .order('updated_at', { ascending: false })
      .limit(200)

    if (modelsError) {
      console.error('[HARDWARE] Failed to fetch models:', modelsError)
      return NextResponse.json({ error: 'Failed to fetch models' }, { status: 500 })
    }

    const mapped: Record<string, {
      componentId: string
      name: string
      status: string
      scadCode?: string
      parameters?: Array<{ name?: string; value?: number; unit?: string; metadata?: Record<string, unknown> }>
      stlMimeType?: string
      scadMimeType?: string
      updatedAt?: string
    }> = {}
    for (const m of models || []) {
      const row = m as unknown as {
        component_id?: string
        component_name?: string
        scad_code?: string
        parameters?: Array<{ name?: string; value?: number; unit?: string; metadata?: Record<string, unknown> }>
        scad_mime?: string
        updated_at?: string
      }
      const componentId = row.component_id as string
      mapped[componentId] = {
        componentId,
        name: (row.component_name as string) ?? '',
        status: 'completed',
        scadCode: row.scad_code as string | undefined,
        parameters: (row.parameters ?? []),
        stlMimeType: 'model/stl',
        scadMimeType: (row.scad_mime ?? 'application/x-openscad') as string,
        updatedAt: row.updated_at as string | undefined,
      }
    }

    return NextResponse.json({ success: true, models: mapped })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[HARDWARE] models list API error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}


