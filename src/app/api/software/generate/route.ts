import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseClient } from '@/lib/supabase/server'
import { createV0Chat } from '@/lib/v0-service'

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseClient()
    
    const body = await request.json()
    const { title, prompt, projectId, userId } = body
    console.log(`[SOFTWARE] Generate request - User: ${userId}, Project: ${projectId}, Title: ${title}`)

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

    // Create v0 chat
    console.log(`[SOFTWARE] Creating v0 chat for project: ${project.v0_id}`)
    console.log(`[SOFTWARE] V0 chat request:`, {
      projectId: project.v0_id,
      message: prompt
    })
    
    let v0Result
    try {
      v0Result = await createV0Chat({
        projectId: project.v0_id,
        message: prompt
      })
      console.log(`[SOFTWARE] V0 chat result:`, v0Result)
    } catch (v0Error) {
      console.error(`[SOFTWARE] V0 chat creation failed:`, v0Error)
      return NextResponse.json({ error: 'Failed to create v0 chat' }, { status: 500 })
    }

    if (v0Result.error) {
      console.log(`[SOFTWARE] V0 chat creation failed:`, v0Result.error)
      return NextResponse.json({ error: v0Result.error }, { status: 500 })
    }

    console.log(`[SOFTWARE] V0 chat created successfully - Chat ID: ${v0Result.chatId}`)
    console.log(`[SOFTWARE] Demo URL (iframe): ${v0Result.demoUrl}`)
    console.log(`[SOFTWARE] Chat URL: ${v0Result.chatUrl}`)
    console.log(`[SOFTWARE] Full v0Result:`, JSON.stringify(v0Result, null, 2))

    if (!v0Result.demoUrl) {
      console.error(`[SOFTWARE] No demoUrl from v0 after sync + polling. Aborting.`)
      return NextResponse.json({ error: 'Demo URL not ready' }, { status: 502 })
    }

    // Create software record in database
    console.log(`[SOFTWARE] Creating software record in database`)
    const { data: software, error: softwareError } = await supabase
      .from('software')
      .insert({
        project_id: projectId,
        title,
        demo_url: v0Result.demoUrl,  // iframe-embeddable demo URL
        url: v0Result.chatUrl,       // chat URL for navigation
        software_id: v0Result.chatId
      })
      .select()
      .single()

    if (softwareError) {
      console.error(`[SOFTWARE] Failed to create software record:`, softwareError)
      return NextResponse.json({ error: 'Failed to save software' }, { status: 500 })
    }

    console.log(`[SOFTWARE] Software record created - ID: ${software.id}`)

    // Add the first message to software_messages
    console.log(`[SOFTWARE] Saving initial message to database`)
    const { error: messageError } = await supabase
      .from('software_messages')
      .insert({
        software_id: software.id,
        role: 'user',
        content: prompt
      })

    if (messageError) {
      console.error(`[SOFTWARE] Failed to save initial message:`, messageError)
      // Don't fail the request, just log the error
    } else {
      console.log(`[SOFTWARE] Initial message saved successfully`)
    }

    // Save v0 response message if available
    if (v0Result.message) {
      console.log(`[SOFTWARE] Saving v0 response message to database`)
      const { error: v0MessageError } = await supabase
        .from('software_messages')
        .insert({
          software_id: software.id,
          role: 'assistant',
          content: v0Result.message
        })

      if (v0MessageError) {
        console.error(`[SOFTWARE] Failed to save v0 response message:`, v0MessageError)
        // Don't fail the request, just log the error
      } else {
        console.log(`[SOFTWARE] V0 response message saved successfully`)
      }
    }

    console.log(`[SOFTWARE] Software generation completed successfully`)
    return NextResponse.json({
      software: {
        id: software.id,
        title: software.title,
        demoUrl: software.demo_url,
        chatId: software.software_id
      }
    })

  } catch (error) {
    console.error(`[SOFTWARE] Software generation error:`, error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
