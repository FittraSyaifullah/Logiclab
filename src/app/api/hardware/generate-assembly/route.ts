import { type NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { projectData, reportId: providedReportId } = await request.json() as {
      projectData: { id: string; description?: string; title?: string }
      reportId?: string
    }

    if (!projectData) {
      return NextResponse.json({ error: "Project data is required" }, { status: 400 })
    }

    // const supabase = createSupabaseServerClient()

    const endpoint = process.env.SUPABASE_HARDWARE_GENERATE_ASSEMBLY_URL
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
    const reportData: { id: string } | null = targetReportId ? { id: targetReportId } : null

    if (!reportData) {
      console.error("Assembly report upsert returned no data")
      return NextResponse.json({ error: "Failed to retrieve stored report" }, { status: 500 })
    }

    return NextResponse.json({
      content: text,
      reportId: reportData.id,
      partsCount: 8,
      estimatedTime: "2-3 hours",
      difficultyLevel: "Beginner",
    })
  } catch (error: unknown) {
    const errObj = error as { message?: string; stack?: string; cause?: unknown }
    console.error("[ASSEMBLY] Error generating assembly instructions:", {
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
            assembly_parts: {
              content: `Error generating assembly instructions: ${errorMessage}`,
              partsCount: 0,
              estimatedTime: "Unknown",
              difficultyLevel: "Unknown",
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
            assembly_parts: {
              content: `Error generating assembly instructions: ${errorMessage}`,
              partsCount: 0,
              estimatedTime: "Unknown",
              difficultyLevel: "Unknown",
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
      console.error("[ASSEMBLY] Database error:", dbError)
      return NextResponse.json({
        error: `Generation failed and database error: ${errorMessage}`,
      }, { status: 500 })
    }
  }
}
