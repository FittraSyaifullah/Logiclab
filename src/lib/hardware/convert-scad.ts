import { compileScadToStlBytes } from "@/lib/scad/openscad"

interface ScadToStlOptions {
  parameters?: Record<string, number>
}

export async function convertScadToStl({
  scadCode,
  options,
}: {
  scadCode: string
  options?: ScadToStlOptions
}): Promise<string> {
  const bytes = await compileScadToStlBytes({ scadCode, parameters: options?.parameters ?? {} })
  return Buffer.from(bytes).toString("base64")
}

