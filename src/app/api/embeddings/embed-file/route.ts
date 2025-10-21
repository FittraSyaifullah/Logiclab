import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

type FileType = 'document' | 'model' | 'image'

interface EmbedRequestBody {
  userId: string
  file: { id: string; path: string; bucket: string; fileType: FileType; mimeType?: string }
  textChunks: string[]
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as EmbedRequestBody | null
  if (!body || !body.userId || !body.file?.id || !Array.isArray(body.textChunks)) {
    return new Response(JSON.stringify({ error: 'Invalid payload' }), { status: 400 })
  }

  const supabase = createSupabaseServerClient()
  // Invoke Supabase Edge Function by name
  const { data, error } = await supabase.functions.invoke('embed-file', {
    body,
  })

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
  return new Response(JSON.stringify(data ?? { ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } })
}





