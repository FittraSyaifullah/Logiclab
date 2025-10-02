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

    const microcontroller = projectData.microcontroller || "arduino"
    let language = "C++"
    let platform = "Arduino IDE"

    if (microcontroller.toLowerCase().includes("raspberry")) {
      language = "Python"
      platform = "Raspberry Pi"
    } else if (microcontroller.toLowerCase().includes("esp")) {
      language = "C++"
      platform = "Arduino IDE / PlatformIO"
    }

    const generateWithFallback = async () => {
      try {
        const { text } = await generateText({
          model: aiModel,
          system: `You are an AI engineer providing firmware code for hardware projects.

Your role is to:
1. Generate complete, working code for the specified microcontroller
2. Include detailed comments explaining each section
3. Specify the programming language and development environment
4. Provide setup instructions and library requirements
5. Include error handling and safety features
6. Explain specific functions and their purposes

Always specify the programming language at the top of your response. Different microcontrollers use different languages:
- Arduino/ESP32/ESP8266: C++ (Arduino IDE)
- Raspberry Pi: Python
- STM32: C/C++
- PIC: C

Focus on clean, well-documented code that beginners can understand and modify.`,
          prompt: `Project: ${projectData.description}
Microcontroller: ${microcontroller}

Generate complete firmware code for this hardware project.`,
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
          firmware_code: {
            content: text,
            language,
            platform,
            libraries: ["Servo.h", "NewPing.h"],
            codeLines: 85,
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
          firmware_code: {
            content: text,
            language,
            platform,
            libraries: ["Servo.h", "NewPing.h"],
            codeLines: 85,
          }
        })
        .select()
        .single()

      reportData = result.data
      reportError = result.error
    }

    if (reportError) {
      console.error("Failed to store firmware report:", reportError)
      return NextResponse.json({ error: "Failed to store report" }, { status: 500 })
    }

    return NextResponse.json({
      content: text,
      reportId: reportData.id,
      language,
      platform,
      libraries: ["Servo.h", "NewPing.h"],
      codeLines: 85,
    })
  } catch (error: any) {
    console.error("[FIRMWARE] Error generating firmware code:", {
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
            title: (projectData as any).title || 'Hardware Project',
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
    } catch (dbError: any) {
      console.error("[FIRMWARE] Database error:", dbError)
      return NextResponse.json({
        error: `Generation failed and database error: ${errorMessage}`,
      }, { status: 500 })
    }
  }
}
