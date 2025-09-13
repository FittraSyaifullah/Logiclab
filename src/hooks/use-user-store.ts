import { create } from 'zustand'

interface User {
  id: string
  email: string
  firstName?: string
  lastName?: string
  fullName?: string
}

interface Project {
  id: string
  name: string
  description?: string
}

interface UserStore {
  user: User | null
  project: Project | null
  setUser: (user: User | null) => void
  setProject: (project: Project | null) => void
  setUserAndProject: (user: User | null, project: Project | null) => void
  clearUser: () => void
}

export const useUserStore = create<UserStore>((set) => ({
  user: null,
  project: null,
  setUser: (user) => set({ user }),
  setProject: (project) => set({ project }),
  setUserAndProject: (user, project) => set({ user, project }),
  clearUser: () => set({ user: null, project: null }),
}))
