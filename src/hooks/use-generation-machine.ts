import { create } from "zustand"

const logTransition = (event: string, payload: Record<string, unknown>) => {
  if (typeof window !== "undefined") {
    console.log(`[GEN-MACHINE] ${event}`, payload)
  }
}

export type GenerationPhase =
  | "idle"
  | "awaitingJob"
  | "scadAvailable"
  | "compiling"
  | "previewReady"
  | "error"

type StlSource = "server" | "computed"

export interface GenerationEntry {
  state: GenerationPhase
  scadCode?: string
  stlBase64?: string
  stlSource?: StlSource
  warnings?: string[]
  triangleCount?: number
  error?: string
  version: number
  updatedAt: number
}

interface MarkArgsBase {
  creationId: string
  componentId: string
}

interface MarkAwaitingArgs extends MarkArgsBase {
  reason?: string
}

interface MarkScadArgs extends MarkArgsBase {
  scadCode?: string
  stlContent?: string
  stlSource?: StlSource
  metadata?: { warnings?: string[]; triangleCount?: number }
}

interface MarkCompilingArgs extends MarkArgsBase {
  origin?: "auto" | "parameter" | "manual"
}

interface MarkPreviewArgs extends MarkArgsBase {
  stlBase64: string
  source: StlSource
  metadata?: { warnings?: string[]; triangleCount?: number }
}

interface MarkErrorArgs extends MarkArgsBase {
  error: string
}

interface HydrateModelArgs extends MarkArgsBase {
  scadCode?: string
  stlContent?: string
  status?: string
}

interface GenerationMachineState {
  entries: Record<string, GenerationEntry>
  markAwaitingJob: (args: MarkAwaitingArgs) => void
  markScadAvailable: (args: MarkScadArgs) => void
  markCompiling: (args: MarkCompilingArgs) => void
  markPreviewReady: (args: MarkPreviewArgs) => void
  markError: (args: MarkErrorArgs) => void
  hydrateFromModel: (args: HydrateModelArgs) => void
  resetForCreation: (creationId: string) => void
  getEntry: (creationId: string, componentId: string) => GenerationEntry | undefined
}

const keyFor = (creationId: string, componentId: string) => `${creationId}:${componentId}`

const nextEntry = (current: GenerationEntry | undefined, defaults?: Partial<GenerationEntry>): GenerationEntry => {
  const now = Date.now()
  const version = (current?.version ?? 0) + 1
  const base: GenerationEntry = {
    state: current?.state ?? "idle",
    scadCode: current?.scadCode,
    stlBase64: current?.stlBase64,
    stlSource: current?.stlSource,
    warnings: current?.warnings,
    triangleCount: current?.triangleCount,
    error: current?.error,
    version,
    updatedAt: now,
  }
  return {
    ...base,
    ...defaults,
    version,
    updatedAt: now,
  }
}

