import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { promises as fs } from 'fs'
import path from 'path'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as { userId?: string; message?: string } | null
  const userId = body?.userId
  const message = body?.message
  if (!userId || !message) return new Response(JSON.stringify({ error: 'userId and message required' }), { status: 400 })

  // Load system prompt from repo
  const promptPath = path.join(process.cwd(), 'reference', 'debug chat', 'system prompt.md')
  const systemPrompt = await fs.readFile(promptPath, 'utf8')

  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase.functions.invoke('debug-chat', {
    body: { userId, message, systemPrompt, topK: 10 }
  })
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  return new Response(JSON.stringify(data ?? {}), { status: 200, headers: { 'Content-Type': 'application/json' } })
}




