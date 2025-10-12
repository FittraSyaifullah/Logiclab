// OpenAI integration utilities for LogicLab
// This calls the actual OpenAI API

export const aiModel = "gpt-4"

export async function generateText({
  model,
  system,
  prompt,
  temperature = 0.7,
  maxTokens = 2000,
}: {
  model: string
  system: string
  prompt: string
  temperature?: number
  maxTokens?: number
}) {
  try {
    console.log(`[OPENAI] Calling OpenAI API with model: ${model}`)

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt }
        ],
        temperature,
        max_tokens: maxTokens,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[OPENAI] API error: ${response.status} - ${errorText}`)
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    console.log(`[OPENAI] Successfully generated response with ${data.usage?.total_tokens || 0} tokens`)

    return { text: data.choices[0].message.content }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error("[OPENAI] Error calling OpenAI API:", error)
    throw new Error(`OpenAI API error: ${message}`)
  }
}

export async function generateStructuredJson({
  system,
  prompt,
  schema,
  model = "gpt-4.1-mini",
  temperature = 0.3,
  maxOutputTokens = 4000,
}: {
  system: string
  prompt: string
  schema: Record<string, unknown>
  model?: string
  temperature?: number
  maxOutputTokens?: number
}) {
  try {
    console.log(`[OPENAI] Calling Responses API with structured output model: ${model}`)

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature,
        max_output_tokens: maxOutputTokens,
        input: [
          { role: 'system', content: [{ type: 'text', text: system }] },
          { role: 'user', content: [{ type: 'text', text: prompt }] },
        ],
        text: {
          format: {
            type: 'json_schema',
            json_schema: {
              name: 'HardwareOutput',
              schema,
              strict: true,
            },
          },
        },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[OPENAI] Responses API error: ${response.status} - ${errorText}`)
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    const outputText: string | undefined = data?.output?.[0]?.content?.[0]?.text || data?.output_text
    if (!outputText) {
      throw new Error('Structured output missing text payload')
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(outputText)
    } catch (e) {
      console.error('[OPENAI] Failed to parse structured JSON:', e, outputText?.slice(0, 200))
      throw new Error('Failed to parse structured JSON output')
    }

    return { json: parsed }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[OPENAI] Error calling structured Responses API:', error)
    throw new Error(`OpenAI API error: ${message}`)
  }
}
