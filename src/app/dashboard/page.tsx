"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Dashboard } from "@/components/dashboard"
import { SidebarProvider } from "@/components/ui/sidebar"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { useUserStore } from "@/hooks/use-user-store"

function DashboardContent() {
  const [isClient, setIsClient] = useState(false)
  const [initialSearchInput, setInitialSearchInput] = useState("")
  const searchParams = useSearchParams()
  const { clearUser } = useUserStore()

  useEffect(() => {
    setIsClient(true)
    const searchQuery = searchParams.get("search")
    if (searchQuery) {
      setInitialSearchInput(searchQuery)
    }
  }, [searchParams])

  const handleLogout = async () => {
    try {
      console.log(`[DASHBOARD] Starting logout process`)
      
      // Clear Zustand store first
      clearUser()
      console.log(`[DASHBOARD] Cleared user store`)
      
      const response = await fetch("/api/auth/signout", {
        method: "POST",
        credentials: "include",
      })

      if (response.ok) {
        console.log(`[DASHBOARD] Logout API call successful`)
        // Clear any local storage and redirect
        localStorage.clear()
        sessionStorage.clear()
        console.log(`[DASHBOARD] Cleared localStorage and sessionStorage`)
        // Force a hard redirect to ensure clean state
        window.location.replace("/")
      } else {
        console.error("Logout failed:", response.status)
        // Still redirect even if API fails
        window.location.replace("/")
      }
    } catch (error) {
      console.error("Logout error:", error)
      // Still redirect even if there's an error
      window.location.replace("/")
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
