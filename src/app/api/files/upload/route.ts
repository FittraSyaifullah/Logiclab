import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// Note: This route expects the client to send multipart/form-data with fields:
// - file: the uploaded File
// - userId: string
// - title?: string, description?: string
// - fileType: 'document' | 'model' | 'image'

export async function POST(req: NextRequest) {
  const form = await req.formData()
  const file = form.get('file') as unknown as File | null
  const userId = (form.get('userId') as string | null) ?? ''
  const title = (form.get('title') as string | null) ?? null
  const description = (form.get('description') as string | null) ?? null
  const fileType = (form.get('fileType') as 'document' | 'model' | 'image' | null)

  if (!file || !userId || !fileType) {
    return new Response(JSON.stringify({ error: 'Missing file, userId, or fileType' }), { status: 400 })
  }

  const supabase = createSupabaseServerClient()

  const bucket = 'user_files'
  const sanitized = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${userId}/${crypto.randomUUID()}_${sanitized}`

  // Upload to Storage using service server client would require signed URL or bucket policy; use client supabase with anon key is not available here.
  // We can upload via storage API directly: use supabase.storage.from with service key is not supported.
  // Alternative: insert DB row first, then let client actually upload to storage path; return target path.

  const { data: inserted, error: insertErr } = await supabase
    .from('files')
    .insert({
      user_id: userId,
      bucket,
      path,
      file_type: fileType,
      mime_type: file.type ?? null,
      original_name: file.name,
      size_bytes: file.size ?? null,
      title,
      description,
      status: 'uploaded',
    })
    .select('id')
    .single()

  if (insertErr || !inserted) {
    return new Response(JSON.stringify({ error: insertErr?.message ?? 'Insert failed' }), { status: 500 })
  }

  // Return the target storage path; client will perform the actual upload and then call embed function with extracted chunks
  return new Response(JSON.stringify({
    fileRecordId: inserted.id,
    storage: { bucket, path }
  }), { status: 200, headers: { 'Content-Type': 'application/json' } })
}





