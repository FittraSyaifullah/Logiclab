import { type NextRequest, NextResponse } from "next/server"
import { generateText, aiModel } from "@/lib/openai"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { projectData, reportId: providedReportId } = await request.json()

    if (!projectData) {
      return NextResponse.json({ error: "Project data is required" }, { status: 400 })
    }

    const supabase = createSupabaseServerClient()

    const generateWithFallback = async () => {
      try {
        const { text } = await generateText({
          model: aiModel,
          system: `You are an AI engineer teaching non-technical users how to assemble hardware projects.

Your role is to:
1. Generate step-by-step assembly instructions from step 1 to completion
2. Create detailed parts lists with specifications and where to source components
3. Provide wiring diagrams and connection details
4. Guide users through observation-based assembly (visual cues, color coding)
5. Include safety warnings and best practices
6. Ask clarifying questions if component details are unclear

Focus on clear, beginner-friendly instructions that anyone can follow. Use visual descriptions and avoid technical jargon.`,
          prompt: `Project: ${projectData.description}

Generate comprehensive assembly instructions and parts list for this hardware project.`,
          temperature: 0.7,
          maxTokens: 2000,
        })
        return text
      } catch (error: any) {
        console.log("Using fallback content due to API limitation")
        throw error
      }
    }

    const text = await generateWithFallback()

    // Resolve target report: prefer provided reportId, else latest by project
    let targetReportId: string | null = null
    if (providedReportId) {
      targetReportId = providedReportId
    } else {
      const { data: existingReport } = await supabase
        .from('hardware_projects')
        .select('id')
        .eq('project_id', projectData.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      targetReportId = existingReport?.id ?? null
    }

    let reportData, reportError

    if (targetReportId) {
      // Update existing row
      const result = await supabase
        .from('hardware_projects')
        .update({
          assembly_parts: {
            content: text,
            partsCount: 8,
            estimatedTime: "2-3 hours",
            difficultyLevel: "Beginner",
          }
        })
        .eq('id', targetReportId)
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
          title: (projectData as any).title || 'Hardware Project',
          assembly_parts: {
            content: text,
            partsCount: 8,
            estimatedTime: "2-3 hours",
            difficultyLevel: "Beginner",
          }
        })
        .select()
        .single()

      reportData = result.data
      reportError = result.error
    }

    if (reportError) {
      console.error("Failed to store assembly report:", reportError)
      return NextResponse.json({ error: "Failed to store report" }, { status: 500 })
    }

    return NextResponse.json({
      content: text,
      reportId: reportData.id,
      partsCount: 8,
      estimatedTime: "2-3 hours",
      difficultyLevel: "Beginner",
    })
  } catch (error: any) {
    console.error("[ASSEMBLY] Error generating assembly instructions:", {
      error: error,
      message: error.message,
      stack: error.stack,
      cause: error.cause
    })

    const supabase = createSupabaseServerClient()
    const { projectData } = await request.json()

    let errorMessage = "Unknown error occurred"

    if (error.message?.includes('OpenAI API')) {
      errorMessage = `OpenAI API error: ${error.message}`
    } else if (error.message) {
      errorMessage = error.message
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

      let reportData, reportError

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
            title: (projectData as any).title || 'Hardware Project',
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
    } catch (dbError: any) {
      console.error("[ASSEMBLY] Database error:", dbError)
      return NextResponse.json({
        error: `Generation failed and database error: ${errorMessage}`,
      }, { status: 500 })
    }
  }
}
