import { NextRequest } from "next/server"
import { addListener, channelKey } from "@/lib/sse"

export const runtime = "edge"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
	const { searchParams } = new URL(request.url)
	const projectId = searchParams.get('projectId') || undefined
	const userId = searchParams.get('userId') || undefined
	const key = channelKey(projectId, userId)

	const stream = new ReadableStream<Uint8Array>({
		start(controller) {
			const encoder = new TextEncoder()
			const send = (data: unknown) => {
				const chunk = `data: ${JSON.stringify(data)}\n\n`
				controller.enqueue(encoder.encode(chunk))
			}
			const close = () => controller.close()
			const remove = addListener(key, send, close)
			// initial heartbeat
			controller.enqueue(encoder.encode(': connected\n\n'))
			const interval = setInterval(() => {
				controller.enqueue(encoder.encode(': keep-alive\n\n'))
			}, 15000)
			request.signal.addEventListener('abort', () => {
				clearInterval(interval)
				remove()
				close()
			})
		},
	})

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache, no-transform',
			'Connection': 'keep-alive',
			'Access-Control-Allow-Origin': '*',
		},
	})
}


