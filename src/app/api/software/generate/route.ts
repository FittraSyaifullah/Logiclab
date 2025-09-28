import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createV0Chat } from '@/lib/v0-service'

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

    // For now, simulate the job processing directly
    // TODO: Implement proper Supabase Queue integration
    console.log(`[SOFTWARE] Job created, will be processed asynchronously: ${job.id}`)

    // Update job status to processing
    await supabase
      .from('jobs')
      .update({
        status: 'processing',
        started_at: new Date().toISOString()
      })
      .eq('id', job.id)

    // Process via v0 service wrapper (synchronous behavior with short polling)
    try {
      console.log(`[SOFTWARE] Creating v0 chat via service for project: ${project.v0_id}`)
      const chatResult = await createV0Chat({
        projectId: project.v0_id,
        message: prompt,
      })

      if (chatResult.error) {
        throw new Error(chatResult.error)
      }

      const chatId = chatResult.chatId
      const demoUrl = chatResult.demoUrl
      const assistantMessage = chatResult.message
      const hasDemoUrl = !!demoUrl
      const hasClarification = !!assistantMessage && !demoUrl
      console.log(`[SOFTWARE] Final result: hasDemoUrl=${hasDemoUrl}, hasClarification=${hasClarification}`)

      // Create software record (handles both scenarios: with and without demo URL)
      const { data: software, error: softwareError } = await supabase
        .from('software')
        .insert({
          project_id: projectId,
          title: title,
          demo_url: demoUrl || null, // Can be null if v0 needs clarification
          url: chatResult.chatUrl || null,
          software_id: chatId || null
        })
        .select()
        .single()

      if (softwareError) {
        throw new Error(`Failed to save software: ${softwareError.message}`)
      }

      console.log(`[SOFTWARE] Software record created - ID: ${software.id}, hasDemoUrl: ${!!demoUrl}`)

      // Add user message
      await supabase
        .from('software_messages')
        .insert({
          software_id: software.id,
          role: 'user',
          content: prompt
        })

      // Add assistant message (could be a clarification question or actual response)
      if (assistantMessage) {
        await supabase
          .from('software_messages')
          .insert({
            software_id: software.id,
            role: 'assistant',
            content: assistantMessage
          })
        console.log(`[SOFTWARE] Assistant message saved: ${assistantMessage.substring(0, 100)}...`)
      }

      // Update job as completed
      await supabase
        .from('jobs')
        .update({
          status: 'completed',
          result: {
            software: {
              id: software.id,
              title: software.title,
              demoUrl: software.demo_url,
              chatId: software.software_id
            }
          },
          finished_at: new Date().toISOString()
        })
        .eq('id', job.id)

      console.log(`[SOFTWARE] Software generation completed successfully: ${job.id}`)
      return NextResponse.json({
        success: true,
        jobId: job.id,
        message: 'Job completed successfully'
      })

    } catch (processingError) {
      console.error(`[SOFTWARE] Job processing failed:`, processingError)

      // Update job status to failed
      await supabase
        .from('jobs')
        .update({
          status: 'failed',
          error: processingError instanceof Error ? processingError.message : 'Unknown error',
          finished_at: new Date().toISOString()
        })
        .eq('id', job.id)

      return NextResponse.json({
        error: 'Job processing failed',
        jobId: job.id
      }, { status: 500 })
    }

  } catch (error) {
    const err = error as unknown
    const message = err && typeof err === 'object' && 'message' in err ? String((err as any).message) : 'Internal server error'
    console.error(`[SOFTWARE] Software generation error:`, err)
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
