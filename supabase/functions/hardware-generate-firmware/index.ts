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
async function getProjectOwnerId(supabase: SupabaseClient, projectId: string): Promise<string | null> {
  const { data } = await supabase.from('projects').select('owner_id').eq('id', projectId).single()
  return (data?.owner_id as string | null) ?? null
}
interface UserCreditsRow { user_id: string; balance_bigint: number; paid_or_unpaid: boolean }
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
      projectData?: { id: string; description?: string; microcontroller?: string; title?: string }
      reportId?: string
    }

    const projectData = body?.projectData
    const providedReportId = body?.reportId
    if (!projectData) {
      return new Response(JSON.stringify({ error: 'Project data is required' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
    }

    const microcontroller = projectData.microcontroller || 'arduino'
    let language = 'C++'
    let platform = 'Arduino IDE'
    if (microcontroller.toLowerCase().includes('raspberry')) {
      language = 'Python'
      platform = 'Raspberry Pi'
    } else if (microcontroller.toLowerCase().includes('esp')) {
      language = 'C++'
      platform = 'Arduino IDE / PlatformIO'
    }

    const system = `You are an AI engineer providing firmware code for hardware projects.

Your role is to:
1. Generate complete, working code for the specified microcontroller
2. Include detailed comments explaining each section
3. Specify the programming language and development environment
4. Provide setup instructions and library requirements
5. Include error handling and safety features
6. Explain specific functions and their purposes

Always specify the programming language at the top of your response. Different microcontrollers use different languages:
- Arduino/ESP32/ESP8266: C++ (Arduino IDE)
- Raspberry Pi: Python
- STM32: C/C++
- PIC: C

Focus on clean, well-documented code that beginners can understand and modify.`

    const prompt = `Project: ${projectData.description}
Microcontroller: ${microcontroller}

Generate complete firmware code for this hardware project.`

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

    // Store/update in hardware_projects
    let reportData: { id: string } | null = null
    if (providedReportId) {
      const upd = await supabase.from('hardware_projects').update({ firmware_code: { content: text, language, platform, libraries: ['Servo.h', 'NewPing.h'], codeLines: 85 } }).eq('id', providedReportId).select().single()
      if (upd.error) throw new Error(upd.error.message)
      reportData = upd.data as { id: string }
    } else {
      const { data: existingReport } = await supabase.from('hardware_projects').select('id').eq('project_id', projectData.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
      if (existingReport?.id) {
        const upd = await supabase.from('hardware_projects').update({ firmware_code: { content: text, language, platform, libraries: ['Servo.h', 'NewPing.h'], codeLines: 85 } }).eq('id', existingReport.id).select().single()
        if (upd.error) throw new Error(upd.error.message)
        reportData = upd.data as { id: string }
      } else {
        const insert = await supabase.from('hardware_projects').insert({ project_id: projectData.id, title: projectData.title || 'Hardware Project', firmware_code: { content: text, language, platform, libraries: ['Servo.h', 'NewPing.h'], codeLines: 85 } }).select().single()
        if (insert.error) throw new Error(insert.error.message)
        reportData = insert.data as { id: string }
      }
    }

    // Post-success debit if unpaid
    const debit = await debitIfUnpaid(supabase, ownerId, CREDIT_COST_HARDWARE_REPORT, 'hardware_report_firmware_code', reportData!.id)
    if (!debit.ok) {
      console.warn('[EDGE-FW] Post-success debit failed:', debit.error)
    }

    return new Response(JSON.stringify({ reportId: reportData?.id, content: text, language, platform }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 })
  }
})


