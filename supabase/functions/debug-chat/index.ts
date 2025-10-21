import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type SupabaseClient = ReturnType<typeof createClient>;

interface SendBody {
  userId: string;
  message: string;
  systemPrompt: string;
  topK?: number;
}

interface DebugMessageRow {
  id: string;
  user_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const openaiKey = Deno.env.get('OPENAI_API_KEY') ?? '';

  if (!supabaseUrl || !supabaseServiceKey || !openaiKey) {
    return new Response(JSON.stringify({ error: 'Server env not configured' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }

  let body: SendBody | null = null;
  try { body = await req.json() as SendBody } catch { /* noop */ }
  if (!body || !body.userId || !body.message || !body.systemPrompt) {
    return new Response(JSON.stringify({ error: 'Missing fields' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
  }

  const userId = body.userId;
  const userMessage = body.message;
  const systemPrompt = body.systemPrompt;
  const topK = Math.max(1, Math.min(50, Number(body.topK ?? 10)));

  const supabase: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Insert user message first
    await supabase.from('debug_messages').insert({ user_id: userId, role: 'user', content: userMessage });

    // Fetch recent history (ordered)
    const { data: history } = await supabase
      .from('debug_messages')
      .select('role, content, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(50);

    // Compute embedding for retrieval
    const embedResp = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'text-embedding-3-small', input: userMessage })
    });
    if (!embedResp.ok) {
      const t = await embedResp.text();
      throw new Error(`Embedding failed: ${t}`);
    }
    const embedJson = await embedResp.json() as { data?: Array<{ embedding: number[] }> };
    const queryEmbedding = embedJson.data?.[0]?.embedding ?? [] as number[];

    // Retrieve top-k chunks
    const { data: matches, error: matchErr } = await supabase.rpc('match_user_file_chunks', {
      p_user_id: userId,
      p_embedding: queryEmbedding,
      p_limit: topK,
    });
    if (matchErr) {
      console.warn('[EDGE:debug-chat] match rpc error', matchErr);
    }

    const contextText = (matches ?? []).map((m: { content_text: string }, i: number) => `[#${i+1}] ${m.content_text}`).join('\n');
    const historyText = (history ?? []).map((m: { role: string; content: string }) => `${m.role.toUpperCase()}: ${m.content}`).join('\n');

    // Call GPT-4o via responses API
    const resp = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o',
        temperature: 0.2,
        max_output_tokens: 2000,
        instructions: systemPrompt,
        input: `Prior chat history (ordered):\n${historyText}\n\nUser message:\n${userMessage}\n\nTop relevant context from user files:\n${contextText}`,
      })
    });
    if (!resp.ok) {
      const t = await resp.text();
      throw new Error(`OpenAI error: ${t}`);
    }
    const data = await resp.json();
    const assistantText: string | undefined = data?.output?.[0]?.content?.[0]?.text || data?.output_text;
    const finalText = assistantText ?? 'No response.';

    // Insert assistant message as 'system' per acceptance criteria
    await supabase.from('debug_messages').insert({ user_id: userId, role: 'system', content: finalText });

    return new Response(JSON.stringify({ content: finalText }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
  } catch (err) {
    console.error('[EDGE:debug-chat] error', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
  }
});




