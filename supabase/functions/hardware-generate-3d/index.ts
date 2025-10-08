import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function openaiChat({ system, prompt, temperature, maxTokens }: { system: string; prompt: string; temperature: number; maxTokens: number }): Promise<string> {
  const apiKey = Deno.env.get('OPENAI_API_KEY')
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured')
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
      temperature,
      max_tokens: maxTokens,
    }),
  })
  if (!resp.ok) {
    const errorText = await resp.text()
    throw new Error(`OpenAI API error: ${resp.status} - ${errorText}`)
  }
  const data = await resp.json()
  const text: string | undefined = data?.choices?.[0]?.message?.content
  if (!text) throw new Error('OpenAI returned empty content')
  return text
}

// Credits
const CREDIT_COST_HARDWARE_REPORT = 10
type SupabaseClient = ReturnType<typeof createClient>
interface UserCreditsRow { user_id: string; balance_bigint: number; paid_or_unpaid: boolean }
async function getProjectOwnerId(supabase: SupabaseClient, projectId: string): Promise<string | null> {
  const { data } = await supabase.from('projects').select('owner_id').eq('id', projectId).single()
  return (data?.owner_id as string | null) ?? null
}
async function getUserCredits(supabase: SupabaseClient, userId: string): Promise<UserCreditsRow | null> {
  const { data } = await supabase.from('user_credits').select('user_id, balance_bigint, paid_or_unpaid').eq('user_id', userId).single()
  return (data as unknown as UserCreditsRow | null) ?? null
}
async function debitIfUnpaid(supabase: SupabaseClient, userId: string, cost: number, reason: string, refId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const credits = await getUserCredits(supabase, userId)
  if (!credits) return { ok: false, error: 'No credits record' }
  if (credits.paid_or_unpaid) return { ok: true }
  if (Number(credits.balance_bigint) < cost) return { ok: false, error: 'Insufficient credits' }
  const newBalance = Number(credits.balance_bigint) - cost
  const { error: updErr } = await supabase.from('user_credits').update({ balance_bigint: newBalance }).eq('user_id', userId)
  if (updErr) return { ok: false, error: updErr.message }
  await supabase.from('credit_transactions').insert({ user_id: userId, change_bigint: -cost, balance_after_bigint: newBalance, type: 'debit', reason, ref_id: refId })
  return { ok: true }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.json() as {
      projectData?: { id: string; description?: string; title?: string }
      reportId?: string
    }

    const projectData = body?.projectData
    const providedReportId = body?.reportId
    if (!projectData) {
      return new Response(JSON.stringify({ error: 'Project data is required' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
    }

    const system = `You are an AI engineer specializing in breaking down hardware projects into 3D printable components.

Your role is to:
1. Analyze the hardware project and identify all structural components that can be 3D printed
2. Break down complex parts into smaller, assemblable pieces that can fit on standard 3D printers
3. Consider print orientation, support requirements, and assembly methods
4. Provide detailed specifications for each printable component
5. Generate separate prompts for 3D model generation for each component

For complex appliances like washing machines, dishwashers, or large devices:
- Break down into functional modules (motor housing, control panel, drum components, etc.)
- Create scaled-down functional prototypes rather than full-size replicas
- Focus on demonstrating key mechanisms and principles
- Provide multiple size options (prototype scale vs functional scale)

Return ONLY a single valid JSON object using double quotes, with exactly these keys at the top level and no others:
- project: string
- description: string
- components: array of objects, each object must contain ALL of these keys with string values:
  - component
  - description
  - promptFor3DGeneration
  - printSpecifications
  - assemblyNotes
  - printTime
  - material
  - supports
- generalNotes: string

Rules:
- Do not include any markdown, code fences, or explanation text.
- The number of components should match the complexity of the request.
- Design for standard 3D printer bed sizes (≈200x200mm) and minimize supports.
- Focus on modular, printable parts that can be assembled by the user.`

    const prompt = `Project context:
${projectData?.description || ''}

Generate the JSON now. Output only the JSON object.`

    // Credit gate (charge project owner)
    const ownerId = await getProjectOwnerId(supabase, projectData.id)
    if (!ownerId) {
      return new Response(JSON.stringify({ error: 'Project owner not found' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
    }
    const preCredits = await getUserCredits(supabase, ownerId)
    if (!preCredits) {
      return new Response(JSON.stringify({ error: 'INSUFFICIENT_CREDITS', message: 'No credits record found for user' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 402 })
    }
    if (!preCredits.paid_or_unpaid && Number(preCredits.balance_bigint) < CREDIT_COST_HARDWARE_REPORT) {
      return new Response(JSON.stringify({ error: 'INSUFFICIENT_CREDITS', message: 'You do not have enough credits (10 required).' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 402 })
    }

    const text = await openaiChat({ system, prompt, temperature: 0.7, maxTokens: 2000 })

    const raw = (text || '').trim()
    const start = raw.indexOf('{')
    const end = raw.lastIndexOf('}')
    if (start === -1 || end === -1 || end <= start) {
      return new Response(JSON.stringify({ error: 'Model did not return valid JSON object.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 422 })
    }
    let parsed: unknown
    try {
      parsed = JSON.parse(raw.slice(start, end + 1))
    } catch {
      return new Response(JSON.stringify({ error: 'JSON parse failed: Invalid JSON returned by model.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 422 })
    }

    // Minimal validation
    const obj = parsed as { project?: unknown; description?: unknown; components?: unknown; generalNotes?: unknown }
    if (typeof obj?.project !== 'string' || typeof obj?.description !== 'string' || typeof obj?.generalNotes !== 'string' || !Array.isArray(obj?.components)) {
      return new Response(JSON.stringify({ error: 'Invalid JSON shape returned by model.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 422 })
    }

    // Store/update in hardware_projects
    let reportData: { id: string } | null = null
    if (providedReportId) {
      const result = await supabase.from('hardware_projects').update({ '3d_components': parsed }).eq('id', providedReportId).select().single()
      if (result.error) throw new Error(result.error.message)
      reportData = result.data as { id: string }
    } else {
      // Try update latest by project first
      const { data: existingReport } = await supabase.from('hardware_projects').select('id').eq('project_id', projectData.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
      if (existingReport?.id) {
        const upd = await supabase.from('hardware_projects').update({ '3d_components': parsed }).eq('id', existingReport.id).select().single()
        if (upd.error) throw new Error(upd.error.message)
        reportData = upd.data as { id: string }
      } else {
        const insert = await supabase.from('hardware_projects').insert({ project_id: projectData.id, title: projectData.title || (obj.project as string) || 'Hardware Project', '3d_components': parsed }).select().single()
        if (insert.error) throw new Error(insert.error.message)
        reportData = insert.data as { id: string }
      }
    }

    // Post-success debit if unpaid
    const debit = await debitIfUnpaid(supabase, ownerId, CREDIT_COST_HARDWARE_REPORT, 'hardware_report_3d_components', reportData!.id)
    if (!debit.ok) {
      // Log but do not fail the generation response
      console.warn('[EDGE-3D] Post-success debit failed:', debit.error)
    }

    return new Response(JSON.stringify({ reportId: reportData?.id, data: parsed }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 })
  }
})


