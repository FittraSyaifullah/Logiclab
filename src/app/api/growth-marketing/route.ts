import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { projectDescription, projectPurpose } = await request.json()

    if (!projectDescription || !projectPurpose) {
      return NextResponse.json({ error: "Project description and purpose are required" }, { status: 400 })
    }

    const apiKey = process.env.PERPLEXITY_API_KEY

    let analysis = null
    let usingMockData = false
    let message = ""

    if (!apiKey || apiKey.trim().length === 0) {
      analysis = getMockAnalysis(projectDescription, projectPurpose)
      usingMockData = true
      message = "Using demo data - add PERPLEXITY_API_KEY to environment variables for real analysis"
    } else {
      const trimmedApiKey = apiKey.trim()

      const prompt = `Analyze this project for market research:

Project: ${projectDescription}
Purpose: ${projectPurpose}

Provide a comprehensive market analysis including:
1. Ideal customer profile and market viability (score out of 50)
2. Solution-market fit and payment likelihood (score out of 50)  
3. Target market niches (5-10 specific niches)
4. Key competitors with strengths, weaknesses, and opportunities
5. Priority features with customer benefits
6. Honest customer and advisor feedback
7. Customer journey stages with touchpoints and pain points
8. Competitive moats and advantages
9. Testable hypotheses with measurable goals

Format as valid JSON with the structure: {"icp": {"description": "", "score": 0, "viability": ""}, "solution": {"analysis": "", "score": 0, "paymentLikelihood": ""}, "niches": [], "competitors": [{"name": "", "strengths": [], "weaknesses": [], "traction": "", "opportunities": ""}], "features": [{"feature": "", "benefit": "", "priority": ""}], "feedback": {"customer": "", "advisor": ""}, "customerJourney": [{"stage": "", "touchpoints": [], "painPoints": [], "opportunities": []}], "moats": [], "hypotheses": [{"hypothesis": "", "goal": "", "metric": ""}]}`

      const response = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${trimmedApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "sonar-pro",
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.3,
          max_tokens: 3000,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`Perplexity API error: ${response.status} - ${errorText}`)

        if (response.status === 401) {
          analysis = getMockAnalysis(projectDescription, projectPurpose)
          usingMockData = true
          message = "API authentication failed - verify PERPLEXITY_API_KEY is correct"
        } else if (response.status === 429) {
          analysis = getMockAnalysis(projectDescription, projectPurpose)
          usingMockData = true
          message = "API rate limit exceeded - try again in a few minutes"
        } else {
          analysis = getMockAnalysis(projectDescription, projectPurpose)
          usingMockData = true
          message = `API error (${response.status}) - showing demo analysis`
        }
      } else {
        const data = await response.json()

        const analysisText = data.choices[0]?.message?.content

        if (!analysisText) {
          analysis = getMockAnalysis(projectDescription, projectPurpose)
          usingMockData = true
          message = "No analysis content received - showing demo data"
        } else {
          try {
            const cleanedText = analysisText.trim()
            if (cleanedText.startsWith("```json")) {
              const jsonMatch = cleanedText.match(/```json\s*([\s\S]*?)\s*```/)
              if (jsonMatch) {
                analysis = JSON.parse(jsonMatch[1])
              } else {
                throw new Error("Could not extract JSON from markdown")
              }
            } else if (cleanedText.startsWith("{")) {
              analysis = JSON.parse(cleanedText)
            } else {
              throw new Error("Response is not in JSON format")
            }

            usingMockData = false
            message = "Real-time analysis from Perplexity SONAR"
          } catch (parseError) {
            console.error("Analysis parsing failed:", parseError)
            analysis = getMockAnalysis(projectDescription, projectPurpose)
            usingMockData = true
            message = "Analysis parsing failed - showing demo data"
          }
        }
      }
    }

    return NextResponse.json({ analysis, usingMockData, message })
  } catch (error) {
    console.error("Growth marketing analysis error:", error)
    return NextResponse.json({
      analysis: getMockAnalysis("AI project", "Market analysis"),
      usingMockData: true,
      message: "Analysis temporarily unavailable - showing demo data",
    })
  }
}

function getMockAnalysis(projectDescription: string, projectPurpose: string) {
  return {
    icp: {
      description: "Tech-savvy entrepreneurs and small business owners aged 25-45 who need rapid prototyping solutions",
      score: 42,
      viability: "High market demand with growing maker movement and startup ecosystem",
    },
    solution: {
      analysis: "Strong product-market fit for no-code hardware prototyping. Addresses significant pain point in product development cycle.",
      score: 38,
      paymentLikelihood: "High willingness to pay for time-saving and expertise-replacement tools",
    },
    niches: [
      "IoT Startups",
      "Educational Institutions", 
      "Maker Communities",
      "Product Design Agencies",
      "Hardware Accelerators",
      "Corporate Innovation Labs",
      "Indie Hardware Developers",
    ],
    competitors: [
      {
        name: "Fusion 360",
        strengths: ["Professional grade", "Established user base", "Comprehensive features"],
        weaknesses: ["Steep learning curve", "Expensive", "Complex for beginners"],
        traction: "High - Industry standard",
        opportunities: "Target beginners and rapid prototypers who find Fusion too complex",
      },
      {
        name: "Tinkercad", 
        strengths: ["Easy to use", "Free", "Web-based"],
        weaknesses: ["Limited functionality", "Basic features only", "No AI assistance"],
        traction: "Medium - Educational focus",
        opportunities: "Add AI-powered features and advanced capabilities",
      },
    ],
    features: [
      {
        feature: "AI-Powered Component Suggestion",
        benefit: "Reduces design time by 70% through intelligent recommendations",
        priority: "high",
      },
      {
        feature: "One-Click 3D Model Generation", 
        benefit: "Eliminates need for CAD expertise, democratizes hardware creation",
        priority: "high",
      },
      {
        feature: "Collaborative Design Workspace",
        benefit: "Enables team-based hardware development and knowledge sharing", 
        priority: "medium",
      },
    ],
    feedback: {
      customer: "This could save me weeks of learning CAD software. The AI suggestions are game-changing, but I'd want more customization options and better integration with manufacturing services.",
      advisor: "Strong value proposition in a growing market. Focus on user acquisition through maker communities and educational partnerships. Consider freemium model to drive adoption.",
    },
    customerJourney: [
      {
        stage: "Awareness",
        touchpoints: ["Social media", "Maker forums", "YouTube tutorials"],
        painPoints: ["Don't know solution exists", "Skeptical of AI capabilities"],
        opportunities: ["Demo videos", "Influencer partnerships", "Free trials"],
      },
      {
        stage: "Consideration", 
        touchpoints: ["Website", "Product demos", "Comparison articles"],
        painPoints: ["Pricing concerns", "Learning curve fears", "Integration questions"],
        opportunities: ["Free tier", "Onboarding tutorials", "Integration guides"],
      },
    ],
    moats: [
      "AI model trained on hardware design patterns",
      "Community-driven component library", 
      "Integration with manufacturing partners",
      "Educational institution partnerships",
    ],
    hypotheses: [
      {
        hypothesis: "Maker community adoption will drive viral growth",
        goal: "Achieve 10,000 active users in 6 months",
        metric: "Monthly Active Users (MAU)",
      },
      {
        hypothesis: "Educational partnerships will provide steady user base",
        goal: "Partner with 50 schools/universities", 
        metric: "Number of institutional partnerships",
      },
    ],
  }
}
