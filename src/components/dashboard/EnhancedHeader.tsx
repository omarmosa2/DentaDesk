import React, { useCallback, memo } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Bell,
  RefreshCw,
  Settings,
  Stethoscope,
  Menu
} from 'lucide-react'
import { useSettingsStore } from '@/store/settingsStore'
import { useStableClinicName, useStableClinicLogo } from '@/hooks/useStableSettings'
import { useGlobalStore } from '@/store/globalStore'

interface EnhancedHeaderProps {
  onRefresh?: () => void
  onOpenSettings?: () => void
  onToggleMobileSidebar?: () => void
}

const EnhancedHeader = memo(function EnhancedHeader({
  onRefresh,
  onOpenSettings,
  onToggleMobileSidebar
}: EnhancedHeaderProps) {
  const { settings } = useSettingsStore()
  const { syncAllData, isGlobalLoading, unreadAlertsCount } = useGlobalStore()
  const clinicName = useStableClinicName()
  const clinicLogo = useStableClinicLogo()

  const handleRefresh = useCallback(async () => {
    await syncAllData()
    onRefresh?.()
  }, [syncAllData, onRefresh])

  return (
    <header className="h-16 md:h-18 lg:h-20 bg-card border-b border-border shadow-lg dark:shadow-xl rtl backdrop-blur-sm animate-fade-in" dir="rtl">
      <div className="h-full px-4 md:px-6 lg:px-8 flex items-center justify-between">
        {/* Right side - Actions (in RTL) */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Refresh Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isGlobalLoading}
            className="text-foreground hover:bg-accent rounded-lg transition-all duration-200 hover:scale-105"
            aria-label="تحديث البيانات"
          >
            <RefreshCw className={`w-4 h-4 ${isGlobalLoading ? 'animate-spin' : ''}`} />
          </Button>

          {/* Notifications */}
          {unreadAlertsCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="relative text-foreground hover:bg-accent rounded-lg transition-all duration-200 hover:scale-105"
              aria-label={`${unreadAlertsCount} تنبيهات غير مقروءة`}
            >
              <Bell className="w-4 h-4" />
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 w-5 md:h-6 md:w-6 flex items-center justify-center p-0 text-xs font-bold shadow-lg animate-pulse"
              >
                {unreadAlertsCount > 99 ? '99+' : unreadAlertsCount}
              </Badge>
            </Button>
          )}

          {/* Settings */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenSettings}
            className="text-foreground hover:bg-accent rounded-lg transition-all duration-200 hover:scale-105"
            aria-label="الإعدادات"
          >
            <Settings className="w-4 h-4" />
          </Button>

          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleMobileSidebar}
            className="text-foreground hover:bg-accent md:hidden rounded-lg transition-all duration-200 hover:scale-105"
            aria-label="القائمة"
          >
            <Menu className="w-4 h-4" />
          </Button>
        </div>

        {/* Center - Clinic Info */}
        <div className="flex-1 flex items-center justify-center px-4">
          {clinicName && (
            <div className="text-center space-y-1">
              <h1 className="text-base md:text-lg lg:text-xl font-bold text-foreground font-tajawal">
                {clinicName}
              </h1>
              {clinicLogo && (
                <div className="mt-1">
                  <img
                    src={clinicLogo}
                    alt="شعار العيادة"
                    className="h-6 md:h-8 lg:h-10 w-auto mx-auto rounded-lg shadow-sm"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Left side - Empty for balance */}
        <div className="w-24 md:w-32 lg:w-40"></div>
      </div>

      {/* Enhanced gradient line */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/20 dark:via-primary/30 to-transparent" />
    </header>
  )
})

export default EnhancedHeader
