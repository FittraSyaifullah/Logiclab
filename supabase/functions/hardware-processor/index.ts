import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Robustly extract a JSON object from LLM text that may include code fences,
// escaped JSON, or extra prose around the payload.
function extractJson(text: string): string | null {
  const trimmed = text.trim()

  // 1) Strip code fences ```json ... ``` or ``` ... ```
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/i)
  const fenced = fenceMatch ? fenceMatch[1].trim() : trimmed

  // 2) Try raw parse first
  try {
    JSON.parse(fenced)
    return fenced
  } catch {}

  // 3) Attempt to unescape quote-escaped JSON
  const looksEscaped = /\\\"|\\\\n/.test(fenced)
  if (looksEscaped) {
    try {
      const unescaped = fenced
        .replace(/^"([\s\S]*)"$/s, '$1')
        .replace(/\\\"/g, '"')
        .replace(/\\\\/g, '\\')
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
      JSON.parse(unescaped)
      return unescaped
    } catch {}
  }

  // 4) Balanced brace scan for first valid object
  const start = fenced.indexOf('{')
  if (start !== -1) {
    let depth = 0
    for (let i = start; i < fenced.length; i++) {
      const ch = fenced[i]
      if (ch === '{') depth++
      else if (ch === '}') {
        depth--
        if (depth === 0) {
          const candidate = fenced.slice(start, i + 1)
          try {
            JSON.parse(candidate)
            return candidate
          } catch {}
        }
      }
    }
  }

  return null
}

// Credit model constants
const CREDIT_COST_HARDWARE_MODEL_COMPONENT = 10

type SupabaseClient = ReturnType<typeof createClient>

interface UserCreditsRow {
  user_id: string
  balance_bigint: number
  reserved_bigint?: number
  paid_or_unpaid: boolean
}

async function getUserCredits(supabase: SupabaseClient, userId: string): Promise<UserCreditsRow | null> {
  const { data } = await supabase
    .from('user_credits')
    .select('user_id, balance_bigint, reserved_bigint, paid_or_unpaid')
    .eq('user_id', userId)
    .single()
  return (data as unknown as UserCreditsRow | null) ?? null
}

