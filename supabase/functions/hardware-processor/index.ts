import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
        const { componentName, prompt, projectId, userId, creationId, componentId } = payload

        if (!componentName || !prompt || !projectId || !userId || !creationId || !componentId) {
          throw new Error('Missing component metadata')
        }

        const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY') ?? ''
        if (!anthropicKey) {
          throw new Error('ANTHROPIC_API_KEY not configured')
        }

        const systemPrompt = `You are LogicLab, an AI CAD generator that produces parametric OpenSCAD code and printable STL meshes. You must:
- Return JSON with keys "stl" (base64 encoded STL), "scad" (OpenSCAD code) and optionally "parameters" (array)
- Ensure the STL is watertight and oriented upright with center at origin
- Declare adjustable parameters at the top of the SCAD
- The STL must be encoded as standard binary STL, base64 encoded
- For the STL, generate a simple geometric shape that represents the component (cube, cylinder, sphere, etc.) and encode it as base64`

        const userPrompt = `Component name: ${componentName}
Project specification:
${prompt}

Return JSON only with the STL encoded as base64 and the SCAD source code.`

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
        const contentBlocks = Array.isArray(payloadJson?.content) ? payloadJson.content : []
        const textBlock = contentBlocks.find((block: any) => block?.type === 'text')
        const text = typeof textBlock?.text === 'string' ? textBlock.text : undefined

        if (!text) {
          throw new Error('Anthropic response missing JSON payload')
        }

        let parsed
        try {
          parsed = JSON.parse(text)
        } catch (err) {
          console.error('Failed to parse Anthropic response JSON', err, text)
          // Attempt to extract the first JSON object from the response
          const jsonMatch = text.match(/\{[\s\S]*\}/)
          if (jsonMatch && jsonMatch[0]) {
            try {
              parsed = JSON.parse(jsonMatch[0])
            } catch (nestedErr) {
              console.error('Failed to parse extracted JSON', nestedErr)
              throw new Error('Failed to parse Anthropic JSON response')
            }
          } else {
            throw new Error('Failed to parse Anthropic JSON response')
          }
        }

        const stlBase64 = parsed?.stl
        const scadCode = parsed?.scad
        const parameters = parsed?.parameters

        if (!stlBase64 || !scadCode) {
          throw new Error('Anthropic response missing STL or SCAD content')
        }

        await supabaseClient
          .from('jobs')
          .update({
            status: 'completed',
            result: {
              componentId,
              componentName,
              creationId,
              stlBase64,
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
            stl_base64: stlBase64,
            scad_code: scadCode,
            parameters,
            stl_mime: 'model/stl',
            scad_mime: 'application/x-openscad',
            updated_at: new Date().toISOString(),
          }, { onConflict: 'component_id' })
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
