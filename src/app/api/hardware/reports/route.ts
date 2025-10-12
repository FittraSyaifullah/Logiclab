import { type NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const userId = searchParams.get('userId')
    const reportId = searchParams.get('reportId')

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

    // Fetch hardware report(s)
    let reports: Array<Record<string, unknown>> | null = null
    if (reportId) {
      // Load the specific report by id to avoid always returning latest
      const { data: specific, error: specificError } = await supabase
        .from('hardware_projects')
        .select('*')
        .eq('id', reportId)
        .eq('project_id', projectId)
        .limit(1)
      if (specificError) {
        console.error('[HARDWARE] Failed to fetch specific report:', specificError)
        return NextResponse.json({ error: 'Failed to fetch report' }, { status: 500 })
      }
      reports = specific ? specific as Array<Record<string, unknown>> : []
    } else {
      const { data: list, error: reportsError } = await supabase
        .from('hardware_projects')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(10)
      if (reportsError) {
        console.error('[HARDWARE] Failed to fetch reports:', reportsError)
        return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 })
      }
      reports = list as Array<Record<string, unknown>> | null
    }

    // Transform reports into the expected format expected by the UI
    const transformedReports: Record<string, unknown> = {}

    if (reports && reports.length > 0) {
      const targetReport = reports[0]

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
        const rawAssembly = targetReport.assembly_parts as Record<string, unknown>
        const hasContent = typeof (rawAssembly as { content?: unknown }).content === 'string'
        if (hasContent) {
          transformedReports['assembly-parts'] = { ...rawAssembly, reportId: targetReport.id }
        } else {
          const overview = typeof (rawAssembly as { overview?: unknown }).overview === 'string' ? (rawAssembly as { overview?: string }).overview : ''
          const assemblyInstructions = typeof (rawAssembly as { assemblyInstructions?: unknown }).assemblyInstructions === 'string' ? (rawAssembly as { assemblyInstructions?: string }).assemblyInstructions : ''
          const safetyChecklist = typeof (rawAssembly as { safetyChecklist?: unknown }).safetyChecklist === 'string' ? (rawAssembly as { safetyChecklist?: string }).safetyChecklist : ''
          const partsList = Array.isArray((rawAssembly as { partsList?: unknown }).partsList) ? (rawAssembly as { partsList: unknown[] }).partsList : []
          transformedReports['assembly-parts'] = {
            content: [overview, assemblyInstructions, safetyChecklist].filter(Boolean).join('\n\n'),
            partsCount: partsList.length,
            estimatedTime: '2-3 hours',
            difficultyLevel: 'Beginner',
            reportId: targetReport.id,
          }
        }
        console.log('[HARDWARE REPORTS] Assembly parts data:', targetReport.assembly_parts)
      }

      if (targetReport.firmware_code) {
        const rawFirmware = targetReport.firmware_code as Record<string, unknown>
        const hasContent = typeof (rawFirmware as { content?: unknown }).content === 'string'
        if (hasContent) {
          transformedReports['firmware-code'] = { ...rawFirmware, reportId: targetReport.id }
        } else {
          const explanation = typeof (rawFirmware as { explanation?: unknown }).explanation === 'string' ? (rawFirmware as { explanation?: string }).explanation : ''
          const code = typeof (rawFirmware as { code?: unknown }).code === 'string' ? (rawFirmware as { code?: string }).code : ''
          const improvementSuggestions = typeof (rawFirmware as { improvementSuggestions?: unknown }).improvementSuggestions === 'string' ? (rawFirmware as { improvementSuggestions?: string }).improvementSuggestions : ''
          const language = typeof (rawFirmware as { language?: unknown }).language === 'string' ? (rawFirmware as { language?: string }).language : 'C++'
          const platform = typeof (rawFirmware as { microcontroller?: unknown }).microcontroller === 'string' ? (rawFirmware as { microcontroller?: string }).microcontroller : 'Arduino IDE'
          const content = [explanation, code, improvementSuggestions].filter(Boolean).join('\n\n')
          transformedReports['firmware-code'] = {
            content,
            language,
            platform,
            libraries: [],
            codeLines: content.split('\n').length,
            reportId: targetReport.id,
          }
        }
        console.log('[HARDWARE REPORTS] Firmware code data:', targetReport.firmware_code)
      }
    }

    console.log(`[HARDWARE] Retrieved ${reports?.length || 0} hardware projects for project ${projectId}`)

    return NextResponse.json({
      success: true,
      reports: transformedReports,
      title: reports?.[0]?.title || null,
      count: reports?.length || 0,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error("[HARDWARE] Reports API error:", error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
