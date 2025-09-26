import { type NextRequest, NextResponse } from "next/server"
import { createSupabaseClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const userId = searchParams.get('userId')

    if (!projectId || !userId) {
      return NextResponse.json({ error: "Missing projectId or userId" }, { status: 400 })
    }

    const supabase = createSupabaseClient()

    // Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, owner_id')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    if (project.owner_id !== userId) {
      return NextResponse.json({ error: "Unauthorized - not project owner" }, { status: 403 })
    }

    // Fetch hardware reports for this project
    const { data: reports, error: reportsError } = await supabase
      .from('hardware_reports')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(10)

    if (reportsError) {
      console.error("[HARDWARE] Failed to fetch reports:", reportsError)
      return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 })
    }

    // Transform reports into the expected format
    const transformedReports: any = {}

    if (reports && reports.length > 0) {
      const latestReport = reports[0]

      // Extract different report sections
      if (latestReport['3d_components']) {
        transformedReports['3d-components'] = latestReport['3d_components']
      }

      if (latestReport.assembly_parts) {
        transformedReports['assembly-parts'] = latestReport.assembly_parts
      }

      if (latestReport.firmware_code) {
        transformedReports['firmware-code'] = latestReport.firmware_code
      }
    }

    console.log(`[HARDWARE] Retrieved ${reports?.length || 0} reports for project ${projectId}`)

    return NextResponse.json({
      success: true,
      reports: transformedReports,
      count: reports?.length || 0,
    })
  } catch (error: any) {
    console.error("[HARDWARE] Reports API error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
