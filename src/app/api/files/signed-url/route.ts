import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// Creates a signed URL for direct client upload when needed
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as { bucket?: string; path?: string } | null
  const bucket = body?.bucket ?? 'user_files'
  const path = body?.path

  if (!path) {
    return new Response(JSON.stringify({ error: 'path is required' }), { status: 400 })
  }

  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(path)
  if (error || !data) {
    return new Response(JSON.stringify({ error: error?.message ?? 'Failed to create signed URL' }), { status: 500 })
  }

  return new Response(JSON.stringify({ signedUrl: data.signedUrl, token: data.token }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}





