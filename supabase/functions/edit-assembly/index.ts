
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
// System prompt sourced from reference/assembly/system prompt/assembly edit system prompt.md
const SYSTEM_PROMPT = `You are Buildables, an AI co-engineer that helps founders and makers safely modify hardware project assembly instructions and documentation. You assist users by chatting with them and making changes to their hardware project assembly instructions and documentation in real time. 

You understand that users can see the assembly instructions in a viewport on the right side of the screen while you make changes.

You also understand that the input JSON I will provide you is the complete context of the hardware project, for your reference in editing the assembly instructions/documentation. You will just be editing the project assembly portion of the hardware project


Your goal is to generate designs, parts recommendations, and code in a way that is safe, feasible, and efficient. 


Follow these rules strictly:

1. Decision-Making Hierarchy  
   - Always prefer off-the-shelf parts when possible. Only recommend 3D printing when a component is custom, small, or cannot be purchased easily.  
   - For electronic components (boards, sensors, power supplies), always recommend industry-standard options first (Arduino, Raspberry Pi, ESP32, etc.).  
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
   - Clearly mark which parts are printable vs. purchasable.  
- The material recommended should be consistent throughout, including material creation and assembly guide. 


5. RAMS Principles (Reliability, Availability, Maintainability, Safety)  
   - Every design must include a mini-checklist of failure points and how to address them.  
   - For example: “Ensure motor torque ≥ load requirement,” or “Print casing with ≥3mm wall thickness for durability.”  

6. Output Format  
   - Start with a high-level assembly plan (major parts, what they do).  
   - Break into sub-components with manufacturing recommendations.  
   - Provide a parts list with suggested vendors.  
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
✓ Assembly sequence is logical and documented
✓ Non-printable parts (electronics, fasteners) are listed

RESPONSE APPROACH:

Assess project scale and complexity
Determine appropriate scaling (prototype vs full-size)
Identify functional modules and dependencies
Generate printable components with specifications
Provide assembly roadmap
List required non-printed hardware
Estimate total build time and difficulty
`;
// Strict JSON Schema derived from reference/assembly/output json schema/assembly.json
const ASSEMBLY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'content',
    'AssemblyAndParts'
  ],
  properties: {
    content: {
      type: 'string'
    },
    AssemblyAndParts: {
      type: 'object',
      additionalProperties: false,
      required: [
        'overview',
        'partsList',
        'assemblyInstructions',
        'safetyChecklist'
      ],
      properties: {
        overview: {
          type: 'string'
        },
        partsList: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: [
              'part',
              'quantity',
              'vendor',
              'notes'
            ],
            properties: {
              part: {
                type: 'string'
              },
              quantity: {
                type: 'string'
              },
              vendor: {
                type: 'string'
              },
              notes: {
                type: 'string'
              }
            }
          }
        },
        assemblyInstructions: {
          type: 'string'
        },
        safetyChecklist: {
          type: 'string'
        }
      }
    }
  }
};
serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const body = await req.json();
    const projectId = body?.projectId ?? '';
    const userId = body?.userId ?? null;
    const hardwareId = body?.hardwareId ?? null;
    const userMessage = body?.userMessage ?? '';
    const fullContext = body?.context ?? {};
    if (!projectId || !userMessage) {
      return new Response(JSON.stringify({
        error: 'Missing required fields: projectId, userMessage'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      });
    }
    const openaiKey = Deno.env.get('OPENAI_API_KEY') ?? '';
    if (!openaiKey) {
      return new Response(JSON.stringify({
        error: 'OPENAI_API_KEY not configured'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      });
    }
    const modelInput = `You are editing ONLY the Assembly & Parts section of the following hardware project. Do not change unrelated sections. Use the user's request to update assembly overview, parts list, instructions, and safety checklist.

USER REQUEST:\n${userMessage}\n\nFULL PROJECT CONTEXT JSON (read-only):\n${JSON.stringify(fullContext)}`;
    const resp = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4.1',
        temperature: 0.3,
        max_output_tokens: 4000,
        instructions: SYSTEM_PROMPT,
        input: modelInput,
        text: {
          format: {
            type: 'json_schema',
            name: 'AssemblyEditOutput',
            schema: ASSEMBLY_SCHEMA,
            strict: true
          }
        }
      })
    });
    if (!resp.ok) {
      const t = await resp.text();
      console.error('[EDGE:edit-assembly] OpenAI error:', t);
      return new Response(JSON.stringify({
        error: `OpenAI error ${resp.status}`
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      });
    }
    const data = await resp.json();
    const outputText = data?.output?.[0]?.content?.[0]?.text || data?.output_text;
    if (!outputText) {
      return new Response(JSON.stringify({
        error: 'Structured output missing text payload'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      });
    }
    let parsed;
    try {
      parsed = JSON.parse(outputText);
    } catch (_e) {
      return new Response(JSON.stringify({
        error: 'Failed to parse structured JSON output'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      });
    }
    const assemblyPayload = parsed;
    // Ensure the "content" key explicitly exists and is used for UI
    const normalizedAssembly = {
      content: typeof assemblyPayload?.content === 'string' ? assemblyPayload.content : '',
      ...assemblyPayload
    };
    // Upsert assembly into hardware_projects
    let targetHardwareId = hardwareId;
    if (targetHardwareId) {
      const { data: updated, error } = await supabase.from('hardware_projects').update({
        assembly_parts: normalizedAssembly
      }).eq('id', targetHardwareId).select('id').single();
      if (error || !updated) {
        console.error('[EDGE:edit-assembly] Update hardware_projects failed', error);
        return new Response(JSON.stringify({
          error: 'Failed to update assembly'
        }), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          },
          status: 500
        });
      }
      targetHardwareId = updated.id;
    } else {
      // find latest by project_id
      const { data: existing } = await supabase.from('hardware_projects').select('id').eq('project_id', projectId).order('created_at', {
        ascending: false
      }).limit(1).maybeSingle();
      if (existing?.id) {
        const { data: updated, error } = await supabase.from('hardware_projects').update({
          assembly_parts: normalizedAssembly
        }).eq('id', existing.id).select('id').single();
        if (error || !updated) {
          console.error('[EDGE:edit-assembly] Update existing hardware_projects failed', error);
          return new Response(JSON.stringify({
            error: 'Failed to update assembly'
          }), {
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            },
            status: 500
          });
        }
        targetHardwareId = updated.id;
      } else {
        const { data: inserted, error } = await supabase.from('hardware_projects').insert({
          project_id: projectId,
          title: fullContext?.project || 'Hardware Project',
          assembly_parts: normalizedAssembly
        }).select('id').single();
        if (error || !inserted) {
          console.error('[EDGE:edit-assembly] Insert hardware_projects failed', error);
          return new Response(JSON.stringify({
            error: 'Failed to insert assembly'
          }), {
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            },
            status: 500
          });
        }
        targetHardwareId = inserted.id;
      }
    }
    // Insert chat messages
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
            content: normalizedAssembly.content || 'Assembly updated.'
          }
        ]);
      }
    } catch (msgErr) {
      console.warn('[EDGE:edit-assembly] hardware_messages insert failed (non-fatal)', msgErr);
    }
    return new Response(JSON.stringify({
      hardwareId: targetHardwareId,
      content: normalizedAssembly.content,
      data: normalizedAssembly
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error('[EDGE:edit-assembly] Function error', error);
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
