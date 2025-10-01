/* eslint-disable no-restricted-globals */

type CompileRequest = {
  id: string
  type: 'compile' | 'init'
  scad?: string
  params?: Record<string, number>
  origin?: string
}

type CompileResponse =
  | {
      id: string
      ok: true
      fileType: 'stl'
      bytes: Uint8Array
      triangleCount: number
      warnings: string[]
    }
  | {
      id: string
      ok: false
      error: string
    }

let baseOrigin = ''
let lastStdout: string[] = []
let lastStderr: string[] = []

// Load OpenSCAD script via classic worker importScripts to avoid bundler dynamic import issues
async function getOpenScad() {
  try { console.log('[OpenSCAD Worker] getOpenScad start, baseOrigin=', baseOrigin) } catch {}
  const origin = baseOrigin || ''
  const jsUrl = `${origin}/api/assets/openscad-js`
  const wasmUrl = `${origin}/api/assets/openscad-wasm`
  // Fetch and patch the JS to remove import.meta usage for classic workers
  let patchedSrc = ''
  try {
    const resp = await fetch(jsUrl)
    const text = await resp.text()
    patchedSrc = text
      .replace(/var\s+_scriptDir\s*=\s*import\.meta\.url\s*;/, "var _scriptDir = '';\n")
      .replace(/import\.meta\.url/g, "''")
      .replace(/^\s*export\s+[^\n]*$/gm, "")
    const blob = new Blob([patchedSrc], { type: 'application/javascript' })
    const blobUrl = URL.createObjectURL(blob)
    ;(self as any).importScripts(blobUrl)
    try { console.log('[OpenSCAD Worker] importScripts ok via blob:', jsUrl) } catch {}
  } catch (e) {
    try { console.error('[OpenSCAD Worker] importScripts failed:', jsUrl, e) } catch {}
    throw e
  }
  const factory = (self as any).OpenSCAD
  if (typeof factory !== 'function') throw new Error('OpenSCAD factory not found')
  try { console.log('[OpenSCAD Worker] factory located') } catch {}
  const stderrBuffer: string[] = []
  const stdoutBuffer: string[] = []
  lastStdout = stdoutBuffer
  lastStderr = stderrBuffer
  const instance = factory({
    locateFile: (p: string, prefix: string) => (p.endsWith('.wasm') ? wasmUrl : prefix + p),
    print: (text: string) => {
      try { console.log('[OpenSCAD stdout]', text) } catch {}
      stdoutBuffer.push(text)
      lastStdout = stdoutBuffer
    },
    printErr: (text: string) => {
      try { console.error('[OpenSCAD stderr]', text) } catch {}
      stderrBuffer.push(text)
      lastStderr = stderrBuffer
    },
    noInitialRun: true,
    onAbort: (reason: any) => { try { console.error('[OpenSCAD abort]', reason) } catch {} },
  })
  try { await (instance as any).ready } catch {}
  ;(instance as any)._stderrBuffer = stderrBuffer
  ;(instance as any)._stdoutBuffer = stdoutBuffer
  try { console.log('[OpenSCAD Worker] instance ready') } catch {}
  return instance as {
    FS: {
      writeFile: (p: string, d: string | Uint8Array) => void
      readFile: (p: string, opts?: { encoding: 'binary' | 'utf8' }) => Uint8Array | string
      mkdir: (p: string) => void
      unlink: (p: string) => void
    }
    callMain: (args: string[]) => number
    _stderrBuffer?: string[]
    _stdoutBuffer?: string[]
  }
}

const STL_BINARY_HEADER_BYTES = 84
const STL_TRIANGLE_SIZE_BYTES = 50

