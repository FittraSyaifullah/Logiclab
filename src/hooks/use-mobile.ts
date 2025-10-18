"use client"

import { useEffect, useState } from "react"

/**
 * Returns true on client when viewport width is < 640px (Tailwind sm breakpoint).
 * SSR-safe: defaults to false until mounted, then subscribes to matchMedia changes.
 */
export function useMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      setIsMobile(false)
      return
    }

    const mediaQuery = window.matchMedia("(max-width: 639.98px)")
    const handleChange = () => setIsMobile(mediaQuery.matches)

    handleChange()
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange)
      return () => mediaQuery.removeEventListener("change", handleChange)
    }
    // Fallback for older browsers
    type LegacyMql = MediaQueryList & {
      addListener?: (listener: (this: MediaQueryList, ev: MediaQueryListEvent) => void) => void
      removeListener?: (listener: (this: MediaQueryList, ev: MediaQueryListEvent) => void) => void
    }
    const legacy = mediaQuery as LegacyMql
    legacy.addListener?.(handleChange)
    return () => legacy.removeListener?.(handleChange)
  }, [])

  return isMobile
}

export default useMobile
