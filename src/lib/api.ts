// API integration utilities for LogicLab

// V0 API integration
export class V0API {
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async createProject(prompt: string) {
    const response = await fetch('https://v0.dev/api/projects', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        framework: 'nextjs',
        language: 'typescript',
      }),
    })

    if (!response.ok) {
      throw new Error(`V0 API error: ${response.statusText}`)
    }

    return response.json()
  }

  async sendMessage(projectId: string, message: string) {
    const response = await fetch(`https://v0.dev/api/projects/${projectId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
      }),
    })

    if (!response.ok) {
      throw new Error(`V0 API error: ${response.statusText}`)
    }

    return response.json()
  }
}

// AdamCAD API integration
export class AdamCADAPI {
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async generate3DModel(components: string[]) {
    const response = await fetch('https://api.adamcad.com/v1/models', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        components,
        format: 'stl',
        quality: 'high',
      }),
    })

    if (!response.ok) {
      throw new Error(`AdamCAD API error: ${response.statusText}`)
    }

    return response.json()
  }

  async updateParameters(modelId: string, parameters: Record<string, number>) {
    const response = await fetch(`https://api.adamcad.com/v1/models/${modelId}/parameters`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        parameters,
      }),
    })

    if (!response.ok) {
      throw new Error(`AdamCAD API error: ${response.statusText}`)
    }

    return response.json()
  }
}

// Perplexity SONAR API integration
export class SONARAPI {
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async generateBusinessReport(projectDescription: string, problemStatement: string) {
    const prompt = `Analyze this project for market research:

Project: ${projectDescription}
Purpose: ${problemStatement}

Provide a comprehensive market analysis including:
1. Ideal customer profile and market viability (score out of 50)
2. Solution-market fit and payment likelihood (score out of 50)  
3. Target market niches (5-10 specific niches)
4. Key competitors with strengths, weaknesses, and opportunities
5. Priority features with customer benefits
6. Honest customer and advisor feedback
7. Customer journey stages with touchpoints and pain points
8. Competitive moats and advantages
9. Testable hypotheses with measurable goals

Format as valid JSON with the structure: {"icp": {"description": "", "score": 0, "viability": ""}, "solution": {"analysis": "", "score": 0, "paymentLikelihood": ""}, "niches": [], "competitors": [{"name": "", "strengths": [], "weaknesses": [], "traction": "", "opportunities": ""}], "features": [{"feature": "", "benefit": "", "priority": ""}], "feedback": {"customer": "", "advisor": ""}, "customerJourney": [{"stage": "", "touchpoints": [], "painPoints": [], "opportunities": []}], "moats": [], "hypotheses": [{"hypothesis": "", "goal": "", "metric": ""}]}`

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 3000,
      }),
    })

    if (!response.ok) {
      throw new Error(`Perplexity API error: ${response.statusText}`)
    }

    return response.json()
  }
}

// API factory function
export function createAPIClients() {
  const v0ApiKey = process.env.V0_API_KEY
  const adamcadApiKey = process.env.ADAMCAD_API_KEY
  const perplexityApiKey = process.env.PERPLEXITY_API_KEY

  if (!v0ApiKey || !adamcadApiKey || !perplexityApiKey) {
    throw new Error('Missing required API keys in environment variables')
  }

  return {
    v0: new V0API(v0ApiKey),
    adamcad: new AdamCADAPI(adamcadApiKey),
    sonar: new SONARAPI(perplexityApiKey),
  }
}
