"use client"

import { create } from "zustand"

interface LandingStoreState {
  pendingPrompt: string | null
  setPendingPrompt: (value: string | null) => void
  consumePendingPrompt: () => string | null
}

export const useLandingStore = create<LandingStoreState>((set, get) => ({
  pendingPrompt: null,
  setPendingPrompt: (value: string | null) => set({ pendingPrompt: value }),
  consumePendingPrompt: () => {
    const value = get().pendingPrompt
    set({ pendingPrompt: null })
    return value
  },
}))


