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
  console.log('[HARDWARE INITIAL] Starting POST request')
  try {
    console.log('[HARDWARE INITIAL] Creating Supabase client')
    const supabase = createSupabaseServerClient()
    
    console.log('[HARDWARE INITIAL] Parsing request body')
    const body = (await request.json()) as Partial<InitialRequestBody>
    console.log('[HARDWARE INITIAL] Request body:', JSON.stringify(body, null, 2))
    
    const { title, prompt, projectId, userId } = body
    console.log('[HARDWARE INITIAL] Extracted fields:', { title, prompt, projectId, userId })

    if (!userId) {
      console.log('[HARDWARE INITIAL] Missing userId')
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }
    if (!title || !prompt || !projectId) {
      console.log('[HARDWARE INITIAL] Missing required fields:', { title: !!title, prompt: !!prompt, projectId: !!projectId })
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Verify project ownership
    console.log('[HARDWARE INITIAL] Verifying project ownership for projectId:', projectId, 'userId:', userId)
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('owner_id', userId)
      .single()

    console.log('[HARDWARE INITIAL] Project query result:', { project, projectError })
    if (projectError || !project) {
      console.log('[HARDWARE INITIAL] Project not found or error:', projectError)
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Synchronous mode: no jobs; generate immediately and return UI-ready payload

    // Load master system prompt and derive JSON Schema from example shape
    console.log('[HARDWARE INITIAL] Loading system prompt and schema files')
    const systemPromptPath = path.resolve(process.cwd(), 'public', 'reference', 'master-system-prompt.md')
    const schemaPath = path.resolve(process.cwd(), 'reference', 'master json schema', 'ai_output.json')
    
    console.log('[HARDWARE INITIAL] File paths:', { systemPromptPath, schemaPath })
    console.log('[HARDWARE INITIAL] Current working directory:', process.cwd())
    
    let systemPrompt: string
    let exampleJson: Record<string, unknown>
    
    try {
      console.log('[HARDWARE INITIAL] Reading system prompt file')
      systemPrompt = fs.readFileSync(systemPromptPath, 'utf8')
      console.log('[HARDWARE INITIAL] System prompt loaded, length:', systemPrompt.length)
      
      console.log('[HARDWARE INITIAL] Reading schema file')
      exampleJson = JSON.parse(fs.readFileSync(schemaPath, 'utf8')) as Record<string, unknown>
      console.log('[HARDWARE INITIAL] Schema loaded:', JSON.stringify(exampleJson, null, 2))
    } catch (fileError) {
      console.error('[HARDWARE INITIAL] File reading error:', fileError)
      throw fileError
    }

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

    console.log('[HARDWARE INITIAL] Converting example to schema')
    const strictSchema = exampleToSchema(exampleJson)
    console.log('[HARDWARE INITIAL] Generated schema:', JSON.stringify(strictSchema, null, 2))

    console.log('[HARDWARE INITIAL] Calling generateStructuredJson')
    const { json } = await generateStructuredJson({
      system: systemPrompt,
      prompt: `Project Title: ${title}\n\nUser Description: ${prompt}\n\nReturn the required hardware output JSON strictly following the provided schema.`,
      schema: strictSchema,
    })
    console.log('[HARDWARE INITIAL] Generated JSON response:', JSON.stringify(json, null, 2))

    // Persist into hardware_projects using existing columns used by UI
    // json shape: { project, description, reports: { 3DComponents, AssemblyAndParts, FirmwareAndCode } }
    console.log('[HARDWARE INITIAL] Processing JSON result')
    const resultObj = json as {
      project?: string
      description?: string
      reports?: {
        '3DComponents'?: { components?: unknown[]; generalNotes?: string }
        'AssemblyAndParts'?: Record<string, unknown>
        'FirmwareAndCode'?: Record<string, unknown>
      }
    }
    console.log('[HARDWARE INITIAL] Result object:', JSON.stringify(resultObj, null, 2))

    const threeD = resultObj?.reports?.['3DComponents']
    const assembly = resultObj?.reports?.['AssemblyAndParts']
    const firmware = resultObj?.reports?.['FirmwareAndCode']
    console.log('[HARDWARE INITIAL] Extracted sections:', { 
      threeD: !!threeD, 
      assembly: !!assembly, 
      firmware: !!firmware 
    })

    // Build assembly and firmware content for UI
    console.log('[HARDWARE INITIAL] Building content for UI')
    const assemblyContent = assembly ? [
      (assembly as { overview?: string }).overview || '',
      (assembly as { assemblyInstructions?: string }).assemblyInstructions || '',
      (assembly as { safetyChecklist?: string }).safetyChecklist || ''
    ].filter(Boolean).join('\n\n') : ''
    console.log('[HARDWARE INITIAL] Assembly content length:', assemblyContent.length)

    const firmwareContent = firmware ? [
      (firmware as { explanation?: string }).explanation || '',
      (firmware as { code?: string }).code || '',
      (firmware as { improvementSuggestions?: string }).improvementSuggestions || ''
    ].filter(Boolean).join('\n\n') : ''
    console.log('[HARDWARE INITIAL] Firmware content length:', firmwareContent.length)

    // Insert
    console.log('[HARDWARE INITIAL] Preparing database insert')
    const insertData = {
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
    }
    console.log('[HARDWARE INITIAL] Insert data:', JSON.stringify(insertData, null, 2))
    
    const { data: reportRow, error: insertErr } = await supabase
      .from('hardware_projects')
      .insert(insertData)
      .select()
      .single()

    console.log('[HARDWARE INITIAL] Insert result:', { reportRow, insertErr })
    if (insertErr) {
      console.error('[HARDWARE INITIAL] Database insert error:', insertErr)
      return NextResponse.json({ error: 'Failed to store report' }, { status: 500 })
    }

    // UI-ready payload mirroring reports API transform
    console.log('[HARDWARE INITIAL] Building UI reports')
    const uiReports: Record<string, unknown> = {}
    if (threeD) {
      console.log('[HARDWARE INITIAL] Processing 3D components')
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
      console.log('[HARDWARE INITIAL] 3D components processed, count:', mappedComponents.length)
    }
    if (assembly) {
      console.log('[HARDWARE INITIAL] Processing assembly parts')
      uiReports['assembly-parts'] = {
        content: assemblyContent,
        partsCount: Array.isArray((assembly as { partsList?: unknown[] }).partsList) ? (assembly as { partsList: unknown[] }).partsList.length : 0,
        estimatedTime: '2-3 hours',
        difficultyLevel: 'Beginner',
        reportId: reportRow?.id,
      }
    }
    if (firmware) {
      console.log('[HARDWARE INITIAL] Processing firmware code')
      uiReports['firmware-code'] = {
        content: firmwareContent,
        language: (firmware as { language?: string }).language || 'C++',
        platform: (firmware as { microcontroller?: string }).microcontroller || 'Arduino IDE',
        libraries: [],
        codeLines: firmwareContent.split('\n').length,
        reportId: reportRow?.id,
      }
    }

    console.log('[HARDWARE INITIAL] Final UI reports:', JSON.stringify(uiReports, null, 2))
    console.log('[HARDWARE INITIAL] Returning success response')
    return NextResponse.json({ success: true, reportId: reportRow?.id, reports: uiReports }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error: unknown) {
    console.error('[HARDWARE INITIAL] Error details:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    })
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}


