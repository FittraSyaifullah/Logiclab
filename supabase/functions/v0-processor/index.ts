import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createClient as createV0Client } from 'https://esm.sh/v0-sdk@0.11.2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface JobPayload {
  jobId: string
  projectId: string
  prompt: string
  title: string
}

// Credit model constants
const CREDIT_COST_V0_SOFTWARE_GENERATION = 10

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
  // Fetch latest balance, then attempt a guarded update
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

  // Log transaction (best-effort)
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
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get job details from the payload (includes userId for authorization)
    const parsed = await req.json() as JobPayload & { userId?: string }
    const { jobId, projectId, prompt, title } = parsed
    const userId = parsed.userId

    if (!jobId || !projectId || !prompt || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required job parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[EDGE] Job details: ${jobId}, ${projectId}, ${title}, user: ${userId}`)

    // Update job status to processing
    await supabase
      .from('jobs')
      .update({
        status: 'processing',
        started_at: new Date().toISOString()
      })
      .eq('id', jobId)

    console.log(`[EDGE] Job status updated to processing`)

    // Server-side credit gate (paid_or_unpaid takes precedence)
    try {
      const credits = await getUserCredits(supabase, userId)
      if (!credits) {
        console.error('[EDGE] No user_credits row found')
        await supabase
          .from('jobs')
          .update({ status: 'failed', error: 'INSUFFICIENT_CREDITS: No credits record', finished_at: new Date().toISOString() })
          .eq('id', jobId)
        return new Response(
          JSON.stringify({ error: 'INSUFFICIENT_CREDITS', message: 'No credits record found for user' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (!credits.paid_or_unpaid) {
        if (Number(credits.balance_bigint) < CREDIT_COST_V0_SOFTWARE_GENERATION) {
          console.error('[EDGE] Insufficient credits for v0 generation')
          await supabase
            .from('jobs')
            .update({ status: 'failed', error: 'INSUFFICIENT_CREDITS: Need 10 credits for software generation', finished_at: new Date().toISOString() })
            .eq('id', jobId)
          return new Response(
            JSON.stringify({ error: 'INSUFFICIENT_CREDITS', message: 'You do not have enough credits for software generation (10 required).' }),
            { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }
    } catch (creditGateErr) {
      console.error('[EDGE] Credit gate error', creditGateErr)
      await supabase
        .from('jobs')
        .update({ status: 'failed', error: 'Credit check failed', finished_at: new Date().toISOString() })
        .eq('id', jobId)
      return new Response(
        JSON.stringify({ error: 'CREDIT_CHECK_FAILED', message: 'Could not verify credits' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user's project to verify ownership and get v0_id
    const { data: project } = await supabase
      .from('projects')
      .select('v0_id')
      .eq('id', projectId)
      .eq('owner_id', userId)
      .single()

    if (!project?.v0_id) {
      console.error(`[EDGE] Project not found or missing v0_id: ${projectId}`)
      await supabase
        .from('jobs')
        .update({
          status: 'failed',
          error: 'Project not found or missing v0_id',
          finished_at: new Date().toISOString()
        })
        .eq('id', jobId)
      return new Response(
        JSON.stringify({ error: 'Project not found or missing v0_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[EDGE] Project verified - v0_id: ${project.v0_id}`)

    // Initialize v0 SDK
    const v0ApiKey = Deno.env.get('V0_API_KEY')
    if (!v0ApiKey) {
      console.error('[EDGE] V0_API_KEY not found')
      await supabase
        .from('jobs')
        .update({
          status: 'failed',
          error: 'V0_API_KEY not configured',
          finished_at: new Date().toISOString()
        })
        .eq('id', jobId)
      return new Response(
        JSON.stringify({ error: 'V0_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const v0Client = createV0Client({ apiKey: v0ApiKey })

    console.log(`[EDGE] Starting v0 chat creation for project: ${project.v0_id}`)

    // Create v0 chat asynchronously
    let chatResult
    try {
      chatResult = await v0Client.chats.create({
        projectId: project.v0_id,
        message: prompt,
        async: true, // Don't wait for generation to complete
      })
      console.log(`[EDGE] V0 chat created: ${chatResult.id}`)
    } catch (v0Error) {
      console.error(`[EDGE] V0 chat creation failed:`, v0Error)
      await supabase
        .from('jobs')
        .update({
          status: 'failed',
          error: `V0 chat creation failed: ${v0Error.message}`,
          finished_at: new Date().toISOString()
        })
        .eq('id', jobId)
      return new Response(
        JSON.stringify({ error: 'V0 chat creation failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the completed chat with demo URL
    let demoUrl = chatResult.latestVersion?.demoUrl
    let assistantMessage: string | undefined

    // Poll for completion (up to 10 attempts, 30 seconds each = 5 minutes max)
    const maxAttempts = 10
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`[EDGE] Polling attempt ${attempt}/${maxAttempts}`)

      try {
        const completedChat = await v0Client.chats.getById({ chatId: chatResult.id })
        demoUrl = completedChat.latestVersion?.demoUrl

        if (demoUrl) {
          // Extract assistant message
          const messages = completedChat.messages as Array<{ role?: string; content?: string }> | undefined
          assistantMessage = messages?.find((msg) => msg.role === 'assistant')?.content
          console.log(`[EDGE] Demo URL found: ${demoUrl}`)
          break
        }

        // Wait 30 seconds before next attempt
        if (attempt < maxAttempts) {
          console.log(`[EDGE] No demo URL yet, waiting 30 seconds...`)
          await new Promise(resolve => setTimeout(resolve, 30000))
        }
      } catch (pollError) {
        console.warn(`[EDGE] Poll attempt ${attempt} failed:`, pollError)
      }
    }

    if (!demoUrl) {
      console.error(`[EDGE] Demo URL not available after polling`)
      await supabase
        .from('jobs')
        .update({
          status: 'failed',
          error: 'Demo URL not ready after polling',
          finished_at: new Date().toISOString()
        })
        .eq('id', jobId)
      return new Response(
        JSON.stringify({ error: 'Demo URL not ready after polling' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[EDGE] Creating software record in database`)

    // Create software record
    const { data: software, error: softwareError } = await supabase
      .from('software')
      .insert({
        project_id: projectId,
        title: title,
        demo_url: demoUrl,  // iframe-embeddable demo URL
        url: chatResult.webUrl,  // chat URL for navigation
        software_id: chatResult.id
      })
      .select()
      .single()

    if (softwareError) {
      console.error(`[EDGE] Failed to create software record:`, softwareError)
      await supabase
        .from('jobs')
        .update({
          status: 'failed',
          error: `Failed to save software: ${softwareError.message}`,
          finished_at: new Date().toISOString()
        })
        .eq('id', jobId)
      return new Response(
        JSON.stringify({ error: 'Failed to save software' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[EDGE] Software record created - ID: ${software.id}`)

    // Add the first message to software_messages
    const { error: messageError } = await supabase
      .from('software_messages')
      .insert({
        software_id: software.id,
        role: 'user',
        content: prompt
      })

    if (messageError) {
      console.warn(`[EDGE] Failed to save initial message:`, messageError)
    }

    // Save v0 response message if available
    if (assistantMessage) {
      const { error: v0MessageError } = await supabase
        .from('software_messages')
        .insert({
          software_id: software.id,
          role: 'assistant',
          content: assistantMessage
        })

      if (v0MessageError) {
        console.warn(`[EDGE] Failed to save v0 response message:`, v0MessageError)
      }
    }

    // Update job as completed
    await supabase
      .from('jobs')
      .update({
        status: 'completed',
        result: {
          software: {
            id: software.id,
            title: software.title,
            demoUrl: software.demo_url,
            chatId: software.software_id
          }
        },
        finished_at: new Date().toISOString()
      })
      .eq('id', jobId)

    console.log(`[EDGE] Job completed successfully: ${jobId}`)

    // Post-success debit for unpaid users (do NOT deduct on earlier failures)
    const creditsAfter = await getUserCredits(supabase, userId)
    if (creditsAfter && !creditsAfter.paid_or_unpaid) {
      const debit = await debitCreditsIfUnpaid(
        supabase,
        userId,
        CREDIT_COST_V0_SOFTWARE_GENERATION,
        'v0_software_generation',
        jobId,
      )
      if (!debit.ok) {
        console.warn('[EDGE] Post-success debit failed:', debit.error)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        jobId,
        software: {
          id: software.id,
          title: software.title,
          demoUrl: software.demo_url,
          chatId: software.software_id
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error(`[EDGE] Unexpected error:`, error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
