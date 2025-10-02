import { type NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }

    const supabase = createSupabaseServerClient()

    // Join projects owned by user with their hardware_projects
    const { data: rows, error } = await supabase
      .from('hardware_projects')
      .select('id, created_at, project_id, title, projects!inner(id, name, owner_id)')
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) {
      console.error('[HARDWARE] list reports failed:', error)
      return NextResponse.json({ error: 'Failed to list hardware reports' }, { status: 500 })
    }

    const items = (rows || [])
      .filter((r: any) => r.projects?.owner_id === userId)
      .map((r: any) => ({
        reportId: r.id as string,
        projectId: r.project_id as string,
        title: (r.title as string | undefined) || (r.projects?.name as string | undefined) || 'Hardware Project',
        createdAt: r.created_at as string,
      }))

    return NextResponse.json({ success: true, items })
  } catch (error: any) {
    console.error('[HARDWARE] list reports API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}


