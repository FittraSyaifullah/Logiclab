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
  } catch (error: any) {
    console.error("[OPENAI] Error calling OpenAI API:", error)
    throw new Error(`OpenAI API error: ${error.message}`)
  }
}
