"use client"

import { useState } from "react"
import { DebugChat } from "@/components/debug-chat"
import { Library } from "@/components/library"
import { LibraryProvider } from "@/lib/library-context"
import { Button } from "@/components/ui/button"
import { MessageSquare, FolderOpen } from "lucide-react"
import { cn } from "@/lib/utils"

type Tab = "debug" | "library"

function PageContent() {
  const [activeTab, setActiveTab] = useState<Tab>("debug")

  return (
    <div className="flex h-screen flex-col">
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <span className="font-mono text-sm font-bold text-primary-foreground">B</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Buildables Debug</h1>
              <p className="text-xs text-muted-foreground">AI-Powered Hardware Engineering Assistant</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">Beta</span>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <Button
            variant={activeTab === "debug" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("debug")}
            className={cn("gap-2", activeTab === "debug" && "shadow-sm")}
          >
            <MessageSquare className="h-4 w-4" />
            Debug
          </Button>
          <Button
            variant={activeTab === "library" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("library")}
            className={cn("gap-2", activeTab === "library" && "shadow-sm")}
          >
            <FolderOpen className="h-4 w-4" />
            Library
          </Button>
        </div>
      </header>
      <div className="flex-1 overflow-hidden">
        {activeTab === "debug" && <DebugChat />}
        {activeTab === "library" && <Library />}
      </div>
    </div>
  )
}

export default function Page() {
  return (
    <LibraryProvider>
      <PageContent />
    </LibraryProvider>
  )
}
