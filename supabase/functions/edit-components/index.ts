import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type SupabaseClient = ReturnType<typeof createClient>

const SYSTEM_PROMPT = `You are Buildables, an AI co-engineer that helps founders and makers safely prototype hardware products. You assist users by chatting with them and making changes to their components in real time.

You understand that users can see the components in a viewport on the right side of the screen while you make changes.

You also understand that the input JSON I will provide you is the complete context of the hardware project, for your reference.

Your role is to:
1. Analyze the hardware project and identify all structural components that can be 3D printed
2. Break down complex parts into smaller, assemblable pieces that can fit on standard 3D printers
3. Consider print orientation, support requirements, and assembly methods
4. Provide detailed specifications for each printable component
5. Generate separate prompts for 3D model generation for each component

Your goal is to generate designs, parts recommendations, and code in a way that is safe, feasible, and efficient.

Follow these rules strictly:

1. Decision-Making Hierarchy  
   - Always prefer off-the-shelf parts when possible. Only recommend 3D printing when a component is custom, small, or cannot be purchased easily.  
   - For electronic components (boards, sensors, power supplies), always recommend industry-standard options first (Arduino, Raspberry Pi, ESP32, etc.).  
   - Never suggest 3D printing circuit boards or high-stress load-bearing parts.  
   - The number of components should match the complexity of the request.
   - If you find that the parts of the user’s prompts are specific enough, do not bother editing. Focus on specifying those that lack details, especially for model creation.

2. Feasibility & Safety  
   - Every design must pass a basic safety and correctness check: components must be compatible, safe for consumer use, and meet realistic material and thermal tolerances.  
   - Flag any designs that would be unsafe, illegal, or outside Buildables’ scope.

3. Scope Control  
   - Focus on consumer electronics, small appliances, IoT devices, educational kits, and gadget enclosures.

4. Material & Manufacturing Guidance  
   - Recommend specific materials with notes on strength, durability, or heat resistance.  
   - Suggest the best manufacturing route for each part and clearly mark printable vs purchasable parts.  
   - Keep material choices consistent across components and assembly.

5. Output Format  
   - Return JSON strictly matching the provided schema.
`

const COMPONENTS_OUTPUT_EXAMPLE = {
  content: "string",
  project: {
    components: [
      {
        component: "string",
        description: "string",
        promptFor3DGeneration: "string",
        printSpecifications: "string",
        assemblyNotes: "string",
        printTime: "string",
        material: "string",
        supports: "string",
      },
    ],
    generalNotes: "string",
  },
} as const

const exampleToSchema = (value: unknown): Record<string, unknown> => {
  if (typeof value === 'string') return { type: 'string' }
  if (Array.isArray(value)) {
    const first = value.length > 0 ? value[0] : {}
    return { type: 'array', items: exampleToSchema(first) }
  }
  if (value && typeof value === 'object') {
    const props: Record<string, unknown> = {}
    const required: string[] = []
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      props[k] = exampleToSchema(v)
      required.push(k)
    }
    return { type: 'object', properties: props, required, additionalProperties: false }
  }
  return { type: 'string' }
}

