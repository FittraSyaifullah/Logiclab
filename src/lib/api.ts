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

// SONAR API integration
export class SONARAPI {
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async generateBusinessReport(projectDescription: string, problemStatement: string) {
    const response = await fetch('https://api.sonar.com/v1/reports', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        project_description: projectDescription,
        problem_statement: problemStatement,
        report_type: 'business_analysis',
        include_market_research: true,
        include_competitor_analysis: true,
      }),
    })

    if (!response.ok) {
      throw new Error(`SONAR API error: ${response.statusText}`)
    }

    return response.json()
  }

  async downloadReport(reportId: string, format: 'pdf' | 'html' = 'pdf') {
    const response = await fetch(`https://api.sonar.com/v1/reports/${reportId}/download`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Accept': format === 'pdf' ? 'application/pdf' : 'text/html',
      },
    })

    if (!response.ok) {
      throw new Error(`SONAR API error: ${response.statusText}`)
    }

    return response.blob()
  }
}

// API factory function
export function createAPIClients() {
  const v0ApiKey = process.env.V0_API_KEY
  const adamcadApiKey = process.env.ADAMCAD_API_KEY
  const sonarApiKey = process.env.SONAR_API_KEY

  if (!v0ApiKey || !adamcadApiKey || !sonarApiKey) {
    throw new Error('Missing required API keys in environment variables')
  }

  return {
    v0: new V0API(v0ApiKey),
    adamcad: new AdamCADAPI(adamcadApiKey),
    sonar: new SONARAPI(sonarApiKey),
  }
}