function analyzeBinaryStl(bytes: Uint8Array) {
  const warnings: string[] = []
  if (bytes.length < STL_BINARY_HEADER_BYTES) {
    return { ok: false, error: 'Binary STL output smaller than 84 byte header.' }
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const triangleCount = view.getUint32(80, true)
  const expectedLength = STL_BINARY_HEADER_BYTES + triangleCount * STL_TRIANGLE_SIZE_BYTES

  if (triangleCount === 0) {
    warnings.push('STL reports 0 triangles.')
  }

  if (bytes.length < expectedLength) {
    return {
      ok: false,
      error: `Binary STL truncated. Expected ${expectedLength} bytes for ${triangleCount} triangles, received ${bytes.length}.`,
    }
  }

  if (bytes.length > expectedLength) {
    warnings.push('STL contains trailing data beyond declared triangle count.')
  }

  return { ok: true, triangleCount, warnings }
}

const FATAL_STDERR_PATTERNS = [/error/i, /failed/i, /exception/i, /fatal/i]
const NON_FATAL_SUBSTRINGS = [
  'Could not initialize localization.',
  'Fontconfig error:',
  "Can't get font",
]

// Always create a fresh instance per compile to avoid FS/output races
async function ensureInstance() {
  return getOpenScad()
}

async function handleCompile(msg: CompileRequest): Promise<CompileResponse> {
  try {
    const instance = await ensureInstance()
    try { instance.FS.mkdir('/work') } catch {}
    const input = '/work/input.scad'
    // Unique output per request to avoid collisions across concurrent runs
    const output = `/work/out-${msg.id}.stl`
    instance.FS.writeFile(input, msg.scad || '')
    try { console.log('[OpenSCAD Worker] compile request', { id: msg.id, scadLen: (msg.scad || '').length, params: Object.keys(msg.params || {}).length }) } catch {}

    const defineFlags: string[] = []
    if (msg.params) {
      for (const [k, v] of Object.entries(msg.params)) {
        if (Number.isFinite(v)) defineFlags.push('-D', `${k}=${v}`)
      }
    }

    const stderrBuffer = (instance as any)._stderrBuffer as string[] | undefined
    const stdoutBuffer = (instance as any)._stdoutBuffer as string[] | undefined
    if (stderrBuffer) {
      stderrBuffer.length = 0
      lastStderr = stderrBuffer
    }
    if (stdoutBuffer) {
      stdoutBuffer.length = 0
      lastStdout = stdoutBuffer
    }

    // Prepare minimal fontconfig setup to support text() without system font db
    try { instance.FS.mkdir('/etc') } catch {}
    try { instance.FS.mkdir('/etc/fonts') } catch {}
    try { instance.FS.mkdir('/fonts') } catch {}

    const fontsConf = `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE fontconfig SYSTEM "urn:fontconfig:fonts.dtd">\n<fontconfig>\n  <dir>/fonts</dir>\n</fontconfig>`
    try {
      instance.FS.writeFile('/etc/fonts/fonts.conf', fontsConf)
    } catch {}

    try {
      const fontUrl = `${baseOrigin}/fonts/arial.ttf`
      const fontResp = await fetch(fontUrl)
      if (fontResp.ok) {
        const fontBuf = new Uint8Array(await fontResp.arrayBuffer())
        instance.FS.writeFile('/fonts/arial.ttf', fontBuf)
        try { console.log('[OpenSCAD Worker] Mounted font', fontUrl) } catch {}
      } else {
        try { console.warn('[OpenSCAD Worker] Font fetch not ok', { url: fontUrl, status: fontResp.status }) } catch {}
      }
    } catch (e) {
      try { console.warn('[OpenSCAD Worker] Font fetch failed', e) } catch {}
    }

    // Ensure fontconfig env is visible to the module
    try {
      const currentEnv = (instance as any).ENV || {}
      ;(instance as any).ENV = {
        ...currentEnv,
        FONTCONFIG_FILE: '/etc/fonts/fonts.conf',
        FONTCONFIG_PATH: '/etc/fonts',
      }
    } catch {}

    // Use minimal args first and force headless, request binary STL output explicitly
    // Reorder flags to avoid build quirks: output/options first, then input, then -D defines
    const args = ['-o', output, '--export-format', 'binstl', input, ...defineFlags]

    const code = instance.callMain(args)
    try { console.log('[OpenSCAD Worker] callMain exit code', code) } catch {}

    let data: Uint8Array | null = null
    try {
      data = instance.FS.readFile(output) as Uint8Array
    } catch (readError) {
      try {
        data = instance.FS.readFile(output, { encoding: 'binary' }) as Uint8Array
      } catch (secondaryReadError) {
        // try a fallback path to rule out path sensitivity in some builds
        try {
          data = instance.FS.readFile('/out.stl') as Uint8Array
        } catch {
          data = null
        }
      }
    }

    const stderrMsg = lastStderr.length ? lastStderr.join('\n') : ''
    const stdoutMsg = lastStdout.length ? lastStdout.join('\n') : ''

    if (data && data.length) {
      const analysis = analyzeBinaryStl(data)
      if (!analysis.ok) {
        throw new Error(analysis.error)
      }

      const warnings = new Set<string>()
      analysis.warnings.forEach((warning) => warnings.add(warning))

      if (code !== 0) {
        const filtered = stderrMsg
          .split(/\r?\n/)
          .filter((line) => !NON_FATAL_SUBSTRINGS.some((s) => line.includes(s)))
          .join('\n')
        const fatal = FATAL_STDERR_PATTERNS.some((pattern) => pattern.test(filtered))
        if (fatal) {
          throw new Error(`OpenSCAD exited with code ${code}${stderrMsg ? `\nstderr:\n${stderrMsg}` : ''}${stdoutMsg ? `\nstdout:\n${stdoutMsg}` : ''}`)
        }
        warnings.add(`OpenSCAD returned exit code ${code}; using generated STL.`)
      }

      if (stderrMsg) {
        stderrMsg
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean)
          .forEach((line) => warnings.add(line))
      }

      return {
        id: msg.id,
        ok: true,
        fileType: 'stl',
        bytes: data,
        triangleCount: analysis.triangleCount,
        warnings: Array.from(warnings),
      }
    }

    if (code !== 0) {
      throw new Error(`OpenSCAD exited with code ${code}${stderrMsg ? `\nstderr:\n${stderrMsg}` : ''}${stdoutMsg ? `\nstdout:\n${stdoutMsg}` : ''}`)
    }

    throw new Error(`Empty STL output${stderrMsg ? `\nstderr:\n${stderrMsg}` : ''}`)
  } catch (e) {
    let err: string
    if (e instanceof Error && e.message) {
      err = e.message
    } else if (typeof e === 'string') {
      err = e
    } else {
      try {
        err = JSON.stringify(e)
      } catch {
        err = String(e)
      }
    }
    const stderrMsg = lastStderr.length ? lastStderr.join('\n') : ''
    if (stderrMsg && !err.includes('stderr')) {
      err = `${err}\nstderr:\n${stderrMsg}`
    }
    try { console.error('[OpenSCAD Worker] compile error', err) } catch {}
    return { id: msg.id, ok: false, error: err }
  }
}

self.onmessage = async (ev: MessageEvent<CompileRequest>) => {
  const req = ev.data
  if (!req) return
  if (req.type === 'init' && typeof req.origin === 'string') {
    baseOrigin = req.origin
    try { console.log('[OpenSCAD Worker] init received, origin=', baseOrigin) } catch {}
    return
  }
  if (req.type !== 'compile') return
  try { console.log('[OpenSCAD Worker] message compile received', { id: req.id }) } catch {}
  const res = await handleCompile(req)
  // Transfer the underlying ArrayBuffer when possible
  if (res.ok) {
    const ab = (res as any).bytes.buffer as ArrayBuffer
    ;(self as any).postMessage(res, [ab])
  } else {
    ;(self as any).postMessage(res)
  }
}


