import { type NextRequest, NextResponse } from "next/server"
import { generateText, aiModel } from "@/lib/openai"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  interface ProjectData {
    id: string
    description?: string
  }
  interface ComponentSpec {
    component: string
    description: string
    promptFor3DGeneration: string
    printSpecifications: string
    assemblyNotes: string
    printTime: string
    material: string
    supports: string
  }
  interface Generate3DJson {
    project: string
    description: string
    components: ComponentSpec[]
    generalNotes: string
  }

  let projectData: ProjectData | undefined
  let providedReportId: string | undefined
  try {
    const body = await request.json()
    projectData = body?.projectData as ProjectData | undefined
    providedReportId = body?.reportId as string | undefined

    if (!projectData) {
      return NextResponse.json({ error: "Project data is required" }, { status: 400 })
    }

    const supabase = createSupabaseServerClient()

    // Call model to return STRICT JSON only (no prose or code fences)
    const { text } = await generateText({
      model: aiModel,
      system: `You are an AI engineer specializing in breaking down hardware projects into 3D printable components.

Your role is to:
1. Analyze the hardware project and identify all structural components that can be 3D printed
2. Break down complex parts into smaller, assemblable pieces that can fit on standard 3D printers
3. Consider print orientation, support requirements, and assembly methods
4. Provide detailed specifications for each printable component
5. Generate separate prompts for 3D model generation for each component

For complex appliances like washing machines, dishwashers, or large devices:
- Break down into functional modules (motor housing, control panel, drum components, etc.)
- Create scaled-down functional prototypes rather than full-size replicas
- Focus on demonstrating key mechanisms and principles
- Provide multiple size options (prototype scale vs functional scale)

Return ONLY a single valid JSON object using double quotes, with exactly these keys at the top level and no others:
- project: string
- description: string
- components: array of objects, each object must contain ALL of these keys with string values:
  - component
  - description
  - promptFor3DGeneration
  - printSpecifications
  - assemblyNotes
  - printTime
  - material
  - supports
- generalNotes: string

Rules:
- Do not include any markdown, code fences, or explanation text.
- The number of components should match the complexity of the request.
- Design for standard 3D printer bed sizes (≈200x200mm) and minimize supports.
- Focus on modular, printable parts that can be assembled by the user.
`,
      prompt: `Project context:
${projectData?.description || ""}

Generate the JSON now. Output only the JSON object.`,
      temperature: 0.7,
      maxTokens: 2000,
    })

    // Parse and validate JSON from the model
    const raw = (text || "").trim()
    const start = raw.indexOf("{")
    const end = raw.lastIndexOf("}")
    if (start === -1 || end === -1 || end <= start) {
      return NextResponse.json({ error: "Model did not return valid JSON object." }, { status: 422 })
    }
    let parsed: Generate3DJson
    try {
      parsed = JSON.parse(raw.slice(start, end + 1)) as Generate3DJson
    } catch {
      return NextResponse.json({ error: "JSON parse failed: Invalid JSON returned by model." }, { status: 422 })
    }

    // Structural validation with light alias handling for minor drift
    const requiredTopKeys = ["project", "description", "components", "generalNotes"]
    for (const key of requiredTopKeys) {
      if (!(key in parsed)) {
        return NextResponse.json({ error: `Missing required key: ${key}` }, { status: 422 })
      }
    }
    if (typeof parsed.project !== "string" || typeof parsed.description !== "string" || typeof parsed.generalNotes !== "string") {
      return NextResponse.json({ error: "Top-level keys must be strings: project, description, generalNotes" }, { status: 422 })
    }
    if (!Array.isArray(parsed.components)) {
      return NextResponse.json({ error: "components must be an array" }, { status: 422 })
    }
    for (let i = 0; i < parsed.components.length; i++) {
      const c = parsed.components[i] as any
      // Alias support: map 'name' -> 'component', 'prompt' -> 'promptFor3DGeneration'
      if (typeof c.component !== "string" && typeof c.name === "string") c.component = c.name
      if (typeof c.promptFor3DGeneration !== "string" && typeof c.prompt === "string") c.promptFor3DGeneration = c.prompt

      const valid =
        typeof c.component === "string" &&
        typeof c.description === "string" &&
        typeof c.promptFor3DGeneration === "string" &&
        typeof c.printSpecifications === "string" &&
        typeof c.assemblyNotes === "string" &&
        typeof c.printTime === "string" &&
        typeof c.material === "string" &&
        typeof c.supports === "string"

      if (!valid) {
        return NextResponse.json({ error: `Component ${i} has invalid or missing fields` }, { status: 422 })
      }
    }

    // Log the parsed JSON for testing
    console.log("[3D] Generated JSON data:", JSON.stringify(parsed, null, 2))

    // Resolve target project id (UI may send a non-UUID creation id)
    const isUuid = (value: string | undefined): boolean => {
      if (!value) return false
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    }
    let targetProjectId: string | null = null
    if (isUuid(projectData?.id)) {
      targetProjectId = projectData!.id
    } else {
      const { data: latestProject } = await supabase
        .from('projects')
        .select('id')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      targetProjectId = latestProject?.id ?? null
    }
    if (!targetProjectId) {
      return NextResponse.json({ error: "Valid project id not found" }, { status: 400 })
    }

    // Resolve target project row: prefer provided id, else create a new row
    let targetReportId: string | null = providedReportId ?? null

    let reportData: { id: string } | null, reportError: unknown

    if (targetReportId) {
      // Update existing row with the generated JSON
      const result = await supabase
        .from('hardware_projects')
        .update({
          '3d_components': parsed,
        })
        .eq('id', targetReportId)
        .select()
        .single()

      reportData = result.data
      reportError = result.error
    } else {
      // Create new row with the generated JSON
      const result = await supabase
        .from('hardware_projects')
        .insert({
          project_id: targetProjectId,
          title: (projectData as any).title || parsed.project || 'Hardware Project',
          '3d_components': parsed,
        })
        .select()
        .single()

      reportData = result.data
      reportError = result.error
    }

    if (reportError) {
      console.error("Failed to store 3D components report:", reportError)
      return NextResponse.json({ error: "Failed to store report" }, { status: 500 })
    }

    return NextResponse.json({
      reportId: reportData?.id,
      data: parsed,
    })
  } catch (error: unknown) {
    const err = error as { message?: string; stack?: string; cause?: unknown }
    console.error("[3D] Error generating 3D components:", {
      error,
      message: err?.message,
      stack: err?.stack,
      cause: err?.cause,
    })

    const supabase = createSupabaseServerClient()

    let errorMessage = "Unknown error occurred"

    if (err?.message?.includes('OpenAI API')) {
      errorMessage = `OpenAI API error: ${err.message}`
    } else if (err?.message) {
      errorMessage = err.message
    }

    // If we don't have a project id, just return the error without attempting DB writes
    if (!projectData?.id) {
      return NextResponse.json({ error: errorMessage }, { status: 500 })
    }

    try {
      // Resolve target project id again for error storage
      const isUuid = (value: string | undefined): boolean => {
        if (!value) return false
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
      }
      let targetProjectId: string | null = null
      if (isUuid(projectData?.id)) {
        targetProjectId = projectData!.id
      } else {
        const { data: latestProject } = await supabase
          .from('projects')
          .select('id')
          .order('created_at', { ascending: false })
          .limit(1)
          .single()
        targetProjectId = latestProject?.id ?? null
      }
      if (!targetProjectId) {
        return NextResponse.json({ error: errorMessage }, { status: 500 })
      }
      // Check if a hardware report already exists for this project
      const { data: existingReport } = await supabase
        .from('hardware_projects')
        .select('id')
        .eq('project_id', projectData.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      // Store error using the same strict JSON shape to keep consumers consistent
      const errorJson = {
        project: (projectData as any).title || "",
        description: "",
        components: [],
        generalNotes: `Error generating 3D components: ${errorMessage}`,
      }

      let reportData: { id: string } | null
      if (existingReport) {
        const result = await supabase
          .from('hardware_projects')
          .update({ '3d_components': errorJson })
          .eq('id', existingReport.id)
          .select()
          .single()
        reportData = result.data
      } else {
        const result = await supabase
          .from('hardware_projects')
          .insert({ project_id: targetProjectId, title: (projectData as any).title || '', '3d_components': errorJson })
          .select()
          .single()
        reportData = result.data
      }

      return NextResponse.json({
        error: errorMessage,
        reportId: reportData?.id,
      }, { status: 500 })
    } catch (dbError: unknown) {
      console.error("[3D] Database error:", dbError)
      return NextResponse.json({
        error: `Generation failed and database error: ${errorMessage}`,
      }, { status: 500 })
    }
  }
}
