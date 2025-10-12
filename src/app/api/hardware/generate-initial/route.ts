import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { generateStructuredJson } from "@/lib/openai"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

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

    // Create job (pending)
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert({
        user_id: userId,
        project_id: projectId,
        kind: 'hardware_initial_generation',
        status: 'pending',
        input: { title, prompt, projectId },
      })
      .select()
      .single()

    if (jobError || !job) {
      return NextResponse.json({ error: 'Failed to create job' }, { status: 500 })
    }

    // Load master system prompt and JSON schema
    const systemPromptPath = resolve(process.cwd(), 'reference', 'master system prompt', 'master system prompt.md')
    const schemaPath = resolve(process.cwd(), 'reference', 'master json schema', 'ai_output.json')
    const systemPrompt = readFileSync(systemPromptPath, 'utf8')
    const schemaJson = JSON.parse(readFileSync(schemaPath, 'utf8')) as Record<string, unknown>

    // Fire-and-forget processing using Responses API with structured outputs
    void (async () => {
      const startTimeIso = new Date().toISOString()
      try {
        // Mark job as processing
        await supabase
          .from('jobs')
          .update({ status: 'processing', started_at: startTimeIso })
          .eq('id', job.id)

        const { json } = await generateStructuredJson({
          system: systemPrompt,
          prompt: `Project Title: ${title}\n\nUser Description: ${prompt}\n\nReturn the required hardware output JSON strictly following the provided schema.`,
          schema: schemaJson,
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

        // Map into storage columns
        const threeD = resultObj?.reports?.['3DComponents']
        const assembly = resultObj?.reports?.['AssemblyAndParts']
        const firmware = resultObj?.reports?.['FirmwareAndCode']

        // Create new hardware_projects row
        const { data: reportRow, error: insertErr } = await supabase
          .from('hardware_projects')
          .insert({
            project_id: projectId,
            title: title || resultObj?.project || 'Hardware Project',
            '3d_components': threeD ? {
              project: resultObj?.project || title,
              description: resultObj?.description || prompt,
              components: Array.isArray(threeD?.components) ? threeD.components : [],
              generalNotes: typeof threeD?.generalNotes === 'string' ? threeD.generalNotes : '',
            } : null,
            assembly_parts: assembly ? assembly : null,
            firmware_code: firmware ? firmware : null,
          })
          .select()
          .single()

        if (insertErr) {
          throw insertErr
        }

        await supabase
          .from('jobs')
          .update({ status: 'completed', finished_at: new Date().toISOString(), result: { reportId: reportRow?.id } })
          .eq('id', job.id)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        await supabase
          .from('jobs')
          .update({ status: 'failed', error: message, finished_at: new Date().toISOString() })
          .eq('id', job.id)
      }
    })()

    return NextResponse.json({ success: true, jobId: job.id })
  } catch (error: unknown) {
    console.error('[HARDWARE INITIAL] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


