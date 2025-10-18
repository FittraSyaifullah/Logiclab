"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calculator, Ruler, Zap, Gauge } from "lucide-react"

export function EngineeringCalculator() {
  const [unitConversion, setUnitConversion] = useState({ value: "", from: "mm", to: "inch", result: "" })
  const [ohmLaw, setOhmLaw] = useState({ voltage: "", current: "", resistance: "", power: "" })
  const [torque, setTorque] = useState({ force: "", distance: "", result: "" })

  const convertUnits = () => {
    const value = Number.parseFloat(unitConversion.value)
    if (isNaN(value)) return

    let result = 0
    if (unitConversion.from === "mm" && unitConversion.to === "inch") {
      result = value / 25.4
    } else if (unitConversion.from === "inch" && unitConversion.to === "mm") {
      result = value * 25.4
    } else if (unitConversion.from === "m" && unitConversion.to === "ft") {
      result = value * 3.28084
    } else if (unitConversion.from === "ft" && unitConversion.to === "m") {
      result = value / 3.28084
    }

    setUnitConversion({ ...unitConversion, result: result.toFixed(4) })
  }

  const calculateOhmsLaw = (field: "voltage" | "current" | "resistance") => {
    const V = Number.parseFloat(ohmLaw.voltage)
    const I = Number.parseFloat(ohmLaw.current)
    const R = Number.parseFloat(ohmLaw.resistance)

    if (field === "resistance" && !isNaN(V) && !isNaN(I) && I !== 0) {
      const resistance = V / I
      const power = V * I
      setOhmLaw({ ...ohmLaw, resistance: resistance.toFixed(2), power: power.toFixed(2) })
    } else if (field === "current" && !isNaN(V) && !isNaN(R) && R !== 0) {
      const current = V / R
      const power = V * current
      setOhmLaw({ ...ohmLaw, current: current.toFixed(2), power: power.toFixed(2) })
    } else if (field === "voltage" && !isNaN(I) && !isNaN(R)) {
      const voltage = I * R
      const power = voltage * I
      setOhmLaw({
        voltage: voltage.toFixed(2),
        current: ohmLaw.current,
        resistance: ohmLaw.resistance,
        power: power.toFixed(2),
      })
    }
  }

  const calculateTorque = () => {
    const force = Number.parseFloat(torque.force)
    const distance = Number.parseFloat(torque.distance)

    if (!isNaN(force) && !isNaN(distance)) {
      const result = force * distance
      setTorque({ ...torque, result: result.toFixed(2) })
    }
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-6">
        <div className="mb-6">
          <h2 className="mb-2 text-2xl font-semibold text-foreground">Engineering Calculator</h2>
          <p className="text-sm text-muted-foreground">Perform common engineering calculations and unit conversions</p>
        </div>

        <Tabs defaultValue="units" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="units" className="gap-2">
              <Ruler className="h-4 w-4" />
              Unit Conversion
            </TabsTrigger>
            <TabsTrigger value="electrical" className="gap-2">
              <Zap className="h-4 w-4" />
              Ohm's Law
            </TabsTrigger>
            <TabsTrigger value="mechanical" className="gap-2">
              <Gauge className="h-4 w-4" />
              Torque
            </TabsTrigger>
          </TabsList>

          <TabsContent value="units">
            <Card className="p-6">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
                <Ruler className="h-5 w-5 text-primary" />
                Unit Conversion
              </h3>
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="value">Value</Label>
                    <Input
                      id="value"
                      type="number"
                      value={unitConversion.value}
                      onChange={(e) => setUnitConversion({ ...unitConversion, value: e.target.value })}
                      placeholder="Enter value"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="from">From</Label>
                    <select
                      id="from"
                      value={unitConversion.from}
                      onChange={(e) => setUnitConversion({ ...unitConversion, from: e.target.value })}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="mm">Millimeters (mm)</option>
                      <option value="inch">Inches (in)</option>
                      <option value="m">Meters (m)</option>
                      <option value="ft">Feet (ft)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="to">To</Label>
                    <select
                      id="to"
                      value={unitConversion.to}
                      onChange={(e) => setUnitConversion({ ...unitConversion, to: e.target.value })}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="mm">Millimeters (mm)</option>
                      <option value="inch">Inches (in)</option>
                      <option value="m">Meters (m)</option>
                      <option value="ft">Feet (ft)</option>
                    </select>
                  </div>
                </div>
                <Button onClick={convertUnits} className="w-full">
                  <Calculator className="mr-2 h-4 w-4" />
                  Convert
                </Button>
                {unitConversion.result && (
                  <div className="rounded-lg bg-primary/10 p-4">
                    <p className="text-sm text-muted-foreground">Result</p>
                    <p className="text-2xl font-semibold text-foreground">
                      {unitConversion.result} {unitConversion.to}
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="electrical">
            <Card className="p-6">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
                <Zap className="h-5 w-5 text-primary" />
                Ohm's Law Calculator
              </h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Calculate voltage, current, resistance, and power. Enter any two values.
              </p>
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="voltage">Voltage (V)</Label>
                    <Input
                      id="voltage"
                      type="number"
                      value={ohmLaw.voltage}
                      onChange={(e) => setOhmLaw({ ...ohmLaw, voltage: e.target.value })}
                      placeholder="Volts"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="current">Current (A)</Label>
                    <Input
                      id="current"
                      type="number"
                      value={ohmLaw.current}
                      onChange={(e) => setOhmLaw({ ...ohmLaw, current: e.target.value })}
                      placeholder="Amperes"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="resistance">Resistance (Ω)</Label>
                    <Input
                      id="resistance"
                      type="number"
                      value={ohmLaw.resistance}
                      onChange={(e) => setOhmLaw({ ...ohmLaw, resistance: e.target.value })}
                      placeholder="Ohms"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="power">Power (W)</Label>
                    <Input
                      id="power"
                      type="number"
                      value={ohmLaw.power}
                      readOnly
                      placeholder="Watts"
                      className="bg-muted"
                    />
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  <Button onClick={() => calculateOhmsLaw("resistance")} variant="outline">
                    Calculate R
                  </Button>
                  <Button onClick={() => calculateOhmsLaw("current")} variant="outline">
                    Calculate I
                  </Button>
                  <Button onClick={() => calculateOhmsLaw("voltage")} variant="outline">
                    Calculate V
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="mechanical">
            <Card className="p-6">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
                <Gauge className="h-5 w-5 text-primary" />
                Torque Calculator
              </h3>
              <p className="mb-4 text-sm text-muted-foreground">Calculate torque from force and distance: τ = F × d</p>
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="force">Force (N)</Label>
                    <Input
                      id="force"
                      type="number"
                      value={torque.force}
                      onChange={(e) => setTorque({ ...torque, force: e.target.value })}
                      placeholder="Newtons"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="distance">Distance (m)</Label>
                    <Input
                      id="distance"
                      type="number"
                      value={torque.distance}
                      onChange={(e) => setTorque({ ...torque, distance: e.target.value })}
                      placeholder="Meters"
                    />
                  </div>
                </div>
                <Button onClick={calculateTorque} className="w-full">
                  <Calculator className="mr-2 h-4 w-4" />
                  Calculate Torque
                </Button>
                {torque.result && (
                  <div className="rounded-lg bg-primary/10 p-4">
                    <p className="text-sm text-muted-foreground">Torque</p>
                    <p className="text-2xl font-semibold text-foreground">{torque.result} N⋅m</p>
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ScrollArea>
  )
}
