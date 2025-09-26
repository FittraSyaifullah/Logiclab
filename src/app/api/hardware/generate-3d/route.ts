import { type NextRequest, NextResponse } from "next/server"
import { generateText, aiModel } from "@/lib/openai"
import { createSupabaseClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { projectData } = await request.json()

    if (!projectData) {
      return NextResponse.json({ error: "Project data is required" }, { status: 400 })
    }

    const supabase = createSupabaseClient()

    const generateWithFallback = async () => {
      try {
        const { text } = await generateText({
          model: aiModel,
          system: `You are an AI engineer specializing in breaking down hardware projects into 3D printable components.

Your role is to:
1. Analyze the hardware project and identify all structural components that can be 3D printed
2. Break down complex parts into smaller, assemblable pieces that can fit on standard 3D printers
3. Consider print orientation, support requirements, and assembly methods
4. Provide detailed specifications for each printable component
5. Generate separate prompts for 3D model generation for each component

For complex appliances like washing machines, dishwashers, or large devices:
- Break down into functional modules (motor housing, control panel, drum components, etc.)
- Create scaled-down functional prototypes rather than full-size replicas
- Focus on demonstrating key mechanisms and principles
- Provide multiple size options (prototype scale vs functional scale)

Focus on creating modular, printable parts that users can assemble themselves. Consider standard 3D printer bed sizes (200x200mm typical) and avoid overhangs that require excessive supports.

IMPORTANT: Generate prompts for each separate component that can be used with 3D modeling software or AI 3D generation tools, not actual 3D models.`,
          prompt: `Project: ${projectData.description}

Generate detailed 3D printable components for this hardware project. If this is a complex appliance or large device, create a scaled-down functional prototype that demonstrates the key mechanisms. Break down complex parts into smaller assemblable pieces and provide prompts for generating each component.

For each component, provide:
1. **Prompt for 3D Generation**: Detailed description for 3D modeling
2. Print specifications (time, material, supports)
3. Assembly notes and hardware requirements`,
          temperature: 0.7,
          maxTokens: 2000,
        })
        return text
      } catch (error: any) {
        console.log("Using fallback content due to API limitation")
        throw error // This will trigger the fallback content below
      }
    }

    const text = await generateWithFallback()

    // Store the result in hardware_reports table
    const { data: reportData, error: reportError } = await supabase
      .from('hardware_reports')
      .insert({
        project_id: projectData.id,
        '3d_components': {
          content: text,
          components: [
            {
              name: "Main Housing",
              description: "Primary enclosure for electronics",
              printTime: "2-3 hours",
              material: "PLA",
              supports: "Minimal",
            },
            {
              name: "Sensor Mount",
              description: "Adjustable mount for sensors",
              printTime: "30 minutes",
              material: "PLA",
              supports: "None",
            },
            {
              name: "Control Interface Panel",
              description: "Face plate for control indicators and buttons",
              printTime: "45 minutes",
              material: "PLA (white for light diffusion)",
              supports: "None",
            },
            {
              name: "Motor Mount Assembly",
              description: "Bracket for mounting servo motors with adjustable positioning",
              printTime: "1 hour",
              material: "PETG for strength",
              supports: "Minimal",
            },
          ],
        }
      })
      .select()
      .single()

    if (reportError) {
      console.error("Failed to store 3D components report:", reportError)
      return NextResponse.json({ error: "Failed to store report" }, { status: 500 })
    }

    return NextResponse.json({
      content: text,
      reportId: reportData.id,
      components: [
        {
          name: "Main Housing",
          description: "Primary enclosure for electronics",
          printTime: "2-3 hours",
          material: "PLA",
          supports: "Minimal",
        },
        {
          name: "Sensor Mount",
          description: "Adjustable mount for sensors",
          printTime: "30 minutes",
          material: "PLA",
          supports: "None",
        },
        {
          name: "Control Interface Panel",
          description: "Face plate for control indicators and buttons",
          printTime: "45 minutes",
          material: "PLA (white for light diffusion)",
          supports: "None",
        },
        {
          name: "Motor Mount Assembly",
          description: "Bracket for mounting servo motors with adjustable positioning",
          printTime: "1 hour",
          material: "PETG for strength",
          supports: "Minimal",
        },
      ],
    })
  } catch (error: any) {
    console.log("3D Models generation using fallback content")

    const supabase = createSupabaseClient()
    const { projectData } = await request.json()

    const fallbackContent = `# 3D Printable Components

## Component Breakdown & Generation Prompts

### 1. Main Housing/Enclosure
**Prompt for 3D Generation**: "Create a rectangular electronics enclosure with dimensions 120x80x40mm, featuring mounting posts for Arduino Uno, ventilation slots on sides, and removable top cover with snap-fit closure"
- **Print Time**: 2-3 hours
- **Material**: PLA recommended
- **Supports**: Minimal tree supports for overhangs

### 2. Sensor Mount Bracket
**Prompt for 3D Generation**: "Design an adjustable sensor mount bracket with 40x30x20mm base, featuring slots for ultrasonic sensor HC-SR04, with 15-degree tilt adjustment mechanism"
- **Print Time**: 30 minutes
- **Material**: PLA or PETG
- **Supports**: None required

### 3. Assembly Brackets (2x)
**Prompt for 3D Generation**: "Create L-shaped mounting brackets 25x15x10mm with M3 screw holes, designed for connecting housing components with 90-degree joints"
- **Print Time**: 15 minutes each
- **Material**: PLA
- **Supports**: None required

### 4. Cable Management Clips (4x)
**Prompt for 3D Generation**: "Design small cable clips 10x8x5mm with snap-fit mechanism for organizing jumper wires inside electronics housing"
- **Print Time**: 5 minutes each
- **Material**: Flexible TPU preferred

### 5. Control Interface Panel
**Prompt for 3D Generation**: "Create a control panel face plate 80x60x3mm with cutouts for LED indicators, push buttons, and small OLED display, featuring recessed button wells and LED light pipes"
- **Print Time**: 45 minutes
- **Material**: PLA (white for light diffusion)
- **Supports**: None required

### 6. Motor Mount Assembly
**Prompt for 3D Generation**: "Design a motor mounting bracket for servo motors with adjustable angle positioning, featuring 40x40x25mm base with M3 mounting holes and 180-degree rotation capability"
- **Print Time**: 1 hour
- **Material**: PETG for strength
- **Supports**: Minimal supports for overhangs

## Assembly Instructions
1. Print all components with 0.2mm layer height
2. Use M3 screws for permanent connections
3. Test fit all parts before final assembly
4. Consider printing spare clips and brackets

*Note: All components designed for standard 200x200mm print bed*`

    // Store fallback content in hardware_reports table
    const { data: reportData, error: reportError } = await supabase
      .from('hardware_reports')
      .insert({
        project_id: projectData.id,
        '3d_components': {
          content: fallbackContent,
          components: [
            {
              name: "Main Housing",
              description: "Primary enclosure for electronics",
              printTime: "2-3 hours",
              material: "PLA",
              supports: "Minimal",
            },
            {
              name: "Sensor Mount",
              description: "Adjustable mount for sensors",
              printTime: "30 minutes",
              material: "PLA",
              supports: "None",
            },
            {
              name: "Control Interface Panel",
              description: "Face plate for control indicators and buttons",
              printTime: "45 minutes",
              material: "PLA (white for light diffusion)",
              supports: "None",
            },
            {
              name: "Motor Mount Assembly",
              description: "Bracket for mounting servo motors with adjustable positioning",
              printTime: "1 hour",
              material: "PETG for strength",
              supports: "Minimal",
            },
          ],
        }
      })
      .select()
      .single()

    return NextResponse.json({
      content: fallbackContent,
      reportId: reportData?.id,
      components: [
        {
          name: "Main Housing",
          description: "Primary enclosure for electronics",
          printTime: "2-3 hours",
          material: "PLA",
          supports: "Minimal",
        },
        {
          name: "Sensor Mount",
          description: "Adjustable mount for sensors",
          printTime: "30 minutes",
          material: "PLA",
          supports: "None",
        },
        {
          name: "Control Interface Panel",
          description: "Face plate for control indicators and buttons",
          printTime: "45 minutes",
          material: "PLA (white for light diffusion)",
          supports: "None",
        },
        {
          name: "Motor Mount Assembly",
          description: "Bracket for mounting servo motors with adjustable positioning",
          printTime: "1 hour",
          material: "PETG for strength",
          supports: "Minimal",
        },
      ],
    })
  }
}
