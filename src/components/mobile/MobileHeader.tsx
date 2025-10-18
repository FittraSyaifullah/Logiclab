"use client"

import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Menu, Search } from "lucide-react"
import { cn } from "@/lib/utils"

interface MobileHeaderProps {
  title?: string
  onMenu?: () => void
  rightAction?: React.ReactNode
  className?: string
}

export function MobileHeader({ title, onMenu, rightAction, className }: MobileHeaderProps) {
  return (
    <div className={cn("sm:hidden fixed top-0 inset-x-0 h-14 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-slate-200/40 dark:border-slate-700/40 flex items-center px-3", className)}>
      <Button variant="ghost" size="sm" className="p-2 h-9 w-9" onClick={onMenu}>
        <Menu className="h-5 w-5" />
      </Button>
      <div className="flex items-center gap-2 ml-1 min-w-0">
        <Image src="/images/Buildables-Logo.png" alt="Buildables" width={24} height={24} className="w-6 h-6" />
        <div className="truncate font-semibold text-sm">{title || "Buildables"}</div>
      </div>
      <div className="ml-auto flex items-center gap-1">
        <Button variant="ghost" size="sm" className="p-2 h-9 w-9">
          <Search className="h-5 w-5" />
        </Button>
        {rightAction}
      </div>
    </div>
  )
}

export default MobileHeader


