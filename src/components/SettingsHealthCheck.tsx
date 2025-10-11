import React, { useEffect, useState, memo } from 'react'
import { AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react'
import { useSettingsStore } from '../store/settingsStore'
import { shallow } from 'zustand/shallow'
import { Button } from './ui/button'
import { Alert, AlertDescription } from './ui/alert'

interface SettingsHealthStatus {
  hasValidSettings: boolean
  hasBackup: boolean
  backupAge: number | null
  issues: string[]
}

export function SettingsHealthCheck() {
  const settings = useSettingsStore(state => state.settings)
  const loadSettings = useSettingsStore(state => state.loadSettings)
  const isLoading = useSettingsStore(state => state.isLoading)
  const [healthStatus, setHealthStatus] = useState<SettingsHealthStatus>({
    hasValidSettings: false,
    hasBackup: false,
    backupAge: null,
    issues: []
  })

  const checkSettingsHealth = () => {
    const issues: string[] = []
    let hasValidSettings = false
    let hasBackup = false
    let backupAge: number | null = null

    // Check if settings are loaded and valid
    if (settings && settings.clinic_name && settings.clinic_name !== 'عيادة الأسنان') {
      hasValidSettings = true
    } else {
      issues.push('إعدادات العيادة غير مكتملة أو مفقودة')
    }

    // Check backup status
    try {
      const backupStr = localStorage.getItem('dental-clinic-settings-backup')
      if (backupStr) {
        const backup = JSON.parse(backupStr)
        if (backup.clinic_name && backup.clinic_name !== 'عيادة الأسنان') {
          hasBackup = true
          if (backup.timestamp) {
            backupAge = Date.now() - backup.timestamp
            const daysOld = Math.floor(backupAge / (1000 * 60 * 60 * 24))
            if (daysOld > 7) {
              issues.push(`النسخة الاحتياطية قديمة (${daysOld} أيام)`)
            }
          }
        }
      } else {
        issues.push('لا توجد نسخة احتياطية للإعدادات')
      }
    } catch (error) {
      issues.push('خطأ في قراءة النسخة الاحتياطية')
    }

    setHealthStatus({
      hasValidSettings,
      hasBackup,
      backupAge,
      issues
    })
  }

  useEffect(() => {
    checkSettingsHealth()
  }, [settings])

  const handleRefreshSettings = async () => {
    await loadSettings()
    checkSettingsHealth()
  }

  const getStatusIcon = () => {
    if (healthStatus.hasValidSettings && healthStatus.hasBackup) {
      return <CheckCircle className="h-5 w-5 text-green-500" />
    }
    return <AlertTriangle className="h-5 w-5 text-yellow-500" />
  }

  const getStatusMessage = () => {
    if (healthStatus.hasValidSettings && healthStatus.hasBackup) {
      return 'إعدادات العيادة محفوظة بأمان'
    }
    if (healthStatus.hasValidSettings && !healthStatus.hasBackup) {
      return 'الإعدادات موجودة لكن بدون نسخة احتياطية'
    }
    if (!healthStatus.hasValidSettings && healthStatus.hasBackup) {
      return 'الإعدادات مفقودة لكن يمكن استعادتها من النسخة الاحتياطية'
    }
    return 'إعدادات العيادة مفقودة'
  }

  // Only show if there are issues or in development mode
  const shouldShow = healthStatus.issues.length > 0 || process.env.NODE_ENV === 'development'

  if (!shouldShow) {
    return null
  }

  return (
    <Alert className="mb-4">
      <div className="flex items-center gap-2">
        {getStatusIcon()}
        <AlertDescription className="flex-1">
          <div className="font-medium mb-2">{getStatusMessage()}</div>
          {healthStatus.issues.length > 0 && (
            <ul className="text-sm space-y-1">
              {healthStatus.issues.map((issue, index) => (
                <li key={index} className="text-muted-foreground">
                  • {issue}
                </li>
              ))}
            </ul>
          )}
        </AlertDescription>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefreshSettings}
          disabled={isLoading}
          className="shrink-0"
        >
          {isLoading ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          تحديث
        </Button>
      </div>
    </Alert>
  )
}

export default SettingsHealthCheck
