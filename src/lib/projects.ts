import { supabase } from './supabase'
import type { Project, Software, SoftwareMessage } from './supabase'

export class ProjectService {
  static async createProject(
    userId: string,
    name: string,
    description: string,
    type: 'hardware' | 'software' = 'software'
  ) {
    try {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          owner_id: userId,
          slug: name.toLowerCase().replace(/\s+/g, '-'),
          name,
          description,
          type,
        })
        .select()
        .single()

      if (error) {
        throw new Error(error.message)
      }

      return { project: data, error: null }
    } catch (error) {
      return { 
        project: null, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      }
    }
  }

  static async getUserProjects(userId: string) {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(error.message)
      }

      return { projects: data, error: null }
    } catch (error) {
      return { 
        projects: null, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      }
    }
  }

  static async getProject(projectId: string) {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()

      if (error) {
        throw new Error(error.message)
      }

      return { project: data, error: null }
    } catch (error) {
      return { 
        project: null, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      }
    }
  }

  static async updateProject(projectId: string, updates: Partial<Project>) {
    try {
      const { data, error } = await supabase
        .from('projects')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', projectId)
        .select()
        .single()

      if (error) {
        throw new Error(error.message)
      }

      return { project: data, error: null }
    } catch (error) {
      return { 
        project: null, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      }
    }
  }

  static async deleteProject(projectId: string) {
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId)

      if (error) {
        throw new Error(error.message)
      }

      return { error: null }
    } catch (error) {
      return { 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      }
    }
  }

  static async createSoftware(projectId: string, title: string, demoUrl?: string) {
    try {
      const { data, error } = await supabase
        .from('software')
        .insert({
          project_id: projectId,
          title,
          demo_url: demoUrl,
        })
        .select()
        .single()

      if (error) {
        throw new Error(error.message)
      }

      return { software: data, error: null }
    } catch (error) {
      return { 
        software: null, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      }
    }
  }

  static async getSoftwareMessages(softwareId: string) {
    try {
      const { data, error } = await supabase
        .from('software_messages')
        .select('*')
        .eq('software_id', softwareId)
        .order('created_at', { ascending: true })

      if (error) {
        throw new Error(error.message)
      }

      return { messages: data, error: null }
    } catch (error) {
      return { 
        messages: null, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      }
    }
  }

  static async addSoftwareMessage(
    softwareId: string,
    role: 'user' | 'assistant' | 'system',
    content: string
  ) {
    try {
      const { data, error } = await supabase
        .from('software_messages')
        .insert({
          software_id: softwareId,
          role,
          content,
        })
        .select()
        .single()

      if (error) {
        throw new Error(error.message)
      }

      return { message: data, error: null }
    } catch (error) {
      return { 
        message: null, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      }
    }
  }
}
