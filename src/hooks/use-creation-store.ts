import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Creation, HardwareData, HardwareReports, HardwareComponentModel } from '@/lib/types'

interface CreationStore {
  creations: Creation[]
  activeCreationId: string | null
  setActiveCreationId: (id: string | null) => void
  addCreation: (creation: Creation) => void
  updateCreation: (id: string, updates: Partial<Creation>) => void
  deleteCreation: (id: string) => void
  clearCreations: () => void
  applyHardwareReports: (id: string, projectId: string, reports: HardwareReports | Record<string, unknown>) => void
  setHardwareGenerationState: (id: string, patch: Partial<HardwareData>) => void
  upsertHardwareModels: (id: string, models: Record<string, HardwareComponentModel>) => void
}

export const useCreationStore = create<CreationStore>()(
  persist(
    (set) => ({
      creations: [],
      activeCreationId: null,
      
      setActiveCreationId: (id) => set({ activeCreationId: id }),
      
      addCreation: (creation) => set((state) => ({
        creations: [...state.creations, creation],
        activeCreationId: creation.id
      })),
      
      updateCreation: (id, updates) => set((state) => ({
        creations: state.creations.map((creation) =>
          creation.id === id ? { ...creation, ...updates } : creation
        )
      })),
      
      applyHardwareReports: (id, projectId, reports) => set((state) => {
        const existing = state.creations.find((c) => c.id === id)
        if (!existing) {
          console.warn('[CREATION-STORE] applyHardwareReports called for unknown creation', { id, projectId })
          return state
        }

        if (existing.projectId && existing.projectId !== projectId) {
          console.warn('[CREATION-STORE] projectId mismatch in applyHardwareReports – skipping update', {
            creationId: id,
            expected: existing.projectId,
            incoming: projectId,
          })
          return state
        }

        const nextHardwareData = {
          isGenerating: false,
          reportsGenerated: true,
        }

        return {
          creations: state.creations.map((creation) =>
            creation.id === id
              ? {
                  ...creation,
                  projectId,
                  hardwareReports: reports as Creation['hardwareReports'],
                  hardwareData: {
                    ...(creation.hardwareData ?? nextHardwareData),
                    ...nextHardwareData,
                  },
                }
              : creation,
          ),
          activeCreationId: id,
        }
      }),

      setHardwareGenerationState: (id, patch) => set((state) => ({
        creations: state.creations.map((creation) =>
          creation.id === id
            ? {
                ...creation,
                hardwareData: {
                  isGenerating: false,
                  reportsGenerated: false,
                  ...(creation.hardwareData ?? {}),
                  ...patch,
                },
              }
            : creation,
        ),
      })),

      upsertHardwareModels: (id, models) => set((state) => {
        const existing = state.creations.find((c) => c.id === id)
        if (!existing) {
          console.warn('[CREATION-STORE] upsertHardwareModels called for unknown creation', { id })
          return state
        }

        // models provided should always belong to the same project; no projectId in payload, so trust existing.projectId
        return {
          creations: state.creations.map((creation) =>
            creation.id === id
              ? {
                  ...creation,
                  hardwareModels: {
                    ...(creation.hardwareModels ?? {}),
                    ...models,
                  },
                }
              : creation,
          ),
        }
      }),
      
      deleteCreation: (id) => set((state) => ({
        creations: state.creations.filter((creation) => creation.id !== id),
        activeCreationId: state.activeCreationId === id ? null : state.activeCreationId
      })),
      
      clearCreations: () => set({ creations: [], activeCreationId: null })
    }),
    {
      name: 'creation-store',
      partialize: (state) => ({ creations: state.creations, activeCreationId: state.activeCreationId })
    }
  )
)

