"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, ExternalLink, Download, Loader2, Package } from "lucide-react"

interface Component {
  id: string
  name: string
  manufacturer: string
  description: string
  category: string
  specifications: Record<string, string>
}

export function ComponentSearch() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Component[]>([])
  const [isSearching, setIsSearching] = useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    setIsSearching(true)

    // Simulate TraceParts API search
    setTimeout(() => {
      setResults([
        {
          id: "1",
          name: "M8 Hex Bolt - DIN 933",
          manufacturer: "Standard Parts",
          description: "Hexagon head bolt with full thread, grade 8.8",
          category: "Fasteners",
          specifications: {
            "Thread Size": "M8",
            Length: "20mm - 100mm",
            Material: "Steel",
            Finish: "Zinc Plated",
          },
        },
        {
          id: "2",
          name: "SKF 6205-2RS Deep Groove Ball Bearing",
          manufacturer: "SKF",
          description: "Single row deep groove ball bearing with rubber seals",
          category: "Bearings",
          specifications: {
            "Bore Diameter": "25mm",
            "Outside Diameter": "52mm",
            Width: "15mm",
            "Load Rating": "9.56 kN",
          },
        },
        {
          id: "3",
          name: "NEMA 17 Stepper Motor",
          manufacturer: "Generic",
          description: "Bipolar stepper motor, 1.8° step angle",
          category: "Motors",
          specifications: {
            "Step Angle": "1.8°",
            "Holding Torque": "0.4 Nm",
            "Rated Current": "1.5A",
            Voltage: "12V",
          },
        },
      ])
      setIsSearching(false)
    }, 1000)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border bg-card p-6">
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for components (e.g., 'M8 bolt', 'ball bearing', 'stepper motor')..."
            className="flex-1"
          />
          <Button type="submit" disabled={isSearching || !query.trim()}>
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Search
              </>
            )}
          </Button>
        </form>
      </div>

      <ScrollArea className="flex-1 p-6">
        {results.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="max-w-md text-center">
              <div className="mb-4 flex justify-center">
                <div className="rounded-2xl bg-muted p-6">
                  <Package className="h-12 w-12 text-muted-foreground" />
                </div>
              </div>
              <h3 className="mb-2 text-lg font-semibold text-foreground">Search Components</h3>
              <p className="text-sm text-muted-foreground text-balance leading-relaxed">
                Search the TraceParts catalog for mechanical and electrical components. Find specifications, CAD models,
                and datasheets.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {results.map((component) => (
              <Card key={component.id} className="p-6">
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <h3 className="mb-1 text-lg font-semibold text-foreground">{component.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {component.manufacturer} • {component.category}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <ExternalLink className="mr-2 h-3 w-3" />
                      View
                    </Button>
                    <Button size="sm">
                      <Download className="mr-2 h-3 w-3" />
                      CAD
                    </Button>
                  </div>
                </div>
                <p className="mb-4 text-sm text-foreground leading-relaxed">{component.description}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {Object.entries(component.specifications).map(([key, value]) => (
                    <div key={key} className="flex justify-between rounded-lg bg-muted px-3 py-2">
                      <span className="text-xs font-medium text-muted-foreground">{key}</span>
                      <span className="text-xs text-foreground">{value}</span>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
