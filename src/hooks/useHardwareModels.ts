"use client"

import { useQuery } from "@tanstack/react-query"
import { useCallback } from "react"

interface HardwareModel {
  componentId: string
  name: string
  scadCode?: string
  parameters?: unknown[]
  scadMimeType?: string
  updatedAt?: string
}

interface UseHardwareModelsResult {
  hardwareModels: Record<string, HardwareModel>
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

export function useHardwareModels(projectId: string): UseHardwareModelsResult {
  const fetchHardwareModels = useCallback(async (): Promise<Record<string, HardwareModel>> => {
    const params = new URLSearchParams({ projectId })

    const response = await fetch(`/api/hardware/models/fetch?${params}`)
    
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to fetch hardware models')
    }

    const data = await response.json()
    return data.hardwareModels || {}
  }, [projectId])

  const {
    data: hardwareModels = {},
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['hardware-models', projectId],
    queryFn: fetchHardwareModels,
    enabled: !!projectId,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
  })

  return {
    hardwareModels,
    isLoading,
    error,
    refetch,
  }
}
