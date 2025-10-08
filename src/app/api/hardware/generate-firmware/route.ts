import { type NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { projectData, reportId: providedReportId } = await request.json() as {
      projectData: { id: string; description?: string; microcontroller?: string; title?: string }
      reportId?: string
    }

    if (!projectData) {
      return NextResponse.json({ error: "Project data is required" }, { status: 400 })
    }

    const supabase = createSupabaseServerClient()

    const endpoint = process.env.SUPABASE_HARDWARE_GENERATE_FIRMWARE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!endpoint || !serviceRoleKey) {
      return NextResponse.json({ error: 'Function not configured' }, { status: 500 })
    }
    const efResp = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceRoleKey}` },
      body: JSON.stringify({ projectData, reportId: providedReportId }),
    })
    const efJson = await efResp.json()
    if (!efResp.ok) {
      return NextResponse.json({ error: efJson?.error || 'Generation failed' }, { status: efResp.status })
    }

    const text = efJson.content as string
    const targetReportId = efJson.reportId as string | null
    let reportData: { id: string } | null = targetReportId ? { id: targetReportId } : null
    let reportError: unknown = null

    if (reportError) {
      console.error("Failed to store firmware report:", reportError)
      return NextResponse.json({ error: "Failed to store report" }, { status: 500 })
    }

    if (!reportData) {
      console.error("Firmware report upsert returned no data")
      return NextResponse.json({ error: "Failed to retrieve stored report" }, { status: 500 })
    }

    return NextResponse.json({
      content: text,
      reportId: reportData.id,
      language: efJson.language,
      platform: efJson.platform,
      libraries: efJson.libraries ?? [],
      codeLines: efJson.codeLines ?? 0,
    })
  } catch (error: unknown) {
    const errObj = error as { message?: string; stack?: string; cause?: unknown }
    console.error("[FIRMWARE] Error generating firmware code:", {
      error,
      message: errObj?.message,
      stack: errObj?.stack,
      cause: errObj?.cause,
    })

    const supabase = createSupabaseServerClient()
    const { projectData } = await request.json()

    let errorMessage = "Unknown error occurred"
    if (typeof errObj?.message === 'string' && errObj.message.includes('OpenAI API')) {
      errorMessage = `OpenAI API error: ${errObj.message}`
    } else if (typeof errObj?.message === 'string') {
      errorMessage = errObj.message
    }

    try {
      // Find latest existing hardware project row for this project
      const { data: existingReport } = await supabase
        .from('hardware_projects')
        .select('id')
        .eq('project_id', projectData.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      let reportData: { id: string } | null = null
      let reportError: unknown = null

      if (existingReport) {
        // Update existing row
        const result = await supabase
          .from('hardware_projects')
          .update({
            firmware_code: {
              content: `Error generating firmware code: ${errorMessage}`,
              language: "Unknown",
              platform: "Unknown",
              libraries: [],
              codeLines: 0,
            }
          })
          .eq('id', existingReport.id)
          .select()
          .single()

        reportData = result.data
        reportError = result.error
      } else {
        // Create new row
        const result = await supabase
          .from('hardware_projects')
          .insert({
            project_id: projectData.id,
            title: typeof projectData.title === 'string' ? projectData.title : 'Hardware Project',
            firmware_code: {
              content: `Error generating firmware code: ${errorMessage}`,
              language: "Unknown",
              platform: "Unknown",
              libraries: [],
              codeLines: 0,
            }
          })
          .select()
          .single()

        reportData = result.data
        reportError = result.error
      }

      return NextResponse.json({
        error: errorMessage,
        reportId: reportData?.id,
      }, { status: 500 })
    } catch (dbError: unknown) {
      console.error("[FIRMWARE] Database error:", dbError)
      return NextResponse.json({
        error: `Generation failed and database error: ${errorMessage}`,
      }, { status: 500 })
    }
  }
}
