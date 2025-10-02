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

    const mapped: Record<string, any> = {}
    for (const m of models || []) {
      const componentId = (m as any).component_id as string
      mapped[componentId] = {
        componentId,
        name: (m as any).component_name as string,
        status: 'completed',
        scadCode: (m as any).scad_code as string,
        parameters: ((m as any).parameters ?? []) as any[],
        stlMimeType: 'model/stl',
        scadMimeType: ((m as any).scad_mime ?? 'application/x-openscad') as string,
        updatedAt: (m as any).updated_at as string,
      }
    }

    return NextResponse.json({ success: true, models: mapped })
  } catch (error: any) {
    console.error('[HARDWARE] models list API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}


