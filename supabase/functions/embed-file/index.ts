import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type SupabaseClient = ReturnType<typeof createClient>;

type FileType = 'document' | 'model' | 'image';

interface EmbedFileRequestBody {
  userId: string;
  file: {
    id: string;
    path: string;
    bucket: string;
    fileType: FileType;
    mimeType?: string;
  };
  textChunks: string[];
}

interface FileRow {
  id: string;
  user_id: string;
  status: string;
  error: string | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const openaiKey = Deno.env.get('OPENAI_API_KEY') ?? '';

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(JSON.stringify({ error: 'Supabase environment not configured' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }

  if (!openaiKey) {
    return new Response(JSON.stringify({ error: 'OPENAI_API_KEY not configured' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }

  let body: EmbedFileRequestBody | null = null;
  try {
    body = await req.json() as EmbedFileRequestBody;
  } catch (_e) {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }

  const userId = body?.userId;
  const file = body?.file;
  const textChunks = Array.isArray(body?.textChunks) ? body!.textChunks : [];

  if (!userId || !file?.id || !file?.path || !file?.bucket || !file?.fileType) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }

  if (textChunks.length === 0) {
    return new Response(JSON.stringify({ error: 'No text chunks provided' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }

  const supabase: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Ownership check: file belongs to user
    const { data: fileRow, error: fileErr } = await supabase
      .from('files')
      .select('id, user_id, status, error')
      .eq('id', file.id)
      .single();

    if (fileErr || !fileRow) {
      return new Response(JSON.stringify({ error: 'File not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    if (fileRow.user_id !== userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    // Update status to processing
    await supabase
      .from('files')
      .update({ status: 'processing', updated_at: new Date().toISOString(), error: null })
      .eq('id', file.id);

    // Batch embeddings: OpenAI allows batching inputs, keep batches <= 100
    const BATCH_SIZE = 100;
    const chunks = textChunks.map((t) => typeof t === 'string' ? t : String(t));

    let totalInserted = 0;
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);

      const resp = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: batch,
        }),
      });

      if (!resp.ok) {
        const txt = await resp.text();
        await supabase
          .from('files')
          .update({ status: 'failed', error: `OpenAI error ${resp.status}`, updated_at: new Date().toISOString() })
          .eq('id', file.id);
        return new Response(JSON.stringify({ error: 'Embedding request failed', details: txt }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 502,
        });
      }

      const json = await resp.json() as { data?: Array<{ embedding: number[] }>; };
      const vectors = (json.data ?? []).map((d) => d.embedding);
      if (vectors.length !== batch.length) {
        await supabase
          .from('files')
          .update({ status: 'failed', error: 'Embedding length mismatch', updated_at: new Date().toISOString() })
          .eq('id', file.id);
        return new Response(JSON.stringify({ error: 'Embedding length mismatch' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        });
      }

      const rows = vectors.map((embedding, offset) => ({
        user_id: userId,
        file_id: file.id,
        file_type: file.fileType,
        chunk_index: i + offset,
        content_text: batch[offset],
        embedding, // supabase-js v2 will serialize to pgvector
      }));

      const { error: insertErr } = await supabase
        .from('file_embeddings')
        .insert(rows);

      if (insertErr) {
        await supabase
          .from('files')
          .update({ status: 'failed', error: insertErr.message, updated_at: new Date().toISOString() })
          .eq('id', file.id);
        return new Response(JSON.stringify({ error: 'DB insert failed', details: insertErr.message }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        });
      }

      totalInserted += rows.length;
    }

    await supabase
      .from('files')
      .update({ status: 'processed', updated_at: new Date().toISOString() })
      .eq('id', file.id);

    return new Response(JSON.stringify({ ok: true, inserted: totalInserted }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    try {
      await createClient(supabaseUrl, supabaseServiceKey)
        .from('files')
        .update({ status: 'failed', error: message, updated_at: new Date().toISOString() })
        .eq('id', body?.file?.id ?? '');
    } catch (_updateErr) {
      // best effort
    }
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});



