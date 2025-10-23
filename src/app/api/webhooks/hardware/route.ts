import { NextResponse, type NextRequest } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
	try {
		const secret = process.env.HARDWARE_WEBHOOK_SECRET
		if (!secret) {
			return NextResponse.json({ error: "Server misconfigured: HARDWARE_WEBHOOK_SECRET missing" }, { status: 500 })
		}

		const provided = request.headers.get("x-buildables-webhook-secret") || request.headers.get("X-Buildables-Webhook-Secret")
		if (!provided || provided !== secret) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
		}

		const payload = await request.json().catch(() => ({})) as Record<string, unknown>

		// Minimal handling: acknowledge receipt. All client hydration happens via Supabase Realtime
		// and existing API routes that read from tables populated by the edge functions.
		console.log("[WEBHOOK] hardware event received", {
			type: (payload?.type as string) || "unknown",
			projectId: payload?.projectId,
			reportId: payload?.reportId,
			status: payload?.status,
		})

		return NextResponse.json({ success: true })
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error"
		console.error("[WEBHOOK] hardware endpoint error", error)
		return NextResponse.json({ error: message }, { status: 500 })
	}
}

export async function GET() {
	return NextResponse.json({ ok: true })
}


