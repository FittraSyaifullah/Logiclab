"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { FileText, Loader2, Download, Lightbulb, CheckCircle2 } from "lucide-react"

type Phase = "input" | "clarification" | "generating" | "complete"

interface ClarificationQuestion {
  id: string
  question: string
  answer: string
}

export function Ideate() {
  const [phase, setPhase] = useState<Phase>("input")
  const [designIdea, setDesignIdea] = useState("")
  const [clarificationQuestions, setClarificationQuestions] = useState<ClarificationQuestion[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [generatedDocument, setGeneratedDocument] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleStartGeneration = async () => {
    if (!designIdea.trim()) return

    setIsLoading(true)
    setPhase("clarification")

    // Generate clarification questions
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: `I want to design: ${designIdea}

Please ask me 3-5 clarifying questions to gather missing information about:
- Project objectives and success criteria
- Technical constraints (budget, size, weight, power)
- Operating environment and conditions
- Intended use cases and user requirements
- Regulatory or compliance requirements

Format your response as a numbered list of questions only, no additional text.`,
            },
          ],
        }),
      })

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let fullResponse = ""

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split("\n")

          for (const line of lines) {
            if (line.startsWith("0:")) {
              try {
                const text = JSON.parse(line.slice(2))
                fullResponse += text
              } catch (e) {
                console.error("Parse error:", e)
              }
            }
          }
        }
      }

      // Parse questions from response
      const questions = fullResponse
        .split("\n")
        .filter((line) => line.match(/^\d+\./))
        .map((q, i) => ({
          id: `q${i}`,
          question: q.replace(/^\d+\.\s*/, ""),
          answer: "",
        }))

      setClarificationQuestions(questions)
    } catch (error) {
      console.error("Error generating questions:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAnswerQuestion = (answer: string) => {
    const updatedQuestions = [...clarificationQuestions]
    updatedQuestions[currentQuestionIndex].answer = answer

    if (currentQuestionIndex < clarificationQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    } else {
      // All questions answered, generate document
      generateFullDocument(updatedQuestions)
    }
  }

  const generateFullDocument = async (questions: ClarificationQuestion[]) => {
    setPhase("generating")
    setIsLoading(true)

    try {
      const qaContext = questions.map((q) => `Q: ${q.question}\nA: ${q.answer}`).join("\n\n")

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: `Generate a comprehensive hardware engineering project document for the following design:

DESIGN IDEA: ${designIdea}

CLARIFICATION RESPONSES:
${qaContext}

Please generate a complete technical specification document with the following sections:

1. EXECUTIVE SUMMARY
   - Project purpose, scope, and key objectives
   - High-level overview of the solution

2. TECHNICAL BACKGROUND
   - Source-referenced explanations of core technologies
   - Relevant engineering principles and methods
   - Industry standards and best practices

3. DESIGN APPROACH
   - Rationale for chosen technologies
   - Comparison of alternatives with quantitative trade-offs (use ASCII tables)
   - Technology selection justification

4. SYSTEM ARCHITECTURE
   - Block diagram description of subsystems (mechanical, electrical, firmware, software)
   - Component interactions and data flow
   - System integration approach

5. COMPONENT SPECIFICATIONS
   - Detailed tables (ASCII format) listing all parts and materials
   - Performance ratings and specifications
   - Compliance standards (ISO, DIN, ANSI, IEEE, etc.)
   - Manufacturer recommendations

6. ENGINEERING CALCULATIONS
   - All relevant calculations with step-by-step work
   - Formulas, substitutions, and results with units
   - Safety factors and design margins

7. ASSEMBLY PROCEDURES
   - Step-by-step assembly instructions
   - Torque settings and alignment methods
   - Quality control checkpoints

8. RISK & TROUBLESHOOTING GUIDE
   - Identified failure modes (FMEA approach)
   - Diagnostic procedures
   - Mitigation strategies

9. TEST PLAN & VALIDATION
   - Test cases and acceptance criteria
   - Performance metrics and benchmarks
   - Compliance verification checklists

10. DEPLOYMENT & MAINTENANCE
    - Field setup guidelines
    - Firmware/software update procedures
    - Preventive maintenance schedules
    - Spare parts recommendations

11. REFERENCES & STANDARDS
    - Engineering standards cited (ISO, DIN, ANSI, IEEE, etc.)
    - Technical papers and datasheets referenced
    - Manufacturer documentation

Format all tables as ASCII art with proper alignment. Be comprehensive and technical.`,
            },
          ],
        }),
      })

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let fullDocument = ""

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split("\n")

          for (const line of lines) {
            if (line.startsWith("0:")) {
              try {
                const text = JSON.parse(line.slice(2))
                fullDocument += text
                setGeneratedDocument(fullDocument)
              } catch (e) {
                console.error("Parse error:", e)
              }
            }
          }
        }
      }

      setPhase("complete")
    } catch (error) {
      console.error("Error generating document:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownload = () => {
    const blob = new Blob([generatedDocument], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${designIdea.slice(0, 30).replace(/[^a-z0-9]/gi, "_")}_project_document.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleReset = () => {
    setPhase("input")
    setDesignIdea("")
    setClarificationQuestions([])
    setCurrentQuestionIndex(0)
    setGeneratedDocument("")
  }

  return (
    <div className="flex h-full flex-col">
      <ScrollArea className="h-0 flex-1 px-6 py-6">
        {phase === "input" && (
          <div className="mx-auto max-w-3xl">
            <div className="mb-8 text-center">
              <div className="mb-4 flex justify-center">
                <div className="rounded-2xl bg-accent/10 p-6">
                  <Lightbulb className="h-12 w-12 text-accent" />
                </div>
              </div>
              <h2 className="mb-3 text-2xl font-semibold text-foreground">Ideate & Design</h2>
              <p className="text-balance text-muted-foreground leading-relaxed">
                Transform your hardware design idea into a comprehensive engineering specification document
              </p>
            </div>

            <Card className="p-6">
              <Label htmlFor="design-idea" className="mb-2 block text-sm font-medium">
                Describe Your Hardware Design Idea
              </Label>
              <Textarea
                id="design-idea"
                value={designIdea}
                onChange={(e) => setDesignIdea(e.target.value)}
                placeholder="Example: A portable water purification device for camping that uses UV-C LED technology and can purify 1 liter of water in 5 minutes..."
                className="mb-4 min-h-[200px] resize-none"
              />
              <Button onClick={handleStartGeneration} disabled={!designIdea.trim() || isLoading} className="w-full">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Questions...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Generate Full Project Document
                  </>
                )}
              </Button>
            </Card>
          </div>
        )}

        {phase === "clarification" && clarificationQuestions.length > 0 && (
          <div className="mx-auto max-w-3xl">
            <div className="mb-6">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">Clarification Questions</h3>
                <span className="text-sm text-muted-foreground">
                  Question {currentQuestionIndex + 1} of {clarificationQuestions.length}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${((currentQuestionIndex + 1) / clarificationQuestions.length) * 100}%` }}
                />
              </div>
            </div>

            <Card className="p-6">
              <Label className="mb-4 block text-base font-medium text-foreground">
                {clarificationQuestions[currentQuestionIndex].question}
              </Label>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  const formData = new FormData(e.currentTarget)
                  const answer = formData.get("answer") as string
                  if (answer.trim()) {
                    handleAnswerQuestion(answer)
                    e.currentTarget.reset()
                  }
                }}
              >
                <Textarea
                  name="answer"
                  placeholder="Enter your answer..."
                  className="mb-4 min-h-[120px] resize-none"
                  required
                />
                <Button type="submit" className="w-full">
                  {currentQuestionIndex < clarificationQuestions.length - 1 ? "Next Question" : "Generate Document"}
                </Button>
              </form>
            </Card>
          </div>
        )}

        {phase === "generating" && (
          <div className="mx-auto max-w-4xl">
            <Card className="p-8">
              <div className="mb-6 flex justify-center">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
              </div>
              <h3 className="mb-2 text-center text-xl font-semibold text-foreground">
                Generating Your Project Document
              </h3>
              <p className="mb-6 text-center text-muted-foreground">
                Creating comprehensive engineering specifications, calculations, and implementation guidance...
              </p>
              {generatedDocument && (
                <div className="rounded-lg bg-muted p-4">
                  <pre className="whitespace-pre-wrap font-mono text-xs text-foreground">{generatedDocument}</pre>
                </div>
              )}
            </Card>
          </div>
        )}

        {phase === "complete" && (
          <div className="mx-auto max-w-4xl">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-green-500/10 p-2">
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Document Generated Successfully</h3>
                  <p className="text-sm text-muted-foreground">Your comprehensive project specification is ready</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleDownload} variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
                <Button onClick={handleReset}>New Design</Button>
              </div>
            </div>

            <Card className="p-6">
              <ScrollArea className="h-[600px]">
                <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-foreground">
                  {generatedDocument}
                </pre>
              </ScrollArea>
            </Card>
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
