export type FileCategory = "document" | "3d-model" | "image" | "other"

export function getFileCategoryFromNameAndType(type: string, name: string): FileCategory {
  const extension = name.split(".").pop()?.toLowerCase()

  if (
    [
      "stl",
      "obj",
      "fbx",
      "3ds",
      "dae",
      "blend",
      "step",
      "stp",
      "iges",
      "igs",
      "gltf",
      "glb",
      "x3d",
      "wrl",
      "ply",
      "scad",
    ].includes(extension || "")
  ) {
    return "3d-model"
  }

  if (type.startsWith("image/")) {
    return "image"
  }

  if (
    type.includes("pdf") ||
    type.includes("document") ||
    type.includes("text") ||
    type.includes("spreadsheet") ||
    type.includes("presentation") ||
    ["doc", "docx", "txt", "pdf", "xls", "xlsx", "ppt", "pptx", "csv", "md"].includes(extension || "")
  ) {
    return "document"
  }

  return "other"
}

export function chunkText(input: string, maxChars = 1200): string[] {
  const chunks: string[] = []
  let i = 0
  while (i < input.length) {
    const end = Math.min(i + maxChars, input.length)
    chunks.push(input.slice(i, end))
    i = end
  }
  return chunks
}

export async function extractTextLight(
  file: File,
  category: FileCategory,
  options?: { title?: string | null; description?: string | null }
): Promise<string[]> {
  const title = options?.title ?? null
  const description = options?.description ?? null

  if (category === "document" && (file.type.startsWith("text/") || /\.(md|csv|txt)$/i.test(file.name))) {
    const content = await file.text()
    const prefaceParts = [
      title ? `Title: ${title}` : null,
      description ? `Description: ${description}` : null,
      `Filename: ${file.name}`,
    ].filter(Boolean)
    const combined = `${prefaceParts.join("\n")}${prefaceParts.length ? "\n\n" : ""}${content}`
    return chunkText(combined)
  }

  // For images, 3D models, PDFs (no parser), use metadata-only lightweight extraction
  const lines = [
    title ? `Title: ${title}` : null,
    description ? `Description: ${description}` : null,
    `Filename: ${file.name}`,
    file.type ? `MIME: ${file.type}` : null,
  ].filter(Boolean)
  return chunkText(lines.join("\n"))
}

// Map UI category to DB file_type
export function uiCategoryToDbType(cat: FileCategory): 'document' | 'model' | 'image' {
  if (cat === '3d-model') return 'model'
  if (cat === 'image') return 'image'
  return 'document'
}