async function debitCreditsIfUnpaid(
  supabase: SupabaseClient,
  userId: string,
  cost: number,
  reason: string,
  refId: string,
): Promise<{ ok: true; balanceAfter: number } | { ok: false; error: string }> {
  const current = await getUserCredits(supabase, userId)
  if (!current) return { ok: false, error: 'User credits not found' }
  if (current.paid_or_unpaid) {
    return { ok: true, balanceAfter: current.balance_bigint }
  }
  if (Number(current.balance_bigint) < cost) {
    return { ok: false, error: 'Insufficient credits' }
  }
  const newBalance = Number(current.balance_bigint) - cost
  const { error: updateError } = await supabase
    .from('user_credits')
    .update({ balance_bigint: newBalance })
    .eq('user_id', userId)
  if (updateError) return { ok: false, error: updateError.message }

  await supabase.from('credit_transactions').insert({
    user_id: userId,
    change_bigint: -cost,
    balance_after_bigint: newBalance,
    type: 'debit',
    reason,
    ref_id: refId,
  })

  return { ok: true, balanceAfter: newBalance }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: jobs, error: jobsError } = await supabaseClient
      .from('jobs')
      .select('*')
      .eq('status', 'pending')
      .eq('kind', 'hardware-model-component')
      .order('created_at', { ascending: true })
      .limit(5)

    if (jobsError) {
      console.error('Error fetching jobs:', jobsError)
      return new Response(JSON.stringify({ error: jobsError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    if (!jobs || jobs.length === 0) {
      return new Response(JSON.stringify({ message: 'No pending jobs' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    for (const job of jobs) {
      try {
        await supabaseClient
          .from('jobs')
          .update({
            status: 'processing',
            started_at: new Date().toISOString(),
          })
          .eq('id', job.id)

        const payload = job.input ?? {}
        const { componentName, prompt, projectId, userId, creationId, componentId } = payload as { componentName?: string; prompt?: string; projectId?: string; userId?: string; creationId?: string; componentId?: string }

        if (!componentName || !prompt || !projectId || !userId || !creationId || !componentId) {
          throw new Error('Missing component metadata')
        }

        // Server-side credit gate (paid_or_unpaid takes precedence)
        try {
          const credits = await getUserCredits(supabaseClient, userId)
          if (!credits) {
            throw new Error('INSUFFICIENT_CREDITS: No credits record')
          }
          if (!credits.paid_or_unpaid && Number(credits.balance_bigint) < CREDIT_COST_HARDWARE_MODEL_COMPONENT) {
            throw new Error('INSUFFICIENT_CREDITS: Need 10 credits for 3D model generation')
          }
        } catch (gateErr) {
          const message = gateErr instanceof Error ? gateErr.message : 'INSUFFICIENT_CREDITS'
          console.error(`Credit gate failed for job ${job.id}:`, message)
          await supabaseClient
            .from('jobs')
            .update({ status: 'failed', error: message, finished_at: new Date().toISOString() })
            .eq('id', job.id)
          // Skip executing the job
          continue
        }

        const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY') ?? ''
        if (!anthropicKey) {
          throw new Error('ANTHROPIC_API_KEY not configured')
        }

        const systemPrompt = `You are LogicLab, an AI CAD generator that produces parametric OpenSCAD code. You must:
- Return JSON with keys "scad" (OpenSCAD code) and optionally "parameters" (array)
- Return a single JSON object with no code fences and no string escaping
- Declare adjustable parameters at the top of the SCAD
- Do NOT include any STL data; we will generate STL ourselves from the SCAD later`

        const userPrompt = `Component name: ${componentName}
Project specification:
${prompt}

Return JSON only with keys: { "scad": string, "parameters"?: Array<{ name: string; value: number; unit?: string; metadata?: Record<string, unknown> }> }.
Do not include code fences or extra prose. Do not include any STL.`

        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': anthropicKey,
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01',
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
                    text: userPrompt,
                  },
                ],
              },
            ],
          }),
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error('Anthropic API error response:', errorText)
          throw new Error(`Anthropic API error ${response.status}`)
        }

        const payloadJson = await response.json()
        const contentBlocks = Array.isArray(payloadJson?.content) ? (payloadJson.content as Array<{ type?: string; text?: string }>) : []
        const textBlock = contentBlocks.find((block) => block?.type === 'text')
        const text = typeof textBlock?.text === 'string' ? textBlock.text : undefined

        if (!text) {
          throw new Error('Anthropic response missing JSON payload')
        }

        let parsed
        try {
          parsed = JSON.parse(text)
        } catch (err) {
          console.error('Failed to parse Anthropic response JSON', err, text)
          const extracted = extractJson(text)
          if (!extracted) {
            throw new Error('Failed to parse Anthropic JSON response')
          }
          try {
            parsed = JSON.parse(extracted)
          } catch (nestedErr) {
            console.error('Failed to parse extracted JSON', nestedErr)
            throw new Error('Failed to parse Anthropic JSON response')
          }
        }

        const scadCode = parsed?.scad
        const parameters = parsed?.parameters

        if (!scadCode) {
          throw new Error('Anthropic response missing SCAD content')
        }

        await supabaseClient
          .from('jobs')
          .update({
            status: 'completed',
            result: {
              componentId,
              componentName,
              creationId,
              scadCode,
              parameters,
            },
            finished_at: new Date().toISOString(),
          })
          .eq('id', job.id)

        await supabaseClient
          .from('hardware_models')
          .upsert({
            project_id: projectId,
            component_id: componentId,
            component_name: componentName,
            creation_id: creationId,
            job_id: job.id,
            scad_code: scadCode,
            parameters,
            scad_mime: 'application/x-openscad',
            updated_at: new Date().toISOString(),
          }, { onConflict: 'component_id' })

        // Post-success debit for unpaid users (do NOT deduct on earlier failures)
        const creditsAfter = await getUserCredits(supabaseClient, userId)
        if (creditsAfter && !creditsAfter.paid_or_unpaid) {
          const debit = await debitCreditsIfUnpaid(
            supabaseClient,
            userId,
            CREDIT_COST_HARDWARE_MODEL_COMPONENT,
            'hardware_model_component',
            job.id,
          )
          if (!debit.ok) {
            console.warn(`[EDGE] Post-success debit failed for job ${job.id}:`, debit.error)
          }
        }

        // Notify Next.js webhook about component model completion
        try {
          const webhookUrl = Deno.env.get('WEBHOOK_URL')
          const webhookSecret = Deno.env.get('HARDWARE_WEBHOOK_SECRET')
          if (webhookUrl && webhookSecret && webhookUrl.startsWith('https://')) {
            const payload = {
              type: 'hardware.model.completed',
              status: 'completed',
              projectId,
              creationId,
              componentId,
              jobId: job.id,
            }
            console.log('[EDGE:hardware-processor] Posting success webhook', { url: webhookUrl, payload })
            const whResp = await fetch(webhookUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Buildables-Webhook-Secret': webhookSecret,
              },
              body: JSON.stringify(payload),
            })
            console.log('[EDGE:hardware-processor] Webhook response (success)', { status: whResp.status })
          } else {
            console.warn('[EDGE:hardware-processor] Skipping webhook: WEBHOOK_URL missing/invalid or secret missing')
          }
        } catch (whErr) {
          console.warn('[EDGE:hardware-processor] Webhook POST failed', whErr)
        }
      } catch (jobError) {
        console.error(`Error processing hardware job ${job.id}`, jobError)
        await supabaseClient
          .from('jobs')
          .update({
            status: 'failed',
            error: jobError instanceof Error ? jobError.message : 'Unknown error',
            finished_at: new Date().toISOString(),
          })
          .eq('id', job.id)

        // Notify webhook about failure
        try {
          const webhookUrl = Deno.env.get('WEBHOOK_URL')
          const webhookSecret = Deno.env.get('HARDWARE_WEBHOOK_SECRET')
          if (webhookUrl && webhookSecret && webhookUrl.startsWith('https://')) {
            const payload = {
              type: 'hardware.model.failed',
              status: 'failed',
              projectId: (job.input as { projectId?: string })?.projectId,
              creationId: (job.input as { creationId?: string })?.creationId,
              componentId: (job.input as { componentId?: string })?.componentId,
              jobId: job.id,
              error: jobError instanceof Error ? jobError.message : 'Unknown error',
            }
            console.log('[EDGE:hardware-processor] Posting failure webhook', { url: webhookUrl, payload })
            const whResp = await fetch(webhookUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Buildables-Webhook-Secret': webhookSecret,
              },
              body: JSON.stringify(payload),
            })
            console.log('[EDGE:hardware-processor] Webhook response (failure)', { status: whResp.status })
          }
        } catch (whErr) {
          console.warn('[EDGE:hardware-processor] Failure webhook POST failed', whErr)
        }
      }
    }

    return new Response(JSON.stringify({ message: `Processed ${jobs.length} hardware jobs` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
