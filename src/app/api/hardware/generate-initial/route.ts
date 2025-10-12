import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { generateStructuredJson } from "@/lib/openai"

export const maxDuration = 60

type InitialRequestBody = {
  title: string
  prompt: string
  projectId: string
  userId: string
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    const body = (await request.json()) as Partial<InitialRequestBody>
    const { title, prompt, projectId, userId } = body

    if (!userId) return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    if (!title || !prompt || !projectId) return NextResponse.json({ error: "Missing required fields" }, { status: 400 })

    // Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('owner_id', userId)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Synchronous mode: no jobs; generate immediately and return UI-ready payload

    // Hardcoded system prompt and derive JSON Schema from example shape
    const systemPrompt = `You are Buildables, an AI co-engineer that helps founders and makers safely prototype hardware products. 

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
- If you find that the parts of the user's prompts are specific enough, do not bother editing. Focus specifying those that lacks details, especially for the model creation. For example, for prompt format for 3d model generation, if all the details are provided, do not change. Only change if you find that you lack information.

2. Feasibility & Safety  
   - Every design must pass a basic safety and correctness check: components must be compatible, safe for consumer use, and meet realistic material and thermal tolerances.  
   - Flag any designs that would be unsafe, illegal, or outside Buildables' scope (e.g., weapons, cars, rockets, food production machinery). Politely redirect the user to safer consumer electronics, appliances, or IoT devices.  

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
   - For example: "Ensure motor torque ≥ load requirement," or "Print casing with ≥3mm wall thickness for durability."  

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
- Provide multiple size options (prototype scale vs functional scale)`

    const exampleJson = {
      "project": "string",
      "description": "string",
      "reports": {
        "3DComponents": {
          "components": [
            {
              "component": "string",
              "description": "string",
              "promptFor3DGeneration": "string",
              "printSpecifications": "string",
              "assemblyNotes": "string",
              "printTime": "string",
              "material": "string",
              "supports": "string"
            }
          ],
          "generalNotes": "string"
        },
        "AssemblyAndParts": {
          "overview": "string",
          "partsList": [
            {
              "part": "string",
              "quantity": "string",
              "vendor": "string",
              "notes": "string"
            }
          ],
          "assemblyInstructions": "string",
          "safetyChecklist": "string"
        },
        "FirmwareAndCode": {
          "microcontroller": "string",
          "language": "string",
          "code": "string",
          "explanation": "string",
          "improvementSuggestions": "string"
        }
      }
    } as Record<string, unknown>

    // Convert example (with "string" placeholders) into a strict JSON Schema
    const exampleToSchema = (value: unknown): Record<string, unknown> => {
      if (typeof value === 'string') {
        return { type: 'string' }
      }
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

    const strictSchema = exampleToSchema(exampleJson)

    const { json } = await generateStructuredJson({
      system: systemPrompt,
      prompt: `Project Title: ${title}\n\nUser Description: ${prompt}\n\nReturn the required hardware output JSON strictly following the provided schema.`,
      schema: strictSchema,
    })

    // Persist into hardware_projects using existing columns used by UI
    // json shape: { project, description, reports: { 3DComponents, AssemblyAndParts, FirmwareAndCode } }
    const resultObj = json as {
      project?: string
      description?: string
      reports?: {
        '3DComponents'?: { components?: unknown[]; generalNotes?: string }
        'AssemblyAndParts'?: Record<string, unknown>
        'FirmwareAndCode'?: Record<string, unknown>
      }
    }

    const threeD = resultObj?.reports?.['3DComponents']
    const assembly = resultObj?.reports?.['AssemblyAndParts']
    const firmware = resultObj?.reports?.['FirmwareAndCode']

    // Build assembly and firmware content for UI
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

    // Insert
    const { data: reportRow, error: insertErr } = await supabase
      .from('hardware_projects')
      .insert({
        project_id: projectId,
        title: title || resultObj?.project || 'Hardware Project',
        '3d_components': threeD ? {
          project: resultObj?.project || title,
          description: resultObj?.description || prompt,
          components: Array.isArray((threeD as { components?: unknown[] }).components) ? (threeD as { components?: unknown[] }).components : [],
          generalNotes: typeof (threeD as { generalNotes?: string }).generalNotes === 'string' ? (threeD as { generalNotes?: string }).generalNotes as string : '',
        } : null,
        assembly_parts: assembly ? {
          content: assemblyContent,
          partsCount: Array.isArray((assembly as { partsList?: unknown[] }).partsList) ? (assembly as { partsList: unknown[] }).partsList.length : 0,
          estimatedTime: '2-3 hours',
          difficultyLevel: 'Beginner',
        } : null,
        firmware_code: firmware ? {
          content: firmwareContent,
          language: (firmware as { language?: string }).language || 'C++',
          platform: (firmware as { microcontroller?: string }).microcontroller || 'Arduino IDE',
          libraries: [],
          codeLines: firmwareContent.split('\n').length,
        } : null,
      })
      .select()
      .single()

    if (insertErr) {
      return NextResponse.json({ error: 'Failed to store report' }, { status: 500 })
    }

    // UI-ready payload mirroring reports API transform
    const uiReports: Record<string, unknown> = {}
    if (threeD) {
      const descriptionText = typeof (resultObj?.description ?? '') === 'string' ? (resultObj?.description as string) : ''
      const notesText = typeof ((threeD as { generalNotes?: string }).generalNotes ?? '') === 'string' ? (threeD as { generalNotes?: string }).generalNotes as string : ''
      const content = [descriptionText, notesText].filter(Boolean).join('\n\n')
      const mappedComponents = Array.isArray((threeD as { components?: Array<Record<string, unknown>> }).components)
        ? ((threeD as { components?: Array<Record<string, unknown>> }).components as Array<Record<string, unknown>>).map((c) => ({
            name: (c?.component as string) ?? '',
            description: (c?.description as string) ?? '',
            printTime: (c?.printTime as string) ?? '',
            material: (c?.material as string) ?? '',
            supports: (c?.supports as string) ?? '',
            prompt: (c?.promptFor3DGeneration as string) ?? '',
            notes: [c?.printSpecifications as string, c?.assemblyNotes as string].filter(Boolean).join('\n\n'),
          }))
        : []
      uiReports['3d-components'] = { content, components: mappedComponents, reportId: reportRow?.id }
    }
    if (assembly) {
      uiReports['assembly-parts'] = {
        content: assemblyContent,
        partsCount: Array.isArray((assembly as { partsList?: unknown[] }).partsList) ? (assembly as { partsList: unknown[] }).partsList.length : 0,
        estimatedTime: '2-3 hours',
        difficultyLevel: 'Beginner',
        reportId: reportRow?.id,
      }
    }
    if (firmware) {
      uiReports['firmware-code'] = {
        content: firmwareContent,
        language: (firmware as { language?: string }).language || 'C++',
        platform: (firmware as { microcontroller?: string }).microcontroller || 'Arduino IDE',
        libraries: [],
        codeLines: firmwareContent.split('\n').length,
        reportId: reportRow?.id,
      }
    }

    return NextResponse.json({ success: true, reportId: reportRow?.id, reports: uiReports }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error: unknown) {
    console.error('[HARDWARE INITIAL] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


