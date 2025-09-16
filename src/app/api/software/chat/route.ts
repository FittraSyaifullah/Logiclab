import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseClient } from '@/lib/supabase/server'
import { sendV0Message } from '@/lib/v0-service'

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseClient()
    
    const body = await request.json()
    const { softwareId, message, userId } = body
    console.log(`[CHAT] Message request - User: ${userId}, Software: ${softwareId}, Message: ${message?.substring(0, 50)}...`)

    if (!userId) {
      console.log(`[CHAT] Message failed - User ID missing`)
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    if (!softwareId || !message) {
      console.log(`[CHAT] Message failed - Missing required fields`)
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get software record and verify ownership
    console.log(`[CHAT] Verifying software ownership for software: ${softwareId}`)
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
      console.log(`[CHAT] Software verification failed:`, softwareError?.message)
      return NextResponse.json({ error: 'Software not found' }, { status: 404 })
    }

    console.log(`[CHAT] Software verified - Chat ID: ${software.software_id}`)

    if (!software.software_id) {
      console.log(`[CHAT] Software missing chat ID: ${softwareId}`)
      return NextResponse.json({ error: 'Software does not have chat ID' }, { status: 400 })
    }

    // Send message to v0
    console.log(`[CHAT] Sending message to v0 chat: ${software.software_id}`)
    const v0Result = await sendV0Message({
      chatId: software.software_id,
      message
    })

    if (v0Result.error) {
      console.log(`[CHAT] V0 message failed:`, v0Result.error)
      return NextResponse.json({ error: v0Result.error }, { status: 500 })
    }

    console.log(`[CHAT] V0 message sent successfully - Demo URL: ${v0Result.demoUrl}`)

    // Save user message
    console.log(`[CHAT] Saving user message to database`)
    const { error: userMessageError } = await supabase
      .from('software_messages')
      .insert({
        software_id: softwareId,
        role: 'user',
        content: message
      })

    if (userMessageError) {
      console.error(`[CHAT] Failed to save user message:`, userMessageError)
    } else {
      console.log(`[CHAT] User message saved successfully`)
    }

    // Update software with new demo URL if provided
    if (v0Result.demoUrl) {
      console.log(`[CHAT] Updating software demo URL`)
      const { error: updateError } = await supabase
        .from('software')
        .update({ demo_url: v0Result.demoUrl })
        .eq('id', softwareId)

      if (updateError) {
        console.error(`[CHAT] Failed to update demo URL:`, updateError)
      } else {
        console.log(`[CHAT] Software demo URL updated successfully`)
      }
    }

    console.log(`[CHAT] Chat message completed successfully`)
    return NextResponse.json({
      demoUrl: v0Result.demoUrl || software.demo_url,
      message: 'Message sent successfully'
    })

  } catch (error) {
    console.error(`[CHAT] Chat message error:`, error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
