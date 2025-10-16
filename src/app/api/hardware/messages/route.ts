import { type NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const hardwareId = searchParams.get('hardwareId')
    const projectId = searchParams.get('projectId')
    const userId = searchParams.get('userId')

    console.log('[HARDWARE MESSAGES] Request params:', { hardwareId, projectId, userId })

    if (!userId || (!hardwareId && !projectId)) {
      console.log('[HARDWARE MESSAGES] Missing required params')
      return NextResponse.json({ error: "Missing userId and either hardwareId or projectId" }, { status: 400 })
    }

    const supabase = createSupabaseServerClient()

    // Authorization: verify project ownership
    let owningProjectId: string | null = null
    if (projectId) {
      console.log('[HARDWARE MESSAGES] Looking up project:', projectId)
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('id, owner_id')
        .eq('id', projectId)
        .single()
      console.log('[HARDWARE MESSAGES] Project lookup result:', { project, projectError })
      if (projectError || !project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
      if (project.owner_id !== userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      owningProjectId = project.id
    } else if (hardwareId) {
      console.log('[HARDWARE MESSAGES] Looking up hardware project:', hardwareId)
      const { data: hardware, error } = await supabase
        .from('hardware_projects')
        .select('project_id')
        .eq('id', hardwareId)
        .single()
      console.log('[HARDWARE MESSAGES] Hardware lookup result:', { hardware, error })
      if (error || !hardware) return NextResponse.json({ error: 'Hardware report not found' }, { status: 404 })
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('id, owner_id')
        .eq('id', hardware.project_id)
        .single()
      console.log('[HARDWARE MESSAGES] Project lookup from hardware result:', { project, projectError })
      if (projectError || !project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
      if (project.owner_id !== userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      owningProjectId = project.id
    }

    // Fetch messages
    if (hardwareId) {
      console.log('[HARDWARE MESSAGES] Fetching messages for hardwareId:', hardwareId)
      const { data: messages, error: msgErr } = await supabase
        .from('hardware_messages')
        .select('id, role, content, created_at')
        .eq('hardware_id', hardwareId)
        .order('created_at', { ascending: true })
      console.log('[HARDWARE MESSAGES] Messages query result:', { messages, msgErr })
      if (msgErr) return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
      return NextResponse.json({ messages: messages ?? [] })
    }

    // If projectId provided but not hardwareId, load messages for latest hardware report
    console.log('[HARDWARE MESSAGES] Looking for latest hardware report for project:', owningProjectId)
    const { data: latestHardware } = await supabase
      .from('hardware_projects')
      .select('id')
      .eq('project_id', owningProjectId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    console.log('[HARDWARE MESSAGES] Latest hardware result:', { latestHardware })
    if (!latestHardware?.id) return NextResponse.json({ messages: [] })

    console.log('[HARDWARE MESSAGES] Fetching messages for latest hardware:', latestHardware.id)
    const { data: messages, error: msgErr } = await supabase
      .from('hardware_messages')
      .select('id, role, content, created_at')
      .eq('hardware_id', latestHardware.id)
      .order('created_at', { ascending: true })
    console.log('[HARDWARE MESSAGES] Latest messages query result:', { messages, msgErr })
    if (msgErr) return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
    return NextResponse.json({ messages: messages ?? [] })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}


