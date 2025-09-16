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

interface V0ChatData {
  projectId: string
  message: string
}

interface V0ChatResult {
  chatId?: string
  demoUrl?: string
  error?: string
}

interface V0MessageData {
  chatId: string
  message: string
}

interface V0MessageResult {
  demoUrl?: string
  error?: string
}

export async function createV0Project(data: V0ProjectData): Promise<V0ProjectResult> {
  try {
    console.log(`[V0] Creating project: ${data.name}`)
    const v0ApiKey = process.env.V0_API_KEY
    
    if (!v0ApiKey) {
      console.warn(`[V0] V0_API_KEY not found, using mock response`)
      // Mock response for development
      const mockProject = {
        id: `v0_${Date.now()}`,
        name: data.name,
        description: data.description,
      }
      console.log(`[V0] Mock project created: ${mockProject.id}`)
      return { project: mockProject }
    }

    console.log(`[V0] Making API call to create project`)
    const response = await fetch('https://v0.dev/api/projects', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${v0ApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: data.name,
        description: data.description,
        userId: data.userId,
        userEmail: data.userEmail,
      }),
    })

    if (!response.ok) {
      console.log(`[V0] API call failed: ${response.status} ${response.statusText}`)
      throw new Error(`V0 API error: ${response.status} ${response.statusText}`)
    }

    const result = await response.json()
    const projectId = response.headers.get('id') || result.id
    console.log(`[V0] Project created successfully: ${projectId}`)

    return {
      project: {
        id: projectId,
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

export async function createV0Chat(data: V0ChatData): Promise<V0ChatResult> {
  try {
    console.log(`[V0] Creating chat for project: ${data.projectId}`)
    const v0ApiKey = process.env.V0_API_KEY
    
    if (!v0ApiKey) {
      console.warn(`[V0] V0_API_KEY not found, using mock response`)
      // Mock response for development
      const mockChatId = `chat_${Date.now()}`
      const mockDemoUrl = `https://v0.dev/demo/${mockChatId}`
      console.log(`[V0] Mock chat created: ${mockChatId}`)
      return { chatId: mockChatId, demoUrl: mockDemoUrl }
    }

    console.log(`[V0] Making API call to create chat`)
    const response = await fetch('https://v0.dev/api/chats', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${v0ApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        projectId: data.projectId,
        message: data.message,
      }),
    })

    if (!response.ok) {
      console.log(`[V0] Chat API call failed: ${response.status} ${response.statusText}`)
      throw new Error(`V0 API error: ${response.status} ${response.statusText}`)
    }

    const result = await response.json()
    const chatId = response.headers.get('id') || result.chatId
    console.log(`[V0] Chat created successfully: ${chatId}`)

    return {
      chatId,
      demoUrl: result.demoUrl || `https://v0.dev/demo/${chatId}`
    }
  } catch (error) {
    console.error(`[V0] Chat creation failed:`, error)
    return {
      error: error instanceof Error ? error.message : 'Failed to create v0 chat'
    }
  }
}

export async function sendV0Message(data: V0MessageData): Promise<V0MessageResult> {
  try {
    console.log(`[V0] Sending message to chat: ${data.chatId}`)
    const v0ApiKey = process.env.V0_API_KEY
    
    if (!v0ApiKey) {
      console.warn(`[V0] V0_API_KEY not found, using mock response`)
      // Mock response for development
      const mockDemoUrl = `https://v0.dev/demo/${data.chatId}?updated=${Date.now()}`
      console.log(`[V0] Mock message sent, demo URL: ${mockDemoUrl}`)
      return { demoUrl: mockDemoUrl }
    }

    console.log(`[V0] Making API call to send message`)
    const response = await fetch('https://v0.dev/api/chats/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${v0ApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chatId: data.chatId,
        message: data.message,
      }),
    })

    if (!response.ok) {
      console.log(`[V0] Message API call failed: ${response.status} ${response.statusText}`)
      throw new Error(`V0 API error: ${response.status} ${response.statusText}`)
    }

    const result = await response.json()
    console.log(`[V0] Message sent successfully`)

    return {
      demoUrl: result.demoUrl || `https://v0.dev/demo/${data.chatId}`
    }
  } catch (error) {
    console.error(`[V0] Message sending failed:`, error)
    return {
      error: error instanceof Error ? error.message : 'Failed to send v0 message'
    }
  }
}

