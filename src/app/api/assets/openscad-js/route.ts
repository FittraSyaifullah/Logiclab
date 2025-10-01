import { NextResponse } from "next/server"
import path from "path"
import fs from "fs/promises"

export const runtime = "nodejs"

export async function GET() {
  try {
    const jsPath = path.join(process.cwd(), "openscad-wasm", "openscad.js")
    let source = await fs.readFile(jsPath, { encoding: "utf8" })
    // Patch ESM-only import.meta for classic workers
    source = source.replace(/var\s+_scriptDir\s*=\s*import\.meta\.url\s*;/, "var _scriptDir = '';")
    // Fallback: nuke any lingering import.meta.url occurrences just in case
    source = source.replace(/import\.meta\.url/g, "''")
    // Remove ESM export lines for classic worker compatibility
    source = source.replace(/^\s*export\s+[^\n]*$/gm, "")

    return new NextResponse(source, {
      status: 200,
      headers: {
        "Content-Type": "text/javascript; charset=utf-8",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load openscad.js"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}


