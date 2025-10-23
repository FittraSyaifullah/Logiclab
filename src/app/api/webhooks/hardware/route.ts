import { NextResponse, type NextRequest } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { broadcast, channelKey } from "@/lib/sse"

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

		console.log("[WEBHOOK] hardware event received", {
			type: (payload?.type as string) || "unknown",
			projectId: payload?.projectId,
			reportId: payload?.reportId,
			status: payload?.status,
		})

		// Confirm DB row exists before broadcasting (avoid race)
		try {
			const supabase = createSupabaseServerClient()
			const projectId = String(payload?.projectId || "")
			const reportId = String(payload?.reportId || "")
			if (projectId && reportId) {
				const { data } = await supabase
					.from('hardware_projects')
					.select('id')
					.eq('id', reportId)
					.eq('project_id', projectId)
					.limit(1)
					.single()
				console.log('[WEBHOOK] DB verification', { found: !!data, projectId, reportId })
				if (data?.id) {
					broadcast(channelKey(projectId, undefined), {
						event: (payload?.type as string) || 'hardware.initial.completed',
						projectId,
						reportId,
					})
					console.log('[WEBHOOK] Broadcasted SSE event for project', projectId)
				}
			}
		} catch {}

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
