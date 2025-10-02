import { type NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const userId = searchParams.get('userId')

    if (!projectId || !userId) {
      return NextResponse.json({ error: "Missing projectId or userId" }, { status: 400 })
    }

    const supabase = createSupabaseServerClient()

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

    // Fetch hardware projects for this project
    const { data: reports, error: reportsError } = await supabase
      .from('hardware_projects')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(10)

    if (reportsError) {
      console.error("[HARDWARE] Failed to fetch reports:", reportsError)
      return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 })
    }

    // Transform reports into the expected format expected by the UI
    const transformedReports: any = {}

    if (reports && reports.length > 0) {
      const latestReport = reports[0]

      // Extract different report sections
      if (latestReport['3d_components']) {
        const raw3d = latestReport['3d_components'] as any
        // If the stored data is in the new strict JSON shape, map it to the UI's expected structure
        const looksLikeStrictJson = raw3d && typeof raw3d === 'object' && 'project' in raw3d && 'components' in raw3d
        if (looksLikeStrictJson) {
          try {
            const descriptionText = typeof raw3d.description === 'string' ? raw3d.description : ''
            const notesText = typeof raw3d.generalNotes === 'string' ? raw3d.generalNotes : ''
            const content = [descriptionText, notesText].filter(Boolean).join('\n\n')

            const mappedComponents = Array.isArray(raw3d.components)
              ? raw3d.components.map((c: any) => ({
                  // UI expects these keys
                  name: c?.component ?? '',
                  description: c?.description ?? '',
                  printTime: c?.printTime ?? '',
                  material: c?.material ?? '',
                  supports: c?.supports ?? '',
                  prompt: c?.promptFor3DGeneration ?? '',
                  // Put extra details into notes for now
                  notes: [c?.printSpecifications, c?.assemblyNotes].filter(Boolean).join('\n\n'),
                }))
              : []

            transformedReports['3d-components'] = {
              content,
              components: mappedComponents,
              reportId: latestReport.id,
            }
          } catch {
            // If mapping fails for any reason, fall back to passing through the raw value
            transformedReports['3d-components'] = { ...(raw3d as any), reportId: latestReport.id }
          }
        } else {
          // Keep legacy shape as-is
          transformedReports['3d-components'] = { ...(raw3d as any), reportId: latestReport.id }
        }
      }

      if (latestReport.assembly_parts) {
        transformedReports['assembly-parts'] = { ...(latestReport.assembly_parts as any), reportId: latestReport.id }
      }

      if (latestReport.firmware_code) {
        transformedReports['firmware-code'] = { ...(latestReport.firmware_code as any), reportId: latestReport.id }
      }
    }

    console.log(`[HARDWARE] Retrieved ${reports?.length || 0} hardware projects for project ${projectId}`)

    return NextResponse.json({
      success: true,
      reports: transformedReports,
      title: reports?.[0]?.title || null,
      count: reports?.length || 0,
    })
  } catch (error: any) {
    console.error("[HARDWARE] Reports API error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
