import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    
    const { searchParams } = new URL(request.url)
    const softwareId = searchParams.get('softwareId')
    const userId = searchParams.get('userId')
    console.log(`[MESSAGES] Messages request - User: ${userId}, Software: ${softwareId}`)

    if (!softwareId || !userId) {
      console.log(`[MESSAGES] Request failed - Missing required parameters`)
      return NextResponse.json({ error: 'Software ID and User ID are required' }, { status: 400 })
    }

    // Verify software ownership
    console.log(`[MESSAGES] Verifying software ownership for software: ${softwareId}`)
    const { data: software, error: softwareError } = await supabase
      .from('software')
      .select(`
        *,
        projects!inner(owner_id)
      `)
      .eq('id', softwareId)
      .eq('projects.owner_id', userId)
      .single()

    if (softwareError || !software) {
      console.log(`[MESSAGES] Software verification failed:`, softwareError?.message)
      return NextResponse.json({ error: 'Software not found' }, { status: 404 })
    }

    console.log(`[MESSAGES] Software verified - Title: ${software.title}`)

    // Get messages for this software
    console.log(`[MESSAGES] Loading messages for software: ${softwareId}`)
    const { data: messages, error: messagesError } = await supabase
      .from('software_messages')
      .select('id, role, content, created_at')
      .eq('software_id', softwareId)
      .order('created_at', { ascending: false })

    if (messagesError) {
      console.log(`[MESSAGES] Failed to load messages:`, messagesError)
      return NextResponse.json({ error: 'Failed to load messages' }, { status: 500 })
    }

    console.log(`[MESSAGES] Messages loaded: ${messages?.length || 0} items`)

    return NextResponse.json({
      software: {
        id: software.id,
        title: software.title,
        demoUrl: software.demo_url,
        chatId: software.software_id
      },
      messages: messages || []
    })

  } catch (error) {
    console.error(`[MESSAGES] Messages loading error:`, error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
