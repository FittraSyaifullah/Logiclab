import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as { bucket?: string; path?: string; expiresIn?: number } | null
  const bucket = body?.bucket ?? 'user_files'
  const path = body?.path
  const expiresIn = body?.expiresIn ?? 60

  if (!path) {
    return new Response(JSON.stringify({ error: 'path is required' }), { status: 400 })
  }

  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn)
  if (error || !data) {
    return new Response(JSON.stringify({ error: error?.message ?? 'Failed to create signed URL' }), { status: 500 })
  }

  return new Response(JSON.stringify({ url: data.signedUrl }), { status: 200, headers: { 'Content-Type': 'application/json' } })
}



