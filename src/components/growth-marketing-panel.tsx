"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import {
  TrendingUp,
  Users,
  Target,
  Lightbulb,
  MessageSquare,
  Map,
  Shield,
  FlaskConical,
  Loader2,
  ArrowRight,
  Star,
  AlertCircle,
  Download,
  X,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import jsPDF from "jspdf"

interface GrowthMarketingPanelProps {
  isOpen: boolean
  onClose: () => void
}

interface MarketAnalysis {
  icp: {
    description: string
    score: number
    viability: string
  }
  solution: {
    analysis: string
    score: number
    paymentLikelihood: string
  }
  niches: string[]
  competitors: Array<{
    name: string
    strengths: string[]
    weaknesses: string[]
    traction: string
    opportunities: string
  }>
  features: Array<{
    feature: string
    benefit: string
    priority: "high" | "medium" | "low"
  }>
  feedback: {
    customer: string
    advisor: string
  }
  customerJourney: Array<{
    stage: string
    touchpoints: string[]
    painPoints: string[]
    opportunities: string[]
  }>
  moats: string[]
  hypotheses: Array<{
    hypothesis: string
    goal: string
    metric: string
  }>
}

export function GrowthMarketingPanel({ isOpen, onClose }: GrowthMarketingPanelProps) {
  const [projectDescription, setProjectDescription] = useState("")
  const [projectPurpose, setProjectPurpose] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<MarketAnalysis | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [usingMockData, setUsingMockData] = useState(false)
  const { toast } = useToast()

  const analysisSteps = [
    "Analyzing target market...",
    "Evaluating solution fit...",
    "Identifying niches...",
    "Researching competitors...",
    "Mapping customer journey...",
    "Generating insights...",
  ]

  const downloadPDF = () => {
    if (!analysis) return

    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.width
    const margin = 20
    let yPosition = margin

    // Helper function to add text with word wrapping
    const addText = (text: string, fontSize = 10, isBold = false) => {
      doc.setFontSize(fontSize)
      if (isBold) {
        doc.setFont(undefined, "bold")
      } else {
        doc.setFont(undefined, "normal")
      }

      const lines = doc.splitTextToSize(text, pageWidth - 2 * margin)

      // Check if we need a new page
      if (yPosition + lines.length * fontSize * 0.4 > doc.internal.pageSize.height - margin) {
        doc.addPage()
        yPosition = margin
      }

      doc.text(lines, margin, yPosition)
      yPosition += lines.length * fontSize * 0.4 + 5
    }

    // Title
    addText("GROWTH MARKETING ANALYSIS REPORT", 16, true)
    addText(`Generated on: ${new Date().toLocaleDateString()}`, 10)
    yPosition += 10

    // Project Info
    addText("PROJECT OVERVIEW", 14, true)
    addText(`Project: ${projectDescription}`, 10)
    addText(`Purpose: ${projectPurpose}`, 10)
    yPosition += 10

    // ICP Section
    addText(`IDEAL CUSTOMER PROFILE (Score: ${analysis.icp.score}/50)`, 14, true)
    addText(analysis.icp.description, 10)
    addText(`Market Viability: ${analysis.icp.viability}`, 10, true)
    yPosition += 10

    // Solution Analysis
    addText(`SOLUTION ANALYSIS (Score: ${analysis.solution.score}/50)`, 14, true)
    addText(analysis.solution.analysis, 10)
    addText(`Payment Likelihood: ${analysis.solution.paymentLikelihood}`, 10, true)
    yPosition += 10

    // Target Niches
    addText("TARGET NICHES", 14, true)
    analysis.niches.forEach((niche) => {
      addText(`• ${niche}`, 10)
    })
    yPosition += 10

    // Competitor Analysis
    addText("COMPETITOR ANALYSIS", 14, true)
    analysis.competitors.forEach((comp) => {
      addText(comp.name, 12, true)
      addText(`Strengths: ${comp.strengths.join(", ")}`, 10)
      addText(`Weaknesses: ${comp.weaknesses.join(", ")}`, 10)
      addText(`Opportunities: ${comp.opportunities}`, 10)
      yPosition += 5
    })

    // Features & Roadmap
    addText("FEATURES & PRODUCT ROADMAP", 14, true)
    analysis.features.forEach((feature) => {
      addText(`• ${feature.feature} (${feature.priority} priority)`, 10, true)
      addText(`  ${feature.benefit}`, 10)
    })
    yPosition += 10

    // Customer Feedback
    addText("CUSTOMER FEEDBACK", 14, true)
    addText("Customer Perspective:", 12, true)
    addText(analysis.feedback.customer, 10)
    addText("Advisor Perspective:", 12, true)
    addText(analysis.feedback.advisor, 10)
    yPosition += 10

    // Competitive Moats
    addText("COMPETITIVE MOATS", 14, true)
    analysis.moats.forEach((moat) => {
      addText(`• ${moat}`, 10)
    })
    yPosition += 10

    // Strategic Hypotheses
    addText("STRATEGIC HYPOTHESES", 14, true)
    analysis.hypotheses.forEach((hyp) => {
      addText(`• ${hyp.hypothesis}`, 10, true)
      addText(`  Goal: ${hyp.goal}`, 10)
      addText(`  Metric: ${hyp.metric}`, 10)
      yPosition += 3
    })

    // Save the PDF
    doc.save(`growth-marketing-analysis-${Date.now()}.pdf`)

    toast({
      title: "PDF Downloaded",
      description: "Your growth marketing analysis has been saved as a PDF file.",
    })
  }

  const handleAnalyze = async () => {
    if (!projectDescription.trim() || !projectPurpose.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide both project description and purpose",
        variant: "destructive",
      })
      return
    }

    setIsAnalyzing(true)
    setCurrentStep(0)

    try {
      // Simulate step-by-step analysis
      for (let i = 0; i < analysisSteps.length; i++) {
        setCurrentStep(i)
        await new Promise((resolve) => setTimeout(resolve, 1500))
      }

      const response = await fetch("/api/growth-marketing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectDescription,
          projectPurpose,
        }),
      })

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`)
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      setAnalysis(data.analysis)
      setUsingMockData(data.usingMockData || false)
      setIsAnalyzing(false)

      if (data.usingMockData && data.message) {
        toast({
          title: "Demo Analysis Complete",
          description: data.message,
          variant: "default",
        })
      } else {
        toast({
          title: "Analysis Complete",
          description: "Your market research report is ready!",
        })
      }
    } catch (error) {
      setIsAnalyzing(false)

      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "Failed to generate analysis. Please try again.",
        variant: "destructive",
      })
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <TrendingUp className="h-6 w-6 text-blue-500" />
                Growth Marketing Analysis
                {usingMockData && (
                  <Badge variant="outline" className="ml-2">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Demo Data
                  </Badge>
                )}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                AI-powered market research using advanced reasoning models
              </p>
            </div>
            <Button variant="ghost" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Input Form */}
          {!analysis && (
            <div className="flex-1 p-6 flex items-center justify-center">
              <div className="max-w-2xl w-full space-y-6">
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-semibold">Tell us about your project</h3>
                  <p className="text-muted-foreground">
                    Provide details about your project to get comprehensive market insights
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">What is your project?</label>
                    <Textarea
                      placeholder="Describe your project, product, or service in detail..."
                      value={projectDescription}
                      onChange={(e) => setProjectDescription(e.target.value)}
                      className="min-h-[100px]"
                      disabled={isAnalyzing}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      What does it do? What problem does it solve?
                    </label>
                    <Textarea
                      placeholder="Explain the core functionality and the problem it addresses..."
                      value={projectPurpose}
                      onChange={(e) => setProjectPurpose(e.target.value)}
                      className="min-h-[100px]"
                      disabled={isAnalyzing}
                    />
                  </div>
                </div>

                {isAnalyzing ? (
                  <div className="space-y-4">
                    <div className="text-center">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-500" />
                      <p className="font-medium">{analysisSteps[currentStep]}</p>
                      <Progress value={((currentStep + 1) / analysisSteps.length) * 100} className="mt-2" />
                    </div>
                  </div>
                ) : (
                  <Button onClick={handleAnalyze} className="w-full" size="lg">
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Generate Market Analysis
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Analysis Results */}
          {analysis && (
            <ScrollArea className="flex-1 p-6">
              <div className="space-y-6">
                {usingMockData && (
                  <Card className="border-orange-200 bg-orange-50 dark:bg-orange-900/20">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
                        <AlertCircle className="h-4 w-4" />
                        <p className="text-sm">
                          <strong>Demo Analysis:</strong> Add PERPLEXITY_API_KEY to Project Settings for real-time
                          market research.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* ICP Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-blue-500" />
                      ICP (Ideal Customer Profile)
                      <Badge variant="secondary" className="ml-auto">
                        {analysis.icp.score}/50
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="mb-3">{analysis.icp.description}</p>
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                      <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                        Market Viability: {analysis.icp.viability}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Solution Analysis */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-green-500" />
                      Solution Analysis
                      <Badge variant="secondary" className="ml-auto">
                        {analysis.solution.score}/50
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="mb-3">{analysis.solution.analysis}</p>
                    <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                      <p className="text-sm font-medium text-green-800 dark:text-green-200">
                        Payment Likelihood: {analysis.solution.paymentLikelihood}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Niches */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-purple-500" />
                      Target Niches
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {analysis.niches.map((niche, index) => (
                        <Badge key={index} variant="outline" className="justify-center p-2">
                          {niche}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Competitor Analysis */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-red-500" />
                      Competitor Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {analysis.competitors.map((competitor, index) => (
                        <div key={index} className="border rounded-lg p-4">
                          <h4 className="font-semibold mb-2">{competitor.name}</h4>
                          <div className="grid md:grid-cols-3 gap-3 text-sm">
                            <div>
                              <p className="font-medium text-green-600 mb-1">Strengths</p>
                              <ul className="list-disc list-inside space-y-1">
                                {competitor.strengths.map((strength, i) => (
                                  <li key={i}>{strength}</li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <p className="font-medium text-red-600 mb-1">Weaknesses</p>
                              <ul className="list-disc list-inside space-y-1">
                                {competitor.weaknesses.map((weakness, i) => (
                                  <li key={i}>{weakness}</li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <p className="font-medium text-blue-600 mb-1">Opportunity</p>
                              <p>{competitor.opportunities}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Features & Product Roadmap */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb className="h-5 w-5 text-yellow-500" />
                      Features & Product Roadmap
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {analysis.features.map((feature, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                          <Star
                            className={`h-4 w-4 mt-1 ${
                              feature.priority === "high"
                                ? "text-red-500"
                                : feature.priority === "medium"
                                  ? "text-yellow-500"
                                  : "text-gray-500"
                            }`}
                          />
                          <div className="flex-1">
                            <h5 className="font-medium">{feature.feature}</h5>
                            <p className="text-sm text-muted-foreground">{feature.benefit}</p>
                          </div>
                          <Badge
                            variant={
                              feature.priority === "high"
                                ? "destructive"
                                : feature.priority === "medium"
                                  ? "default"
                                  : "secondary"
                            }
                          >
                            {feature.priority}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Simulate Feedback */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-indigo-500" />
                      Simulated Feedback
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                        <h5 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Customer Perspective</h5>
                        <p className="text-sm">{analysis.feedback.customer}</p>
                      </div>
                      <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                        <h5 className="font-medium text-purple-800 dark:text-purple-200 mb-2">
                          Startup Advisor Perspective
                        </h5>
                        <p className="text-sm">{analysis.feedback.advisor}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Customer Journey Mapping */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Map className="h-5 w-5 text-teal-500" />
                      Customer Journey Mapping
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {analysis.customerJourney.map((stage, index) => (
                        <div key={index} className="border rounded-lg p-4">
                          <h5 className="font-semibold mb-3">{stage.stage}</h5>
                          <div className="grid md:grid-cols-3 gap-3 text-sm">
                            <div>
                              <p className="font-medium text-blue-600 mb-2">Touchpoints</p>
                              <ul className="list-disc list-inside space-y-1">
                                {stage.touchpoints.map((point, i) => (
                                  <li key={i}>{point}</li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <p className="font-medium text-red-600 mb-2">Pain Points</p>
                              <ul className="list-disc list-inside space-y-1">
                                {stage.painPoints.map((pain, i) => (
                                  <li key={i}>{pain}</li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <p className="font-medium text-green-600 mb-2">Opportunities</p>
                              <ul className="list-disc list-inside space-y-1">
                                {stage.opportunities.map((opp, i) => (
                                  <li key={i}>{opp}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* MOATS */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-emerald-500" />
                      Competitive Moats
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-3">
                      {analysis.moats.map((moat, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg"
                        >
                          <Shield className="h-4 w-4 text-emerald-600" />
                          <span className="text-sm">{moat}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Hypotheses */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FlaskConical className="h-5 w-5 text-orange-500" />
                      Strategic Hypotheses
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {analysis.hypotheses.map((hyp, index) => (
                        <div key={index} className="border rounded-lg p-4">
                          <h5 className="font-medium mb-2">{hyp.hypothesis}</h5>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>
                              <strong>Goal:</strong> {hyp.goal}
                            </span>
                            <ArrowRight className="h-3 w-3" />
                            <span>
                              <strong>Metric:</strong> {hyp.metric}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={() => {
                      setAnalysis(null)
                      setUsingMockData(false)
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    New Analysis
                  </Button>
                  <Button onClick={downloadPDF} variant="outline" className="flex-1 bg-transparent">
                    <Download className="mr-2 h-4 w-4" />
                    Download Report
                  </Button>
                  <Button onClick={onClose} className="flex-1">
                    Close Report
                  </Button>
                </div>
              </div>
            </ScrollArea>
          )}
        </div>
      </div>
    </div>
  )
}
