"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, Download, Zap, ImageIcon, Box } from "lucide-react"
import type { Creation } from "@/lib/types"

interface ViewerPanelProps {
  creation: Creation
  onGenerate3D: (creationId: string) => void
}

export function ViewerPanel({ creation, onGenerate3D }: ViewerPanelProps) {
  const [ClientViewer, setClientViewer] = useState<null | React.ComponentType<{ creation: Creation }>>(null)
  const [loadingClient, setLoadingClient] = useState(false)

  useEffect(() => {
    let mounted = true
    setLoadingClient(true)
    import("./viewer-panel.client")
      .then((mod: { ClientViewer?: React.ComponentType<{ creation: Creation }>; default?: React.ComponentType<{ creation: Creation }> }) => {
        if (!mounted) return
        setClientViewer(() => mod.ClientViewer ?? mod.default ?? null)
      })
      .catch((err) => {
        console.error("Failed to load client 3D viewer:", err)
      })
      .finally(() => mounted && setLoadingClient(false))

    return () => {
      mounted = false
    }
  }, [])

  const hasImage = !!creation.imageUrl
  const hasModel = !!creation.modelUrl
  const isGenerating = !!creation.isGenerating3D

  return (
    <div className="h-full flex flex-col">
      <Card className="flex-1 flex flex-col">
        <CardHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Box className="h-5 w-5 text-indigo-500" />
              3D Model Viewer
            </CardTitle>
            <div className="flex items-center gap-2">
              {hasImage && (
                <Badge variant="secondary" className="text-xs">
                  <ImageIcon className="h-3 w-3 mr-1" />
                  Image Ready
                </Badge>
              )}
              {hasModel && (
                <Badge variant="default" className="text-xs bg-green-600">
                  <Box className="h-3 w-3 mr-1" />
                  3D Model Ready
                </Badge>
              )}
              {isGenerating && (
                <Badge variant="secondary" className="text-xs">
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Generating...
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-4">
          <div className="flex-1 relative bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-800 dark:to-neutral-900 rounded-lg overflow-hidden">
            {ClientViewer ? (
              <ClientViewer creation={creation} />
            ) : (
              <>
                {hasModel ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <Loader2 className="h-7 w-7 animate-spin mx-auto mb-3" />
                      <p className="text-sm">Loading 3D viewer…</p>
                    </div>
                  </div>
                ) : hasImage ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="max-w-md max-h-full">
                      <img
                        src={creation.imageUrl || "/placeholder.svg"}
                        alt={creation.title}
                        className="w-full h-full object-contain rounded-lg shadow-lg"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <Box className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium mb-2">No 3D Model Yet</p>
                      <p className="text-sm">Generate an image first, then create a 3D model</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex-shrink-0 mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {hasModel && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (!creation.modelUrl) return
                      const link = document.createElement("a")
                      link.href = creation.modelUrl
                      link.download = `${creation.title.replace(/\s+/g, "_")}_model.glb`
                      document.body.appendChild(link)
                      link.click()
                      document.body.removeChild(link)
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download GLB
                  </Button>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              {hasImage && !hasModel && !isGenerating && (
                <Button onClick={() => onGenerate3D(creation.id)}>
                  <Zap className="h-4 w-4 mr-2" />
                  Generate 3D Model
                </Button>
              )}
              {hasModel && (
                <Button variant="outline" onClick={() => onGenerate3D(creation.id)} disabled={isGenerating}>
                  <Zap className="h-4 w-4 mr-2" />
                  Regenerate
                </Button>
              )}
            </div>
          </div>

          {creation.error && (
            <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-800 dark:text-red-200">
                <strong>Error:</strong> {creation.error}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
