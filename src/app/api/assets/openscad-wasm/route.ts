import { NextResponse } from "next/server"
import path from "path"
import fs from "fs/promises"

export const runtime = "nodejs"

export async function GET() {
  try {
    const wasmPath = path.join(process.cwd(), "openscad-wasm", "openscad.wasm")
    const data = await fs.readFile(wasmPath)
    const arrayBuffer = new ArrayBuffer(data.byteLength)
    const view = new Uint8Array(arrayBuffer)
    view.set(data)

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/wasm",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load openscad.wasm"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}


