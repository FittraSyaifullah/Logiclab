import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { HardwareComponentModel, HardwareReports } from '@/lib/types'

type HardwareReportListItem = {
  reportId: string
  projectId: string
  title?: string
  createdAt: string
}

interface HardwareStore {
  reportsList: HardwareReportListItem[]
  reportsByProjectId: Record<string, HardwareReports>
  modelsByProjectId: Record<string, Record<string, HardwareComponentModel>>
  setReportsList: (items: HardwareReportListItem[]) => void
  setReportsForProject: (projectId: string, reports: HardwareReports) => void
  setModelsForProject: (projectId: string, models: Record<string, HardwareComponentModel>) => void
  clear: () => void
}

export const useHardwareStore = create<HardwareStore>()(
  persist(
    (set) => ({
      reportsList: [],
      reportsByProjectId: {},
      modelsByProjectId: {},
      setReportsList: (items) => set({ reportsList: items }),
      setReportsForProject: (projectId, reports) =>
        set((state) => ({ reportsByProjectId: { ...state.reportsByProjectId, [projectId]: reports } })),
      setModelsForProject: (projectId, models) =>
        set((state) => ({ modelsByProjectId: { ...state.modelsByProjectId, [projectId]: models } })),
      clear: () => set({ reportsList: [], reportsByProjectId: {}, modelsByProjectId: {} }),
    }),
    {
      name: 'hardware-store',
      partialize: (state) => ({
        reportsList: state.reportsList,
        reportsByProjectId: state.reportsByProjectId,
        modelsByProjectId: state.modelsByProjectId,
      }),
    },
  ),
)


