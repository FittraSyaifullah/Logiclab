"use client"

import { Home, Layers, MessageSquare, Settings } from "lucide-react"
import { cn } from "@/lib/utils"

interface BottomNavItem {
  key: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  onClick?: () => void
}

interface BottomNavProps {
  activeKey?: string
  items: BottomNavItem[]
  className?: string
}

export function BottomNav({ activeKey, items, className }: BottomNavProps) {
  return (
    <nav className={cn("sm:hidden fixed bottom-0 inset-x-0 h-14 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200/40 dark:border-slate-700/40 grid grid-cols-4", className)}>
      {items.map((item) => {
        const Icon = item.icon
        const isActive = item.key === activeKey
        return (
          <button key={item.key} onClick={item.onClick} className={cn("flex flex-col items-center justify-center text-xs", isActive ? "text-orange-600" : "text-slate-600 dark:text-slate-300")}> 
            <Icon className={cn("h-5 w-5 mb-0.5", isActive ? "text-orange-600" : "text-slate-500")} />
            <span className="leading-none">{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

export default BottomNav


