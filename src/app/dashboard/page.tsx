"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Dashboard } from "@/components/dashboard"
import { SidebarProvider } from "@/components/ui/sidebar"
import { ProtectedRoute } from "@/components/ProtectedRoute"

function DashboardContent() {
  const [isClient, setIsClient] = useState(false)
  const [initialSearchInput, setInitialSearchInput] = useState("")
  const searchParams = useSearchParams()

  useEffect(() => {
    setIsClient(true)
    const searchQuery = searchParams.get("search")
    if (searchQuery) {
      setInitialSearchInput(searchQuery)
    }
  }, [searchParams])

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth/signout", {
        method: "POST",
        credentials: "include",
      })

      if (response.ok) {
        // Clear any local storage and redirect
        localStorage.clear()
        sessionStorage.clear()
        window.location.href = "/"
      } else {
        console.error("Logout failed:", response.status)
        // Still redirect even if API fails
        window.location.href = "/"
      }
    } catch (error) {
      console.error("Logout error:", error)
      // Still redirect even if there's an error
      window.location.href = "/"
    }
  }

  if (!isClient) {
    return (
      <div className="bg-neutral-50 dark:bg-neutral-900 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <ProtectedRoute>
      <div className="bg-neutral-50 dark:bg-neutral-900 min-h-screen">
        <SidebarProvider defaultOpen>
          <Dashboard onLogout={handleLogout} initialSearchInput={initialSearchInput} />
        </SidebarProvider>
    </div>
    </ProtectedRoute>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="bg-neutral-50 dark:bg-neutral-900 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  )
}
