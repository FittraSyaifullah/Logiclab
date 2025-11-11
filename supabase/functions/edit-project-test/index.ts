import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
// Credit model constants
const CREDIT_COST_EDIT_PROJECT = 10;

// Simple retry for transient network errors on Supabase REST calls
async function retrySupabase<T>(
  opName: string,
  run: () => Promise<{ data: T | null; error: unknown }>,
  attempts = 3,
  baseDelayMs = 300
): Promise<{ data: T | null; error: unknown }> {
  let last: { data: T | null; error: unknown } = { data: null, error: null };
  for (let attempt = 1; attempt <= attempts; attempt++) {
    last = await run();
    const message = String((last as any)?.error?.message ?? last.error ?? '');
    const isTransient = !!message && /connection reset|ECONNRESET|SendRequest|network|timeout/i.test(message);
    if (!last.error || !isTransient || attempt === attempts) {
      return last;
    }
    const delayMs = baseDelayMs * Math.pow(2, attempt - 1);
    console.warn('[EDGE:edit-project-test] Transient error, retrying ' + opName, { attempt, delayMs, message });
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return last;
}

async function getUserCredits(supabase: any, userId: string) {
  const { data } = await supabase
    .from('user_credits')
    .select('user_id, balance_bigint, reserved_bigint, paid_or_unpaid')
    .eq('user_id', userId)
    .single();
  return data ?? null;
}

async function debitCreditsIfUnpaid(
  supabase: any,
  userId: string,
  cost: number,
  reason: string,
  refId?: string
) {
  const { data: current } = await supabase
    .from('user_credits')
    .select('user_id, balance_bigint, paid_or_unpaid')
    .eq('user_id', userId)
    .single();
  if (!current) {
    return { ok: false as const, error: 'User credits not found' };
  }
  if (current.paid_or_unpaid) {
    return { ok: true as const, balanceAfter: current.balance_bigint as number };
  }
  if (Number(current.balance_bigint) < cost) {
    return { ok: false as const, error: 'Insufficient credits' };
  }
  const newBalance = Number(current.balance_bigint) - cost;
  const { error: updateError } = await supabase
    .from('user_credits')
    .update({ balance_bigint: newBalance })
    .eq('user_id', userId);
  if (updateError) {
    return { ok: false as const, error: updateError.message };
  }
  await supabase.from('credit_transactions').insert({
    user_id: userId,
    change_bigint: -cost,
    balance_after_bigint: newBalance,
    type: 'debit',
    reason,
    ref_id: refId
  });
  return { ok: true as const, balanceAfter: newBalance };
}
// System prompt sourced from reference/edit-project/system prompt/edit-project-system-prompt.md
const SYSTEM_PROMPT = `You are Buildables, an AI co-engineer that helps founders and makers refine, improve, and safely prototype hardware projects.
In Interactive Editing Mode, you collaborate directly with the user.
 Your goal is to:
Interpret the user’s chat input as instructions, clarifications, or change requests.


Compare the new input against the existing project data (components, materials, model prompts, or code).


Identify what should change, what should remain, and how to update safely.


Output clear, structured updates that reflect the user’s intent while maintaining engineering integrity.


🗣️ HOW TO USE USER INPUT
Treat each user message as a design revision, clarification, or question about an existing project.


Parse intent carefully: determine whether the user is requesting


a modification (e.g. “make the shell thinner”),


an addition (e.g. “add a cooling vent”), or


a clarification (e.g. “what’s the material of this part?”).


If input is ambiguous, ask clarifying questions before editing.


If user input contradicts safe design practices, explain why and propose a safer alternative.


Never overwrite a part that the user didn’t mention — edit only what the user implies or requests.




🧩 EDITING PRINCIPLES
1. Non-Destructive Updates
Preserve existing valid data: only modify unclear, unsafe, or incomplete sections.


If all design details are already sufficient, confirm and keep them intact.


Always show what changed and why (e.g. “Increased wall thickness to 3 mm for structural stability”).


2. Decision Hierarchy (Same as Generation Mode)
Prefer off-the-shelf parts whenever possible.


Only recommend 3D printing when geometry is unique or unavailable commercially.


Never suggest printing circuit boards or heavy-load parts.


Match recommendations to realistic complexity and project scope.


3. Feasibility & Safety
Verify compatibility between components and materials.


Flag any unsafe, unrealistic, or out-of-scope designs.


Redirect to safer alternatives if user’s request exceeds consumer-grade prototyping boundaries.


4. Scope Control
Stay within: consumer electronics, IoT, gadgets, small appliances, educational kits.


Avoid large vehicles or high-risk machinery. Additionally avoid NSFW or 18+ products (Sexual products, firearms or explosive)


If project is too large, reframe as a smaller demonstrable prototype.



🧱 MATERIAL & MANUFACTURING UPDATES
When editing:
Reassess whether the chosen material suits the design purpose (strength, temperature, flexibility).


If you change materials, ensure consistency across all parts and the assembly guide.


Recommend revised manufacturing routes if a change improves feasibility or quality.



⚙️ RAMS (Reliability, Availability, Maintainability, Safety)
For every edit:
Verify that new or revised designs meet basic RAMS checks.


Include a short “Change Impact” note showing how edits affect reliability or safety.



📦 OUTPUT FORMAT (for Edits)
When presenting your output:
Summary of Revisions:


Bullet list of key changes and their reasoning.


Updated Assembly Plan:


Include only updated or affected modules.


Revised Component Specs:


Show before → after for each modified parameter.


Updated 3D Model Prompts (only if modified):


 [Component name]: [updated prompt]
Reason for edit: [reason]


Optional Firmware Changes:


Only revise code if new hardware or logic requires it.


Keep code comments clear and minimal, with a short preface explaining the update.


Safety Reminder:


Always end with a note encouraging physical validation and safe testing.



🧰 3D COMPONENT UPDATE RULES
If a part’s dimensions, orientation, or connection method change, update its 3D generation prompt accordingly.


If a part remains unchanged, mark it as “No revision required.”


Respect printability constraints:


Max bed: 200×200×200 mm


Max overhang: 45°


Wall thickness: ≥ 2 mm (structural), ≥ 1 mm (non-structural)


Clearance: 0.2 mm (sliding), 0.1 mm (press fit)



🧩 COMPONENT REVISION STRATEGY
Project Size
Editing Focus
Example Adjustments
Small (<200 mm)
Orientation, printability
Reduce supports, improve surface finish
Medium (200–500 mm)
Modularity, joinery
Redesign split seams, strengthen interlocks
Large (>500 mm)
Scaling, sub-assembly
Add modular mounts, propose 1:2 prototype


💻 FIRMWARE / CODE EDITING RULES
Match code to updated hardware (MCU type, sensor changes).


Prefer C/C++ unless otherwise stated.


Always annotate why edits were made.


Example:

 // Updated to include new temperature sensor (DS18B20)



🛠️ EDITING CHECKLIST (Before Output)
✅ All modified parts pass printability rules
 ✅ Material consistency verified
 ✅ Updated assembly instructions are logical
 ✅ Firmware changes match hardware
 ✅ No unsafe or out-of-scope elements
 ✅ Every change has a clear rationale

🧑‍🔧 TONE & POSITIONING
Act as a senior mechanical/electronics engineer reviewing a junior’s work.


Be precise, respectful, and factual.


Encourage iterative prototyping and testing.


Never overstate feasibility—acknowledge uncertainty clearly.`;
// Strict JSON Schema derived from reference/edit-project/json-schema/edit-project-schema.json
const EDIT_PROJECT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'summary_of_changes',
    'project',
    'description',
    'reports'
  ],
  properties: {
    summary_of_changes: {
      type: 'string'
    },
    project: {
      type: 'string'
    },
    description: {
      type: 'string'
    },
    reports: {
      type: 'object',
      additionalProperties: false,
      required: [
        '3DComponents',
        'AssemblyAndParts',
        'FirmwareAndCode'
      ],
      properties: {
        '3DComponents': {
          type: 'object',
          additionalProperties: false,
          required: [
            'components',
            'generalNotes'
          ],
          properties: {
            components: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                required: [
                  'component',
                  'description',
                  'promptFor3DGeneration',
                  'printSpecifications',
                  'assemblyNotes',
                  'printTime',
                  'material',
                  'supports'
                ],
                properties: {
                  component: {
                    type: 'string'
                  },
                  description: {
                    type: 'string'
                  },
                  promptFor3DGeneration: {
                    type: 'string'
                  },
                  printSpecifications: {
                    type: 'string'
                  },
                  assemblyNotes: {
                    type: 'string'
                  },
                  printTime: {
                    type: 'string'
                  },
                  material: {
                    type: 'string'
                  },
                  supports: {
                    type: 'string'
                  }
                }
              }
            },
            generalNotes: {
              type: 'string'
            }
          }
        },
        'AssemblyAndParts': {
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
        },
        'FirmwareAndCode': {
          type: 'object',
          additionalProperties: false,
          required: [
            'microcontroller',
            'language',
            'code',
            'explanation',
            'improvementSuggestions'
          ],
          properties: {
            microcontroller: {
              type: 'string'
            },
            language: {
              type: 'string'
            },
            code: {
              type: 'string'
            },
            explanation: {
              type: 'string'
            },
            improvementSuggestions: {
              type: 'string'
            }
          }
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
    if (!userId) {
      return new Response(JSON.stringify({
        error: 'Missing required field: userId'
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
    // Server-side credit gate (paid_or_unpaid takes precedence)
    try {
      const credits = await getUserCredits(supabase, userId);
      if (!credits) {
        return new Response(JSON.stringify({ code: 'INSUFFICIENT_CREDITS', error: 'No credits record' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 402
        });
      }
      if (!credits.paid_or_unpaid && Number(credits.balance_bigint) < CREDIT_COST_EDIT_PROJECT) {
        return new Response(JSON.stringify({ code: 'INSUFFICIENT_CREDITS', error: 'Need 10 credits for editing project' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 402
        });
      }
    } catch (_gateErr) {
      return new Response(JSON.stringify({ code: 'INSUFFICIENT_CREDITS', error: 'Credit check failed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 402
      });
    }
    const modelInput = `You are editing the ENTIRE hardware project. Use the user's request to update the project summary and any of the three reports as needed. Only change what the user implies or requests, and maintain safety and feasibility.\n\nUSER REQUEST:\n${userMessage}\n\nFULL PROJECT CONTEXT JSON (read-only):\n${JSON.stringify(fullContext)}`;
    const resp = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4.1',
        temperature: 0.3,
        max_output_tokens: 6000,
        instructions: SYSTEM_PROMPT,
        input: modelInput,
        text: {
          format: {
            type: 'json_schema',
            name: 'EditProjectOutput',
            schema: EDIT_PROJECT_SCHEMA,
            strict: true
          }
        }
      })
    });
    if (!resp.ok) {
      const t = await resp.text();
      console.error('[EDGE:edit-project] OpenAI error:', t);
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
    const summaryOfChanges = typeof parsed?.summary_of_changes === 'string' ? parsed.summary_of_changes : '';
    const reports = parsed?.reports ?? {};
    const next3D = reports?.['3DComponents'] ?? null;
    const nextAssembly = reports?.['AssemblyAndParts'] ?? null;
    const nextFirmware = reports?.['FirmwareAndCode'] ?? null;
    // Upsert into hardware_projects (update existing by id, else latest by project, else insert)
    let targetHardwareId = hardwareId;
    if (targetHardwareId) {
      const { data: updated, error } = await retrySupabase('hardware_projects.update', () =>
        supabase.from('hardware_projects').update({
          '3d_components': next3D,
          assembly_parts: nextAssembly,
          firmware_code: nextFirmware,
          full_json: parsed
        }).eq('id', targetHardwareId).select('id').single()
      );
      if (error || !updated) {
        console.error('[EDGE:edit-project] Update hardware_projects failed', error);
        return new Response(JSON.stringify({
          error: 'Failed to update project'
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
      const { data: existing } = await supabase.from('hardware_projects').select('id').eq('project_id', projectId).order('created_at', {
        ascending: false
      }).limit(1).maybeSingle();
      if (existing?.id) {
        const { data: updated, error } = await retrySupabase('hardware_projects.updateExisting', () =>
          supabase.from('hardware_projects').update({
            '3d_components': next3D,
            assembly_parts: nextAssembly,
            firmware_code: nextFirmware,
            full_json: parsed
          }).eq('id', existing.id).select('id').single()
        );
        if (error || !updated) {
          console.error('[EDGE:edit-project] Update existing hardware_projects failed', error);
          return new Response(JSON.stringify({
            error: 'Failed to update project'
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
        const { data: inserted, error } = await retrySupabase('hardware_projects.insert', () =>
          supabase.from('hardware_projects').insert({
            project_id: projectId,
            title: fullContext?.project || 'Hardware Project',
            '3d_components': next3D,
            assembly_parts: nextAssembly,
            firmware_code: nextFirmware,
            full_json: parsed
          }).select('id').single()
        );
        if (error || !inserted) {
          console.error('[EDGE:edit-project] Insert hardware_projects failed', error);
          return new Response(JSON.stringify({
            error: 'Failed to insert project'
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
    // Insert chat messages (user + assistant summary)
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
            content: summaryOfChanges || 'Project updated.'
          }
        ]);
      }
    } catch (msgErr) {
      console.warn('[EDGE:edit-project] hardware_messages insert failed (non-fatal)', msgErr);
    }
    // Post-success debit for unpaid users (do NOT deduct on earlier failures)
    try {
      const creditsAfter = await getUserCredits(supabase, userId);
      if (creditsAfter && !creditsAfter.paid_or_unpaid) {
        const debit = await debitCreditsIfUnpaid(supabase, userId, CREDIT_COST_EDIT_PROJECT, 'edit_project', targetHardwareId ?? undefined);
        if (!debit.ok) {
          console.warn('[EDGE:edit-project] Post-success debit failed:', debit.error);
        }
      }
    } catch (debitErr) {
      console.warn('[EDGE:edit-project] Debit step error:', debitErr);
    }
    return new Response(JSON.stringify({
      hardwareId: targetHardwareId,
      summary_of_changes: summaryOfChanges,
      data: parsed
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error('[EDGE:edit-project] Function error', error);
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
