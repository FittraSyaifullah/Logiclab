import { createContext, useCallback, useContext, useMemo } from "react"
import type { PropsWithChildren } from "react"
import type { Creation, HardwareComponentModel, HardwareData, HardwareReports } from "@/lib/types"
import { useCreationStore } from "@/hooks/use-creation-store"

interface ApplyReportsArgs {
  creationId: string
  projectId: string
  reports: HardwareReports | Record<string, unknown>
  source?: string
}

interface UpsertModelsArgs {
  creationId: string
  projectId: string
  models: Record<string, HardwareComponentModel>
}

interface UpdateCreationArgs {
  creationId: string
  updates: Partial<Creation>
  projectId?: string | null
}

type CreationManager = {
  creations: Creation[]
  activeCreationId: string | null
  activeCreation: Creation | null
  setActiveCreationId: (id: string | null) => void
  addCreation: (creation: Creation) => void
  deleteCreation: (creationId: string) => void
  clearCreations: () => void
  applyReports: (args: ApplyReportsArgs) => void
  upsertModels: (args: UpsertModelsArgs) => void
  updateCreation: (args: UpdateCreationArgs) => void
  setHardwareGenerationState: (
    creationId: string,
    patch: Partial<HardwareData>,
  ) => void
  getCreation: (creationId: string) => Creation | undefined
}

const CreationContext = createContext<CreationManager | null>(null)

function ensureProjectMatch(creation: Creation | undefined, targetProjectId: string) {
  if (!creation) return false
  if (!creation.projectId) return true
  return creation.projectId === targetProjectId
}

export function CreationProvider({ children }: PropsWithChildren) {
  const {
    creations,
    activeCreationId,
    setActiveCreationId,
    addCreation,
    deleteCreation,
    applyHardwareReports,
    upsertHardwareModels,
    updateCreation,
    setHardwareGenerationState,
    clearCreations,
  } = useCreationStore()

  const getCreation = useCallback(
    (creationId: string) =>
      useCreationStore.getState().creations.find((creation) => creation.id === creationId),
    [],
  )

  const applyReports = useCallback(
    ({ creationId, projectId, reports, source }: ApplyReportsArgs) => {
      const creation = getCreation(creationId)
      if (!creation) {
        console.warn("[CREATION] Cannot apply reports for unknown creation", {
          creationId,
          projectId,
          source,
        })
        return
      }

      if (!ensureProjectMatch(creation, projectId)) {
        console.warn("[CREATION] Skipping reports due to project mismatch", {
          creationId,
          expected: creation.projectId,
          incoming: projectId,
          source,
        })
        return
      }

      applyHardwareReports(creationId, projectId, reports)
    },
    [applyHardwareReports, getCreation],
  )

  const upsertModels = useCallback(
    ({ creationId, projectId, models }: UpsertModelsArgs) => {
      const creation = getCreation(creationId)
      if (!creation) {
        console.warn("[CREATION] Cannot upsert models for unknown creation", {
          creationId,
          projectId,
        })
        return
      }

      if (!ensureProjectMatch(creation, projectId)) {
        console.warn("[CREATION] Skipping models due to project mismatch", {
          creationId,
          expected: creation.projectId,
          incoming: projectId,
        })
        return
      }

      upsertHardwareModels(creationId, models)
    },
    [getCreation, upsertHardwareModels],
  )

  const guardedUpdateCreation = useCallback(
    ({ creationId, updates, projectId }: UpdateCreationArgs) => {
      const creation = getCreation(creationId)
      if (!creation) {
        console.warn("[CREATION] Cannot update unknown creation", { creationId, projectId })
        return
      }

      if (projectId && !ensureProjectMatch(creation, projectId)) {
        console.warn("[CREATION] Skipping update due to project mismatch", {
          creationId,
          projectId,
          expected: creation.projectId,
          updates,
        })
        return
      }

      updateCreation(creationId, updates)
    },
    [getCreation, updateCreation],
  )

  const value = useMemo<CreationManager>(
    () => ({
      creations,
      activeCreationId,
      activeCreation: activeCreationId
        ? creations.find((creation) => creation.id === activeCreationId) ?? null
        : null,
      setActiveCreationId,
      addCreation,
      deleteCreation,
      clearCreations,
      applyReports,
      upsertModels,
      updateCreation: guardedUpdateCreation,
      setHardwareGenerationState,
      getCreation,
    }),
    [
      creations,
      activeCreationId,
      setActiveCreationId,
      addCreation,
      deleteCreation,
      clearCreations,
      applyReports,
      upsertModels,
      guardedUpdateCreation,
      setHardwareGenerationState,
      getCreation,
    ],
  )

  return <CreationContext.Provider value={value}>{children}</CreationContext.Provider>
}

export function useCreationManager() {
  const context = useContext(CreationContext)
  if (!context) {
    throw new Error("useCreationManager must be used within a CreationProvider")
  }
  return context
}
