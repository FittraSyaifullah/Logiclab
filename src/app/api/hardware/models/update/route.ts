import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const {
      componentId,
      projectId,
      creationId,
      scadCode,
      parameters,
    }: {
      componentId?: string
      projectId?: string
      creationId?: string
      scadCode?: string
      parameters?: unknown
    } = await request.json()

    if (!componentId || !projectId) {
      return NextResponse.json({ error: "componentId and projectId are required" }, { status: 400 })
    }

    // Use projectId as creationId if not provided
    const effectiveCreationId = creationId || projectId

    const supabase = createSupabaseServerClient()

    // First check if the record exists
    const { data: existingRecord } = await supabase
      .from("hardware_models")
      .select("id")
      .eq("component_id", componentId)
      .eq("project_id", projectId)
      .single()

    let hardwareModel: { id: string; component_id: string; component_name: string } | null = null

    if (existingRecord) {
      // Update existing record
      const updateData: Record<string, unknown> = {}
      if (scadCode !== undefined) updateData.scad_code = scadCode
      if (parameters !== undefined) updateData.parameters = parameters
      updateData.updated_at = new Date().toISOString()

      const { data: updatedModel, error: updateError } = await supabase
        .from("hardware_models")
        .update(updateData)
        .eq("id", existingRecord.id)
        .select("id, component_id, component_name")
        .single()

      if (updateError) {
        console.error("[HARDWARE] Failed to update hardware model", updateError)
        return NextResponse.json({ error: "Failed to update hardware model" }, { status: 500 })
      }

      hardwareModel = updatedModel
    } else {
      // Record doesn't exist, this shouldn't happen in normal flow
      // but we'll handle it gracefully by creating a new record
      console.warn(`[HARDWARE] No existing hardware model found for component ${componentId}, creating new record`)
      
      const { data: newModel, error: createError } = await supabase
        .from("hardware_models")
        .insert({
          component_id: componentId,
          component_name: "Component",
          project_id: projectId,
          creation_id: effectiveCreationId, // Use effective creation ID (projectId if not provided)
          scad_code: scadCode || "",
          parameters: parameters || {},
          scad_mime: "application/x-openscad",
        })
        .select("id, component_id, component_name")
        .single()

      if (createError) {
        console.error("[HARDWARE] Failed to create hardware model", createError)
        return NextResponse.json({ error: "Failed to create hardware model" }, { status: 500 })
      }

      hardwareModel = newModel
    }

    console.log(`[HARDWARE] Updated hardware model record: ${hardwareModel?.id}`)

    return NextResponse.json({ 
      success: true, 
      hardwareModelId: hardwareModel?.id 
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    console.error("[HARDWARE] Error updating hardware model", error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
