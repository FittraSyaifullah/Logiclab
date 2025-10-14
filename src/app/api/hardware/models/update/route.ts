import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const {
      componentId,
      scadCode,
      parameters,
    }: {
      componentId?: string
      scadCode?: string
      parameters?: unknown
    } = await request.json()

    if (!componentId) {
      return NextResponse.json({ error: "componentId is required" }, { status: 400 })
    }

    const supabase = createSupabaseServerClient()

    // Update the hardware_models record
    const updateData: Record<string, unknown> = {}
    if (scadCode !== undefined) updateData.scad_code = scadCode
    if (parameters !== undefined) updateData.parameters = parameters
    updateData.updated_at = new Date().toISOString()

    const { data: hardwareModel, error: updateError } = await supabase
      .from("hardware_models")
      .update(updateData)
      .eq("component_id", componentId)
      .select("id, component_id, component_name")
      .single()

    if (updateError) {
      console.error("[HARDWARE] Failed to update hardware model", updateError)
      return NextResponse.json({ error: "Failed to update hardware model" }, { status: 500 })
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
