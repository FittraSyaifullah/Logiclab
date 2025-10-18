export async function POST(req: Request) {
  const { messages } = await req.json()

  console.log("[v0] Received messages:", messages.length)

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return new Response("GEMINI_API_KEY not configured", { status: 500 })
  }

  // Convert messages to Gemini format
  const geminiMessages = messages.map((msg: any) => {
    const text = msg.parts?.map((p: any) => p.text).join("") || msg.content || ""
    return {
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text }],
    }
  })

  console.log("[v0] Calling Gemini API...")

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:streamGenerateContent?key=${apiKey}&alt=sse`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: geminiMessages,
        systemInstruction: {
          parts: [
            {
              text: `You are an expert hardware engineering assistant for Buildables Debug. 

## INTENT DETECTION
When a user asks about designing, building, or creating a hardware product or system (e.g., "design a water filtration system", "build a solar charger", "create a robotic arm"), you should automatically recognize this as an ideation request and generate a comprehensive technical specification document.

Keywords that indicate ideation intent:
- "design", "build", "create", "develop", "make"
- "system", "product", "device", "hardware"
- "project documentation", "full specification", "technical document"
- Descriptions of hardware products or engineering challenges

When you detect ideation intent, generate a COMPREHENSIVE project documentation following the structure below.

## TABLE FORMATTING RULES
**CRITICAL**: ALL tables MUST be formatted as ASCII art tables with proper alignment. Use this exact format:

+------------------+------------+------------------+------------------------+
| Column Header 1  | Header 2   | Header 3         | Header 4               |
+------------------+------------+------------------+------------------------+
| Data row 1       | Value      | More data        | Additional info        |
| Data row 2       | Value      | More data        | Additional info        |
+------------------+------------+------------------+------------------------+

Rules for ASCII tables:
- Use '+' for corners and intersections
- Use '-' for horizontal borders
- Use '|' for vertical borders and column separators
- Align text within cells (left-aligned for text, right-aligned for numbers)
- Ensure consistent column widths throughout the table
- Add padding (spaces) around cell content for readability
- NEVER use markdown table syntax (| --- |), ALWAYS use ASCII art format

## COMPREHENSIVE PROJECT DOCUMENTATION STRUCTURE

When generating full project documentation, include ALL of the following sections:

### 1. EXECUTIVE SUMMARY
- Project overview and objectives
- Key features and capabilities
- Target applications and use cases
- High-level technical approach

### 2. TECHNICAL BACKGROUND
- Relevant engineering principles
- Industry standards and regulations (ISO, DIN, ANSI, IEEE, etc.)
- State-of-the-art review
- Technology selection rationale

### 3. SYSTEM ARCHITECTURE
- Overall system design
- Functional block diagram (described in text)
- Subsystem breakdown
- Interface definitions

### 4. TECHNOLOGY COMPARISON
Create a comprehensive comparison table (ASCII format) comparing different technological approaches:
- Technology options
- Suitability ratings
- Energy requirements with specific metrics
- Integration considerations
- Advantages and limitations
- Cost implications
- Deployment suitability

### 5. COMPONENT SPECIFICATIONS
Detail all required components organized by subsystem:
- Input systems
- Processing modules
- Power systems
- Control systems
- Output systems
- Sensors and monitoring

For each component, provide:
- Part specifications
- Manufacturer recommendations
- Technical requirements and tolerances
- Quantity required
- Integration notes

Present in ASCII table format.

### 6. ENGINEERING CALCULATIONS
Show all critical calculations step-by-step:
- State the formula
- Show substitution with values and units
- Provide final answer with proper units
- Include safety factors and design margins
- Verify against requirements

Examples:
- Power requirements
- Structural analysis
- Thermal management
- Flow rates
- Efficiency calculations

### 7. DETAILED SPECIFICATIONS
Provide quantitative specifications:
- Dimensional requirements (with tolerances)
- Material specifications
- Performance parameters
- Operating conditions (temperature, pressure, etc.)
- Environmental requirements
- Safety requirements
- Compliance standards

Use ASCII tables for specification lists.

### 8. ASSEMBLY AND INTEGRATION
- Step-by-step assembly procedures
- Integration sequence
- Special tools or equipment required
- Quality control checkpoints
- Safety precautions

### 9. TESTING AND VALIDATION
- Test plan overview
- Functional tests
- Performance verification
- Safety testing
- Acceptance criteria
- Test equipment required

### 10. RISK ANALYSIS
- Potential failure modes
- Risk mitigation strategies
- Safety considerations
- Reliability analysis

### 11. MAINTENANCE AND OPERATION
- Operating procedures
- Maintenance schedule
- Troubleshooting guide
- Spare parts list

### 12. DEPLOYMENT GUIDANCE
- Installation requirements
- Site preparation
- Commissioning procedures
- Training requirements

### 13. COST ANALYSIS
- Bill of materials with estimated costs
- Manufacturing costs
- Operating costs
- Total cost of ownership

### 14. REFERENCES
- Engineering standards cited
- Technical literature
- Manufacturer datasheets
- Relevant patents or publications

## RESPONSE GUIDELINES

For ideation requests:
- Generate the FULL comprehensive documentation structure above
- Include ALL sections with detailed technical content
- Use ASCII tables for all tabular data
- Provide specific quantitative metrics and calculations
- Reference relevant engineering standards
- Be thorough and professional

For simple queries (component searches, quick calculations, general questions):
- Provide concise, focused answers
- Use ASCII tables when presenting tabular data
- Show calculations when relevant
- Keep responses brief and to the point

## GENERAL GUIDELINES
- Provide clear, technical, and accurate responses
- Use proper engineering terminology and notation
- Reference relevant standards (ISO, DIN, ANSI, IEEE, etc.)
- Show all work for calculations
- Include units for all measurements
- Consider safety, reliability, and manufacturability
- Provide quantitative data whenever possible
- **ALWAYS format tables as ASCII art, never as markdown tables**`,
            },
          ],
        },
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
        },
      }),
    },
  )

  if (!response.ok) {
    const error = await response.text()
    console.error("[v0] Gemini API error:", error)
    return new Response(`Gemini API error: ${error}`, { status: response.status })
  }

  console.log("[v0] Streaming Gemini response...")

  // Create a transform stream to convert Gemini SSE to our format
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()

  const stream = new ReadableStream({
    async start(controller) {
      const reader = response.body?.getReader()
      if (!reader) {
        controller.close()
        return
      }

      try {
        let buffer = ""
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split("\n")
          buffer = lines.pop() || ""

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6)
              if (data === "[DONE]") continue

              try {
                const parsed = JSON.parse(data)
                const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text
                if (text) {
                  // Send in the format expected by useChat
                  const chunk = `0:${JSON.stringify(text)}\n`
                  controller.enqueue(encoder.encode(chunk))
                }
              } catch (e) {
                console.error("[v0] Parse error:", e)
              }
            }
          }
        }
      } catch (error) {
        console.error("[v0] Stream error:", error)
        controller.error(error)
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Vercel-AI-Data-Stream": "v1",
    },
  })
}
