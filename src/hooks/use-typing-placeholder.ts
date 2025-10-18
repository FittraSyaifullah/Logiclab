"use client"

import { useEffect, useMemo, useRef, useState } from "react"

interface UseTypingPlaceholderOptions {
  typeMs?: number
  eraseMs?: number
  pauseMs?: number
  idleMs?: number
  isActive?: boolean
}

export function useTypingPlaceholder(
  prompts: string[],
  options?: UseTypingPlaceholderOptions,
): string {
  const { typeMs = 50, eraseMs = 30, pauseMs = 1200, idleMs = 500, isActive = true } = options || {}

  const safePrompts = useMemo(() => (Array.isArray(prompts) && prompts.length > 0 ? prompts : [""]), [prompts])
  const [promptIndex, setPromptIndex] = useState<number>(0)
  const [charIndex, setCharIndex] = useState<number>(0)
  const [isDeleting, setIsDeleting] = useState<boolean>(false)
  const timeoutRef = useRef<number | null>(null)

  const currentPrompt = safePrompts[promptIndex % safePrompts.length]
  const baseText = "I want to build a"
  const fullText = currentPrompt
  const placeholder = isDeleting && charIndex <= baseText.length 
    ? baseText.slice(0, charIndex)
    : fullText.slice(0, charIndex)

  useEffect(() => {
    if (!isActive) {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
      return () => {
        if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
      }
    }

    const schedule = (delay: number, fn: () => void) => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
      timeoutRef.current = window.setTimeout(fn, delay)
    }

    if (!isDeleting && charIndex < currentPrompt.length) {
      schedule(typeMs, () => setCharIndex((i) => i + 1))
    } else if (!isDeleting && charIndex === currentPrompt.length) {
      schedule(pauseMs, () => setIsDeleting(true))
    } else if (isDeleting && charIndex > baseText.length) {
      schedule(eraseMs, () => setCharIndex((i) => Math.max(baseText.length, i - 1)))
    } else if (isDeleting && charIndex === baseText.length) {
      schedule(idleMs, () => {
        setIsDeleting(false)
        setPromptIndex((i) => (i + 1) % safePrompts.length)
      })
    }

    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
    }
  }, [charIndex, isDeleting, currentPrompt, typeMs, eraseMs, pauseMs, idleMs, isActive, safePrompts.length, baseText.length])

  // Reset cycle if prompts array changes significantly
  useEffect(() => {
    setPromptIndex(0)
    setCharIndex(0)
    setIsDeleting(false)
  }, [safePrompts])

  return placeholder
}


