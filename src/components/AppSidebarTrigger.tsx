import * as React from "react"
import { X } from "lucide-react"
const __DEV__ = process.env.NODE_ENV !== 'production'

import { Button } from "@/components/ui/button"
import { useSidebar } from "@/components/ui/sidebar"

export function AppSidebarTrigger() {
  const { toggleSidebar, open } = useSidebar()

  const handleClick = () => {
    __DEV__ && console.log('SidebarTrigger clicked, current state:', open)
    toggleSidebar()
  }

  return (
    <Button
      data-sidebar="trigger"
      variant="ghost"
      size="icon"
      onClick={handleClick}
      className="h-7 w-7 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 transition-colors"
      title={open ? "إغلاق السايدبار" : "فتح السايدبار"}
    >
      <X className="h-4 w-4" />
      <span className="sr-only">إغلاق السايدبار</span>
    </Button>
  )
}
