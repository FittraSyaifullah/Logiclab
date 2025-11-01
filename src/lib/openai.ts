// OpenAI integration utilities for LogicLab
// Updated to use GPT-5 Responses API (no temperature; uses reasoning_effort/verbosity)

export const aiModel = "gpt-5"

export async function generateText({
  model,
  system,
  prompt,
  maxTokens = 2000,
  reasoningEffort = 'minimal',
  verbosity = 'medium',
}: {
  model: string
  system: string
  prompt: string
  maxTokens?: number
  reasoningEffort?: 'minimal' | 'low' | 'medium' | 'high'
  verbosity?: 'low' | 'medium' | 'high'
}) {
  try {
    console.log(`[OPENAI] Calling Responses API with model: ${model}`)

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        reasoning_effort: reasoningEffort,
        verbosity,
        max_output_tokens: maxTokens,
        instructions: system,
        input: prompt,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[OPENAI] Responses API error: ${response.status} - ${errorText}`)
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    console.log(`[OPENAI] Full response data:`, JSON.stringify(data, null, 2))

    const text: string | undefined = data?.output_text || data?.output?.[0]?.content?.[0]?.text
    if (!text) {
      throw new Error('No text output from model')
    }
    return { text }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[OPENAI] Error calling Responses API:', error)
    throw new Error(`OpenAI API error: ${message}`)
  }
}

export async function generateStructuredJson({
  system,
  prompt,
  schema,
  model = 'gpt-5',
  maxOutputTokens = 4000,
  reasoningEffort = 'minimal',
  verbosity = 'medium',
}: {
  system: string
  prompt: string
  schema: Record<string, unknown>
  model?: string
  maxOutputTokens?: number
  reasoningEffort?: 'minimal' | 'low' | 'medium' | 'high'
  verbosity?: 'low' | 'medium' | 'high'
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
        reasoning_effort: reasoningEffort,
        verbosity,
        max_output_tokens: maxOutputTokens,
        instructions: system,
        input: prompt,
        text: {
          format: {
            type: 'json_schema',
            name: 'HardwareOutput',
            schema,
            strict: true,
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
    console.log(`[OPENAI] Structured response data:`, JSON.stringify(data, null, 2))

    // Prefer structured parsed output if present
    const parsedDirect = data?.output_parsed as unknown
    if (parsedDirect) {
      return { json: parsedDirect }
    }

    const outputText: string | undefined = data?.output_text || data?.output?.[0]?.content?.[0]?.text
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
