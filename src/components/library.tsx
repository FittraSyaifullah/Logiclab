"use client"

import type React from "react"

import { useEffect, useState } from "react"
import type { LibraryFile } from "@/lib/library-context"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useLibrary } from "@/lib/library-context"
import { useAuth } from "@/contexts/AuthContext"
import { createSupabaseClient } from "@/lib/supabase/server"
import { supabase } from "@/lib/supabase"
import { extractTextLight, getFileCategoryFromNameAndType, uiCategoryToDbType } from "@/lib/file-utils"
import { FileText, Box, ImageIcon, File, Trash2, Search, Upload } from "lucide-react"
import { cn } from "@/lib/utils"

export function Library() {
  const { files, addFiles, removeFile } = useLibrary()
  const [searchQuery, setSearchQuery] = useState("")
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchFiles = async () => {
      if (!user?.id) return
      setLoading(true)
      try {
        const res = await fetch(`/api/files/list?userId=${encodeURIComponent(user.id)}`)
        const json = await res.json()
        if (json?.files) {
          // For now, just show counts via header; state remains local for uploads
          // A fuller refactor would replace local state entirely with server files
        }
      } finally {
        setLoading(false)
      }
    }
    fetchFiles()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const filteredFiles = files.filter((file) => file.name.toLowerCase().includes(searchQuery.toLowerCase()))

  const getIcon = (category: string) => {
    switch (category) {
      case "document":
        return <FileText className="h-5 w-5" />
      case "3d-model":
        return <Box className="h-5 w-5" />
      case "image":
        return <ImageIcon className="h-5 w-5" />
      default:
        return <File className="h-5 w-5" />
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-neutral-200 dark:border-neutral-700 bg-white/70 dark:bg-neutral-900/40 px-6 py-4 rounded-t-lg">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Library</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">Manage your documents, 3D models, and reference materials for AI-assisted engineering</p>
        </div>
        <div className="mb-3">
          <label className="inline-flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
            <Upload className="h-4 w-4" />
            <input
              type="file"
              className="hidden"
              multiple
              onChange={async (e) => {
                const list = e.target.files
                if (!list || !user?.id) return
                const filesArr = Array.from(list)
                addFiles(filesArr)

                for (const f of filesArr) {
                  const category = getFileCategoryFromNameAndType(f.type, f.name)
                  const fileType = uiCategoryToDbType(category)

                  // 1) Ask server for target path + DB insert
                  const fd = new FormData()
                  fd.append('file', f)
                  fd.append('userId', user.id)
                  fd.append('fileType', fileType)
                  const initRes = await fetch('/api/files/upload', { method: 'POST', body: fd })
                  const initJson = await initRes.json()
                  if (!initRes.ok) {
                    console.error('Init upload failed', initJson)
                    continue
                  }
                  const fileRecordId = initJson.fileRecordId as string
                  const { bucket, path } = initJson.storage as { bucket: string; path: string }

                  // 2) Create signed URL for direct upload and upload file
                  const suRes = await fetch('/api/files/signed-url', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bucket, path }) })
                  const suJson = await suRes.json()
                  if (!suRes.ok) {
                    console.error('Signed URL failed', suJson)
                    continue
                  }
                  const { signedUrl, token } = suJson as { signedUrl: string; token: string }
                  const uploadRes = await fetch(signedUrl, { method: 'PUT', headers: { 'x-upsert': 'false', 'Authorization': `Bearer ${token}` }, body: f })
                  if (!uploadRes.ok) {
                    console.error('Storage upload failed')
                    continue
                  }

                  // 3) Lightweight text extraction and embed
                  const chunks = await extractTextLight(f, category, { title: f.name, description: null })
                  await fetch('/api/embeddings/embed-file', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      userId: user.id,
                      file: { id: fileRecordId, path, bucket, fileType },
                      textChunks: chunks,
                    })
                  })
                }
              }}
            />
            <span className="underline cursor-pointer">Upload files</span>
          </label>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input placeholder="Search files..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
      </div>

      <Tabs defaultValue="all" className="flex flex-1 flex-col">
        <div className="border-b border-neutral-200 dark:border-neutral-700 px-6">
          <TabsList className="h-auto bg-transparent p-0">
            <TabsTrigger value="all" className="rounded-none border-b-2 border-transparent data-[state=active]:border-violet-500 data-[state=active]:bg-transparent">All Files ({files.length})</TabsTrigger>
            <TabsTrigger value="documents" className="rounded-none border-b-2 border-transparent data-[state=active]:border-violet-500 data-[state=active]:bg-transparent">Documents ({files.filter((f) => f.category === "document").length})</TabsTrigger>
            <TabsTrigger value="3d-models" className="rounded-none border-b-2 border-transparent data-[state=active]:border-violet-500 data-[state=active]:bg-transparent">3D Models ({files.filter((f) => f.category === "3d-model").length})</TabsTrigger>
            <TabsTrigger value="images" className="rounded-none border-b-2 border-transparent data-[state=active]:border-violet-500 data-[state=active]:bg-transparent">Images ({files.filter((f) => f.category === "image").length})</TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-6">
            <TabsContent value="all" className="mt-0">
              <FileGrid files={filteredFiles} getIcon={getIcon} formatFileSize={formatFileSize} formatDate={formatDate} onRemove={removeFile} />
            </TabsContent>
            <TabsContent value="documents" className="mt-0">
              <FileGrid files={filteredFiles.filter((f) => f.category === "document")} getIcon={getIcon} formatFileSize={formatFileSize} formatDate={formatDate} onRemove={removeFile} />
            </TabsContent>
            <TabsContent value="3d-models" className="mt-0">
              <FileGrid files={filteredFiles.filter((f) => f.category === "3d-model")} getIcon={getIcon} formatFileSize={formatFileSize} formatDate={formatDate} onRemove={removeFile} />
            </TabsContent>
            <TabsContent value="images" className="mt-0">
              <FileGrid files={filteredFiles.filter((f) => f.category === "image")} getIcon={getIcon} formatFileSize={formatFileSize} formatDate={formatDate} onRemove={removeFile} />
            </TabsContent>
          </div>
        </ScrollArea>
      </Tabs>
    </div>
  )
}

