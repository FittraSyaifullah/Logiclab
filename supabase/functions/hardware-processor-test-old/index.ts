import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
// Robustly extract a JSON object from LLM text that may include code fences,
// escaped JSON, or extra prose around the payload.
function extractJson(text) {
  const trimmed = text.trim();
  // 1) Strip code fences ```json ... ``` or ``` ... ```
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
  const fenced = fenceMatch ? fenceMatch[1].trim() : trimmed;
  // 2) Try raw parse first
  try {
    JSON.parse(fenced);
    return fenced;
  } catch  {}
  // 3) Attempt to unescape quote-escaped JSON
  const looksEscaped = /\\\"|\\\\n/.test(fenced);
  if (looksEscaped) {
    try {
      const unescaped = fenced.replace(/^"([\s\S]*)"$/s, '$1').replace(/\\\"/g, '"').replace(/\\\\/g, '\\').replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t');
      JSON.parse(unescaped);
      return unescaped;
    } catch  {}
  }
  // 4) Balanced brace scan for first valid object
  const start = fenced.indexOf('{');
  if (start !== -1) {
    let depth = 0;
    for(let i = start; i < fenced.length; i++){
      const ch = fenced[i];
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) {
          const candidate = fenced.slice(start, i + 1);
          try {
            JSON.parse(candidate);
            return candidate;
          } catch  {}
        }
      }
    }
  }
  return null;
}
// Credit model constants
const CREDIT_COST_HARDWARE_MODEL_COMPONENT = 10;
async function getUserCredits(supabase, userId) {
  const { data } = await supabase.from('user_credits').select('user_id, balance_bigint').eq('user_id', userId).single();
  return data ?? null;
}
serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const { data: jobs, error: jobsError } = await supabaseClient.from('jobs').select('*').eq('status', 'pending').eq('kind', 'hardware-model-component').order('created_at', {
      ascending: true
    }).limit(5);
    if (jobsError) {
      console.error('Error fetching jobs:', jobsError);
      return new Response(JSON.stringify({
        error: jobsError.message
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      });
    }
    if (!jobs || jobs.length === 0) {
      return new Response(JSON.stringify({
        message: 'No pending jobs'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 200
      });
    }
    for (const job of jobs){
      try {
        await supabaseClient.from('jobs').update({
          status: 'processing',
          started_at: new Date().toISOString()
        }).eq('id', job.id);
        const payload = job.input ?? {};
        const { componentName, prompt, projectId, userId, creationId, componentId } = payload;
        if (!componentName || !prompt || !projectId || !userId || !creationId || !componentId) {
          throw new Error('Missing component metadata');
        }
        // Server-side credit gate (10 credits required)
        try {
          const credits = await getUserCredits(supabaseClient, userId);
          if (!credits) throw new Error('INSUFFICIENT_CREDITS: No credits record');
          if (Number(credits.balance_bigint) < CREDIT_COST_HARDWARE_MODEL_COMPONENT) {
            throw new Error('INSUFFICIENT_CREDITS: Need 10 credits for 3D model generation');
          }
        } catch (gateErr) {
          const message = gateErr instanceof Error ? gateErr.message : 'INSUFFICIENT_CREDITS';
          console.error(`Credit gate failed for job ${job.id}:`, message);
          await supabaseClient.from('jobs').update({
            status: 'failed',
            error: message,
            finished_at: new Date().toISOString()
          }).eq('id', job.id);
          continue;
        }
        const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY') ?? '';
        if (!anthropicKey) {
          throw new Error('ANTHROPIC_API_KEY not configured');
        }
        const systemPrompt = `You are LogicLab, an AI CAD generator that produces parametric OpenSCAD code. You must:
- Return JSON with keys "scad" (OpenSCAD code) and optionally "parameters" (array)
- Return a single JSON object with no code fences and no string escaping
- Declare adjustable parameters at the top of the SCAD
- Do NOT include any STL data; we will generate STL ourselves from the SCAD later`;
        const userPrompt = `Component name: ${componentName}
Project specification:
${prompt}

Return JSON only with keys: { "scad": string, "parameters"?: Array<{ name: string; value: number; unit?: string; metadata?: Record<string, unknown> }> }.
Do not include code fences or extra prose. Do not include any STL.`;
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': anthropicKey,
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 4000,
            system: systemPrompt,
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: userPrompt
                  }
                ]
              }
            ]
          })
        });
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Anthropic API error response:', errorText);
          throw new Error(`Anthropic API error ${response.status}`);
        }
        const payloadJson = await response.json();
        const contentBlocks = Array.isArray(payloadJson?.content) ? payloadJson.content : [];
        const textBlock = contentBlocks.find((block)=>block?.type === 'text');
        const text = typeof textBlock?.text === 'string' ? textBlock.text : undefined;
        if (!text) {
          throw new Error('Anthropic response missing JSON payload');
        }
        let parsed;
        try {
          parsed = JSON.parse(text);
        } catch (err) {
          console.error('Failed to parse Anthropic response JSON', err, text);
          const extracted = extractJson(text);
          if (!extracted) {
            throw new Error('Failed to parse Anthropic JSON response');
          }
          try {
            parsed = JSON.parse(extracted);
          } catch (nestedErr) {
            console.error('Failed to parse extracted JSON', nestedErr);
            throw new Error('Failed to parse Anthropic JSON response');
          }
        }
        const scadCode = parsed?.scad;
        const parameters = parsed?.parameters;
        if (!scadCode) {
          throw new Error('Anthropic response missing SCAD content');
        }
        // Deduct credits BEFORE persisting results to prevent free writes on race
        const { data: deducted, error: rpcError } = await supabaseClient.rpc('spend_credits', { user_id: userId, cost: CREDIT_COST_HARDWARE_MODEL_COMPONENT });
        if (rpcError || deducted !== true) {
          await supabaseClient.from('jobs').update({
            status: 'failed',
            error: 'INSUFFICIENT_CREDITS',
            finished_at: new Date().toISOString()
          }).eq('id', job.id);
          continue;
        }
        await supabaseClient.from('jobs').update({
          status: 'completed',
          result: {
            componentId,
            componentName,
            creationId,
            scadCode,
            parameters
          },
          finished_at: new Date().toISOString()
        }).eq('id', job.id);
        await supabaseClient.from('hardware_models').upsert({
          project_id: projectId,
          component_id: componentId,
          component_name: componentName,
          creation_id: creationId,
          job_id: job.id,
          scad_code: scadCode,
          parameters,
          scad_mime: 'application/x-openscad',
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'component_id'
        });
      } catch (jobError) {
        console.error(`Error processing hardware job ${job.id}`, jobError);
        await supabaseClient.from('jobs').update({
          status: 'failed',
          error: jobError instanceof Error ? jobError.message : 'Unknown error',
          finished_at: new Date().toISOString()
        }).eq('id', job.id);
      }
    }
    return new Response(JSON.stringify({
      message: `Processed ${jobs.length} hardware jobs`
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});
