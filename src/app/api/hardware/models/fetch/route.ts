import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json({ error: "projectId is required" }, { status: 400 })
    }

    const supabase = createSupabaseServerClient()

    // Build query - fetch all hardware models for the project
    const query = supabase
      .from("hardware_models")
      .select("*")
      .eq("project_id", projectId)

    const { data: hardwareModels, error } = await query

    if (error) {
      console.error("[HARDWARE] Failed to fetch hardware models", error)
      return NextResponse.json({ error: "Failed to fetch hardware models" }, { status: 500 })
    }

    // Transform the data to match the expected format
    const transformedModels = hardwareModels?.reduce((acc, model) => {
      acc[model.component_id] = {
        componentId: model.component_id,
        name: model.component_name,
        scadCode: model.scad_code,
        parameters: model.parameters || [],
        scadMimeType: model.scad_mime || 'application/x-openscad',
        updatedAt: model.updated_at,
      }
      return acc
    }, {} as Record<string, {
      componentId: string
      name: string
      scadCode: string
      parameters: unknown[]
      scadMimeType: string
      updatedAt?: string
    }>) || {}

    return NextResponse.json({ 
      success: true, 
      hardwareModels: transformedModels 
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    console.error("[HARDWARE] Error fetching hardware models", error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