function FileGrid({
  files,
  getIcon,
  formatFileSize,
  formatDate,
  onRemove,
}: {
  files: LibraryFile[]
  getIcon: (category: string) => React.ReactNode
  formatFileSize: (bytes: number) => string
  formatDate: (date: Date) => string
  onRemove: (id: string) => void
}) {
  if (files.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <Upload className="mx-auto mb-3 h-12 w-12 text-slate-400" />
          <p className="text-sm text-slate-600 dark:text-slate-300">No files found</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Upload files from the Debug tab to see them here</p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {files.map((file) => (
        <Card key={file.id} className="group relative overflow-hidden transition-all hover:shadow-md">
          <div className="p-4">
            <div className="mb-3 flex items-start justify-between">
              <div className={cn("rounded-lg p-2",
                file.category === "document" && "bg-blue-500/10 text-blue-600",
                file.category === "3d-model" && "bg-purple-500/10 text-purple-600",
                file.category === "image" && "bg-green-500/10 text-green-600",
                file.category === "other" && "bg-slate-100 text-slate-600")}
              >
                {getIcon(file.category)}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                onClick={async () => {
                  if (!user?.id) return
                  try {
                    await fetch('/api/files/delete', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ userId: user.id, fileId: file.id })
                    })
                  } finally {
                    onRemove(file.id)
                  }
                }}
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>
            <h3 className="mb-1 truncate text-sm font-medium text-slate-900 dark:text-slate-100" title={file.name}>{file.name}</h3>
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>{formatFileSize(file.size)}</span>
              <span>{formatDate(file.uploadedAt)}</span>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}


