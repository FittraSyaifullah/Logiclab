import { toArray } from "@jscad/stl-serializer"
import { designFromScad } from "@jscad/scad-deserializer"

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
  const design = await designFromScad(scadCode, {
    lookupParameters: options?.parameters ?? {},
    addMetaData: true,
  })

  if (!design || !Array.isArray(design.solids) || design.solids.length === 0) {
    throw new Error("No geometry produced from SCAD code")
  }

  const stlData = toArray(design.solids, { binary: true })
  if (!stlData.length) {
    throw new Error("Failed to serialize STL")
  }

  const buffer = Buffer.from(stlData[0].data)
  return buffer.toString("base64")
}

