import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type SupabaseClient = ReturnType<typeof createClient>

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('*')
      .eq('status', 'pending')
      .eq('kind', 'hardware_initial_generation')
      .order('created_at', { ascending: true })
      .limit(3)

    if (jobsError) {
      console.error('[EDGE:hardware-initial] Error fetching jobs:', jobsError)
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

    // Hardcoded master system prompt from repository
    const SYSTEM_PROMPT = `You are Buildables, an AI co-engineer that helps founders and makers safely prototype hardware products. 

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
   - For electronic components (boards, sensors, power supplies), always recommend industry-standard options first (Arduino, Raspberry Pi, ESP32, etc.).  Also do state what tools and electronic components under the assembly tab
   - Never suggest 3D printing circuit boards or high-stress load-bearing parts.  
- The number of components should match the complexity of the request.
- If you find that the parts of the user’s prompts are specific enough, do not bother editing. Focus specifying those that lacks details, especially for the model creation. For example, for prompt format for 3d model generation, if all the details are provided, do not change. Only change if you find that you lack information.


2. Feasibility & Safety  
   - Every design must pass a basic safety and correctness check: components must be compatible, safe for consumer use, and meet realistic material and thermal tolerances.  
   - Flag any designs that would be unsafe, illegal, or outside Buildables’ scope (e.g., weapons, cars, rockets, food production machinery). Politely redirect the user to safer consumer electronics, appliances, or IoT devices.  

3. Scope Control  
   - Buildables is for consumer electronics, small appliances, IoT devices, educational kits, and gadget enclosures.  
   - You may design shells, casings, mounts, and brackets, but avoid unrealistic full-system manufacturing (e.g., entire cars, rockets).  
   - If a user requests something outside scope, break the idea down into a smaller demonstrable project they could still prototype.  

4. Material & Manufacturing Guidance  
   - Recommend specific materials (PLA, ABS, PETG, aluminum, etc.) with notes on strength, durability, or heat resistance.  
   - Suggest the best manufacturing route for each part:  
       - Off-the-shelf (buy)  
       - 3D print (custom geometry, non-load-bearing)  
       - CNC/laser cut/injection molding/metal sheet (panels, metal parts)  
   - Clearly mark which parts are printable vs. purchasable under the assembly tab. And do state the full model name and not vague generic parts name
- The material recommended should be consistent throughout, including material creation and assembly guide. 


5. RAMS Principles (Reliability, Availability, Maintainability, Safety)  
   - Every design must include a mini-checklist of failure points and how to address them.  
   - For example: “Ensure motor torque ≥ load requirement,” or “Print casing with ≥3mm wall thickness for durability.”  

6. Output Format  
   - Start with a high-level assembly plan (major parts, what they do).  
   - Break into sub-components with manufacturing recommendations.  
   - Provide a parts list such as what electronic components and tools needed. The electronic components should have the specific model name so user can search it up online and not just the simple name.
   - If electronics are included, generate ready-to-run sample code in the requested format (.ino, .py, .c).  
   - Always end with a safety disclaimer reminding users to test, validate, and handle responsibly.  

7. Tone & Positioning  
   - You are an expert AI engineer, not a hobby assistant.  
   - Avoid overpromising: focus on achievable prototypes, not production-ready devices that can be assembled by the user.
   - Encourage users to validate designs with real testing and iteration.

DESIGN CONSTRAINTS:
- Standard print bed: 200×200×200mm (adjust for larger printers if specified)
- Maximum overhang angle: 45° without supports
- Minimum wall thickness: 2mm for structural parts, 1mm for non-structural
- Layer height consideration: 0.1-0.3mm typical
- Tolerance: 0.2mm clearance for sliding fits, 0.1mm for press fits

COMPONENT BREAKDOWN STRATEGY:

For Small Projects (<200mm):
- Generate as single or minimal parts
- Focus on optimal print orientation
- Minimize support requirements

For Medium Projects (200-500mm):
- Split into 2-4 major assemblies
- Use interlocking joints (dovetails, snap-fits, threaded connections)
- Consider modular expansion capabilities

For Large Projects/Appliances (>500mm):
Create scaled functional prototypes (1:2 or 1:4 scale recommended)
Break into functional modules:
Housing/enclosures
Motor mounts and mechanical systems
Control panel interfaces
Moving parts (gears, arms, drums)
- Provide both prototype AND full-scale options with note on practicality


3D GENERATION PROMPTS:
Create detailed prompts for each component suitable for:

AI 3D generation tools (Tripo, Meshy, etc.)
Traditional CAD software guidance
Manual modeling instructions


3D component prompt format:
[Component type] for [purpose], overall dimensions [X]×[Y]×[Z] mm; features include [list all features, specifying shape, size, position, depth, orientation]; critical elements must include [mounting points, holes, threads, connectors]; style: [functional/organic/geometric]; material appearance: [texture/finish]; printability: [orientation, support requirements, tolerances]

ASSEMBLY DOCUMENTATION:
For each component specify:

Connection method (snap-fit, screws, glue, heat-set inserts)
Required hardware (M3 screws, bearings, magnets, etc.)
Assembly sequence order
Torque specs or glue types if applicable
Wire routing or channel provisions

SCALING STRATEGIES FOR LARGE APPLIANCES:
Washing Machine Example:

Prototype scale (1:4): Demonstrates drum rotation, door mechanism, simple agitation
Components: drum assembly, door frame, motor mount, control panel mockup
Full scale note: "Full-size drum would require 800mm height; recommend scaled prototype"

Dishwasher Example:

Prototype scale (1:3): Shows rack sliding, spray arm rotation, door hinge
Components: rack frame, spray arm, door assembly, pump housing
Functional insight: Working water spray mechanism at small scale

MATERIAL RECOMMENDATIONS:

PLA: Prototypes, decorative, low-stress parts
PETG: Moderate strength, some flexibility, water resistant
ABS: High strength, heat resistant, acetone smoothing
TPU: Flexible parts, gaskets, grips
Nylon: High strength, wear resistant, functional parts

CRITICAL CHECKS BEFORE OUTPUT:
✓ All STL files are valid and watertight
✓ OpenSCAD code compiles without errors
✓ Parameters have sensible ranges and defaults
✓ Components fit within specified print volume
✓ Assembly sequence is logical and documented
✓ Non-printable parts (electronics, fasteners) are listed
✓ Generation prompts are detailed and unambiguous
RESPONSE APPROACH:

Assess project scale and complexity
Determine appropriate scaling (prototype vs full-size)
Identify functional modules and dependencies
Generate printable components with specifications
Provide assembly roadmap
List required non-printed hardware
Estimate total build time and difficulty

For firmware code,
Make sure that the language aligns to what microcontroller is being used. Try to use popular coding language for microcontroller such as C or C++ as much as possible. writes clean, efficient and well-documented code. Follow best practices, including meaningful variable names, proper indentation and security considerations. Always provide a short explanation before the code and suggest improvements if applicable. 

For complex appliances like washing machines, dishwashers, or large devices:
- Break down into functional modules (motor housing, control panel, drum components, etc.)
- Create scaled-down functional prototypes rather than full-size replicas
- Focus on demonstrating key mechanisms and principles
- Provide multiple size options (prototype scale vs functional scale)
`

    // Example JSON defining the output shape from repository
    const AI_OUTPUT_EXAMPLE = {
      project: "string",
      description: "string",
      reports: {
        "3DComponents": {
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
        AssemblyAndParts: {
          overview: "string",
          partsList: [
            { part: "string", quantity: "string", vendor: "string", notes: "string" },
          ],
          assemblyInstructions: "string",
          safetyChecklist: "string",
        },
        FirmwareAndCode: {
          microcontroller: "string",
          language: "string",
          code: "string",
          explanation: "string",
          improvementSuggestions: "string",
        },
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

    const STRICT_SCHEMA = exampleToSchema(AI_OUTPUT_EXAMPLE)

    for (const job of jobs) {
      try {
        await supabase
          .from('jobs')
          .update({ status: 'processing', started_at: new Date().toISOString() })
          .eq('id', job.id)

        const payload = (job.input ?? {}) as { title?: string; prompt?: string; projectId?: string; userId?: string }
        const { title, prompt, projectId, userId } = payload
        if (!title || !prompt || !projectId || !userId) {
          throw new Error('Missing required input for initial generation')
        }

        const openaiKey = Deno.env.get('OPENAI_API_KEY') ?? ''
        if (!openaiKey) throw new Error('OPENAI_API_KEY not configured')

        const body = {
          model: 'gpt-4.1',
          temperature: 0.3,
          max_output_tokens: 4000,
          instructions: SYSTEM_PROMPT,
          input: `Project Title: ${title}\n\nUser Description: ${prompt}\n\nReturn the required hardware output JSON strictly following the provided schema.`,
          text: {
            format: {
              type: 'json_schema',
              name: 'HardwareOutput',
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
          console.error('[EDGE:hardware-initial] OpenAI error:', t)
          throw new Error(`OpenAI error ${resp.status}`)
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

        const resultObj = parsed as {
          project?: string
          description?: string
          reports?: {
            '3DComponents'?: { components?: unknown[]; generalNotes?: string }
            'AssemblyAndParts'?: Record<string, unknown>
            'FirmwareAndCode'?: Record<string, unknown>
          }
        }

        const threeD = resultObj?.reports?.['3DComponents'] as { components?: unknown[]; generalNotes?: string } | undefined
        const assembly = resultObj?.reports?.['AssemblyAndParts'] as Record<string, unknown> | undefined
        const firmware = resultObj?.reports?.['FirmwareAndCode'] as Record<string, unknown> | undefined

        const assemblyContent = assembly ? [
          (assembly as { overview?: string }).overview || '',
          (assembly as { assemblyInstructions?: string }).assemblyInstructions || '',
          (assembly as { safetyChecklist?: string }).safetyChecklist || ''
        ].filter(Boolean).join('\n\n') : ''

        const firmwareContent = firmware ? [
          (firmware as { explanation?: string }).explanation || '',
          (firmware as { code?: string }).code || '',
          (firmware as { improvementSuggestions?: string }).improvementSuggestions || ''
        ].filter(Boolean).join('\n\n') : ''

        const { data: inserted, error: insertErr } = await supabase
          .from('hardware_projects')
          .insert({
            project_id: projectId,
            title: title || resultObj?.project || 'Hardware Project',
            '3d_components': threeD ? {
              project: resultObj?.project || title,
              description: resultObj?.description || prompt,
              components: Array.isArray(threeD?.components) ? threeD.components : [],
              generalNotes: typeof threeD?.generalNotes === 'string' ? threeD.generalNotes : '',
            } : null,
            assembly_parts: assembly ? {
              content: assemblyContent,
              partsCount: Array.isArray((assembly as { partsList?: unknown[] }).partsList) ? (assembly as { partsList?: unknown[] }).partsList!.length : 0,
              estimatedTime: "2-3 hours",
              difficultyLevel: "Beginner",
            } : null,
            firmware_code: firmware ? {
              content: firmwareContent,
              language: (firmware as { language?: string }).language || 'C++',
              platform: (firmware as { microcontroller?: string }).microcontroller || 'Arduino IDE',
              libraries: ["Servo.h", "NewPing.h"],
              codeLines: firmwareContent.split('\n').length,
            } : null,
          })
          .select('id')
          .single()

        if (insertErr || !inserted) {
          throw insertErr || new Error('Insert failed')
        }

        console.log('[EDGE:hardware-initial] Inserted hardware_projects row', { reportId: inserted.id, projectId })

        await supabase
          .from('jobs')
          .update({ status: 'completed', finished_at: new Date().toISOString(), result: { reportId: inserted.id } })
          .eq('id', job.id)
        console.log('[EDGE:hardware-initial] Marked job completed and stored reportId')

        // Fire webhook to Next.js app (HTTPS)
        const webhookUrl = Deno.env.get('WEBHOOK_URL')
        const webhookSecret = Deno.env.get('HARDWARE_WEBHOOK_SECRET')
        try {
          if (webhookUrl && webhookSecret && webhookUrl.startsWith('https://')) {
            const payload = {
              type: 'hardware.initial.completed',
              projectId,
              reportId: inserted.id,
              status: 'completed',
              title,
            }
            console.log('[EDGE:hardware-initial] Posting success webhook', { url: webhookUrl, payload })
            const whResp = await fetch(webhookUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Buildables-Webhook-Secret': webhookSecret,
              },
              body: JSON.stringify(payload),
            })
            console.log('[EDGE:hardware-initial] Webhook response (success)', { status: whResp.status })
          } else {
            console.warn('[EDGE:hardware-initial] Skipping webhook: WEBHOOK_URL missing/invalid or secret missing')
          }
        } catch (whErr) {
          console.warn('[EDGE:hardware-initial] Webhook POST failed', whErr)
        }
      } catch (err) {
        console.error('[EDGE:hardware-initial] Job error', err)
        await supabase
          .from('jobs')
          .update({ status: 'failed', error: err instanceof Error ? err.message : String(err), finished_at: new Date().toISOString() })
          .eq('id', job.id)

        // Notify webhook about failure
        try {
          const webhookUrl = Deno.env.get('WEBHOOK_URL')
          const webhookSecret = Deno.env.get('HARDWARE_WEBHOOK_SECRET')
          if (webhookUrl && webhookSecret && webhookUrl.startsWith('https://')) {
            const payload = {
              type: 'hardware.initial.failed',
              projectId: (job.input as { projectId?: string })?.projectId,
              status: 'failed',
              error: err instanceof Error ? err.message : String(err),
            }
            console.log('[EDGE:hardware-initial] Posting failure webhook', { url: webhookUrl, payload })
            const whResp = await fetch(webhookUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Buildables-Webhook-Secret': webhookSecret,
              },
              body: JSON.stringify(payload),
            })
            console.log('[EDGE:hardware-initial] Webhook response (failure)', { status: whResp.status })
          }
        } catch (whErr) {
          console.warn('[EDGE:hardware-initial] Failure webhook POST failed', whErr)
        }
      }
    }

    return new Response(JSON.stringify({ message: `Processed ${jobs.length} initial hardware jobs` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('[EDGE:hardware-initial] Function error', error)
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})


