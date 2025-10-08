import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Costs per Token Economy: tabs are 10 credits each
const CREDIT_COST_PER_REPORT = 10

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

type ReportKind = '3d' | 'assembly' | 'firmware'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { kind, projectData, reportId, userId } = await req.json() as {
      kind: ReportKind
      projectData: { id: string; description?: string; title?: string; microcontroller?: string }
      reportId?: string
      userId?: string
    }

    if (!kind || !projectData?.id || !userId) {
      return new Response(JSON.stringify({ error: 'kind, projectData.id, and userId are required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Credit gate
    const credits = await getUserCredits(supabase, userId)
    if (!credits) {
      return new Response(JSON.stringify({ error: 'INSUFFICIENT_CREDITS', message: 'No credits record found for user' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 402,
      })
    }
    if (!credits.paid_or_unpaid && Number(credits.balance_bigint) < CREDIT_COST_PER_REPORT) {
      return new Response(JSON.stringify({ error: 'INSUFFICIENT_CREDITS', message: `You need ${CREDIT_COST_PER_REPORT} credits for ${kind} generation.` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 402,
      })
    }

    // Forward to internal Next.js route to reuse prompt/storage logic (no duplication)
    const baseUrl = Deno.env.get('INTERNAL_APP_URL') || ''
    const endpoints: Record<ReportKind, string> = {
      '3d': '/api/hardware/generate-3d',
      'assembly': '/api/hardware/generate-assembly',
      'firmware': '/api/hardware/generate-firmware',
    }
    const target = `${baseUrl}${endpoints[kind]}`

    const forwardResp = await fetch(target, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectData, reportId }),
    })

    const respText = await forwardResp.text()
    let respJson: unknown
    try {
      respJson = JSON.parse(respText)
    } catch {
      respJson = { error: `Non-JSON response: ${respText.substring(0, 200)}...` }
    }

    if (!forwardResp.ok) {
      return new Response(JSON.stringify(respJson), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: forwardResp.status,
      })
    }

    // Debit credits only after success for unpaid users
    if (!credits.paid_or_unpaid) {
      const reason = kind === '3d' ? 'hardware_report_3d' : kind === 'assembly' ? 'hardware_report_assembly' : 'hardware_report_firmware'
      const ref = (respJson as { reportId?: string })?.reportId || `${projectData.id}:${kind}`
      const debit = await debitCreditsIfUnpaid(supabase, userId, CREDIT_COST_PER_REPORT, reason, ref)
      if (!debit.ok) {
        // We do not fail the response; log and continue
        console.warn('[EDGE hardware-reports] Post-success debit failed:', debit.error)
      }
    }

    return new Response(JSON.stringify(respJson), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('[EDGE hardware-reports] Unexpected error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})


