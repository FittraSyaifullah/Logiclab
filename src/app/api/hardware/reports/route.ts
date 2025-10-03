import { type NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const userId = searchParams.get('userId')
    const reportId = searchParams.get('reportId')

    console.log(`[API] ===== HARDWARE REPORTS API START =====`)
    console.log(`[API] Request params:`, { projectId, userId, reportId })

    if (!projectId || !userId) {
      console.log(`[API] Missing required params: projectId=${!!projectId}, userId=${!!userId}`)
      return NextResponse.json({ error: "Missing projectId or userId" }, { status: 400 })
    }

    const supabase = createSupabaseServerClient()

    // Verify project ownership
    console.log(`[API] Verifying project ownership for projectId: ${projectId}`)
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, owner_id')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      console.log(`[API] Project not found:`, { projectError, project })
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    if (project.owner_id !== userId) {
      console.log(`[API] Unauthorized: project.owner_id=${project.owner_id}, userId=${userId}`)
      return NextResponse.json({ error: "Unauthorized - not project owner" }, { status: 403 })
    }

    console.log(`[API] Project ownership verified`)

    // Fetch hardware report(s)
    let reports: Array<Record<string, unknown>> | null = null
    if (reportId) {
      // Load the specific report by id to avoid always returning latest
      console.log(`[API] Fetching specific report: ${reportId} for project: ${projectId}`)
      const { data: specific, error: specificError } = await supabase
        .from('hardware_projects')
        .select('*')
        .eq('id', reportId)
        .eq('project_id', projectId)
        .limit(1)
      if (specificError) {
        console.error('[API] Failed to fetch specific report:', specificError)
        return NextResponse.json({ error: 'Failed to fetch report' }, { status: 500 })
      }
      reports = specific ? specific as Array<Record<string, unknown>> : []
      console.log(`[API] Specific report found: ${reports.length} records`)
    } else {
      console.log(`[API] Fetching latest reports for project: ${projectId}`)
      const { data: list, error: reportsError } = await supabase
        .from('hardware_projects')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(10)
      if (reportsError) {
        console.error('[API] Failed to fetch reports:', reportsError)
        return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 })
      }
      reports = list as Array<Record<string, unknown>> | null
      console.log(`[API] Latest reports found: ${reports?.length || 0} records`)
    }

    // Transform reports into the expected format expected by the UI
    const transformedReports: Record<string, unknown> = {}

    if (reports && reports.length > 0) {
      const targetReport = reports[0]
      console.log(`[API] Processing target report:`, {
        id: targetReport.id,
        title: targetReport.title,
        has3dComponents: !!targetReport['3d_components'],
        hasAssemblyParts: !!targetReport.assembly_parts,
        hasFirmwareCode: !!targetReport.firmware_code
      })

      // Extract different report sections
      if (targetReport['3d_components']) {
        const raw3d = targetReport['3d_components'] as unknown as {
          project?: string
          description?: string
          components?: Array<{
            component?: string
            description?: string
            printTime?: string
            material?: string
            supports?: string
            promptFor3DGeneration?: string
            printSpecifications?: string
            assemblyNotes?: string
          }>
          generalNotes?: string
        }
        // If the stored data is in the new strict JSON shape, map it to the UI's expected structure
        const looksLikeStrictJson = raw3d && typeof raw3d === 'object' && 'project' in raw3d && 'components' in raw3d
        if (looksLikeStrictJson) {
          try {
            const descriptionText = typeof raw3d.description === 'string' ? raw3d.description : ''
            const notesText = typeof raw3d.generalNotes === 'string' ? raw3d.generalNotes : ''
            const content = [descriptionText, notesText].filter(Boolean).join('\n\n')

            const mappedComponents = Array.isArray(raw3d.components)
              ? raw3d.components.map((c) => ({
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
              reportId: targetReport.id,
            }
          } catch {
            // If mapping fails for any reason, fall back to passing through the raw value
            transformedReports['3d-components'] = { ...(raw3d as Record<string, unknown>), reportId: targetReport.id }
          }
        } else {
          // Keep legacy shape as-is
          transformedReports['3d-components'] = { ...(raw3d as Record<string, unknown>), reportId: targetReport.id }
        }
      }

      if (targetReport.assembly_parts) {
        transformedReports['assembly-parts'] = { ...(targetReport.assembly_parts as Record<string, unknown>), reportId: targetReport.id }
      }

      if (targetReport.firmware_code) {
        transformedReports['firmware-code'] = { ...(targetReport.firmware_code as Record<string, unknown>), reportId: targetReport.id }
      }
    }

    console.log(`[API] Retrieved ${reports?.length || 0} hardware projects for project ${projectId}`)
    console.log(`[API] Transformed reports keys:`, Object.keys(transformedReports))
    console.log(`[API] ===== HARDWARE REPORTS API SUCCESS =====`)

    return NextResponse.json({
      success: true,
      reports: transformedReports,
      title: reports?.[0]?.title || null,
      count: reports?.length || 0,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error("[API] Hardware Reports API error:", error)
    console.log(`[API] ===== HARDWARE REPORTS API ERROR =====`)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