export const useGenerationMachine = create<GenerationMachineState>((set, get) => ({
  entries: {},
  markAwaitingJob: ({ creationId, componentId }) => {
    const key = keyFor(creationId, componentId)
    set((state) => {
      const current = state.entries[key]
      const updated = nextEntry(current, { state: "awaitingJob", error: undefined })
      logTransition("awaitingJob", { creationId, componentId, version: updated.version })
      return {
        entries: {
          ...state.entries,
          [key]: updated,
        },
      }
    })
  },
  markScadAvailable: ({ creationId, componentId, scadCode, stlContent, stlSource, metadata }) => {
    const key = keyFor(creationId, componentId)
    set((state) => {
      const current = state.entries[key]
      const incomingHasStl = !!stlContent
      const hasComputedStl = current?.stlSource === "computed"

      const nextState: GenerationEntry = nextEntry(current, {
        scadCode: scadCode ?? current?.scadCode,
        warnings: metadata?.warnings ?? current?.warnings,
        triangleCount: metadata?.triangleCount ?? current?.triangleCount,
        error: undefined,
      })

      if (incomingHasStl && !hasComputedStl) {
        nextState.state = "previewReady"
        nextState.stlBase64 = stlContent
        nextState.stlSource = stlSource ?? "server"
      } else if (current?.state === "previewReady" && hasComputedStl) {
        nextState.state = current.state
        nextState.stlBase64 = current.stlBase64
        nextState.stlSource = current.stlSource
      } else {
        nextState.state = "scadAvailable"
      }

      logTransition("scadAvailable", {
        creationId,
        componentId,
        hasStl: incomingHasStl,
        stlSource: nextState.stlSource,
        version: nextState.version,
      })

      return {
        entries: {
          ...state.entries,
          [key]: nextState,
        },
      }
    })
  },
  markCompiling: ({ creationId, componentId }) => {
    const key = keyFor(creationId, componentId)
    set((state) => {
      const current = state.entries[key]
      const nextState: GenerationEntry = nextEntry(current, {
        state: "compiling",
        error: undefined,
      })
      logTransition("compiling", { creationId, componentId, version: nextState.version })
      return {
        entries: {
          ...state.entries,
          [key]: nextState,
        },
      }
    })
  },
  markPreviewReady: ({ creationId, componentId, stlBase64, source, metadata }) => {
    const key = keyFor(creationId, componentId)
    set((state) => {
      const current = state.entries[key]
      const nextState: GenerationEntry = nextEntry(current, {
        state: "previewReady",
        stlBase64,
        stlSource: source,
        warnings: metadata?.warnings ?? current?.warnings,
        triangleCount: metadata?.triangleCount ?? current?.triangleCount,
        error: undefined,
      })
      logTransition("previewReady", {
        creationId,
        componentId,
        source,
        version: nextState.version,
      })
      return {
        entries: {
          ...state.entries,
          [key]: nextState,
        },
      }
    })
  },
  markError: ({ creationId, componentId, error }) => {
    const key = keyFor(creationId, componentId)
    set((state) => {
      const current = state.entries[key]
      const nextState: GenerationEntry = nextEntry(current, {
        state: "error",
        error,
      })
      logTransition("error", { creationId, componentId, error, version: nextState.version })
      return {
        entries: {
          ...state.entries,
          [key]: nextState,
        },
      }
    })
  },
  hydrateFromModel: ({ creationId, componentId, scadCode, stlContent, status }) => {
    const key = keyFor(creationId, componentId)
    set((state) => {
      const current = state.entries[key]
      const hasComputedStl = current?.state === "previewReady" && current?.stlSource === "computed"
      const next: GenerationEntry = nextEntry(current, {
        scadCode: scadCode ?? current?.scadCode,
        error: status === "failed" ? current?.error : undefined,
      })

      if (status === "failed" && !hasComputedStl) {
        next.state = "error"
      } else if (stlContent && !hasComputedStl) {
        next.state = "previewReady"
        next.stlBase64 = stlContent
        next.stlSource = "server"
      } else if (scadCode && !hasComputedStl && !stlContent) {
        if (status === "completed") {
          next.state = "scadAvailable"
        } else if (status === "processing") {
          next.state = "awaitingJob"
        }
      }

      logTransition("hydrate", {
        creationId,
        componentId,
        status,
        hasComputed: hasComputedStl,
        nextState: next.state,
        version: next.version,
      })

      return {
        entries: {
          ...state.entries,
          [key]: next,
        },
      }
    })
  },
  resetForCreation: (creationId: string) => {
    set((state) => {
      const nextEntries: Record<string, GenerationEntry> = {}
      const prefix = `${creationId}:`
      Object.entries(state.entries).forEach(([key, value]) => {
        if (!key.startsWith(prefix)) {
          nextEntries[key] = value
        } else {
          logTransition("reset", { creationId, key })
        }
      })
      return { entries: nextEntries }
    })
  },
  getEntry: (creationId: string, componentId: string) => {
    const key = keyFor(creationId, componentId)
    return get().entries[key]
  },
}))
