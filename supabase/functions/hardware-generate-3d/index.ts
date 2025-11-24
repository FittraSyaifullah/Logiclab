import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProjectData {
  id: string;
  description?: string;
  title?: string;
}

interface ComponentSpec {
  component: string;
  description: string;
  promptFor3DGeneration: string;
  printSpecifications: string;
  assemblyNotes: string;
  printTime: string;
  material: string;
  supports: string;
}

interface Generate3DJson {
  project: string;
  description: string;
  components: ComponentSpec[];
  generalNotes: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    let jobId: string | null = null;
    try {
      const body = await req.json();
      jobId = typeof body?.jobId === "string" ? body.jobId : null;
    } catch {
      jobId = null;
    }

    if (!jobId) {
      console.error("[EDGE:hardware-generate-3d] Missing or invalid jobId in request body");
      return new Response(
        JSON.stringify({ error: "jobId is required and must be a string" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, serviceKey);

    const {
      data: jobs,
      error: jobsError,
    } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", jobId)
      .eq("status", "pending")
      .eq("kind", "hardware_3d_generation")
      .limit(1);

    if (jobsError) {
      console.error("[EDGE:hardware-generate-3d] Error fetching job:", jobsError);
      return new Response(
        JSON.stringify({ error: jobsError.message }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        },
      );
    }

    if (!jobs || jobs.length === 0) {
      console.log("[EDGE:hardware-generate-3d] No matching pending job found", { jobId });
      return new Response(
        JSON.stringify({ error: "Job not found or not in pending state" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        },
      );
    }

    const job = jobs[0];

    try {
      await supabase
        .from("jobs")
        .update({
          status: "processing",
          started_at: new Date().toISOString(),
        })
        .eq("id", job.id);

      const payload = (job.input ?? {}) as {
        projectData?: ProjectData;
        reportId?: string | null;
      };

      const projectData = payload.projectData;
      const providedReportId = payload.reportId ?? null;

      if (!projectData || !projectData.id) {
        throw new Error("Missing project data for 3D generation");
      }

      const openaiKey = Deno.env.get("OPENAI_API_KEY") ?? "";
      if (!openaiKey) {
        throw new Error("OPENAI_API_KEY not configured");
      }

      const model = Deno.env.get("OPENAI_3D_MODEL") ?? "gpt-4.1-mini";

      const systemPrompt = `
You are an AI engineer specializing in breaking down hardware projects into 3D printable components.

Your role is to:
1. Analyze the hardware project and identify all structural components that can be 3D printed
2. Break down complex parts into smaller, assemblable pieces that can fit on standard 3D printers
3. Consider print orientation, support requirements, and assembly methods
4. Provide detailed specifications for each printable component
5. Generate separate prompts for 3D model generation for each component

For complex appliances like washing machines, dishwashers, or large devices:
- Break down into functional modules (motor housing, control panel, drum components, etc.)
- Create scaled-down functional prototypes rather than full-size replicas
- Focus on demonstrating key mechanisms and principles
- Provide multiple size options (prototype scale vs functional scale)

Return ONLY a single valid JSON object using double quotes, with exactly these keys at the top level and no others:
- project: string
- description: string
- components: array of objects, each object must contain ALL of these keys with string values:
  - component
  - description
  - promptFor3DGeneration
  - printSpecifications
  - assemblyNotes
  - printTime
  - material
  - supports
- generalNotes: string

Rules:
- Do not include any markdown, code fences, or explanation text.
- The number of components should match the complexity of the request.
- Design for standard 3D printer bed sizes (≈200x200mm) and minimize supports.
- Focus on modular, printable parts that can be assembled by the user.
`.trim();

      const userPrompt = `Project context:
${projectData.description ?? ""}

Generate the JSON now. Output only the JSON object.`;

      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          input: userPrompt,
          instructions: systemPrompt,
          max_output_tokens: 2000,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error(
          "[EDGE:hardware-generate-3d] OpenAI error response:",
          response.status,
          text,
        );
        throw new Error(`OpenAI error ${response.status}`);
      }

      const data = await response.json();
      const rawText: string = (data?.output_text ?? "").trim();

      const start = rawText.indexOf("{");
      const end = rawText.lastIndexOf("}");
      if (start === -1 || end === -1 || end <= start) {
        throw new Error("Model did not return valid JSON object.");
      }

      let parsed: Generate3DJson;
      try {
        parsed = JSON.parse(rawText.slice(start, end + 1)) as Generate3DJson;
      } catch {
        throw new Error("JSON parse failed: Invalid JSON returned by model.");
      }

      const requiredTopKeys: Array<keyof Generate3DJson> = [
        "project",
        "description",
        "components",
        "generalNotes",
      ];
      for (const key of requiredTopKeys) {
        if (!(key in parsed)) {
          throw new Error(`Missing required key: ${key as string}`);
        }
      }

      if (
        typeof parsed.project !== "string" ||
        typeof parsed.description !== "string" ||
        typeof parsed.generalNotes !== "string"
      ) {
        throw new Error(
          "Top-level keys must be strings: project, description, generalNotes",
        );
      }

      if (!Array.isArray(parsed.components)) {
        throw new Error("components must be an array");
      }

      for (let i = 0; i < parsed.components.length; i++) {
        const c = parsed.components[i] as Partial<ComponentSpec> &
          Record<string, unknown>;
        const aliasName = c.name;
        const aliasPrompt = (c as Record<string, unknown>)["prompt"];

        if (typeof c.component !== "string" && typeof aliasName === "string") {
          c.component = aliasName;
        }
        if (
          typeof c.promptFor3DGeneration !== "string" &&
          typeof aliasPrompt === "string"
        ) {
          c.promptFor3DGeneration = aliasPrompt as string;
        }

        const valid =
          typeof c.component === "string" &&
          typeof c.description === "string" &&
          typeof c.promptFor3DGeneration === "string" &&
          typeof c.printSpecifications === "string" &&
          typeof c.assemblyNotes === "string" &&
          typeof c.printTime === "string" &&
          typeof c.material === "string" &&
          typeof c.supports === "string";

        if (!valid) {
          throw new Error(`Component ${i} has invalid or missing fields`);
        }
      }

      // Resolve target project id (UI may send a non-UUID creation id)
      const isUuid = (value: string | undefined): boolean => {
        if (!value) return false;
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
          .test(value);
      };

      let targetProjectId: string | null = null;
      if (isUuid(projectData.id)) {
        targetProjectId = projectData.id;
      } else {
        const { data: latestProject } = await supabase
          .from("projects")
          .select("id")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
        targetProjectId = (latestProject as { id?: string } | null)?.id ?? null;
      }

      if (!targetProjectId) {
        throw new Error("Valid project id not found");
      }

      const targetReportId: string | null = providedReportId;

      let reportData: { id: string } | null = null;
      let reportError: unknown = null;

      if (targetReportId) {
        const result = await supabase
          .from("hardware_projects")
          .update({
            3d_components: parsed,
          } as never)
          .eq("id", targetReportId)
          .select("id")
          .single();

        reportData = result.data as { id: string } | null;
        reportError = result.error;
      } else {
        const result = await supabase
          .from("hardware_projects")
          .insert({
            project_id: targetProjectId,
            title: projectData.title || parsed.project || "Hardware Project",
            3d_components: parsed,
          } as never)
          .select("id")
          .single();

        reportData = result.data as { id: string } | null;
        reportError = result.error;
      }

      if (reportError || !reportData) {
        console.error(
          "[EDGE:hardware-generate-3d] Failed to store 3D components report:",
          reportError,
        );
        throw new Error("Failed to store report");
      }

      await supabase
        .from("jobs")
        .update({
          status: "completed",
          finished_at: new Date().toISOString(),
          result: {
            reportId: reportData.id,
          },
        })
        .eq("id", job.id);

      return new Response(
        JSON.stringify({
          message: "3D components generated",
          reportId: reportData.id,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    } catch (jobError) {
      console.error(
        "[EDGE:hardware-generate-3d] Job error",
        jobError,
      );
      const message =
        jobError instanceof Error ? jobError.message : String(jobError);

      await supabase
        .from("jobs")
        .update({
          status: "failed",
          error: message,
          finished_at: new Date().toISOString(),
        })
        .eq("id", job.id);

      return new Response(
        JSON.stringify({ error: message }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        },
      );
    }
  } catch (error) {
    console.error("[EDGE:hardware-generate-3d] Function error", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});


