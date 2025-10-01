export interface Creation {
  id: string
  title: string
  prompt: string
  mode: "hardware" | "software"
  viewMode?: "model" | "code"
  chatHistory: ChatMessage[]
  components: Component[]
  customParams: CustomParam[]
  microcontroller?: string
  outputFormat?: ".ino" | ".py" | ".c"
  imageUrl?: string
  imagePrompt?: string
  modelUrl?: string
  generatedCode?: string
  hasCode?: boolean
  isGenerating3D?: boolean
  error?: string
  softwareData?: SoftwareData
  hardwareData?: HardwareData
  hardwareReports?: HardwareReports
  hardwareSpecs?: HardwareSpecs
  hardwareModels?: Record<string, HardwareComponentModel>
  codeVersions?: CodeVersion[]
  activeCodeVersion?: string
}

export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  createdAt?: Date
}

export interface Component {
  id: string
  name: string
  prompt: string
  description?: string
}

export interface CustomParam {
  key: string
  label: string
  type: "number" | "string" | "boolean"
  value: number | string | boolean
  min?: number
  max?: number
  step?: number
}

export interface SoftwareData {
  chatId: string
  demoUrl: string
  isGenerating: boolean
  error?: string
}

export interface CodeVersion {
  id: string
  component: string
  code: string
  language: string
  timestamp: number
}

export interface HardwareSpecs {
  power?: string
  analysis?: {
    componentSuggestions?: Array<{
      name: string
      type?: string
      description?: string
    }>
    estimatedCost?: string
    difficulty?: string
  }
}

export interface User {
  id: string
  email: string
  display_name?: string
  first_name?: string
  last_name?: string
  created_at?: string
  user_metadata?: Record<string, unknown>
}

export interface Project {
  id: string
  name: string
  description?: string
  v0_id?: string
}

export interface HardwareData {
  isGenerating: boolean
  reportsGenerated: boolean
  error?: string
}

export interface HardwareReports {
  "3d-components"?: {
    content: string
    components: Array<{
      id: string
      name: string
      description: string
      printTime: string
      material: string
      supports: string
      prompt?: string
      notes?: string
      model?: HardwareComponentModel
    }>
    reportId?: string
  }
  "assembly-parts"?: {
    content: string
    partsCount: number
    estimatedTime: string
    difficultyLevel: string
    reportId?: string
  }
  "firmware-code"?: {
    content: string
    language: string
    platform: string
    libraries: string[]
    codeLines: number
    reportId?: string
  }
}

export interface HardwareComponentModel {
  componentId: string
  name: string
  status: "idle" | "queued" | "processing" | "completed" | "failed"
  jobId?: string
  scadCode?: string
  stlContent?: string
  transientStlContent?: string
  stlMimeType?: "model/stl" | string
  scadMimeType?: "application/x-openscad" | string
  parameters?: Array<{
    name: string
    value: number
    unit?: string
    metadata?: {
      min?: number
      max?: number
      step?: number
    }
  }>
  metadata?: Record<string, unknown>
  error?: string
  updatedAt?: string
}

