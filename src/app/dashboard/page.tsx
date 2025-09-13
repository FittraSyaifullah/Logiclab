'use client'

import { useState } from 'react'
import { Plus, TrendingUp, Settings, LogOut, User, CreditCard, LayoutDashboard, BarChart3, DollarSign } from 'lucide-react'
import Link from 'next/link'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

export default function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const { user, signOut } = useAuth()

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <ProtectedRoute>
      <div className="bg-neutral-50 dark:bg-neutral-900 min-h-screen">
      <div className="group/sidebar-wrapper flex min-h-svh w-full" style={{'--sidebar-width': '16rem', '--sidebar-width-icon': '3rem'}}>
        <div className="flex h-screen w-full overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-100/40 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/20 pt-16">
          
          {/* Sidebar */}
          <div className={`fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-r border-slate-200/30 dark:border-slate-700/30 shadow-xl transition-transform duration-300 ease-out z-40 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            <div className="flex flex-col h-full p-4">
              {/* Top Actions */}
              <div className="space-y-3 mb-6">
                <button className="inline-flex items-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2 w-full justify-start bg-orange-500 hover:bg-orange-600 text-white shadow-md">
                  <Plus className="mr-3 h-4 w-4" />
                  New Creation
                </button>
                <button className="inline-flex items-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border hover:text-accent-foreground h-10 px-4 py-2 w-full justify-start border-emerald-300 hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 bg-transparent">
                  <TrendingUp className="mr-3 h-4 w-4 text-emerald-600" />
                  Growth Marketing
                </button>
              </div>

              {/* Projects List */}
              <div className="flex-1 overflow-hidden">
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Creations</div>
                <div className="space-y-1 overflow-y-auto max-h-[calc(100vh-16rem)]">
                  <button className="inline-flex items-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground w-full justify-start text-left p-3 h-auto bg-orange-100 dark:bg-orange-950/50 text-orange-900 dark:text-orange-100">
                    <div className="flex flex-col items-start w-full">
                      <div className="font-medium text-sm truncate w-full">My new app</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate w-full">Software • 9/11/2025</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="border-t border-slate-200 dark:border-slate-700 pt-4 space-y-2">
                <button className="inline-flex items-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:text-accent-foreground h-10 px-4 py-2 w-full justify-start text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                  <Settings className="mr-3 h-4 w-4" />
                  Settings
                </button>
                <button 
                  onClick={handleSignOut}
                  className="inline-flex items-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:text-accent-foreground h-10 px-4 py-2 w-full justify-start text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <LogOut className="mr-3 h-4 w-4" />
                  Logout
                </button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 ml-64">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-slate-200/30 dark:border-slate-700/30 z-30">
              <div className="flex items-center justify-between h-full px-6">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                  >
                    <LayoutDashboard className="h-5 w-5" />
                  </button>
                  <h1 className="text-xl font-semibold">Dashboard</h1>
                </div>
                <div className="flex items-center gap-4">
                  <Link href="/dashboard/billing" className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100">
                    <CreditCard className="h-4 w-4" />
                    Billing
                  </Link>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-sm font-medium">
                      {user?.user_metadata?.full_name || user?.email || 'User'}
                    </span>
                  </div>
                </div>
              </div>
            </header>

            {/* Main Panel */}
            <main className="pt-16 p-6">
              <div className="max-w-7xl mx-auto">
                {/* Navigation Tabs */}
                <div className="flex space-x-1 mb-8">
                  <button className="inline-flex items-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </button>
                  <button className="inline-flex items-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:text-accent-foreground h-10 px-4 py-2">
                    <BarChart3 className="h-4 w-4" />
                    Business Analysis
                  </button>
                  <button className="inline-flex items-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:text-accent-foreground h-10 px-4 py-2">
                    <DollarSign className="h-4 w-4" />
                    Payments
                  </button>
                </div>

                {/* Content Area */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Initial Prompt Form */}
                  <div className="lg:col-span-2">
                    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
                      <h2 className="text-lg font-semibold mb-4">Start a New Project</h2>
                      
                      {/* Toggle: Hardware | Software */}
                      <div className="flex space-x-1 mb-6 bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
                        <button className="flex-1 py-2 px-4 text-sm font-medium rounded-md bg-white dark:bg-slate-600 text-slate-900 dark:text-slate-100 shadow-sm">
                          Hardware
                        </button>
                        <button className="flex-1 py-2 px-4 text-sm font-medium rounded-md text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100">
                          Software
                        </button>
                      </div>

                      {/* Prompt Input */}
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            What do you want to build?
                          </label>
                          <Textarea 
                            className="w-full h-32 resize-none"
                            placeholder="Describe your project idea..."
                          />
                        </div>
                        <Button className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white transition-all duration-300 hover:scale-105 hover:shadow-lg">
                          Generate Project
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Chat UI Placeholder */}
                  <div className="lg:col-span-1">
                    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 h-96">
                      <h3 className="text-lg font-semibold mb-4">Chat</h3>
                      <div className="text-center text-slate-500 dark:text-slate-400 mt-20">
                        Start a project to begin chatting
                      </div>
                    </div>
                  </div>
                </div>

                {/* Viewer Panel Placeholder */}
                <div className="mt-6">
                  <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 h-96">
                    <h3 className="text-lg font-semibold mb-4">Project Viewer</h3>
                    <div className="text-center text-slate-500 dark:text-slate-400 mt-20">
                      Your generated projects will appear here
                    </div>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
    </ProtectedRoute>
  )
}
