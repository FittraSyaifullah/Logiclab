"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CreditCard, Zap } from "lucide-react"
import { cn } from "@/lib/utils"

interface CreditBalanceWidgetProps {
  className?: string
}

export function CreditBalanceWidget({ className }: CreditBalanceWidgetProps) {
  // Mock data - in real app this would come from user store or API
  const credits = 5
  const maxCredits = 25
  const percentage = (credits / maxCredits) * 100

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-500" />
          Credits
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold">{credits}</span>
            <Badge variant="outline" className="text-xs">
              Free Plan
            </Badge>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-amber-400 to-orange-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${percentage}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{credits} of {maxCredits} used</span>
            <span>Resets daily</span>
          </div>
          <button className="w-full flex items-center justify-center gap-2 text-xs text-amber-600 hover:text-amber-700 transition-colors">
            <CreditCard className="h-3 w-3" />
            Get more credits
          </button>
        </div>
      </CardContent>
    </Card>
  )
}

