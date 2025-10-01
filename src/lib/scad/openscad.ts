import path from "path"
import { pathToFileURL } from "url"
import { createRequire } from "module"

type OpenScadModule = {
  FS: {
    writeFile: (p: string, data: Uint8Array | string) => void
    readFile: (p: string, opts?: { encoding?: "binary" | "utf8" }) => Uint8Array | string
    mkdir: (p: string) => void
  }
  callMain: (args: string[]) => number
}

let modulePromise: Promise<OpenScadModule> | null = null

async function getFactory(): Promise<(opts: { locateFile: (p: string) => string }) => Promise<OpenScadModule>> {
  const jsPath = path.join(process.cwd(), "openscad-wasm", "openscad.js")
  let imported: any
  try {
    imported = await import(pathToFileURL(jsPath).href)
  } catch {}

  let candidate = imported?.default ?? imported

  if (typeof candidate !== "function") {
    // Fallback to CJS require if the bundler didn't expose ESM default properly
    try {
      const require = createRequire(import.meta.url)
      const cjs = require(jsPath)
      candidate = cjs?.default ?? cjs
    } catch {}
  }

  if (typeof candidate !== "function") {
    throw new Error("OpenSCAD WASM factory not found or not a function")
  }
  return candidate as (opts: { locateFile: (p: string) => string }) => Promise<OpenScadModule>
}

async function getModule(): Promise<OpenScadModule> {
  if (modulePromise) return modulePromise
  const jsPath = path.join(process.cwd(), "openscad-wasm", "openscad.js")
  const baseDir = path.dirname(jsPath)
  const factory = await getFactory()
  modulePromise = factory({ locateFile: (p: string) => path.join(baseDir, p) })
  return modulePromise
}

export async function compileScadToStlBytes({
  scadCode,
  parameters,
}: {
  scadCode: string
  parameters?: Record<string, number>
}): Promise<Uint8Array> {
  const instance = await getModule()

  const inputFile = "/input.scad"
  const outputFile = "/out.stl"

  try {
    // Ensure basic directories exist (no-op if they do)
    try {
      instance.FS.mkdir("/tmp")
    } catch {}

    // Write SCAD source
    instance.FS.writeFile(inputFile, scadCode)

    const defineFlags: string[] = []
    if (parameters) {
      for (const [name, value] of Object.entries(parameters)) {
        if (Number.isFinite(value)) {
          // -D name=value
          defineFlags.push("-D", `${name}=${value}`)
        }
      }
    }

    const args = [
      inputFile,
      "-o",
      outputFile,
      "--export-format=binstl",
      "--enable=manifold",
      "--enable=fast-csg",
      "--enable=lazy-union",
      ...defineFlags,
    ]

    const code = instance.callMain(args)
    if (code !== 0) {
      throw new Error(`OpenSCAD exited with code ${code}`)
    }

    const data = instance.FS.readFile(outputFile, { encoding: "binary" }) as Uint8Array
    if (!(data && data.length)) {
      throw new Error("OpenSCAD produced no STL data")
    }
    return data
  } catch (err) {
    throw err instanceof Error ? err : new Error("Unknown OpenSCAD error")
  }
}


