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

export async function createV0Project(data: V0ProjectData): Promise<V0ProjectResult> {
  try {
    // For now, we'll simulate the v0 project creation
    // In production, you'd call the actual v0 API
    console.log('Creating v0 project:', data)
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Mock response
    const mockProject = {
      id: `v0_${Date.now()}`,
      name: data.name,
      description: data.description,
    }
    
    console.log('V0 project created successfully:', mockProject)
    
    return {
      project: mockProject
    }
  } catch (error) {
    console.error('V0 project creation failed:', error)
    return {
      error: error instanceof Error ? error.message : 'Failed to create v0 project'
    }
  }
}

