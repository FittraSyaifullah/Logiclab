import { type NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    console.log(`[API] ===== HARDWARE REPORTS LIST API START =====`)
    console.log(`[API] Request params:`, { userId })
    
    if (!userId) {
      console.log(`[API] Missing userId`)
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }

    const supabase = createSupabaseServerClient()

    // Join projects owned by user with their hardware_projects
    console.log(`[API] Fetching hardware projects for user: ${userId}`)
    const { data: rows, error } = await supabase
      .from('hardware_projects')
      .select('id, created_at, project_id, title, projects!inner(id, name, owner_id)')
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) {
      console.error('[API] list reports failed:', error)
      return NextResponse.json({ error: 'Failed to list hardware reports' }, { status: 500 })
    }

    console.log(`[API] Raw hardware projects found: ${rows?.length || 0} records`)

    type ProjectRecord = { id: string; name: string | null; owner_id: string }
    type HardwareProjectRow = {
      id: string
      created_at: string
      project_id: string
      title: string | null
      projects: ProjectRecord | ProjectRecord[] | null
    }

    const items = ((rows as HardwareProjectRow[]) || [])
      .map((row) => {
        const relatedProject = Array.isArray(row.projects) ? row.projects[0] ?? null : row.projects
        return { row, relatedProject }
      })
      .filter(({ relatedProject }) => relatedProject?.owner_id === userId)
      .map(({ row, relatedProject }) => ({
        reportId: row.id,
        projectId: row.project_id,
        title: row.title || relatedProject?.name || 'Hardware Project',
        createdAt: row.created_at,
      }))

    console.log(`[API] Filtered items for user: ${items.length} records`)
    console.log(`[API] Sample items:`, items.slice(0, 3))
    console.log(`[API] ===== HARDWARE REPORTS LIST API SUCCESS =====`)

    return NextResponse.json({ success: true, items })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[API] Hardware reports list API error:', error)
    console.log(`[API] ===== HARDWARE REPORTS LIST API ERROR =====`)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}


