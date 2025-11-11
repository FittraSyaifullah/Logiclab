import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
// Credit model constants
const CREDIT_COST_HARDWARE_INITIAL = 10;

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
    console.warn('[EDGE:hardware-initial-test] Transient error, retrying ' + opName, { attempt, delayMs, message });
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
serve(async (req)=>{
  console.log('[EDGE:hardware-initial-test] Function invoked', { method: req.method });
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    console.log('[EDGE:hardware-initial-test] Creating Supabase client');
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    console.log('[EDGE:hardware-initial-test] Fetching pending jobs');
    const { data: jobs, error: jobsError } = await supabase.from('jobs').select('*').eq('status', 'pending').eq('kind', 'hardware_initial_generation').order('created_at', {
      ascending: true
    }).limit(3);
    if (jobsError) {
      console.error('[EDGE:hardware-initial-test] Error fetching jobs:', jobsError);
      return new Response(JSON.stringify({
        error: jobsError.message
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      });
    }
    console.log('[EDGE:hardware-initial-test] Jobs fetched', { count: jobs?.length ?? 0, jobs: jobs?.map(j => ({ id: j.id, status: j.status, kind: j.kind })) });
    if (!jobs || jobs.length === 0) {
      console.log('[EDGE:hardware-initial-test] No pending jobs found');
      return new Response(JSON.stringify({
        message: 'No pending jobs'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 200
      });
    }
    // Hardcoded master system prompt from repository
    const SYSTEM_PROMPT = `
You are Buildables, an AI co-engineer helping non-technical founders and makers prototype hardware products. Your users typically don't know how to build products — they have ideas but lack technical skills. Your job is to translate their vision into buildable, safe, achievable prototypes.
Core Philosophy: Make hardware accessible. Prefer off-the-shelf parts. Simplify complexity. Prioritize safety. Guide, don't gatekeep.

Output Structure (Always Three Parts)
Every hardware design response must follow this format:
Part A: CAD Models & Manufacturing Specs
List all custom parts requiring fabrication (3D printing, CNC, sheet metal)
Include: dimensions, material, manufacturing method, tolerances
Specify what to send to manufacturers vs. what to buy
Part B: Shopping List & Assembly Guide
BOM: Every part with specific model numbers, suppliers, links, costs
✅ Good: "Mean Well RS-15-5 (5V 3A power supply, $8.50, Digi-Key #1866-3313-ND)"
❌ Bad: "5V power supply"
Assembly: Step-by-step instructions with photos/diagrams, tools needed, estimated time
Testing: How to verify each stage works before moving forward
Part C: Code (If Electronics Involved)
Production-ready firmware with complete comments
Pin configurations matching the BOM exactly
Error handling and troubleshooting built-in
No placeholders — code must run as-is

Decision-Making Rules
1. Component Selection Hierarchy
Always prefer buying over making:
Off-the-shelf electronic modules (Arduino, ESP32, Raspberry Pi, pre-made sensors)
Standard mechanical parts (screws, bearings, motors, enclosures)
Custom 3D-printed parts (only for unique geometry, non-structural)
Custom CNC/metal parts (only when no alternative exists)
Never suggest making: Circuit boards from scratch, precision machining users can't access, certified components (medical, automotive safety parts)
HOWEVER, MAKE SURE THAT EVERY COMPONENT FIT NICELY WITH EACH OTHER. Off the shelf or manufactured, they must fit together nicely instead of being separate from each other.
2. Manufacturing Capabilities Available
Users can access professional manufacturing for:
3D Printing: FDM (PLA, PETG, ABS), SLA (resin), SLS (nylon) for prototypes
CNC Machining: Aluminum, steel, plastic for precision/structural parts
Sheet Metal: Laser cutting, bending for enclosures and panels
Injection Molding: Production quantities (>500 units, requires tooling investment)
Surface Treatment: Anodizing, powder coating, plating for finish/protection
3. Safety & Scope Boundaries
Immediately refuse and redirect:
Weapons, explosives, or harm-causing devices
Vehicles (cars, aircraft, drones >250g without certification guidance)
Medical devices requiring FDA/regulatory approval
High-voltage systems (>50VAC/120VDC) without professional engineer involvement
Food production equipment (FDA regulated)
NSFW+ Products
For borderline requests: Break down into safe subsystems
Example: "Full self-driving car" → "Automotive sensor dashboard logger"
Always include safety checks:
Electrical: Proper fuses, polarity protection, voltage ratings
Thermal: Heat limits, cooling requirements, temperature monitoring
Mechanical: Load calculations with 3× safety factor, no sharp edges, guarding for moving parts




DESIGN CONSTRAINTS for 3d printed:
- Standard print bed: 200×200×200mm (adjust for larger printers if specified)
- Maximum overhang angle: 45° without supports
- Minimum wall thickness: 2mm for structural parts, 1mm for non-structural
- Layer height consideration: 0.1-0.3mm typical
- Tolerance: 0.2mm clearance for sliding fits, 0.1mm for press fits
How to prompt your CAD model component
[Component type] for [purpose], overall dimensions [X]×[Y]×[Z] mm; features include [list all features, specifying shape, size, position, depth, orientation]; critical elements must include [mounting points, holes, threads, connectors]; style: [functional/organic/geometric]; material appearance: [texture/finish]; printability: [orientation, support requirements, tolerances]


Specification Standards
For Electronics (BOM Requirements)
Every component needs:
Exact model & version: "ESP32-DevKitC V4" not "ESP32 board"
Key specs: Voltage, current, logic levels, communication protocol
Supplier & part number: "Adafruit #4448" or "Digi-Key 1866-3313-ND"
Price & availability: Current pricing, lead time if >2 weeks
For Mechanical Parts
Every part needs:
Fasteners: Type, size, length, material, finish (e.g., "M3×10mm socket head cap screw, stainless steel")
Motors: Type, voltage, torque, shaft size, mounting standard (e.g., "NEMA 17 stepper, 40 N·cm")
Materials: Specific alloys/grades (e.g., "Aluminum 6061-T6" not "aluminum")
For Custom Fabrication
Every custom part needs:
Exact dimensions with tolerances (±0.1mm for precision, ±0.5mm general)
Material specification (grade, finish)
Manufacturing method with key parameters
Post-processing requirements (deburring, coating, heat treatment)

Code Requirements
All firmware must include:
Header: Project name, hardware list, pin configuration table, library versions
User config section: WiFi credentials, thresholds, settings (clearly marked for editing)
Error handling: Sensor failures, communication timeouts, power issues
Debug output: Serial logging with meaningful messages
Non-blocking code: Use millis() timing, avoid delay() in production
Comments: Every function explained, complex logic documented
Troubleshooting guide: Common issues and solutions at the end

Tone & Communication
For Non-Technical Users:
Explain jargon on first use: "GPIO (General Purpose Input/Output) is a pin that can..."
Use analogies: "The capacitor is like a small battery that smooths out voltage bumps"
Encourage questions: "Not sure about X? Let me know and I'll explain differently"
Realistic expectations: "This is a prototype for testing your idea, not a finished product"
What to Avoid:
❌ Assuming prior knowledge ("Just configure the I2C bus" → ✅ "Set the I2C pins: SDA=21, SCL=22")
❌ Vague specs ("small motor" → ✅ "NEMA 17 stepper motor, 40 N·cm torque")
❌ Placeholder solutions ("Buy a sensor" → ✅ "DHT22 temperature sensor, Adafruit #385, $9.95")
❌ Overpromising ("This will work perfectly" → ✅ "This design should work, but you'll need to test and iterate")
Response Structure:
Acknowledge the idea: "That's a great concept for [use case]!"
Simplify if needed: "Let's start with [achievable subsystem] to validate the core idea"
Deliver three parts: CAD → BOM/Assembly → Code
Set expectations: "Build time: X hours, cost: ~$Y, skill level: [beginner/intermediate]"
Encourage iteration: "Test this version and let me know what needs adjustment"

Safety Disclaimer (Always Include)
End every design with:
⚠️ SAFETY CHECKLIST — Complete before use:
□ Verify all electrical connections with a multimeter
□ Test power supply voltage before connecting to circuit
□ Use proper fuses/circuit breakers (specify ratings)
□ Ensure adequate ventilation for heat-generating parts
□ Check all moving parts are properly guarded
□ Never leave prototype unattended during first 24 hours of testing

This design is for prototyping and learning. For commercial products:
- Consult a licensed professional engineer
- Obtain required certifications (UL, CE, FCC)
- Perform extended safety testing

You are responsible for safe implementation and testing.


Quality Checklist (Internal — Verify Before Responding)
Before sending any design, confirm:
✅ All parts have specific model numbers and suppliers
✅ No generic placeholders ("buy a sensor", "use a motor")
✅ BOM includes total cost estimate
✅ Assembly guide has step-by-step instructions with time estimates
✅ Code compiles without errors and includes error handling
✅ Safety warnings appropriate to the design
✅ Scope is achievable for a non-expert builder
✅ Manufacturing methods are accessible (no exotic processes)

Key Principles Summary
Accessibility: Design for non-technical builders
Specificity: Every part fully specified with suppliers
Safety: Always assess and warn about risks
Achievability: Prototype-focused, not production-perfection
Modularity: Break complex projects into testable subsystems
Iteration: Encourage testing, feedback, and refinement
Education: Explain concepts, don't just provide solutions
Remember: Your user doesn't know how to build hardware. That's why they need you. Make it simple, safe, and achievable.

`;
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
              supports: "string"
            }
          ],
          generalNotes: "string"
        },
        AssemblyAndParts: {
          overview: "string",
          partsList: [
            {
              part: "string",
              quantity: "string",
              vendor: "string",
              notes: "string"
            }
          ],
          assemblyInstructions: "string",
          safetyChecklist: "string"
        },
        FirmwareAndCode: {
          microcontroller: "string",
          language: "string",
          code: "string",
          explanation: "string",
          improvementSuggestions: "string"
        }
      }
    };
    const exampleToSchema = (value)=>{
      if (typeof value === 'string') return {
        type: 'string'
      };
      if (Array.isArray(value)) {
        const first = value.length > 0 ? value[0] : {};
        return {
          type: 'array',
          items: exampleToSchema(first)
        };
      }
      if (value && typeof value === 'object') {
        const props = {};
        const required = [];
        for (const [k, v] of Object.entries(value)){
          props[k] = exampleToSchema(v);
          required.push(k);
        }
        return {
          type: 'object',
          properties: props,
          required,
          additionalProperties: false
        };
      }
      return {
        type: 'string'
      };
    };
    const STRICT_SCHEMA = exampleToSchema(AI_OUTPUT_EXAMPLE);
    for (const job of jobs){
      console.log('[EDGE:hardware-initial-test] Processing job', { jobId: job.id, status: job.status });
      try {
        console.log('[EDGE:hardware-initial-test] Updating job status to processing', { jobId: job.id });
        await supabase.from('jobs').update({
          status: 'processing',
          started_at: new Date().toISOString()
        }).eq('id', job.id);
        const payload = job.input ?? {};
        const { title, prompt, projectId, userId } = payload;
        const effectiveUserId = job.user_id ?? userId ?? null;
        if (userId && job.user_id && job.user_id !== userId) {
          console.warn('[EDGE:hardware-initial-test] Mismatched user IDs between job and payload; using job.user_id as source of truth', {
            jobId: job.id,
            jobUserId: job.user_id,
            payloadUserId: userId
          });
        }
        console.log('[EDGE:hardware-initial-test] Job payload extracted', { jobId: job.id, hasTitle: !!title, hasPrompt: !!prompt, projectId, userId, effectiveUserId });
        if (!title || !prompt || !projectId || !effectiveUserId) {
          throw new Error('Missing required input for initial generation');
        }
        // Server-side credit gate (paid_or_unpaid takes precedence)
        console.log('[EDGE:hardware-initial-test] Checking credits', { jobId: job.id, effectiveUserId });
        try {
          const credits = await getUserCredits(supabase, effectiveUserId);
          console.log('[EDGE:hardware-initial-test] Credits fetched', { jobId: job.id, effectiveUserId, credits: credits ? { balance: credits.balance_bigint, paid: credits.paid_or_unpaid } : null });
          console.log('[EDGE:hardware-initial-test] paid_or_unpaid value:', { jobId: job.id, effectiveUserId, paid_or_unpaid: credits?.paid_or_unpaid, paid_or_unpaid_type: typeof credits?.paid_or_unpaid, paid_or_unpaid_raw: credits?.paid_or_unpaid });
          if (!credits) {
            throw new Error('INSUFFICIENT_CREDITS: No credits record');
          }
          if (!credits.paid_or_unpaid && Number(credits.balance_bigint) < CREDIT_COST_HARDWARE_INITIAL) {
            throw new Error('INSUFFICIENT_CREDITS: Need 10 credits for initial hardware generation');
          }
          console.log('[EDGE:hardware-initial-test] Credit check passed', { jobId: job.id, effectiveUserId, balance: credits.balance_bigint, paid: credits.paid_or_unpaid });
        } catch (gateErr) {
          const message = gateErr instanceof Error ? gateErr.message : 'INSUFFICIENT_CREDITS';
          console.error('[EDGE:hardware-initial-test] Credit gate failed for job ' + job.id + ':', message);
          await supabase.from('jobs').update({
            status: 'failed',
            // Normalize error so UI popup can detect reliably
            error: 'INSUFFICIENT_CREDITS',
            finished_at: new Date().toISOString()
          }).eq('id', job.id);
          continue;
        }
        const openaiKey = Deno.env.get('OPENAI_API_KEY') ?? '';
        if (!openaiKey) throw new Error('OPENAI_API_KEY not configured');
        console.log('[EDGE:hardware-initial-test] Calling OpenAI API', { jobId: job.id, title, promptLength: prompt?.length });
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
              strict: true
            }
          }
        };
        const resp = await fetch('https://api.openai.com/v1/responses', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        });
        console.log('[EDGE:hardware-initial-test] OpenAI response received', { jobId: job.id, status: resp.status, ok: resp.ok });
        if (!resp.ok) {
          const t = await resp.text();
          console.error('[EDGE:hardware-initial-test] OpenAI error:', t);
          throw new Error(`OpenAI error ${resp.status}`);
        }
        const data = await resp.json();
        const outputText = data?.output?.[0]?.content?.[0]?.text || data?.output_text;
        console.log('[EDGE:hardware-initial-test] OpenAI output extracted', { jobId: job.id, hasOutputText: !!outputText, outputTextLength: outputText?.length });
        if (!outputText) throw new Error('Structured output missing text payload');
        let parsed;
        try {
          parsed = JSON.parse(outputText);
          console.log('[EDGE:hardware-initial-test] JSON parsed successfully', { jobId: job.id, hasReports: !!parsed?.reports });
        } catch (_e) {
          console.error('[EDGE:hardware-initial-test] JSON parse failed', { jobId: job.id, error: _e, outputTextPreview: outputText?.substring(0, 200) });
          throw new Error('Failed to parse structured JSON output');
        }
        const resultObj = parsed;
        const threeD = resultObj?.reports?.['3DComponents'];
        const assembly = resultObj?.reports?.['AssemblyAndParts'];
        const firmware = resultObj?.reports?.['FirmwareAndCode'];
        console.log('[EDGE:hardware-initial-test] Extracted report sections', { jobId: job.id, hasThreeD: !!threeD, hasAssembly: !!assembly, hasFirmware: !!firmware });
        const assemblyContent = assembly ? [
          assembly.overview || '',
          assembly.assemblyInstructions || '',
          assembly.safetyChecklist || ''
        ].filter(Boolean).join('\n\n') : '';
        const firmwareContent = firmware ? [
          firmware.explanation || '',
          firmware.code || '',
          firmware.improvementSuggestions || ''
        ].filter(Boolean).join('\n\n') : '';
        const insertPayload = {
          project_id: projectId,
          title: title || resultObj?.project || 'Hardware Project',
          '3d_components': threeD ? {
            project: resultObj?.project || title,
            description: resultObj?.description || prompt,
            components: Array.isArray(threeD?.components) ? threeD.components : [],
            generalNotes: typeof threeD?.generalNotes === 'string' ? threeD.generalNotes : ''
          } : null,
          assembly_parts: assembly ? {
            content: assemblyContent,
            partsCount: Array.isArray(assembly.partsList) ? assembly.partsList.length : 0,
            estimatedTime: "2-3 hours",
            difficultyLevel: "Beginner"
          } : null,
          firmware_code: firmware ? {
            content: firmwareContent,
            language: firmware.language || 'C++',
            platform: firmware.microcontroller || 'Arduino IDE',
            libraries: [
              "Servo.h",
              "NewPing.h"
            ],
            codeLines: firmwareContent.split('\n').length
          } : null
        };
        console.log('[EDGE:hardware-initial-test] Preparing hardware_projects insert', { 
          jobId: job.id, 
          projectId, 
          title: insertPayload.title,
          has3D: !!insertPayload['3d_components'],
          hasAssembly: !!insertPayload.assembly_parts,
          hasFirmware: !!insertPayload.firmware_code
        });
        const { data: inserted, error: insertErr } = await retrySupabase('hardware_projects.insert', () =>
          supabase.from('hardware_projects').insert(insertPayload).select('id').single()
        );
        console.log('[EDGE:hardware-initial-test] hardware_projects insert result', { 
          jobId: job.id, 
          insertedId: inserted?.id, 
          error: insertErr ? { message: insertErr.message, code: insertErr.code, details: insertErr.details, hint: insertErr.hint } : null 
        });
        if (insertErr || !inserted) {
          console.error('[EDGE:hardware-initial-test] hardware_projects insert failed', { jobId: job.id, error: insertErr, inserted });
          throw insertErr || new Error('Insert failed');
        }
        console.log('[EDGE:hardware-initial-test] hardware_projects inserted successfully', { jobId: job.id, hardwareProjectId: inserted.id });
        console.log('[EDGE:hardware-initial-test] Updating job to completed', { jobId: job.id, hardwareProjectId: inserted.id });
        await supabase.from('jobs').update({
          status: 'completed',
          finished_at: new Date().toISOString(),
          result: {
            reportId: inserted.id
          }
        }).eq('id', job.id);
        console.log('[EDGE:hardware-initial-test] Job updated to completed', { jobId: job.id });
        // Post-success debit for unpaid users (do NOT deduct on earlier failures)
        console.log('[EDGE:hardware-initial-test] Starting post-success debit', { jobId: job.id, effectiveUserId });
        try {
          const creditsAfter = await getUserCredits(supabase, effectiveUserId);
          console.log('[EDGE:hardware-initial-test] Credits after success', { jobId: job.id, effectiveUserId, credits: creditsAfter ? { balance: creditsAfter.balance_bigint, paid: creditsAfter.paid_or_unpaid } : null });
          if (creditsAfter && !creditsAfter.paid_or_unpaid) {
            console.log('[EDGE:hardware-initial-test] Debiting credits', { jobId: job.id, effectiveUserId, cost: CREDIT_COST_HARDWARE_INITIAL });
            const debit = await debitCreditsIfUnpaid(supabase, effectiveUserId, CREDIT_COST_HARDWARE_INITIAL, 'hardware_initial_generation', job.id);
            if (!debit.ok) {
              console.warn('[EDGE:hardware-initial-test] Post-success debit failed for job ' + job.id + ':', debit.error);
            } else {
              console.log('[EDGE:hardware-initial-test] Credits debited successfully', { jobId: job.id, effectiveUserId, balanceAfter: debit.balanceAfter });
            }
          } else {
            console.log('[EDGE:hardware-initial-test] Skipping debit (paid user or no credits)', { jobId: job.id, effectiveUserId, paid: creditsAfter?.paid_or_unpaid });
          }
        } catch (debitErr) {
          console.warn('[EDGE:hardware-initial-test] Debit step error for job ' + job.id + ':', debitErr);
        }
        console.log('[EDGE:hardware-initial-test] Job processing completed successfully', { jobId: job.id });
      } catch (err) {
        console.error('[EDGE:hardware-initial-test] Job error', { jobId: job.id, error: err, errorMessage: err instanceof Error ? err.message : String(err), errorStack: err instanceof Error ? err.stack : undefined });
        await supabase.from('jobs').update({
          status: 'failed',
          error: err instanceof Error ? err.message : String(err),
          finished_at: new Date().toISOString()
        }).eq('id', job.id);
        console.log('[EDGE:hardware-initial-test] Job marked as failed', { jobId: job.id });
      }
    }
    console.log('[EDGE:hardware-initial-test] All jobs processed', { totalJobs: jobs.length });
    return new Response(JSON.stringify({
      message: `Processed ${jobs.length} initial hardware jobs`
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error('[EDGE:hardware-initial-test] Function error', { error, errorMessage: error instanceof Error ? error.message : String(error), errorStack: error instanceof Error ? error.stack : undefined });
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
