import { type NextRequest, NextResponse } from "next/server"
import { destroySession } from "@/lib/auth-service"

export async function POST(request: NextRequest) {
  try {
    console.log(`[AUTH] Signout request received`)
    await destroySession()
    console.log(`[AUTH] Session destroyed successfully`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(`[AUTH] Signout error:`, error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
