import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types based on the provided schema
export interface User {
  id: string
  username?: string
  display_name?: string
  email?: string
  created_at: string
  metadata?: Record<string, unknown>
}

export interface Project {
  id: string
  owner_id: string
  slug: string
  name: string
  description?: string
  type: string
  settings?: Record<string, unknown>
  created_at: string
  updated_at: string
  chatID?: string
  webUrl?: string
  privacy?: string
  environment_variables?: string[]
  v0_id?: string
}

export interface Software {
  id: string
  project_id: string
  title: string
  repo_url?: string
  manifest?: Record<string, unknown>
  created_at: string
  web_url?: string
  api_Url?: string
  demo_url?: string
  url?: string
  software_id?: string
}

export interface SoftwareMessage {
  id: string
  software_id?: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  created_at: string
}

export interface Job {
  id: string
  user_id: string
  project_id?: string
  kind: string
  status: string
  priority: number
  input?: Record<string, unknown>
  result?: Record<string, unknown>
  tokens_consumed: number
  error?: string
  created_at: string
  started_at?: string
  finished_at?: string
}

export interface UserCredits {
  user_id: string
  balance_bigint: number
  reserved_bigint: number
  updated_at: string
}

export interface CreditTransaction {
  id: string
  user_id: string
  change_bigint: number
  balance_after_bigint: number
  type: string
  reason?: string
  ref_id?: string
  created_at: string
}
