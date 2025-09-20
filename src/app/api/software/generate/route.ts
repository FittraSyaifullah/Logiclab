import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseClient()

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

    // Create job record
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
          projectId: project.v0_id
        }
      })
      .select()
      .single()

    if (jobError) {
      console.error(`[SOFTWARE] Failed to create job record:`, jobError)
      return NextResponse.json({ error: 'Failed to create job' }, { status: 500 })
    }

    console.log(`[SOFTWARE] Job record created - ID: ${job.id}`)

    // Call the edge function to enqueue the job
    console.log(`[SOFTWARE] Enqueuing job with edge function`)
    const edgeFunctionUrl = `${process.env.SUPABASE_URL}/functions/v1/v0-processor`

    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('authorization') || '',
        'apikey': process.env.SUPABASE_ANON_KEY || '',
      },
      body: JSON.stringify({
        jobId: job.id,
        projectId: projectId,
        prompt: prompt,
        title: title
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[SOFTWARE] Edge function failed:`, response.status, errorText)

      // Update job status to failed
      await supabase
        .from('jobs')
        .update({
          status: 'failed',
          error: `Edge function failed: ${response.status} - ${errorText}`,
          finished_at: new Date().toISOString()
        })
        .eq('id', job.id)

      return NextResponse.json({
        error: 'Failed to enqueue job',
        jobId: job.id
      }, { status: 500 })
    }

    const result = await response.json()
    console.log(`[SOFTWARE] Edge function response:`, result)

    // Update job status to processing
    await supabase
      .from('jobs')
      .update({
        status: 'processing',
        started_at: new Date().toISOString()
      })
      .eq('id', job.id)

    console.log(`[SOFTWARE] Software generation job enqueued successfully: ${job.id}`)
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
