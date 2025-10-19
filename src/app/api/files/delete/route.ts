import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as { userId?: string; fileId?: string } | null
  const userId = body?.userId
  const fileId = body?.fileId

  if (!userId || !fileId) {
    return new Response(JSON.stringify({ error: 'userId and fileId are required' }), { status: 400 })
  }

  const supabase = createSupabaseServerClient()

  // 1) Load file row and verify ownership
  const { data: fileRow, error: fileErr } = await supabase
    .from('files')
    .select('id,user_id,bucket,path')
    .eq('id', fileId)
    .single()

  if (fileErr || !fileRow) {
    return new Response(JSON.stringify({ error: 'File not found' }), { status: 404 })
  }
  if (fileRow.user_id !== userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 })
  }

  // 2) Delete storage object (best-effort, but we surface errors)
  const { error: storageErr } = await supabase.storage
    .from(fileRow.bucket)
    .remove([fileRow.path])

  if (storageErr) {
    return new Response(JSON.stringify({ error: `Storage delete failed: ${storageErr.message}` }), { status: 500 })
  }

  // 3) Delete embeddings for this file
  const { error: embedErr } = await supabase
    .from('file_embeddings')
    .delete()
    .eq('file_id', fileId)
    .eq('user_id', userId)

  if (embedErr) {
    return new Response(JSON.stringify({ error: `Embeddings delete failed: ${embedErr.message}` }), { status: 500 })
  }

  // 4) Delete file row
  const { error: fileDelErr } = await supabase
    .from('files')
    .delete()
    .eq('id', fileId)
    .eq('user_id', userId)

  if (fileDelErr) {
    return new Response(JSON.stringify({ error: `File record delete failed: ${fileDelErr.message}` }), { status: 500 })
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } })
}



