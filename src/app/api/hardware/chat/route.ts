import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { generateText, aiModel } from "@/lib/openai"

type TargetType = "3d-components" | "assembly-parts" | "firmware-code" | "3d-component"

interface ChatRequestBody {
	projectId: string
	creationId?: string
	userId?: string
	message: string
	target: {
		type: TargetType
		componentId?: string
		reportId?: string
		componentName?: string
	}
	context?: {
		microcontroller?: string
		components?: Array<{ id: string; name?: string }>
		params?: Record<string, number>
		creationTitle?: string
		creationPrompt?: string
	}
}

interface ChatResponseBody {
	"AI response": string
	"AI content": unknown
}

const toStrictDescription = (base?: string, userMsg?: string) => {
	const a = typeof base === "string" ? base.trim() : ""
	const b = typeof userMsg === "string" ? userMsg.trim() : ""
	if (a && b) return `${a}\n\nChange request: ${b}`
	return a || b
}

export async function POST(request: NextRequest) {
	const supabase = createSupabaseServerClient()

	try {
		console.log('[HARDWARE CHAT] Received request')
		const body = (await request.json()) as ChatRequestBody
		console.log('[HARDWARE CHAT] Request body:', { 
			projectId: body?.projectId, 
			creationId: body?.creationId, 
			userId: body?.userId, 
			message: body?.message, 
			target: body?.target,
			context: body?.context 
		})
		
		const {
			projectId,
			creationId,
			userId,
			message,
			target,
			context,
		} = body || ({} as ChatRequestBody)

		if (!projectId || !message || !target?.type) {
			console.error('[HARDWARE CHAT] Missing required fields:', { 
				projectId: !!projectId, 
				message: !!message, 
				targetType: !!target?.type 
			})
			return NextResponse.json(
				{ error: "Missing required fields: projectId, message, target.type" },
				{ status: 400 },
			)
		}

		// Optional: verify project ownership when userId provided
		if (userId) {
			const { data: project, error: projectError } = await supabase
				.from("projects")
				.select("id, owner_id")
				.eq("id", projectId)
				.single()
			if (projectError || !project) {
				return NextResponse.json({ error: "Project not found" }, { status: 404 })
			}
			if (project.owner_id !== userId) {
				return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
			}
		}

		// Best-effort: persist user message to hardware_messages (if table exists)
		try {
			await supabase.from("hardware_messages").insert({
				project_id: projectId,
				creation_id: creationId ?? null,
				user_id: userId ?? null,
				content: message,
				target_type: target.type,
				component_id: target.componentId ?? null,
			})
		} catch (msgErr) {
			console.warn("[HARDWARE CHAT] hardware_messages insert failed (non-fatal)", msgErr)
		}

		console.log('[HARDWARE CHAT] Routing to target type:', target.type)
		
		// Route based on target.type
		if (target.type === "3d-components") {
			const description = toStrictDescription(context?.creationPrompt, message)
        const resp = await fetch(`${request.nextUrl.origin}/api/hardware/generate-3d`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					projectData: { id: projectId, description, title: context?.creationTitle },
					reportId: target.reportId,
				}),
			})
        const data = await resp.json()
			if (!resp.ok) {
				return NextResponse.json(
					{ error: data?.error ?? "Failed to generate 3D components" },
					{ status: resp.status },
				)
			}
        // Generate concise natural-language summary
        const summaryRes = await generateText({
            model: aiModel,
            system: "You write short, clear summaries for users. 1-3 sentences max.",
            prompt: `User requested changes to 3D components: "${message}". Summarize what will change in the 3D components report.`,
            temperature: 0.3,
            maxTokens: 120,
        })
        const responseBody: ChatResponseBody = {
            "AI response": (summaryRes.text || "Updated 3D component breakdown based on your request.").trim(),
            "AI content": data?.data ?? data,
        }
			return NextResponse.json(responseBody)
		}

        if (target.type === "assembly-parts") {
            console.log('[HARDWARE CHAT] Calling edit-assembly API with:', { projectId, userId, message })
            // Call our edit-assembly API which invokes the Supabase Edge Function
            const resp = await fetch(`${request.nextUrl.origin}/api/hardware/edit-assembly`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    projectId,
                    userId,
                    message,
                }),
            })
            console.log('[HARDWARE CHAT] Edit-assembly response status:', resp.status)
            const data = await resp.json()
            console.log('[HARDWARE CHAT] Edit-assembly response data:', data)
            if (!resp.ok) {
                console.error('[HARDWARE CHAT] Edit-assembly failed:', data?.error)
                return NextResponse.json(
                    { error: data?.error ?? "Failed to edit assembly" },
                    { status: resp.status },
                )
            }
            const summaryRes = await generateText({
                model: aiModel,
                system: "You write short, clear summaries for users. 1-3 sentences max.",
                prompt: `User requested changes to assembly: "${message}". Summarize what was updated in the assembly instructions and parts list.`,
                temperature: 0.3,
                maxTokens: 120,
            })
            const responseBody: ChatResponseBody = {
                "AI response": (summaryRes.text || "Updated assembly instructions and parts list based on your request.").trim(),
                "AI content": data?.data ?? data,
            }
            return NextResponse.json(responseBody)
        }

		if (target.type === "firmware-code") {
			const description = toStrictDescription(context?.creationPrompt, message)
			const resp = await fetch(`${request.nextUrl.origin}/api/hardware/generate-firmware`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					projectData: {
						id: projectId,
						description,
						microcontroller: context?.microcontroller,
						title: context?.creationTitle,
					},
					reportId: target.reportId,
				}),
			})
        const data = await resp.json()
			if (!resp.ok) {
				return NextResponse.json(
					{ error: data?.error ?? "Failed to generate firmware" },
					{ status: resp.status },
				)
			}
        const summaryRes = await generateText({
            model: aiModel,
            system: "You write short, clear summaries for users. 1-3 sentences max.",
            prompt: `User requested changes to firmware: "${message}". Summarize what will change in the firmware code.`,
            temperature: 0.3,
            maxTokens: 120,
        })
        const responseBody: ChatResponseBody = {
            "AI response": (summaryRes.text || "Updated firmware code based on your request.").trim(),
            "AI content": data?.content ?? data,
        }
			return NextResponse.json(responseBody)
		}

		if (target.type === "3d-component") {
			// Create a job, synchronously generate SCAD via Anthropic, then mark job complete and upsert hardware_models
			const { data: job, error: jobError } = await supabase
				.from("jobs")
				.insert({
					user_id: userId ?? null,
					project_id: projectId,
					kind: "hardware-model-component",
					status: "processing",
					input: {
						componentId: target.componentId,
						componentName: target.componentName,
						projectId,
						userId,
						creationId,
						prompt: toStrictDescription(context?.creationPrompt, message),
					},
				})
				.select()
				.single()
			if (jobError || !job) {
				return NextResponse.json({ error: "Failed to create job" }, { status: 500 })
			}

			const anthropicKey = process.env.ANTHROPIC_API_KEY
			if (!anthropicKey) {
				// Mark job failed and return
				await supabase
					.from("jobs")
					.update({ status: "failed", error: "ANTHROPIC_API_KEY not configured", finished_at: new Date().toISOString() })
					.eq("id", job.id)
				return NextResponse.json({ error: "Model generation not configured" }, { status: 500 })
			}

			const systemPrompt =
				"You are LogicLab, an AI CAD generator that produces parametric OpenSCAD code. You must: \n" +
				"- Return JSON with keys \"scad\" (OpenSCAD code) and optionally \"parameters\" (array)\n" +
				"- Return a single JSON object with no code fences and no string escaping\n" +
				"- Declare adjustable parameters at the top of the SCAD\n" +
				"- Do NOT include any STL data; we will generate STL ourselves from the SCAD later"

			const userPrompt = `Component name: ${target.componentName || target.componentId}
Project specification:
${toStrictDescription(context?.creationPrompt, message)}

Return JSON only with keys: { "scad": string, "parameters"?: Array<{ name: string; value: number; unit?: string; metadata?: Record<string, unknown> }> }.
Do not include code fences or extra prose. Do not include any STL.`

			const resp = await fetch("https://api.anthropic.com/v1/messages", {
				method: "POST",
				headers: {
					"x-api-key": anthropicKey,
					"Content-Type": "application/json",
					"anthropic-version": "2023-06-01",
				},
				body: JSON.stringify({
					model: "claude-3-5-sonnet-20240620",
					max_tokens: 4000,
					system: systemPrompt,
					messages: [
						{ role: "user", content: [{ type: "text", text: userPrompt }] },
					],
				}),
			})

			if (!resp.ok) {
				await supabase
					.from("jobs")
					.update({ status: "failed", error: `Anthropic ${resp.status}`, finished_at: new Date().toISOString() })
					.eq("id", job.id)
				return NextResponse.json({ error: `Anthropic API error ${resp.status}` }, { status: 500 })
			}

			const payload = await resp.json()
			const blocks = Array.isArray(payload?.content) ? (payload.content as Array<{ type?: string; text?: string }>) : []
			const text = blocks.find((b) => b?.type === "text")?.text as string | undefined
			if (!text) {
				await supabase
					.from("jobs")
					.update({ status: "failed", error: "Missing text payload", finished_at: new Date().toISOString() })
					.eq("id", job.id)
				return NextResponse.json({ error: "Missing text payload from model" }, { status: 500 })
			}

			let parsed: { scad?: string; parameters?: unknown }
			try {
				parsed = JSON.parse(text)
			} catch {
				return NextResponse.json({ error: "Invalid JSON returned by model" }, { status: 500 })
			}

			if (!parsed?.scad) {
				return NextResponse.json({ error: "Model did not return SCAD" }, { status: 500 })
			}

			await supabase
				.from("jobs")
				.update({ status: "completed", result: parsed, finished_at: new Date().toISOString() })
				.eq("id", job.id)

			await supabase
				.from("hardware_models")
				.upsert({
					project_id: projectId,
					component_id: target.componentId,
					component_name: target.componentName ?? target.componentId,
					creation_id: creationId,
					job_id: job.id,
					scad_code: parsed.scad,
					parameters: parsed.parameters ?? null,
					scad_mime: "application/x-openscad",
					updated_at: new Date().toISOString(),
				}, { onConflict: "component_id" })

			const responseBody: ChatResponseBody = {
				"AI response": `Updated 3D component ${target.componentName || target.componentId} SCAD per your request.`,
				"AI content": parsed,
			}
			return NextResponse.json(responseBody)
		}

		console.error('[HARDWARE CHAT] Unsupported target type:', target?.type)
		return NextResponse.json({ error: "Unsupported target" }, { status: 400 })
	} catch (error) {
		console.error("[HARDWARE CHAT] Error:", error)
		return NextResponse.json({ error: "Internal server error" }, { status: 500 })
	}
}


