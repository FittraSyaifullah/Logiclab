"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Plus, LogOut, User, Trash2, MoreHorizontal, Box, Monitor, Cpu } from "lucide-react"
import type { Creation } from "@/lib/types"
import { useCreationStore } from "@/hooks/use-creation-store"
import { CreditBalanceWidget } from "@/components/credit-balance-widget"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface AppSidebarProps {
  onLogout: () => void
}

export function AppSidebar({ onLogout }: AppSidebarProps) {
  const [deleteCreationId, setDeleteCreationId] = useState<string | null>(null)
  const { creations, activeCreationId, setActiveCreationId, deleteCreation } = useCreationStore()

  const handleNewCreation = () => {
    setActiveCreationId(null)
  }

  const handleDeleteCreation = async (creationId: string) => {
    const creationToDelete = creations.find((c) => c.id === creationId)

    if (creationToDelete?.softwareData?.chatId) {
      try {
        console.log(`🗑️ Deleting v0 chat: ${creationToDelete.softwareData.chatId}`)

        const response = await fetch("/api/delete-chat", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            chatId: creationToDelete.softwareData.chatId,
          }),
        })

        if (!response.ok) {
          console.warn("Failed to delete v0 chat, but continuing with local deletion")
        } else {
          console.log("✅ Successfully deleted v0 chat")
        }
      } catch (error) {
        console.error("Error deleting v0 chat:", error)
      }
    }

    deleteCreation(creationId)
    if (activeCreationId === creationId) {
      setActiveCreationId(null)
    }
    setDeleteCreationId(null)
  }

  const getCreationIcon = (creation: Creation) => {
    if (creation.mode === "software" || creation.softwareData) {
      return <Monitor className="w-4 h-4" />
    } else if (creation.hasCode) {
      return <Cpu className="w-4 h-4" />
    } else {
      return <Box className="w-4 h-4" />
    }
  }

  return (
    <Sidebar collapsible="icon" className="border-r border-neutral-200 dark:border-neutral-700">
      <SidebarHeader className="p-2"></SidebarHeader>

      <SidebarContent className="p-0">
        <SidebarGroup className="p-2">
          <SidebarGroupContent>
            <Button
              onClick={handleNewCreation}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-lg group-data-[collapsible=icon]:px-2"
            >
              <Plus className="h-4 w-4 group-data-[collapsible=icon]:mr-0 mr-2" />
              <span className="group-data-[collapsible=icon]:hidden">New Creation</span>
            </Button>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="p-2 pt-0">
          <SidebarGroupContent>
            <CreditBalanceWidget className="group-data-[collapsible=icon]:hidden" />
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="p-2 pt-0">
          <SidebarGroupLabel>Creations</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {(creations ?? []).map((creation) => (
                <SidebarMenuItem key={creation.id}>
                  <div className="flex items-center w-full group">
                    <SidebarMenuButton
                      onClick={() => setActiveCreationId(creation.id)}
                      isActive={activeCreationId === creation.id}
                      className="justify-start flex-1"
                      tooltip={creation.title}
                    >
                      {getCreationIcon(creation)}
                      <span className="truncate">{creation.title}</span>
                    </SidebarMenuButton>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => setDeleteCreationId(creation.id)}
                          className="text-red-600 dark:text-red-400"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton className="justify-start" tooltip="Profile">
              <User className="w-4 h-4" />
              <span>Profile</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton className="justify-start" tooltip="Logout" onClick={onLogout}>
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <AlertDialog open={!!deleteCreationId} onOpenChange={() => setDeleteCreationId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Creation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this creation? This action cannot be undone. All associated models and
              code will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteCreationId && handleDeleteCreation(deleteCreationId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sidebar>
  )
}
