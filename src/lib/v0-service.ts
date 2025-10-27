import { createClient } from 'v0-sdk'

// Timeout utility function
const withTimeout = <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Request timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ])
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

interface V0ProjectData {
  name: string
  description: string
  userId: string
  userEmail: string
}

interface V0ProjectResult {
  project?: {
    id: string
    name: string
    description: string
  }
  error?: string
}

// Software chat/message paths removed per requirements

export async function createV0Project(data: V0ProjectData): Promise<V0ProjectResult> {
  try {
    console.log(`[V0] Creating project: ${data.name}`)
    const v0ApiKey = process.env.V0_API_KEY
    
    if (!v0ApiKey) {
      console.error(`[V0] V0_API_KEY not configured`)
      return { error: 'V0_API_KEY not configured' }
    }

    // Initialize v0 SDK
    const client = createClient({
      apiKey: v0ApiKey,
    })

    console.log(`[V0] Making API call to create project using SDK`)
    const result = await client.projects.create({
      name: data.name,
      description: data.description,
    })

    console.log(`[V0] Project created successfully:`, result)
    console.log(`[V0] Project ID: ${result.id}`)

    return {
      project: {
        id: result.id,
        name: data.name,
        description: data.description,
      }
    }
  } catch (error) {
    console.error(`[V0] Project creation failed:`, error)
    return {
      error: error instanceof Error ? error.message : 'Failed to create v0 project'
    }
  }
}

// createV0Chat and sendV0Message removed

