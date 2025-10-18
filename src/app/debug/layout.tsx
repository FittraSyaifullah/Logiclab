"use client"

import type React from "react"
import { LibraryProvider } from "@/lib/library-context"

export default function DebugLayout({ children }: { children: React.ReactNode }) {
  return <LibraryProvider>{children}</LibraryProvider>
}


