"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CreditCard, Zap } from "lucide-react"
import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"
import { useUserStore } from "@/hooks/use-user-store"

interface CreditBalanceWidgetProps {
  className?: string
}

export function CreditBalanceWidget({ className }: CreditBalanceWidgetProps) {
  const { user } = useUserStore()
  const [balance, setBalance] = useState<number>(0)
  const [paid, setPaid] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(true)

  const maxCredits = 50 // UI meter reference for free plan
  const percentage = paid ? 100 : Math.max(0, Math.min(100, (Number(balance) / maxCredits) * 100))

  useEffect(() => {
    const fetchCredits = async () => {
      try {
        if (!user?.id) {
          setLoading(false)
          return
        }
        const resp = await fetch(`/api/credits?userId=${encodeURIComponent(user.id)}`, { cache: "no-store" })
        if (!resp.ok) {
          setLoading(false)
          return
        }
        const data = (await resp.json()) as { balance?: number; paid?: boolean }
        setBalance(Number(data.balance) || 0)
        setPaid(!!data.paid)
      } catch {
        // noop
      } finally {
        setLoading(false)
      }
    }
    void fetchCredits()
  }, [user?.id])

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
            <span className="text-2xl font-bold">
              {loading ? "–" : paid ? "Unlimited" : Math.max(0, Number(balance) || 0)}
            </span>
            <Badge variant="outline" className="text-xs">
              {paid ? "Paid Plan" : "Free Plan"}
            </Badge>
          </div>
          {!paid && (
            <>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-amber-400 to-orange-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{Math.max(0, Number(balance) || 0)} of {maxCredits} left</span>
                <span>Resets daily</span>
              </div>
            </>
          )}
          <button className="w-full flex items-center justify-center gap-2 text-xs text-amber-600 hover:text-amber-700 transition-colors">
            <CreditCard className="h-3 w-3" />
            Get more credits
          </button>
        </div>
      </CardContent>
    </Card>
  )
}

