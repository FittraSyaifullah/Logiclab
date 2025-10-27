// API integration utilities for LogicLab

// V0 API integration (signup-only)
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

// Note: SONAR and AdamCAD integrations removed per current scope
