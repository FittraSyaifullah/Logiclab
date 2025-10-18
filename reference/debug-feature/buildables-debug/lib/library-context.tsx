"use client"

import type React from "react"
import { createContext, useContext, useState } from "react"

export type LibraryFile = {
  id: string
  name: string
  type: string
  size: number
  file: File
  uploadedAt: Date
  category: "document" | "3d-model" | "image" | "other"
}

type LibraryContextType = {
  files: LibraryFile[]
  addFiles: (files: File[]) => void
  removeFile: (id: string) => void
  getFilesByCategory: (category: LibraryFile["category"]) => LibraryFile[]
}

const LibraryContext = createContext<LibraryContextType | undefined>(undefined)

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const [files, setFiles] = useState<LibraryFile[]>([])

  const addFiles = (newFiles: File[]) => {
    const libraryFiles: LibraryFile[] = newFiles.map((file) => {
      const category = getFileCategory(file.type, file.name)
      return {
        id: `${Date.now()}-${Math.random()}`,
        name: file.name,
        type: file.type,
        size: file.size,
        file,
        uploadedAt: new Date(),
        category,
      }
    })
    setFiles((prev) => [...prev, ...libraryFiles])
  }

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }

  const getFilesByCategory = (category: LibraryFile["category"]) => {
    return files.filter((f) => f.category === category)
  }

  return (
    <LibraryContext.Provider value={{ files, addFiles, removeFile, getFilesByCategory }}>
      {children}
    </LibraryContext.Provider>
  )
}

export function useLibrary() {
  const context = useContext(LibraryContext)
  if (!context) {
    throw new Error("useLibrary must be used within LibraryProvider")
  }
  return context
}

function getFileCategory(type: string, name: string): LibraryFile["category"] {
  const extension = name.split(".").pop()?.toLowerCase()

  // 3D model formats
  if (
    [
      "stl",
      "obj",
      "fbx",
      "3ds",
      "dae",
      "blend",
      "step",
      "stp",
      "iges",
      "igs",
      "gltf",
      "glb",
      "x3d",
      "wrl",
      "ply",
    ].includes(extension || "")
  ) {
    return "3d-model"
  }

  // Image formats
  if (type.startsWith("image/")) {
    return "image"
  }

  // Document formats
  if (
    type.includes("pdf") ||
    type.includes("document") ||
    type.includes("text") ||
    type.includes("spreadsheet") ||
    type.includes("presentation") ||
    ["doc", "docx", "txt", "pdf", "xls", "xlsx", "ppt", "pptx", "csv", "md"].includes(extension || "")
  ) {
    return "document"
  }

  return "other"
}
