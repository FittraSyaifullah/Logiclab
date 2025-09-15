import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Creation } from '@/lib/types'

interface CreationStore {
  creations: Creation[]
  activeCreationId: string | null
  setActiveCreationId: (id: string | null) => void
  addCreation: (creation: Creation) => void
  updateCreation: (id: string, updates: Partial<Creation>) => void
  deleteCreation: (id: string) => void
  clearCreations: () => void
}

export const useCreationStore = create<CreationStore>()(
  persist(
    (set, get) => ({
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

