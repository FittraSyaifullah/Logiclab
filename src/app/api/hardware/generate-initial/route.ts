import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"
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

    // Load master system prompt and derive JSON Schema from example shape
    const systemPromptPath = resolve(process.cwd(), 'reference', 'master system prompt', 'master system prompt.md')
    const schemaPath = resolve(process.cwd(), 'reference', 'master json schema', 'ai_output.json')
    const systemPrompt = readFileSync(systemPromptPath, 'utf8')
    const exampleJson = JSON.parse(readFileSync(schemaPath, 'utf8')) as Record<string, unknown>

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

    // Create job (pending)
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert({
        user_id: userId,
        project_id: projectId,
        kind: 'hardware_initial_generation',
        status: 'pending',
        input: { title, prompt, projectId, userId, systemPrompt, strictSchema },
      })
      .select('id')
      .single()

    if (jobError || !job) {
      return NextResponse.json({ error: 'Failed to create job' }, { status: 500 })
    }

    // Trigger edge function to process jobs (fire-and-forget)
    const HARDWARE_INITIAL_FUNCTION_ENDPOINT = process.env.SUPABASE_HARDWARE_INITIAL_FUNCTION_URL
    const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (HARDWARE_INITIAL_FUNCTION_ENDPOINT && SERVICE_ROLE_KEY) {
      try {
        const fnResp = await fetch(HARDWARE_INITIAL_FUNCTION_ENDPOINT, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        })
        if (!fnResp.ok) {
          console.warn('[HARDWARE INITIAL] Edge function returned non-OK:', await fnResp.text())
        }
      } catch (e) {
        console.warn('[HARDWARE INITIAL] Failed to trigger edge function', e)
      }
    } else {
      console.warn('[HARDWARE INITIAL] Missing SUPABASE_HARDWARE_INITIAL_FUNCTION_URL or SUPABASE_SERVICE_ROLE_KEY')
    }

    return NextResponse.json({ success: true, jobId: job.id })
  } catch (error: unknown) {
    console.error('[HARDWARE INITIAL] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


