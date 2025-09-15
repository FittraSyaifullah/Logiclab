import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, Project } from '@/lib/types'

interface UserStore {
  user: User | null
  project: Project | null
  setUser: (user: User | null) => void
  setProject: (project: Project | null) => void
  setUserAndProject: (user: User | null, project: Project | null) => void
  clearUser: () => void
}

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      user: null,
      project: null,
      setUser: (user) => set({ user }),
      setProject: (project) => set({ project }),
      setUserAndProject: (user, project) => set({ user, project }),
      clearUser: () => set({ user: null, project: null }),
    }),
    {
      name: 'user-store',
      partialize: (state) => ({ user: state.user, project: state.project })
    }
  )
)
