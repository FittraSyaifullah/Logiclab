import { type NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const hardwareId = searchParams.get('hardwareId')
    const projectId = searchParams.get('projectId')
    const userId = searchParams.get('userId')

    console.log('[HARDWARE MESSAGES] Request params:', { hardwareId, projectId, userId })

    if (!userId || !hardwareId) {
      console.log('[HARDWARE MESSAGES] Missing required params (userId and hardwareId are required)')
      return NextResponse.json({ error: "Missing userId or hardwareId" }, { status: 400 })
    }

    const supabase = createSupabaseServerClient()

    // Authorization: verify project ownership based on hardwareId
    console.log('[HARDWARE MESSAGES] Looking up hardware project:', hardwareId)
    const { data: hardware, error } = await supabase
      .from('hardware_projects')
      .select('project_id')
      .eq('id', hardwareId)
      .single()
    console.log('[HARDWARE MESSAGES] Hardware lookup result:', { hardware, error })
    if (error || !hardware) return NextResponse.json({ error: 'Hardware report not found' }, { status: 404 })
    const { data: projectRow, error: projectError } = await supabase
      .from('projects')
      .select('id, owner_id')
      .eq('id', hardware.project_id)
      .single()
    console.log('[HARDWARE MESSAGES] Project lookup from hardware result:', { project: projectRow, projectError })
    if (projectError || !projectRow) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    if (projectRow.owner_id !== userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

    // Fetch messages strictly for provided hardwareId
    console.log('[HARDWARE MESSAGES] Fetching messages for hardwareId:', hardwareId)
    const { data: messages, error: msgErr } = await supabase
      .from('hardware_messages')
      .select('id, role, content, created_at')
      .eq('hardware_id', hardwareId)
      .order('created_at', { ascending: true })
    console.log('[HARDWARE MESSAGES] Messages query result:', { messages, msgErr })
    if (msgErr) return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
    return NextResponse.json({ messages: messages ?? [] })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}


