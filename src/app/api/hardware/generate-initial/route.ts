import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { generateStructuredJson } from "@/lib/openai"
import fs from "node:fs"
import path from "node:path"

export const maxDuration = 60

type InitialRequestBody = {
  title: string
  prompt: string
  projectId: string
  userId: string
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    const body = (await request.json()) as Partial<InitialRequestBody>
    const { title, prompt, projectId, userId } = body

    if (!userId) return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    if (!title || !prompt || !projectId) return NextResponse.json({ error: "Missing required fields" }, { status: 400 })

    // Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('owner_id', userId)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Synchronous mode: no jobs; generate immediately and return UI-ready payload

    // Load master system prompt and derive JSON Schema from example shape
    const systemPromptPath = path.resolve(process.cwd(), 'src', 'reference', 'master-system-prompt.md')
    const schemaPath = path.resolve(process.cwd(), 'reference', 'master json schema', 'ai_output.json')
    const systemPrompt = fs.readFileSync(systemPromptPath, 'utf8')
    const exampleJson = JSON.parse(fs.readFileSync(schemaPath, 'utf8')) as Record<string, unknown>

    // Convert example (with "string" placeholders) into a strict JSON Schema
    const exampleToSchema = (value: unknown): Record<string, unknown> => {
      if (typeof value === 'string') {
        return { type: 'string' }
      }
      if (Array.isArray(value)) {
        const first = value.length > 0 ? value[0] : {}
        return { type: 'array', items: exampleToSchema(first) }
      }
      if (value && typeof value === 'object') {
        const props: Record<string, unknown> = {}
        const required: string[] = []
        for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
          props[k] = exampleToSchema(v)
          required.push(k)
        }
        return { type: 'object', properties: props, required, additionalProperties: false }
      }
      return { type: 'string' }
    }

    const strictSchema = exampleToSchema(exampleJson)

    const { json } = await generateStructuredJson({
      system: systemPrompt,
      prompt: `Project Title: ${title}\n\nUser Description: ${prompt}\n\nReturn the required hardware output JSON strictly following the provided schema.`,
      schema: strictSchema,
    })

    // Persist into hardware_projects using existing columns used by UI
    // json shape: { project, description, reports: { 3DComponents, AssemblyAndParts, FirmwareAndCode } }
    const resultObj = json as {
      project?: string
      description?: string
      reports?: {
        '3DComponents'?: { components?: unknown[]; generalNotes?: string }
        'AssemblyAndParts'?: Record<string, unknown>
        'FirmwareAndCode'?: Record<string, unknown>
      }
    }

    const threeD = resultObj?.reports?.['3DComponents']
    const assembly = resultObj?.reports?.['AssemblyAndParts']
    const firmware = resultObj?.reports?.['FirmwareAndCode']

    // Build assembly and firmware content for UI
    const assemblyContent = assembly ? [
      (assembly as { overview?: string }).overview || '',
      (assembly as { assemblyInstructions?: string }).assemblyInstructions || '',
      (assembly as { safetyChecklist?: string }).safetyChecklist || ''
    ].filter(Boolean).join('\n\n') : ''

    const firmwareContent = firmware ? [
      (firmware as { explanation?: string }).explanation || '',
      (firmware as { code?: string }).code || '',
      (firmware as { improvementSuggestions?: string }).improvementSuggestions || ''
    ].filter(Boolean).join('\n\n') : ''

    // Insert
    const { data: reportRow, error: insertErr } = await supabase
      .from('hardware_projects')
      .insert({
        project_id: projectId,
        title: title || resultObj?.project || 'Hardware Project',
        '3d_components': threeD ? {
          project: resultObj?.project || title,
          description: resultObj?.description || prompt,
          components: Array.isArray((threeD as { components?: unknown[] }).components) ? (threeD as { components?: unknown[] }).components : [],
          generalNotes: typeof (threeD as { generalNotes?: string }).generalNotes === 'string' ? (threeD as { generalNotes?: string }).generalNotes as string : '',
        } : null,
        assembly_parts: assembly ? {
          content: assemblyContent,
          partsCount: Array.isArray((assembly as { partsList?: unknown[] }).partsList) ? (assembly as { partsList: unknown[] }).partsList.length : 0,
          estimatedTime: '2-3 hours',
          difficultyLevel: 'Beginner',
        } : null,
        firmware_code: firmware ? {
          content: firmwareContent,
          language: (firmware as { language?: string }).language || 'C++',
          platform: (firmware as { microcontroller?: string }).microcontroller || 'Arduino IDE',
          libraries: [],
          codeLines: firmwareContent.split('\n').length,
        } : null,
      })
      .select()
      .single()

    if (insertErr) {
      return NextResponse.json({ error: 'Failed to store report' }, { status: 500 })
    }

    // UI-ready payload mirroring reports API transform
    const uiReports: Record<string, unknown> = {}
    if (threeD) {
      const descriptionText = typeof (resultObj?.description ?? '') === 'string' ? (resultObj?.description as string) : ''
      const notesText = typeof ((threeD as { generalNotes?: string }).generalNotes ?? '') === 'string' ? (threeD as { generalNotes?: string }).generalNotes as string : ''
      const content = [descriptionText, notesText].filter(Boolean).join('\n\n')
      const mappedComponents = Array.isArray((threeD as { components?: Array<Record<string, unknown>> }).components)
        ? ((threeD as { components?: Array<Record<string, unknown>> }).components as Array<Record<string, unknown>>).map((c) => ({
            name: (c?.component as string) ?? '',
            description: (c?.description as string) ?? '',
            printTime: (c?.printTime as string) ?? '',
            material: (c?.material as string) ?? '',
            supports: (c?.supports as string) ?? '',
            prompt: (c?.promptFor3DGeneration as string) ?? '',
            notes: [c?.printSpecifications as string, c?.assemblyNotes as string].filter(Boolean).join('\n\n'),
          }))
        : []
      uiReports['3d-components'] = { content, components: mappedComponents, reportId: reportRow?.id }
    }
    if (assembly) {
      uiReports['assembly-parts'] = {
        content: assemblyContent,
        partsCount: Array.isArray((assembly as { partsList?: unknown[] }).partsList) ? (assembly as { partsList: unknown[] }).partsList.length : 0,
        estimatedTime: '2-3 hours',
        difficultyLevel: 'Beginner',
        reportId: reportRow?.id,
      }
    }
    if (firmware) {
      uiReports['firmware-code'] = {
        content: firmwareContent,
        language: (firmware as { language?: string }).language || 'C++',
        platform: (firmware as { microcontroller?: string }).microcontroller || 'Arduino IDE',
        libraries: [],
        codeLines: firmwareContent.split('\n').length,
        reportId: reportRow?.id,
      }
    }

    return NextResponse.json({ success: true, reportId: reportRow?.id, reports: uiReports }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error: unknown) {
    console.error('[HARDWARE INITIAL] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


