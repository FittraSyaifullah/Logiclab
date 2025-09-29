import { NextResponse } from "next/server"
import { convertScadToStl } from "@/lib/hardware/convert-scad"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const scadCode = typeof body?.scadCode === "string" ? body.scadCode : null
    const parameters =
      body?.parameters && typeof body.parameters === "object" && !Array.isArray(body.parameters)
        ? (body.parameters as Record<string, number>)
        : undefined

    if (!scadCode) {
      return NextResponse.json({ error: "scadCode is required" }, { status: 400 })
    }

    const stlContent = await convertScadToStl({
      scadCode,
      options: { parameters },
    })

    return NextResponse.json({ stlContent, mimeType: "model/stl" }, { status: 200 })
  } catch (error) {
    console.error("[SCAD] Conversion failed", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

