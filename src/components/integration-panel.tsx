"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { X, Database, Brain, Code, ImageIcon, Eye, EyeOff, Plus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface IntegrationPanelProps {
  isOpen: boolean
  onClose: () => void
}

interface ApiKey {
  key: string
  name: string
  icon: React.ReactNode
  description: string
  placeholder: string
  category: "database" | "ai" | "other"
}

interface CustomApiKey {
  id: string
  name: string
  key: string
  value: string
}

const API_KEYS: ApiKey[] = [
  { key: "SUPABASE_URL", name: "Supabase URL", icon: <Database className="h-4 w-4" />, description: "Your Supabase project URL for database operations", placeholder: "https://your-project.supabase.co", category: "database" },
  { key: "SUPABASE_ANON_KEY", name: "Supabase Anon Key", icon: <Database className="h-4 w-4" />, description: "Your Supabase anonymous key for client-side access", placeholder: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", category: "database" },
  { key: "DATABASE_URL", name: "Database URL", icon: <Database className="h-4 w-4" />, description: "PostgreSQL or other database connection string", placeholder: "postgresql://user:password@host:port/database", category: "database" },
  { key: "OPENAI_API_KEY", name: "OpenAI API Key", icon: <Brain className="h-4 w-4" />, description: "For GPT models and component identification", placeholder: "sk-...", category: "ai" },
  { key: "ANTHROPIC_API_KEY", name: "Anthropic API Key", icon: <Brain className="h-4 w-4" />, description: "For Claude models and hardware assistance", placeholder: "sk-ant-...", category: "ai" },
  { key: "V0_API_KEY", name: "v0 API Key", icon: <Code className="h-4 w-4" />, description: "For software generation and UI components", placeholder: "v0_...", category: "ai" },
  { key: "HF_TOKEN", name: "Hugging Face Token", icon: <ImageIcon className="h-4 w-4" />, description: "For image generation and AI models", placeholder: "hf_...", category: "ai" },
  { key: "BREVO_API_KEY", name: "Brevo API Key", icon: <Brain className="h-4 w-4" />, description: "For email marketing and notifications", placeholder: "xkeysib-...", category: "other" },
]

export function IntegrationPanel({ isOpen, onClose }: IntegrationPanelProps) {
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({})
  const [customApiKeys, setCustomApiKeys] = useState<CustomApiKey[]>([])
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({})
  const [newKeyName, setNewKeyName] = useState("")
  const [newKeyValue, setNewKeyValue] = useState("")
  const { toast } = useToast()

  useEffect(() => {
    if (isOpen) {
      const saved = localStorage.getItem("overhaul-api-keys")
      const savedCustom = localStorage.getItem("overhaul-custom-api-keys")
      if (saved) {
        try { setApiKeys(JSON.parse(saved)) } catch {}
      }
      if (savedCustom) {
        try { setCustomApiKeys(JSON.parse(savedCustom)) } catch {}
      }
    }
  }, [isOpen])

  const handleSave = () => {
    try {
      localStorage.setItem("overhaul-api-keys", JSON.stringify(apiKeys))
      localStorage.setItem("overhaul-custom-api-keys", JSON.stringify(customApiKeys))
      toast({ title: "API Keys Saved", description: "Your integration settings have been saved locally" })
    } catch {
      toast({ title: "Save Failed", description: "Could not save API keys", variant: "destructive" })
    }
  }

  const handleKeyChange = (key: string, value: string) => setApiKeys((prev) => ({ ...prev, [key]: value }))
  const toggleShowKey = (key: string) => setShowKeys((prev) => ({ ...prev, [key]: !prev[key] }))
  const handleAddCustomKey = () => {
    if (!newKeyName.trim() || !newKeyValue.trim()) {
      toast({ title: "Invalid Input", description: "Please provide both API key name and value", variant: "destructive" })
      return
    }
    const newKey: CustomApiKey = { id: Date.now().toString(), name: newKeyName.trim(), key: newKeyName.trim().toUpperCase().replace(/\s+/g, "_"), value: newKeyValue.trim() }
    setCustomApiKeys((prev) => [...prev, newKey])
    setNewKeyName("")
    setNewKeyValue("")
    toast({ title: "API Key Added", description: `${newKey.name} has been added to your integrations` })
  }
  const handleRemoveCustomKey = (id: string) => { setCustomApiKeys((prev) => prev.filter((k) => k.id !== id)); toast({ title: "API Key Removed", description: "Custom API key has been removed" }) }

  const groupedKeys = API_KEYS.reduce((acc, k) => { (acc[k.category] ||= []).push(k); return acc }, {} as Record<string, ApiKey[]>)

  if (!isOpen) return null

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white dark:bg-neutral-800 border-l border-neutral-200 dark:border-neutral-700 shadow-lg z-50">
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Integrations</h2>
            <Button variant="ghost" size="sm" onClick={onClose}><X className="h-4 w-4" /></Button>
          </div>
          <p className="text-sm text-muted-foreground mt-1">Configure your API keys for enhanced functionality</p>
        </div>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium flex items-center gap-2"><Database className="h-4 w-4" />Database</h3>
                <Dialog>
                  <DialogTrigger asChild><Button variant="outline" size="sm"><Plus className="h-4 w-4 mr-1" />Add</Button></DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader><DialogTitle>Add Database Connection</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2"><Label htmlFor="db-name">Database Name</Label><Input id="db-name" placeholder="e.g., Production Database" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} /></div>
                      <div className="space-y-2"><Label htmlFor="db-url">Connection String</Label><Input id="db-url" type="password" placeholder="postgresql://user:password@host:port/database" value={newKeyValue} onChange={(e) => setNewKeyValue(e.target.value)} /></div>
                      <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => { setNewKeyName(""); setNewKeyValue("") }}>Cancel</Button><Button onClick={handleAddCustomKey}>Add Database</Button></div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="space-y-4">
                {groupedKeys.database?.map((apiKey) => (
                  <Card key={apiKey.key}>
                    <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2">{apiKey.icon}{apiKey.name}</CardTitle><p className="text-xs text-muted-foreground">{apiKey.description}</p></CardHeader>
                    <CardContent className="pt-0"><div className="flex gap-2"><Input type={showKeys[apiKey.key] ? "text" : "password"} value={apiKeys[apiKey.key] || ""} onChange={(e) => handleKeyChange(apiKey.key, e.target.value)} placeholder={apiKey.placeholder} className="flex-1" /><Button variant="ghost" size="sm" onClick={() => toggleShowKey(apiKey.key)}>{showKeys[apiKey.key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button></div></CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <Separator />

            <div>
              <div className="flex items-center justify-between mb-3"><h3 className="text-sm font-medium flex items-center gap-2"><Code className="h-4 w-4" />Environment Variables</h3>
                <Dialog>
                  <DialogTrigger asChild><Button variant="outline" size="sm"><Plus className="h-4 w-4 mr-1" />Add</Button></DialogTrigger>
                  <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Add API Key</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2"><Label htmlFor="api-name">API Key Name</Label><Input id="api-name" placeholder="e.g., Custom Service API" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} /></div>
                      <div className="space-y-2"><Label htmlFor="api-key">API Key</Label><Input id="api-key" type="password" placeholder="Enter your API key" value={newKeyValue} onChange={(e) => setNewKeyValue(e.target.value)} /></div>
                      <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => { setNewKeyName(""); setNewKeyValue("") }}>Cancel</Button><Button onClick={handleAddCustomKey}>Add API Key</Button></div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="space-y-4">
                {groupedKeys.ai?.map((apiKey) => (
                  <Card key={apiKey.key}><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2">{apiKey.icon}{apiKey.name}</CardTitle><p className="text-xs text-muted-foreground">{apiKey.description}</p></CardHeader><CardContent className="pt-0"><div className="flex gap-2"><Input type={showKeys[apiKey.key] ? "text" : "password"} value={apiKeys[apiKey.key] || ""} onChange={(e) => handleKeyChange(apiKey.key, e.target.value)} placeholder={apiKey.placeholder} className="flex-1" /><Button variant="ghost" size="sm" onClick={() => toggleShowKey(apiKey.key)}>{showKeys[apiKey.key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button></div></CardContent></Card>
                ))}
                {groupedKeys.other?.map((apiKey) => (
                  <Card key={apiKey.key}><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2">{apiKey.icon}{apiKey.name}</CardTitle><p className="text-xs text-muted-foreground">{apiKey.description}</p></CardHeader><CardContent className="pt-0"><div className="flex gap-2"><Input type={showKeys[apiKey.key] ? "text" : "password"} value={apiKeys[apiKey.key] || ""} onChange={(e) => handleKeyChange(apiKey.key, e.target.value)} placeholder={apiKey.placeholder} className="flex-1" /><Button variant="ghost" size="sm" onClick={() => toggleShowKey(apiKey.key)}>{showKeys[apiKey.key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button></div></CardContent></Card>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-neutral-200 dark:border-neutral-700"><div className="flex gap-2"><Button onClick={handleSave} className="flex-1">Save Settings</Button><Button variant="outline" onClick={onClose}>Cancel</Button></div><p className="text-xs text-muted-foreground mt-2">Keys are stored locally in your browser for security</p></div>
      </div>
    </div>
  )
}

