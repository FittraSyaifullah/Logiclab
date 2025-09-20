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

interface V0ChatData {
  projectId: string
  message: string
}

interface V0ChatResult {
  chatId?: string
  demoUrl?: string
  chatUrl?: string
  message?: string
  needsClarification?: boolean
  error?: string
}

interface V0MessageData {
  chatId: string
  message: string
}

interface V0MessageResult {
  demoUrl?: string
  chatUrl?: string
  message?: string
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

    // Initialize v0 SDK
    const client = createClient({
      apiKey: v0ApiKey,
    })

    console.log(`[V0] Making API call to create chat using SDK`)
    console.log(`[V0] Request parameters:`, {
      projectId: data.projectId,
      message: data.message
    })
    
    const result = await withTimeout(
      client.chats.create({
        projectId: data.projectId,
        message: data.message,
        // Ensure synchronous behavior so latestVersion is materialized when possible
        responseMode: 'sync' as any,
      } as any),
      110000 // 110 seconds timeout (just under 2 minutes)
    )

    console.log(`[V0] Chat created successfully:`, result)
    console.log(`[V0] Full result structure:`, JSON.stringify(result, null, 2))
    
    // Check if result is what we expect
    if (!result) {
      console.error(`[V0] No result returned from v0 API`)
      return {
        error: 'No result returned from v0 API'
      }
    }
    
    // Handle different response types
    if ('id' in result) {
        console.log(`[V0] Chat ID: ${result.id}`)
        console.log(`[V0] Web URL (chat URL): ${result.webUrl}`)
        console.log(`[V0] Latest Version exists: ${!!result.latestVersion}`)
        
        if (result.latestVersion) {
          console.log(`[V0] Latest Version details:`, JSON.stringify(result.latestVersion, null, 2))
          console.log(`[V0] Latest Version status: ${result.latestVersion.status}`)
          console.log(`[V0] Demo URL (iframe URL): ${result.latestVersion.demoUrl}`)
        } else {
          console.log(`[V0] No latestVersion available yet`)
        }
        
        // Extract latest assistant message if present
        let assistantMessage: string | undefined = undefined
        if (Array.isArray((result as any).messages)) {
          const assistantMessages = (result as any).messages.filter((m: any) => m.role === 'assistant')
          if (assistantMessages.length > 0) {
            assistantMessage = assistantMessages[assistantMessages.length - 1].content
          }
        }

        // Map URLs correctly:
        // - demoUrl: iframe-embeddable demo URL (for iframe)
        // - chatUrl: chat URL (for navigation)
        let demoUrl = result.latestVersion?.demoUrl
        const chatUrl = result.webUrl

        console.log(`[V0] Mapped URLs - Demo: ${demoUrl}, Chat: ${chatUrl}`)

        // If no demoUrl yet, perform short server-side polling to wait until ready
        if (!demoUrl) {
          console.log(`[V0] No demoUrl yet. Starting short polling for chat: ${result.id}`)
          const maxAttempts = 8
          for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            await delay(1500)
            try {
              const refreshed: any = await client.chats.getById({ chatId: (result as any).id } as any)
              demoUrl = refreshed?.latestVersion?.demoUrl
              console.log(`[V0] Poll attempt ${attempt}/${maxAttempts} - Demo URL: ${demoUrl}`)
              if (demoUrl) {
                break
              }
            } catch (pollErr) {
              console.warn(`[V0] Poll attempt ${attempt} failed:`, pollErr)
            }
          }
        }

        // Check if we have a demo URL or if v0 provided a clarification message
        if (!demoUrl) {
          // Check if v0 provided a clarification message instead of a demo URL
          if (assistantMessage) {
            console.log(`[V0] No demo URL but v0 provided clarification message`)
            return {
              chatId: result.id,
              demoUrl: undefined, // No demo URL available yet
              chatUrl,
              message: assistantMessage,
              needsClarification: true, // Flag to indicate v0 needs more context
              error: undefined,
            }
          } else {
            console.error(`[V0] Demo URL still not available after polling and no clarification message`)
            return { error: 'Demo URL not ready and no clarification message provided' }
          }
        }

        return {
          chatId: result.id,
          demoUrl,
          chatUrl,
          message: assistantMessage,
          error: undefined,
        }
    } else {
      // Handle stream response
      console.log(`[V0] Stream response received`)
      return {
        chatId: `stream_${Date.now()}`,
        demoUrl: `https://v0.dev/demo/stream_${Date.now()}`
      }
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

    // Initialize v0 SDK
    const client = createClient({
      apiKey: v0ApiKey,
    })

    console.log(`[V0] Making API call to send message using SDK`)
    console.log(`[V0] - Chat ID: ${data.chatId}`)
    console.log(`[V0] - Message: ${data.message}`)
    
    const result = await withTimeout(
      client.chats.sendMessage({
        chatId: data.chatId,
        message: data.message,
      }),
      110000 // 110 seconds timeout (just under 2 minutes)
    )

    console.log(`[V0] Message sent successfully:`, result)
    console.log(`[V0] Full result structure:`, JSON.stringify(result, null, 2))
    
    // Handle different response types
    if ('id' in result) {
      console.log(`[V0] Chat ID: ${result.id}`)
      console.log(`[V0] Web URL (chat URL): ${result.webUrl}`)
      console.log(`[V0] Demo URL (iframe URL): ${result.latestVersion?.demoUrl}`)
      console.log(`[V0] Messages array:`, result.messages)
      
      // Extract the latest assistant message from the messages array
      let assistantMessage = undefined
      if (result.messages && Array.isArray(result.messages)) {
        // Find the latest assistant message
        const assistantMessages = result.messages.filter(msg => msg.role === 'assistant')
        if (assistantMessages.length > 0) {
          const latestAssistantMessage = assistantMessages[assistantMessages.length - 1]
          assistantMessage = latestAssistantMessage.content
          console.log(`[V0] Latest assistant message content: ${assistantMessage}`)
        }
      }
      
      // Map URLs correctly:
      // - demoUrl: iframe-embeddable demo URL (for iframe)
      // - chatUrl: chat URL (for navigation)
      const demoUrl = result.latestVersion?.demoUrl
      const chatUrl = result.webUrl
      
      console.log(`[V0] Mapped URLs - Demo: ${demoUrl}, Chat: ${chatUrl}`)
      console.log(`[V0] Assistant message: ${assistantMessage}`)
      
      return {
        demoUrl: demoUrl,
        chatUrl: chatUrl,
        message: assistantMessage
      }
    } else {
      // Handle stream response or other types
      console.log(`[V0] Stream response received`)
      return {
        demoUrl: `https://v0.dev/demo/${data.chatId}`,
        chatUrl: `https://v0.app/chat/${data.chatId}`,
        message: undefined
      }
    }
  } catch (error) {
    console.error(`[V0] Message sending failed:`, error)
    return {
      error: error instanceof Error ? error.message : 'Failed to send v0 message'
    }
  }
}

