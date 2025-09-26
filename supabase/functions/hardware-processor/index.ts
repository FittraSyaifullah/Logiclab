import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get all pending hardware jobs
    const { data: jobs, error: jobsError } = await supabaseClient
      .from('jobs')
      .select('*')
      .eq('status', 'pending')
      .eq('kind', '3d-components')
      .or('kind.eq.assembly-parts,kind.eq.firmware-code')

    if (jobsError) {
      console.error('Error fetching jobs:', jobsError)
      return new Response(JSON.stringify({ error: jobsError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    if (!jobs || jobs.length === 0) {
      console.log('No pending hardware jobs found')
      return new Response(JSON.stringify({ message: 'No pending jobs' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    console.log(`Processing ${jobs.length} hardware jobs`)

    // Process each job
    for (const job of jobs) {
      try {
        console.log(`Processing job ${job.id} of kind ${job.kind}`)

        // Update job status to processing
        await supabaseClient
          .from('jobs')
          .update({
            status: 'processing',
            started_at: new Date().toISOString()
          })
          .eq('id', job.id)

        let result: any = null
        let error: string | null = null

        try {
          // Call the appropriate generation endpoint based on job kind
          const endpoint = `http://localhost:3000/api/hardware/generate-${job.kind}`

          const generationResponse = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectData: job.input?.projectData,
              jobId: job.id
            }),
          })

          if (generationResponse.ok) {
            result = await generationResponse.json()
            console.log(`Successfully generated ${job.kind} for job ${job.id}`)
          } else {
            const errorData = await generationResponse.text()
            error = `Generation failed: ${errorData}`
            console.error(`Failed to generate ${job.kind} for job ${job.id}:`, errorData)
          }
        } catch (generationError: any) {
          error = `Generation error: ${generationError.message}`
          console.error(`Error during ${job.kind} generation for job ${job.id}:`, generationError)
        }

        // Update job with final status
        await supabaseClient
          .from('jobs')
          .update({
            status: error ? 'failed' : 'completed',
            result: result,
            error: error,
            finished_at: new Date().toISOString()
          })
          .eq('id', job.id)

        console.log(`Completed job ${job.id} with status: ${error ? 'failed' : 'completed'}`)

      } catch (jobError: any) {
        console.error(`Error processing job ${job.id}:`, jobError)

        // Update job as failed
        await supabaseClient
          .from('jobs')
          .update({
            status: 'failed',
            error: jobError.message,
            finished_at: new Date().toISOString()
          })
          .eq('id', job.id)
      }
    }

    return new Response(JSON.stringify({
      message: `Processed ${jobs.length} hardware jobs`,
      processedJobs: jobs.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    console.error('Edge function error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
