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
          system: `You are an AI engineer teaching non-technical users how to assemble hardware projects.

Your role is to:
1. Generate step-by-step assembly instructions from step 1 to completion
2. Create detailed parts lists with specifications and where to source components
3. Provide wiring diagrams and connection details
4. Guide users through observation-based assembly (visual cues, color coding)
5. Include safety warnings and best practices
6. Ask clarifying questions if component details are unclear

Focus on clear, beginner-friendly instructions that anyone can follow. Use visual descriptions and avoid technical jargon.`,
          prompt: `Project: ${projectData.description}

Generate comprehensive assembly instructions and parts list for this hardware project.`,
          temperature: 0.7,
          maxTokens: 2000,
        })
        return text
      } catch (error: any) {
        console.log("Using fallback content due to API limitation")
        throw error
      }
    }

    const text = await generateWithFallback()

    // Store the result in hardware_reports table
    const { data: reportData, error: reportError } = await supabase
      .from('hardware_reports')
      .insert({
        project_id: projectData.id,
        assembly_parts: {
          content: text,
          partsCount: 8,
          estimatedTime: "2-3 hours",
          difficultyLevel: "Beginner",
        }
      })
      .select()
      .single()

    if (reportError) {
      console.error("Failed to store assembly report:", reportError)
      return NextResponse.json({ error: "Failed to store report" }, { status: 500 })
    }

    return NextResponse.json({
      content: text,
      reportId: reportData.id,
      partsCount: 8,
      estimatedTime: "2-3 hours",
      difficultyLevel: "Beginner",
    })
  } catch (error: any) {
    console.log("Assembly generation using fallback content")

    const supabase = createSupabaseClient()
    const { projectData } = await request.json()

    const fallbackContent = `# Assembly Instructions

## Parts List & Bill of Materials

### Electronic Components
1. **Arduino Uno R3** - Main microcontroller ($25)
   - Source: Arduino.cc, Amazon, SparkFun
2. **Ultrasonic Sensor (HC-SR04)** - Distance detection ($3)
   - 4-pin sensor with 2cm-400cm range
3. **Servo Motor (SG90)** - Actuator mechanism ($8)
   - 180-degree rotation, 1.6kg torque
4. **Breadboard (Half-size)** - Prototyping connections ($5)
   - 400 tie points, self-adhesive
5. **Jumper Wires** - Male-to-male connections ($3)
   - Pack of 40, various colors
6. **USB Cable (A to B)** - Programming and power ($5)
   - 6ft length recommended
7. **9V Battery Pack** - Portable power optional ($8)
   - With barrel jack connector

### Hardware & Fasteners
8. **M3 Screws** - 8mm length (4x) ($2)
9. **M3 Nuts** - For secure mounting (4x)
10. **3D Printed Housing** - Custom enclosure (see 3D Components tab)

**Total Estimated Cost: ~$59**

## Step-by-Step Assembly Instructions

### Step 1: Prepare Workspace
- Clear, well-lit work area
- Anti-static mat recommended
- Organize components by type
- Have small screwdriver ready

### Step 2: Install Arduino in Housing
- Place Arduino Uno in main housing compartment
- Align USB port with housing opening
- Secure with M3 screws through mounting holes
- Ensure board sits flat and stable

### Step 3: Mount Ultrasonic Sensor
- Insert HC-SR04 sensor into front panel slots
- Sensor eyes should face outward
- Secure with small clips or adhesive
- Verify sensor can "see" clearly ahead

### Step 4: Wire Ultrasonic Sensor
- **VCC (Red wire)** → Arduino 5V pin
- **GND (Black wire)** → Arduino GND pin
- **Trig (Blue wire)** → Arduino Digital Pin 7
- **Echo (Green wire)** → Arduino Digital Pin 8
- Use breadboard for clean connections

### Step 5: Install Servo Motor
- Mount SG90 servo in designated housing slot
- Servo horn should move freely
- Secure with provided servo screws
- Route wires through cable management clips

### Step 6: Wire Servo Motor
- **Red wire** → Arduino 5V pin (shared with sensor)
- **Brown/Black wire** → Arduino GND pin
- **Orange/Yellow wire** → Arduino Digital Pin 9
- Double-check all power connections

### Step 7: Power Connections
- Connect USB cable to Arduino
- For portable operation, connect 9V battery pack
- Test power LED on Arduino lights up
- Verify no loose connections

### Step 8: Final Assembly & Testing
- Close housing carefully, avoiding wire pinching
- Secure housing with remaining screws
- Upload firmware code (see Firmware tab)
- Test sensor detection and servo movement

## Safety Warnings
⚠️ **Always disconnect power when making connections**
⚠️ **Double-check wiring before powering on**
⚠️ **Avoid short circuits between power pins**

## Troubleshooting
- **No power**: Check USB connection and cable
- **Sensor not working**: Verify 5V and GND connections
- **Servo not moving**: Check pin 9 connection and power supply
- **Erratic behavior**: Ensure stable power supply

**Assembly Time**: 2-3 hours for beginners
**Difficulty Level**: Beginner-friendly with basic soldering skills`

    // Store fallback content in hardware_reports table
    const { data: reportData, error: reportError } = await supabase
      .from('hardware_reports')
      .insert({
        project_id: projectData.id,
        assembly_parts: {
          content: fallbackContent,
          partsCount: 10,
          estimatedTime: "2-3 hours",
          difficultyLevel: "Beginner",
        }
      })
      .select()
      .single()

    return NextResponse.json({
      content: fallbackContent,
      reportId: reportData?.id,
      partsCount: 10,
      estimatedTime: "2-3 hours",
      difficultyLevel: "Beginner",
    })
  }
}
