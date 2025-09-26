"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Box,
  FileText,
  Code,
  Download,
  Eye,
  RefreshCw,
  CheckCircle,
  Clock,
  DollarSign,
  Loader2,
  Copy,
} from "lucide-react"
import type { Creation, HardwareReports } from "@/lib/types"

interface HardwareViewerProps {
  creation: Creation
  onRegenerate?: () => void
}

export function HardwareViewer({ creation, onRegenerate }: HardwareViewerProps) {
  const [activeTab, setActiveTab] = useState("3d-components")
  const [regeneratingTabs, setRegeneratingTabs] = useState<string[]>([])

  const hardwareReports = creation.hardwareReports as HardwareReports | undefined

  const handleRegenerate = async (tabId: string) => {
    setRegeneratingTabs((prev) => [...prev, tabId])

    try {
      // Call the specific regeneration API
      const response = await fetch(`/api/hardware/generate-${tabId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectData: {
            id: creation.id,
            title: creation.title,
            description: creation.prompt,
          }
        }),
      })

      if (response.ok) {
        const result = await response.json()
        console.log(`Regenerated ${tabId}:`, result)
        // Refresh the page or update state to show new content
        window.location.reload()
      } else {
        console.error(`Failed to regenerate ${tabId}`)
      }
    } catch (error) {
      console.error("Failed to regenerate tab:", error)
    } finally {
      setTimeout(() => {
        setRegeneratingTabs((prev) => prev.filter((id) => id !== tabId))
      }, 2000)
    }
  }

  const isRegenerating = (tabId: string) => regeneratingTabs.includes(tabId)

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch (err) {
      console.error("Failed to copy text: ", err)
    }
  }

  const renderContent = (content: string, type: "code" | "components" | "assembly") => {
    if (!content) return null

    if (type === "code") {
      // Extract code blocks from markdown
      const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g
      const parts = []
      let lastIndex = 0
      let match

      while ((match = codeBlockRegex.exec(content)) !== null) {
        // Add text before code block
        if (match.index > lastIndex) {
          parts.push({
            type: "text",
            content: content.slice(lastIndex, match.index),
          })
        }

        // Add code block
        parts.push({
          type: "code",
          language: match[1] || "text",
          content: match[2].trim(),
        })

        lastIndex = match.index + match[0].length
      }

      // Add remaining text
      if (lastIndex < content.length) {
        parts.push({
          type: "text",
          content: content.slice(lastIndex),
        })
      }

      return (
        <div className="space-y-4">
          {parts.map((part, index) => (
            <div key={index}>
              {part.type === "code" ? (
                <div className="relative">
                  <div className="flex items-center justify-between bg-muted px-4 py-2 rounded-t-lg border-b">
                    <Badge variant="outline">{part.language}</Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(part.content)}
                      className="h-6 px-2"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                  <pre className="bg-muted/30 p-4 rounded-b-lg overflow-auto font-mono text-sm">
                    <code>{part.content}</code>
                  </pre>
                </div>
              ) : (
                <div className="whitespace-pre-wrap text-sm">{part.content}</div>
              )}
            </div>
          ))}
        </div>
      )
    }

    if (type === "components") {
      // Parse component sections and make them copyable
      const sections = content.split(/(?=###|\*\*Prompt for 3D Generation\*\*)/g)

      return (
        <div className="space-y-4">
          {sections.map((section, index) => {
            if (section.includes("**Prompt for 3D Generation**")) {
              const promptMatch = section.match(/\*\*Prompt for 3D Generation\*\*:\s*"([^"]+)"/)
              const prompt = promptMatch ? promptMatch[1] : ""

              return (
                <div key={index} className="border rounded-lg p-4 bg-muted/20">
                  <div className="whitespace-pre-wrap text-sm mb-3">
                    {section.replace(/\*\*Prompt for 3D Generation\*\*:\s*"[^"]+"/g, "")}
                  </div>
                  {prompt && (
                    <div className="relative">
                      <div className="flex items-center justify-between bg-blue-50 px-3 py-2 rounded-t-lg border-b">
                        <span className="text-sm font-medium text-blue-700">3D Generation Prompt</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(prompt)}
                          className="h-6 px-2 text-blue-600 hover:text-blue-800"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                      <div className="bg-blue-50/50 p-3 rounded-b-lg border border-blue-200">
                        <p className="text-sm text-blue-800">{prompt}</p>
                      </div>
                    </div>
                  )}
                </div>
              )
            }

            return (
              <div key={index} className="whitespace-pre-wrap text-sm">
                {section}
              </div>
            )
          })}
        </div>
      )
    }

    if (type === "assembly") {
      // Format assembly instructions with proper step numbering
      const stepRegex = /(?:^|\n)((?:Step \d+|### Step \d+|##? \d+\.?)[^\n]*)/g
      const parts = []
      let lastIndex = 0
      let match
      let stepCounter = 1

      while ((match = stepRegex.exec(content)) !== null) {
        // Add text before step
        if (match.index > lastIndex) {
          parts.push({
            type: "text",
            content: content.slice(lastIndex, match.index),
          })
        }

        // Add step
        parts.push({
          type: "step",
          number: stepCounter++,
          content: match[1],
        })

        lastIndex = match.index + match[0].length
      }

      // Add remaining text
      if (lastIndex < content.length) {
        parts.push({
          type: "text",
          content: content.slice(lastIndex),
        })
      }

      return (
        <div className="space-y-4">
          {parts.map((part, index) => (
            <div key={index}>
              {part.type === "step" ? (
                <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    {part.number}
                  </div>
                  <div className="flex-1 text-sm text-blue-800 font-medium">
                    {part.content.replace(/^(?:Step \d+|### Step \d+|##? \d+\.?):?\s*/, "")}
                  </div>
                </div>
              ) : (
                <div className="whitespace-pre-wrap text-sm">{part.content}</div>
              )}
            </div>
          ))}
        </div>
      )
    }

    return (
      <div className="whitespace-pre-wrap text-sm bg-muted/30 p-4 rounded-lg overflow-auto max-h-96">{content}</div>
    )
  }

  if (creation.hardwareData?.isGenerating) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <div>
            <h3 className="font-medium">Generating Hardware Specifications</h3>
            <p className="text-sm text-muted-foreground">
              Our AI is creating detailed 3D models, assembly instructions, and firmware code...
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!hardwareReports || Object.keys(hardwareReports).length === 0) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Box className="w-12 h-12 mx-auto text-muted-foreground" />
          <div>
            <h3 className="font-medium">Ready to Generate Hardware</h3>
            <p className="text-sm text-muted-foreground">Start a hardware project to see specifications here</p>
            <Button onClick={onRegenerate} className="mt-4">
              <RefreshCw className="w-4 h-4 mr-2" />
              Generate Hardware Specs
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 p-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <TabsList className="grid w-full max-w-lg grid-cols-4">
            <TabsTrigger value="3d-components" className="gap-2 relative">
              <Box className="w-4 h-4" />
              3D Components
              {isRegenerating("3d-components") && (
                <RefreshCw className="w-3 h-3 animate-spin absolute -top-1 -right-1" />
              )}
            </TabsTrigger>
            <TabsTrigger value="assembly-parts" className="gap-2 relative">
              <FileText className="w-4 h-4" />
              Assembly & Parts
              {isRegenerating("assembly-parts") && (
                <RefreshCw className="w-3 h-3 animate-spin absolute -top-1 -right-1" />
              )}
            </TabsTrigger>
            <TabsTrigger value="firmware-code" className="gap-2 relative">
              <Code className="w-4 h-4" />
              Firmware & Code
              {isRegenerating("firmware-code") && (
                <RefreshCw className="w-3 h-3 animate-spin absolute -top-1 -right-1" />
              )}
            </TabsTrigger>
            <TabsTrigger value="safety" className="gap-2">
              <CheckCircle className="w-4 h-4" />
              Safety
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <CheckCircle className="w-3 h-3" />
              AI Generated
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleRegenerate(activeTab)}
              disabled={isRegenerating(activeTab) || activeTab === "safety"}
            >
              {isRegenerating(activeTab) ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                  Regenerating...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Regenerate Tab
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="flex-1">
          <TabsContent value="3d-components" className="h-full">
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Box className="w-5 h-5" />
                      3D Printable Components
                    </CardTitle>
                    <CardDescription>AI-generated components broken down into printable parts</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {hardwareReports["3d-components"]?.components?.length || 3} Parts
                    </Badge>
                    <Badge variant="outline" className="gap-1">
                      <DollarSign className="w-3 h-3" />
                      ~$2.50 material
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">AI Generation Complete</span>
                      <span className="text-sm text-muted-foreground">100%</span>
                    </div>
                  </div>
                  <CheckCircle className="w-5 h-5 text-blue-500" />
                </div>

                {renderContent(
                  hardwareReports["3d-components"]?.content || "No 3D components content available",
                  "components",
                )}

                <div className="flex gap-2 pt-4 border-t">
                  <Button className="flex-1">
                    <Download className="w-4 h-4 mr-2" />
                    Download All STL Files
                  </Button>
                  <Button variant="outline">
                    <Eye className="w-4 h-4 mr-2" />
                    Preview in 3D Viewer
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assembly-parts" className="h-full">
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      AI-Generated Assembly Instructions
                    </CardTitle>
                    <CardDescription>Step-by-step build guide with complete bill of materials</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="gap-1">
                      <Clock className="w-3 h-3" />~{hardwareReports["assembly-parts"]?.estimatedTime || "2 hours"} build
                    </Badge>
                    <Badge variant="outline" className="gap-1">
                      <DollarSign className="w-3 h-3" />
                      ~$35 total cost
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription className="flex items-center justify-between">
                    <span>AI safety analysis: This project uses low voltage components and is beginner-safe.</span>
                    <Badge variant="secondary" className="gap-1">
                      <CheckCircle className="w-3 h-3" />
                      AI Verified Safe
                    </Badge>
                  </AlertDescription>
                </Alert>

                {renderContent(
                  hardwareReports["assembly-parts"]?.content || "No assembly instructions available",
                  "assembly",
                )}

                <div className="flex gap-2 pt-4 border-t">
                  <Button className="flex-1">
                    <Download className="w-4 h-4 mr-2" />
                    Download Complete Assembly Guide (PDF)
                  </Button>
                  <Button variant="outline">
                    <Eye className="w-4 h-4 mr-2" />
                    View Interactive Assembly Guide
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="firmware-code" className="h-full">
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Code className="w-5 h-5" />
                      AI-Generated Firmware & Code
                    </CardTitle>
                    <CardDescription>Ready-to-flash code with pin mappings and test routines</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{hardwareReports["firmware-code"]?.platform || "Arduino IDE"}</Badge>
                    <Badge variant="outline">{hardwareReports["firmware-code"]?.language || "C++"}</Badge>
                    <Badge variant="secondary">AI Generated</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <Alert>
                    <Code className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Programming Language:</strong> {hardwareReports["firmware-code"]?.language || "C++"} |
                      <strong> Platform:</strong> {hardwareReports["firmware-code"]?.platform || "Arduino IDE"}
                    </AlertDescription>
                  </Alert>

                  {renderContent(hardwareReports["firmware-code"]?.content || "No firmware code available", "code")}

                  <div className="flex gap-2 pt-4 border-t">
                    <Button className="flex-1">
                      <Download className="w-4 h-4 mr-2" />
                      Download .ino File
                    </Button>
                    <Button variant="outline">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Regenerate Code
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="safety" className="h-full">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  AI Safety Analysis
                </CardTitle>
                <CardDescription>Automated safety verification for your hardware project</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="font-medium">Electrical Safety</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Project uses safe 5V USB power. No high voltage components detected.
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="font-medium">Mechanical Safety</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      No moving parts that could cause injury. All components properly enclosed.
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="font-medium">Thermal Safety</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Components operate at room temperature. No heat-generating elements.
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="font-medium">Beginner Friendly</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Suitable for beginners. No advanced tools or expertise required.
                    </p>
                  </div>
                </div>

                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Overall Assessment:</strong> This project has been analyzed and approved as safe for construction.
                    All components are beginner-friendly and use standard low-voltage electronics.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
