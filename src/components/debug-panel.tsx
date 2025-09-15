"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Bug, CheckCircle, XCircle, AlertTriangle, RefreshCw, Zap } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"

interface DebugInfo {
  timestamp: string
  apiKeyConfigured: boolean
  hfTokenConfigured?: boolean
  hfTokenFormat?: boolean
  lastGenerationAttempt?: string
  lastError?: string
  apiEndpointStatus: "unknown" | "healthy" | "error"
  service?: string
}

export function DebugPanel() {
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const { toast } = useToast()

  const runDiagnostics = async () => {
    setIsChecking(true)
    try {
      const configResponse = await fetch("/api/debug/config")
      const configData = await configResponse.json()

      const connectivityResponse = await fetch("/api/debug/connectivity")
      const connectivityData = await connectivityResponse.json()

      setDebugInfo({
        timestamp: new Date().toISOString(),
        apiKeyConfigured: configData.apiKeyConfigured,
        hfTokenConfigured: configData.hfTokenConfigured,
        hfTokenFormat: configData.hfTokenFormat,
        apiEndpointStatus: connectivityData.status,
        service: connectivityData.service,
        lastError: connectivityData.error,
      })

      toast({ title: "Diagnostics completed", description: "Check the results below" })
    } catch (error) {
      toast({ title: "Diagnostics failed", description: (error as Error).message, variant: "destructive" })
    } finally {
      setIsChecking(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bug className="h-5 w-5" />
          API Diagnostics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={runDiagnostics} disabled={isChecking} className="w-full">
          {isChecking ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Bug className="mr-2 h-4 w-4" />}
          Run Diagnostics
        </Button>

        {debugInfo && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Anthropic API Key</span>
                {debugInfo.apiKeyConfigured ? (
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Yes
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <XCircle className="mr-1 h-3 w-3" />
                    No
                  </Badge>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm">Hugging Face Token</span>
                {debugInfo.hfTokenConfigured ? (
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    <Zap className="mr-1 h-3 w-3" />
                    Configured
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <XCircle className="mr-1 h-3 w-3" />
                    Missing
                  </Badge>
                )}
              </div>

              {debugInfo.hfTokenConfigured && (
                <div className="flex items-center justify-between">
                  <span className="text-sm">HF Token Format</span>
                  {debugInfo.hfTokenFormat ? (
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Valid
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <XCircle className="mr-1 h-3 w-3" />
                      Invalid
                    </Badge>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-sm">{debugInfo.service || "API Endpoint"}</span>
                <div className="flex items-center gap-1">
                  {getStatusIcon(debugInfo.apiEndpointStatus)}
                  <Badge variant="outline">{debugInfo.apiEndpointStatus}</Badge>
                </div>
              </div>

              {debugInfo.lastError && (
                <div className="p-2 bg-red-50 dark:bg-red-900 rounded text-xs">
                  <strong>Last Error:</strong>
                  <ScrollArea className="h-20 mt-1">
                    <pre className="whitespace-pre-wrap">{debugInfo.lastError}</pre>
                  </ScrollArea>
                </div>
              )}

              <div className="text-xs text-muted-foreground">
                Last check: {new Date(debugInfo.timestamp).toLocaleString()}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}


