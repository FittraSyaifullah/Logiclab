import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()

    const body = await request.json()
    const { title, prompt, projectId, userId } = body
    console.log(`[SOFTWARE] Async generate request - User: ${userId}, Project: ${projectId}, Title: ${title}`)

    if (!userId) {
      console.log(`[SOFTWARE] Generate failed - User ID missing`)
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    if (!title || !prompt || !projectId) {
      console.log(`[SOFTWARE] Generate failed - Missing required fields`)
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get user's project to verify ownership
    console.log(`[SOFTWARE] Verifying project ownership for project: ${projectId}`)
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('owner_id', userId)
      .single()

    if (projectError || !project) {
      console.log(`[SOFTWARE] Project verification failed:`, projectError?.message)
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (!project.v0_id) {
      console.log(`[SOFTWARE] Project missing v0_id: ${projectId}`)
      return NextResponse.json({ error: 'Project does not have v0_id' }, { status: 400 })
    }

    console.log(`[SOFTWARE] Project verified - v0_id: ${project.v0_id}`)

    // Create job record (pending)
    console.log(`[SOFTWARE] Creating job record for v0 processing`)
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert({
        user_id: userId,
        project_id: projectId,
        kind: 'v0_software_generation',
        status: 'pending',
        input: {
          title,
          prompt,
          projectId: projectId
        }
      })
      .select()
      .single()

    if (jobError) {
      console.error(`[SOFTWARE] Failed to create job record:`, jobError)
      return NextResponse.json({ error: 'Failed to create job' }, { status: 500 })
    }

    console.log(`[SOFTWARE] Job record created - ID: ${job.id}`)

    // Trigger Supabase Edge Function (v0-processor) to process asynchronously (fire-and-forget)
    const functionUrl = process.env.SUPABASE_SOFTWARE_FUNCTION_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!functionUrl || !serviceRoleKey) {
      console.error('[SOFTWARE] Missing function configuration: ', {
        hasFunctionUrl: !!functionUrl,
        hasServiceRoleKey: !!serviceRoleKey,
      })
    } else {
      void fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({
          jobId: job.id,
          projectId,
          prompt,
          title,
          userId,
        }),
      }).then(() => {
        console.log('[SOFTWARE] v0-processor invoked')
      }).catch((invokeError) => {
        console.error('[SOFTWARE] Failed to invoke v0-processor:', invokeError)
        // Keep job as pending; external processor can be triggered later
      })
    }

    console.log(`[SOFTWARE] Job enqueued for processing: ${job.id}`)
    return NextResponse.json({
      success: true,
      jobId: job.id,
      message: 'Job enqueued for processing'
    })

  } catch (error) {
    console.error(`[SOFTWARE] Software generation error:`, error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