const STRICT_SCHEMA = exampleToSchema(COMPONENTS_OUTPUT_EXAMPLE)

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { projectId, userId, hardwareId: passedHardwareId, userMessage, context } = await req.json() as {
      projectId: string
      userId?: string
      hardwareId?: string
      userMessage: string
      context: {
        project?: string
        description?: string
        reports?: Record<string, unknown>
      }
    }
    console.log('[EDGE:edit-components] Request body:', { projectId, userId, passedHardwareId, hasContext: !!context, hasReports: !!context?.reports })

    if (!projectId || !userMessage) {
      return new Response(JSON.stringify({ error: 'Missing projectId or userMessage' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Find or create target hardware report row using three-tier fallback strategy
    let targetHardwareId = passedHardwareId || null
    console.log('[EDGE:edit-components] Initial hardwareId:', targetHardwareId)

    const openaiKey = Deno.env.get('OPENAI_API_KEY') ?? ''
    if (!openaiKey) throw new Error('OPENAI_API_KEY not configured')

    const inputContext = {
      project: context?.project ?? '',
      description: context?.description ?? '',
      reports: context?.reports ?? {},
      userMessage,
    }

    const body = {
      model: 'gpt-4.1',
      temperature: 0.3,
      max_output_tokens: 4000,
      instructions: SYSTEM_PROMPT,
      input: `Context JSON (strictly reference-only):\n${JSON.stringify(inputContext, null, 2)}\n\nReturn JSON strictly following the schema.`,
      text: {
        format: {
          type: 'json_schema',
          name: 'ComponentsOutput',
          schema: STRICT_SCHEMA,
          strict: true,
        },
      },
    }

    const resp = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!resp.ok) {
      const t = await resp.text()
      console.error('[EDGE:edit-components] OpenAI error:', t)
      return new Response(JSON.stringify({ error: `OpenAI error ${resp.status}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    const data = await resp.json()
    const outputText: string | undefined = data?.output?.[0]?.content?.[0]?.text || data?.output_text
    if (!outputText) throw new Error('Structured output missing text payload')

    let parsed: unknown
    try {
      parsed = JSON.parse(outputText)
    } catch (_e) {
      throw new Error('Failed to parse structured JSON output')
    }

    const parsedObj = parsed as {
      content?: string
      project?: {
        components?: Array<{
          component?: string
          description?: string
          promptFor3DGeneration?: string
          printSpecifications?: string
          assemblyNotes?: string
          printTime?: string
          material?: string
          supports?: string
        }>
        generalNotes?: string
      }
    }

    const componentsPayload = parsedObj?.project ?? null
    console.log('[EDGE:edit-components] Parsed components count:', Array.isArray(componentsPayload?.components) ? componentsPayload!.components.length : 0)

    // Create display text for AI chat bubble
    const list = Array.isArray(componentsPayload?.components) ? componentsPayload!.components : []
    const bulletList = list
      .map((c) => `- ${c?.component || 'Component'}: ${c?.description || ''}`)
      .join('\n')
    const aiText = (parsedObj?.content && typeof parsedObj.content === 'string')
      ? parsedObj.content
      : ([
          componentsPayload?.generalNotes ? `Notes: ${componentsPayload?.generalNotes}` : '',
          bulletList,
        ].filter(Boolean).join('\n\n') || 'Updated 3D components.')

    // Three-tier fallback strategy for hardware_projects update
    if (targetHardwareId) {
      // Tier 1: Update existing record
      const { data: updated, error } = await supabase
        .from('hardware_projects')
        .update({ '3d_components': componentsPayload })
        .eq('id', targetHardwareId)
        .select('id')
        .single()
      if (error || !updated) {
        console.error('[EDGE:edit-components] Update hardware_projects failed', error)
        return new Response(JSON.stringify({ error: 'Failed to update components' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        })
      }
      targetHardwareId = updated.id
      console.log('[EDGE:edit-components] Updated existing hardware_projects.3d_components')
    } else {
      // Tier 2: Find latest by project_id
      const { data: existing } = await supabase
        .from('hardware_projects')
        .select('id')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      
      if (existing?.id) {
        const { data: updated, error } = await supabase
          .from('hardware_projects')
          .update({ '3d_components': componentsPayload })
          .eq('id', existing.id)
          .select('id')
          .single()
        if (error || !updated) {
          console.error('[EDGE:edit-components] Update existing hardware_projects failed', error)
          return new Response(JSON.stringify({ error: 'Failed to update components' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          })
        }
        targetHardwareId = updated.id
        console.log('[EDGE:edit-components] Updated latest hardware_projects.3d_components')
      } else {
        // Tier 3: Create new record
        const { data: inserted, error } = await supabase
          .from('hardware_projects')
          .insert({
            project_id: projectId,
            title: context?.project || 'Hardware Project',
            '3d_components': componentsPayload
          })
          .select('id')
          .single()
        if (error || !inserted) {
          console.error('[EDGE:edit-components] Insert hardware_projects failed', error)
          return new Response(JSON.stringify({ error: 'Failed to create components' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          })
        }
        targetHardwareId = inserted.id
        console.log('[EDGE:edit-components] Created new hardware_projects with 3d_components')
      }
    }

    // Insert messages after database update to ensure targetHardwareId is valid
    try {
      if (targetHardwareId) {
        await supabase.from('hardware_messages').insert([
          {
            hardware_id: targetHardwareId,
            role: 'user',
            content: userMessage
          },
          {
            hardware_id: targetHardwareId,
            role: 'assistant',
            content: aiText
          }
        ]);
        console.log('[EDGE:edit-components] Inserted hardware_messages rows with hardware_id:', targetHardwareId)
      } else {
        console.error('[EDGE:edit-components] No valid targetHardwareId for message insertion')
      }
    } catch (msgErr) {
      console.warn('[EDGE:edit-components] hardware_messages insert failed (non-fatal)', msgErr)
    }

    return new Response(
      JSON.stringify({ message: 'Components updated', data: componentsPayload }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    )
  } catch (error) {
    console.error('[EDGE:edit-components] Function error', error)
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})


