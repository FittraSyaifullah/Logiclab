import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export const maxDuration = 360

type InitialRequestBody = {
  title: string
  prompt: string
  projectId: string
  userId: string
}

export async function POST(request: NextRequest) {
  try {
    console.log('[HARDWARE INITIAL] Starting request processing...')
    const supabase = createSupabaseServerClient()
    const body = (await request.json()) as Partial<InitialRequestBody>
    const { title, prompt, projectId, userId } = body

    console.log('[HARDWARE INITIAL] Request body:', { title, prompt, projectId, userId })

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

    // Note: System prompt and schema are handled by the edge function
    console.log('[HARDWARE INITIAL] Creating job (system prompt handled by edge function)...')
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert({
        user_id: userId,
        project_id: projectId,
        kind: 'hardware_initial_generation',
        status: 'pending',
        input: { title, prompt, projectId, userId },
      })
      .select('id')
      .single()

    if (jobError || !job) {
      console.error('[HARDWARE INITIAL] Job creation failed:', jobError)
      return NextResponse.json({ error: 'Failed to create job' }, { status: 500 })
    }
    
    console.log('[HARDWARE INITIAL] Job created successfully:', job.id)

    // Trigger edge function to process jobs (fire-and-forget)
    console.log('[HARDWARE INITIAL] Triggering edge function...')
    const HARDWARE_INITIAL_FUNCTION_ENDPOINT = process.env.SUPABASE_HARDWARE_INITIAL_FUNCTION_URL//_TEST
    const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    console.log('[HARDWARE INITIAL] Function URL:', HARDWARE_INITIAL_FUNCTION_ENDPOINT ? 'present' : 'missing')
    console.log('[HARDWARE INITIAL] Service key:', SERVICE_ROLE_KEY ? 'present' : 'missing')
    
    if (HARDWARE_INITIAL_FUNCTION_ENDPOINT && SERVICE_ROLE_KEY) {
      console.log('[HARDWARE INITIAL] Calling edge function (fire-and-forget)...')
      console.log('[HARDWARE INITIAL] Edge function URL:', HARDWARE_INITIAL_FUNCTION_ENDPOINT)
      
      // Fire-and-forget: do not await the edge function; client listens via Supabase Realtime
      // Add timeout to prevent hanging on Vercel (30 seconds for connection + initial response)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        controller.abort()
      }, 30000) // 30 second timeout
      
      fetch(HARDWARE_INITIAL_FUNCTION_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        // Pass the specific jobId so the edge function processes only this job
        body: JSON.stringify({ jobId: job.id }),
        signal: controller.signal,
      })
        .then(async (fnResp) => {
          clearTimeout(timeoutId)
          console.log('[HARDWARE INITIAL] Edge function response status:', fnResp.status)
          if (!fnResp.ok) {
            const errorText = await fnResp.text().catch(() => '<failed to read body>')
            console.warn('[HARDWARE INITIAL] Edge function returned non-OK:', errorText)
          } else {
            console.log('[HARDWARE INITIAL] Edge function called successfully')
          }
        })
        .catch((e) => {
          clearTimeout(timeoutId)
          const errorDetails = {
            message: e instanceof Error ? e.message : String(e),
            name: e instanceof Error ? e.name : 'Unknown',
            cause: e instanceof Error && 'cause' in e ? e.cause : undefined,
            code: 'code' in e ? (e as { code?: string }).code : undefined,
            errno: 'errno' in e ? (e as { errno?: number }).errno : undefined,
            syscall: 'syscall' in e ? (e as { syscall?: string }).syscall : undefined,
          }
          
          if (e instanceof Error && e.name === 'AbortError') {
            console.warn('[HARDWARE INITIAL] Edge function call timed out after 30 seconds', errorDetails)
          } else {
            console.warn('[HARDWARE INITIAL] Failed to trigger edge function', errorDetails)
          }
          
          // Log additional context for debugging
          console.warn('[HARDWARE INITIAL] Network error details:', {
            url: HARDWARE_INITIAL_FUNCTION_ENDPOINT,
            hasServiceKey: !!SERVICE_ROLE_KEY,
            errorType: e instanceof Error ? e.constructor.name : typeof e,
          })
        })
    } else {
      console.warn('[HARDWARE INITIAL] Missing SUPABASE_HARDWARE_INITIAL_FUNCTION_URL or SUPABASE_SERVICE_ROLE_KEY')
    }

    return NextResponse.json({ success: true, jobId: job.id })
  } catch (error: unknown) {
    console.error('[HARDWARE INITIAL] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[HARDWARE INITIAL] Error details:', {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    })
    return NextResponse.json({ error: `Internal server error: ${errorMessage}` }, { status: 500 })
  }
}


