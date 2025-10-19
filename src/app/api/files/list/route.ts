import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

type FileRow = {
  id: string
  user_id: string
  bucket: string
  path: string
  file_type: 'document' | 'model' | 'image'
  mime_type: string | null
  original_name: string | null
  size_bytes: number | null
  status: string
  error: string | null
  created_at: string
}

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) {
    return new Response(JSON.stringify({ error: 'userId required' }), { status: 400 })
  }

  const supabase = createSupabaseServerClient()

  const { data, error } = await supabase
    .from('files')
    .select('id,user_id,bucket,path,file_type,mime_type,original_name,size_bytes,status,error,created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  const files = (data ?? []) as FileRow[]
  return new Response(JSON.stringify({ files }), { status: 200, headers: { 'Content-Type': 'application/json' } })
}


