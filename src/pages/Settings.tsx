import { useState, useEffect, useRef } from 'react'
import QRCode from 'qrcode'
import { useBackupStore } from '@/store/backupStore'
import { useSettingsStore } from '@/store/settingsStore'
import { useTheme } from '@/contexts/ThemeContext'
import { useStableClinicLogo } from '@/hooks/useStableSettings'
import { formatDate } from '@/lib/utils'
import { SUPPORTED_CURRENCIES } from '@/lib/utils'
import { useCurrency } from '@/contexts/CurrencyContext'
import SecuritySettings from '@/components/settings/SecuritySettings'
import ElegantShortcutsDisplay from '@/components/help/ElegantShortcutsDisplay'
import { DatabaseDiagnostics } from '@/components/DatabaseDiagnostics'
import { ExportService } from '@/services/exportService'
import { useDentalTreatmentStore } from '@/store/dentalTreatmentStore'
import { Switch } from '@/components/ui/switch'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import {
  Download,
  Upload,
  Settings as SettingsIcon,
  Trash2,
  Clock,
  Shield,
  Database,
  Calendar,
  AlertTriangle,
  RefreshCw,
  HardDrive,
  Palette,
  Moon,
  Sun,
  Key,
  Users,
  Phone,
  Mail,
  Info,
  Image,
  Keyboard,
  DollarSign,
  Facebook
} from 'lucide-react'


export default function Settings() {
  const [activeTab, setActiveTab] = useState('diagnostics')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)

  const [notification, setNotification] = useState<{
    message: string
    type: 'success' | 'error' | 'info'
    show: boolean
  }>({ message: '', type: 'success', show: false })

  // WhatsApp Reminder Settings State
  const [enableReminder, setEnableReminder] = useState(false)
  const [hoursBefore, setHoursBefore] = useState(24)
  const [minutesBefore, setMinutesBefore] = useState<number>(0)
  const [messageText, setMessageText] = useState('')
  const [allowCustomMessage, setAllowCustomMessage] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const [initialLoadComplete, setInitialLoadComplete] = useState(false)
  const [showQRModal, setShowQRModal] = useState(false)
  const [qrData, setQrData] = useState<string>('')
  const [qrImageUrl, setQrImageUrl] = useState<string>('')
  const [confirmResetOpen, setConfirmResetOpen] = useState(false)
  const [confirmDeleteQROpen, setConfirmDeleteQROpen] = useState(false)
  const [qrSvg, setQrSvg] = useState<string>('')
  const messageTextareaRef = useRef<HTMLTextAreaElement | null>(null)

  // WhatsApp Session Status State
  const [_sessionStatus, setSessionStatus] = useState<{
    isConnected: boolean
    isConnecting: boolean
    lastActivity: string | null
    qrAvailable: boolean
  }>({
    isConnected: false,
    isConnecting: false,
    lastActivity: null,
    qrAvailable: false
  })

  const {
    backups,
    isLoading,
    error,
    isCreatingBackup,
    isRestoringBackup,
    autoBackupEnabled,
    backupFrequency,
    loadBackups,
    createBackup,
    restoreBackup,
    deleteBackup,
    setAutoBackupEnabled,
    setBackupFrequency,
    selectBackupFile,
    clearError,
    formatBackupSize,
    formatBackupDate,
    getBackupStatus
  } = useBackupStore()

  const { settings, updateSettings, loadSettings } = useSettingsStore()
  const { isDarkMode, toggleDarkMode } = useTheme()
  const { currentCurrency, setCurrency } = useCurrency()
  const stableClinicLogo = useStableClinicLogo()
  const { refreshAllImages } = useDentalTreatmentStore()

  // State محلي لإدارة الشعار لضمان التحديث الفوري
  const [localClinicLogo, setLocalClinicLogo] = useState<string>('')

  // State for logo upload
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoError, setLogoError] = useState<string>('')

  useEffect(() => {
    loadBackups()
    loadSettings()
    // Load initial WhatsApp session status
    updateSessionStatus()
  }, [loadBackups, loadSettings])

  // Function to update WhatsApp session status
  const updateSessionStatus = async () => {
    try {
      // @ts-ignore
      if (// @ts-ignore
window.electronAPI?.whatsappReminders?.getStatus) {
        // @ts-ignore
        const status = await window.electronAPI.whatsappReminders.getStatus()
        const isConnected = status.isReady && (status.state === 'connected' || status.state === 'authenticated')
        const isConnecting = status.hasQr || !!status.qr

        setSessionStatus({
          isConnected,
          isConnecting: Boolean(isConnecting && !isConnected),
          lastActivity: status.lastReadyAt ? new Date(status.lastReadyAt).toLocaleString('en-US') : null,
          qrAvailable: status.hasQr || !!status.qr
        })
      }
    } catch (error) {
      console.warn('Failed to get WhatsApp status:', error)
      setSessionStatus({
        isConnected: false,
        isConnecting: false,
        lastActivity: null,
        qrAvailable: false
      })
    }
  }

  // Auto-update session status every 30 seconds
  useEffect(() => {
    const interval = setInterval(updateSessionStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  // Listen for WhatsApp session notifications
  useEffect(() => {
    // @ts-ignore
    if (window.electronAPI) {
      // @ts-ignore
      const handleConnected = (_event, data) => {
        showNotification(data.message, 'success')
        updateSessionStatus() // Update status immediately
      }

      // @ts-ignore
      const handleDeleted = (_event, data) => {
        showNotification(data.message, 'success')
        updateSessionStatus() // Update status immediately
      }

      // @ts-ignore
      window.electronAPI.on('whatsapp:session:connected', handleConnected)
      // @ts-ignore
      window.electronAPI.on('whatsapp:session:deleted', handleDeleted)

      return () => {
        // @ts-ignore
        if (window.electronAPI.removeListener) {
          // @ts-ignore
          window.electronAPI.removeListener('whatsapp:session:connected', handleConnected)
          // @ts-ignore
          window.electronAPI.removeListener('whatsapp:session:deleted', handleDeleted)
        }
      }
    }
  }, [])

  // تحديث الشعار المحلي عند تغيير الشعار المستقر
  useEffect(() => {
    setLocalClinicLogo(stableClinicLogo)
  }, [stableClinicLogo])

  useEffect(() => {
    if (error) {
      showNotification(error, 'error')
      clearError()
    }
  }, [error, clearError])

  // Debug: Monitor showDeleteConfirm state changes
  useEffect(() => {
  }, [showDeleteConfirm])

  // Subscribe to WhatsApp QR events when modal is open
  useEffect(() => {
    if (!showQRModal) return

    // First, check if we already have QR data from the current session
    const checkExistingQr = async () => {
      try {
        // @ts-ignore
        if (window.electronAPI?.whatsappReminders?.getStatus) {
          // @ts-ignore
          const status = await window.electronAPI.whatsappReminders.getStatus()
          if (status.qr) {
            setQrData(status.qr)
            return
          }
        }
      } catch (error) {
        console.warn('Failed to check existing QR status:', error)
      }
    }

    checkExistingQr()

    // Subscribe to QR events - fallback to direct event listener
    const handleQrReceived = (_event: any, qr: string) => {
      setQrData(qr)
    }

    const handleReady = (_event: any, data: any) => {
      showNotification('تم ربط واتساب بنجاح!', 'success')
      setShowQRModal(false)
      updateSessionStatus()
    }

    const handleSessionConnected = (_event: any, data: any) => {
      showNotification(data?.message || 'تم ربط واتساب بنجاح!', 'success')
      updateSessionStatus()
    }

    const handleAuthFailure = (_event: any, _data: any) => {
      showNotification('فشل في ربط واتساب. يرجى المحاولة مرة أخرى.', 'error')
    }

    const handleSessionCleared = (_event: any, _data: any) => {
      setQrData('')
      showNotification('تم مسح جلسة واتساب', 'info')
    }

    const handleConnectionFailure = (_event: any, data: any) => {
      showNotification(`فشل في الاتصال: ${data?.message || 'خطأ غير معروف'}`, 'error')
    }

    const handleInitFailure = (_event: any, data: any) => {
      showNotification(`فشل في تهيئة واتساب: ${data?.message || 'خطأ غير معروف'}`, 'error')
    }

    const handleSessionAutoCleared = (_event: any, data: any) => {
      showNotification('تم مسح جلسة واتساب تلقائياً بسبب خطأ 401. يرجى مسح رمز QR مرة أخرى.', 'info')

      // Clear QR data to show waiting message
      setQrData('')

      // Auto-retry QR generation after a short delay
      setTimeout(async () => {
        try {
          const generateResult = await window.electronAPI?.whatsappReminders?.generateNewQR?.()
          if (generateResult?.success) {
            showNotification('تم بدء عملية توليد رمز QR جديد', 'info')
          } else {
            console.warn('⚠️ Auto-retry QR generation failed:', generateResult?.error || 'Unknown error')
            const errorDetails = (generateResult as any)?.details

            let errorMessage = 'فشل في توليد رمز QR بعد مسح الجلسة'
            if (generateResult?.error && generateResult.error !== 'Unknown error') {
              errorMessage += `: ${generateResult.error}`
            } else if (errorDetails) {
              errorMessage += `: ${errorDetails.type}`
              if (errorDetails.code !== 'N/A') {
                errorMessage += ` (${errorDetails.code})`
              }
            } else {
              errorMessage += `: خطأ غير معروف`
            }

            showNotification(errorMessage, 'error')

            // Log detailed error for debugging
            if (errorDetails) {
              console.error('📊 Auto-retry detailed error info:', {
                type: errorDetails.type,
                code: errorDetails.code,
                stack: errorDetails.stack
              })
            }

            console.error('📊 Full auto-retry generateResult object:', generateResult)
          }
        } catch (error) {
          console.error('Error auto-retrying QR generation:', error)
        }
      }, 2000)
    }

    try {
      // Using dynamic typing for event listeners
      const unsubscribeQR = window.electronAPI?.on('whatsapp:qr', handleQrReceived)
      const unsubscribeReady = window.electronAPI?.on('whatsapp:ready', handleReady)
      const unsubscribeSessionConnected = window.electronAPI?.on('whatsapp:session:connected', handleSessionConnected)
      const unsubscribeAuthFailure = window.electronAPI?.on('whatsapp:auth_failure', handleAuthFailure)
      const unsubscribeSessionCleared = window.electronAPI?.on('whatsapp:session_cleared', handleSessionCleared)
      const unsubscribeConnectionFailure = window.electronAPI?.on('whatsapp:connection_failure', handleConnectionFailure)
      const unsubscribeInitFailure = window.electronAPI?.on('whatsapp:init_failure', handleInitFailure)
      const unsubscribeSessionAutoCleared = window.electronAPI?.on('whatsapp:session_auto_cleared', handleSessionAutoCleared)

      return () => {
        try {
          if (typeof unsubscribeQR === 'function') unsubscribeQR()
          if (typeof unsubscribeReady === 'function') unsubscribeReady()
          if (typeof unsubscribeSessionConnected === 'function') unsubscribeSessionConnected()
          if (typeof unsubscribeAuthFailure === 'function') unsubscribeAuthFailure()
          if (typeof unsubscribeSessionCleared === 'function') unsubscribeSessionCleared()
          if (typeof unsubscribeConnectionFailure === 'function') unsubscribeConnectionFailure()
          if (typeof unsubscribeInitFailure === 'function') unsubscribeInitFailure()
          if (typeof unsubscribeSessionAutoCleared === 'function') unsubscribeSessionAutoCleared()
        } catch (error) {
          console.warn('Error unsubscribing from events:', error)
        }
      }
    } catch (error) {
      console.error('❌ Error setting up event listeners:', error)
    }
  }, [showQRModal])

  // Generate a high-quality QR (SVG preferred) whenever qrData changes
  useEffect(() => {
    let isCancelled = false
    const generate = async () => {
      if (!qrData || qrData.trim() === '') {
        setQrImageUrl('')
        setQrSvg('')
        return
      }


      try {
        // Validate QR data before processing
        if (qrData.length < 10) {
          console.warn('⚠️ QR data too short, may be invalid:', qrData.substring(0, 50))
          return
        }

        // Prefer SVG for perfect sharpness (no resampling)
        const svg = await QRCode.toString(qrData, {
          type: 'svg',
          errorCorrectionLevel: 'M',
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF' // pure white for better contrast
          },
          width: 512
        })

        if (!isCancelled) {
          setQrSvg(svg)
        }

        // Also prepare a PNG fallback with better quality settings
        const url = await QRCode.toDataURL(qrData, {
          errorCorrectionLevel: 'M',
          margin: 2,
          width: 512
        })

        if (!isCancelled) {
          setQrImageUrl(url)
        }
      } catch (e) {
        console.error('❌ Failed to generate QR code:', e)
        console.error('QR Data that failed:', qrData.substring(0, 100) + '...')

        if (!isCancelled) {
          setQrImageUrl('')
          setQrSvg('')
          showNotification('فشل في توليد رمز QR. يرجى المحاولة مرة أخرى.', 'error')
        }
      }
    }

    generate()
    return () => { isCancelled = true }
  }, [qrData])

  // Handle keyboard events for modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (showDeleteConfirm && event.key === 'Escape') {
        setShowDeleteConfirm(null)
      }
    }

    if (showDeleteConfirm) {
      document.addEventListener('keydown', handleKeyDown)
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [showDeleteConfirm])

  // Function to fetch WhatsApp settings
    const fetchWhatsAppSettings = async () => {
      try {
        // Prefer new API via electronAPI.whatsappReminders; fallback to legacy window.electron
        let data: any
        // @ts-ignore
        if (window.electronAPI?.whatsappReminders?.getSettings) {
          // @ts-ignore
          data = await window.electronAPI.whatsappReminders.getSettings()
          setEnableReminder(Boolean(data.whatsapp_reminder_enabled))
          setHoursBefore(Number(data.hours_before ?? 24))
          setMinutesBefore(Number(data.minutes_before ?? (data.hours_before ?? 0) * 60))
          setMessageText(String(data.message ?? ''))
          setAllowCustomMessage(Boolean(data.custom_enabled))
          setSettingsLoaded(true)
          setInitialLoadComplete(true)
        } else if (window.electron?.getWhatsAppSettings) {
          const legacy = await window.electron.getWhatsAppSettings()
          setEnableReminder(legacy.enableReminder || false)
          setHoursBefore(legacy.hoursBefore || 24)
          setMessageText(legacy.messageText || '')
          setAllowCustomMessage(legacy.allowCustomMessage || false)
          setSettingsLoaded(true)
          setInitialLoadComplete(true)
        } else {
          console.warn('WhatsApp settings API not available')
        }
      } catch (error) {
        console.error('Error fetching WhatsApp settings:', error)
        // Don't reset settingsLoaded on error to prevent reload loops
        // setSettingsLoaded(false) // Reset on error to allow retry
      }
    }

  // Fetch initial WhatsApp settings (only once on component mount)
  useEffect(() => {
    if (!initialLoadComplete) {
      fetchWhatsAppSettings()
    }
  }, [initialLoadComplete])

  // Fetch WhatsApp settings on page focus/visibility change (handles page refresh)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && activeTab === 'whatsapp' && !settingsLoaded && !initialLoadComplete) {
        fetchWhatsAppSettings()
      }
    }

    const handleFocus = () => {
      if (activeTab === 'whatsapp' && !settingsLoaded && !initialLoadComplete) {
        fetchWhatsAppSettings()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [activeTab])

  // Fetch WhatsApp settings when switching to WhatsApp tab (only if not already loaded)
  useEffect(() => {
    if (activeTab === 'whatsapp' && !settingsLoaded && !initialLoadComplete) {
      fetchWhatsAppSettings()
    } else if (activeTab === 'whatsapp' && (settingsLoaded || initialLoadComplete)) {
    }
  }, [activeTab, settingsLoaded, initialLoadComplete])

  // Auto-save WhatsApp settings when they change (with better debouncing)
  useEffect(() => {
    // Only auto-save if we're on the WhatsApp tab, settings have been loaded, and not currently saving
    if (activeTab === 'whatsapp' && settingsLoaded && !isSaving) {
      const autoSaveSettings = async () => {
        if (isSaving) return // Double check to avoid race conditions
        
        try {
          setIsSaving(true)
      const settingsPayload = {
        whatsapp_reminder_enabled: enableReminder ? 1 : 0,
        hours_before: hoursBefore,
        minutes_before: minutesBefore,
        message: messageText,
        custom_enabled: allowCustomMessage ? 1 : 0,
      }

          // @ts-ignore
          // @ts-ignore
          if (window.electronAPI?.whatsappReminders?.setSettings) {
            // @ts-ignore
            const saveResult = await window.electronAPI.whatsappReminders.setSettings(settingsPayload)
            
            // Test: Immediately reload settings to verify they were saved
            setTimeout(async () => {
              try {
                // @ts-ignore
                const testReload = await window.electronAPI.whatsappReminders.getSettings()
              } catch (error) {
                // console.error('🧪 [TEST] Failed to reload settings for verification:', error)
              }
            }, 3000)
          }
        } catch (error) {
          console.error('Error auto-saving WhatsApp settings:', error)
        } finally {
          // Add a small delay before allowing next auto-save
          setTimeout(() => setIsSaving(false), 1000)
        }
      }

      // Increased debounce time to 5 seconds to avoid conflicts with manual save
      const timeoutId = setTimeout(autoSaveSettings, 2000)
      return () => clearTimeout(timeoutId)
    }
  }, [activeTab, enableReminder, hoursBefore, minutesBefore, messageText, allowCustomMessage, isSaving, settingsLoaded])

  // Save settings before page unload
  useEffect(() => {
    const handleBeforeUnload = async () => {
      if (activeTab === 'whatsapp') {
        try {
          const settingsPayload = {
            whatsapp_reminder_enabled: enableReminder ? 1 : 0,
            hours_before: hoursBefore,
            minutes_before: minutesBefore,
            message: messageText,
            custom_enabled: allowCustomMessage ? 1 : 0,
          }

          // @ts-ignore
if (window.electronAPI?.whatsappReminders?.setSettings) {
            // Use synchronous save if possible
            // @ts-ignore
            await window.electronAPI.whatsappReminders.setSettings(settingsPayload)
          }
        } catch (error) {
          console.error('Error saving WhatsApp settings before unload:', error)
        }
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [activeTab, enableReminder, hoursBefore, minutesBefore, messageText, allowCustomMessage])

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotification({ message, type, show: true })
    setTimeout(() => {
      setNotification(prev => ({ ...prev, show: false }))
    }, 3000)
  }

  // Save WhatsApp settings

  // Insert token at current caret position in textarea
  const insertTokenAtCursor = (token: string) => {
    const textarea = messageTextareaRef.current
    if (!textarea) {
      // Fallback: append at end
      setMessageText(prev => (prev || '') + token)
      return
    }
    const start = textarea.selectionStart ?? textarea.value.length
    const end = textarea.selectionEnd ?? textarea.value.length
    const before = messageText.slice(0, start)
    const after = messageText.slice(end)
    const next = `${before}${token}${after}`
    setMessageText(next)
    // Restore focus and set caret after inserted token
    requestAnimationFrame(() => {
      textarea.focus()
      const caretPos = start + token.length
      try {
        textarea.setSelectionRange(caretPos, caretPos)
      } catch {}
    })
  }

  // Handle logo upload with validation
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Clear previous error
    setLogoError('')

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024 // 5MB in bytes
    if (file.size > maxSize) {
      setLogoError('حجم الملف كبير جداً. الحد الأقصى المسموح به هو 5 ميجابايت.')
      return
    }

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml']
    if (!allowedTypes.includes(file.type)) {
      setLogoError('نوع الملف غير مدعوم. الصيغ المسموحة: PNG, JPG, SVG فقط.')
      return
    }

    // Set uploading state
    setLogoUploading(true)

    try {
      // Convert to base64
      const reader = new FileReader()
      reader.onload = async (event) => {
        const base64 = event.target?.result as string
        try {
          await handleUpdateSettings({ clinic_logo: base64 })
          showNotification('تم تحديث شعار العيادة بنجاح', 'success')
        } catch (error) {
          console.error('Error updating logo:', error)
          setLogoError('فشل في حفظ الشعار. يرجى المحاولة مرة أخرى.')
        } finally {
          setLogoUploading(false)
        }
      }

      reader.onerror = () => {
        setLogoError('فشل في قراءة الملف. يرجى المحاولة مرة أخرى.')
        setLogoUploading(false)
      }

      reader.readAsDataURL(file)
    } catch (error) {
      console.error('Error processing file:', error)
      setLogoError('حدث خطأ أثناء معالجة الملف.')
      setLogoUploading(false)
    }
  }

  const handleCreateBackup = async (withImages = false) => {
    try {
      await createBackup(null, withImages)
      const message = withImages
        ? 'تم إنشاء النسخة الاحتياطية مع الصور بنجاح'
        : 'تم إنشاء النسخة الاحتياطية بنجاح'
      showNotification(message, 'success')
    } catch (error) {
      showNotification('فشل في إنشاء النسخة الاحتياطية', 'error')
    }
  }

  const handleRestoreBackup = async () => {
    try {
      const filePath = await selectBackupFile()
      if (!filePath) return

      const confirmed = window.confirm(
        'هل أنت متأكد من استعادة هذه النسخة الاحتياطية؟ سيتم استبدال جميع البيانات الحالية.'
      )

      if (confirmed) {
        await restoreBackup(filePath)

        // Refresh all images after restore
        try {
          await refreshAllImages()
        } catch (error) {
          console.warn('Could not refresh images after restore:', error)
        }

        showNotification('تم استعادة النسخة الاحتياطية بنجاح', 'success')
        // Reload the page to reflect changes
        window.location.reload()
      }
    } catch (error) {
      showNotification('فشل في استعادة النسخة الاحتياطية', 'error')
    }
  }

  const handleRestoreFromPath = async (backupPath: string) => {
    try {
      const confirmed = window.confirm(
        'هل أنت متأكد من استعادة هذه النسخة الاحتياطية؟ سيتم استبدال جميع البيانات الحالية.'
      )

      if (confirmed) {
        await restoreBackup(backupPath)

        // Refresh all images after restore
        try {
          await refreshAllImages()
        } catch (error) {
          console.warn('Could not refresh images after restore:', error)
        }

        showNotification('تم استعادة النسخة الاحتياطية بنجاح', 'success')
        // Reload the page to reflect changes
        window.location.reload()
      }
    } catch (error) {
      showNotification('فشل في استعادة النسخة الاحتياطية', 'error')
    }
  }

  const handleDeleteBackup = async (backupName: string) => {
    try {
      await deleteBackup(backupName)
      showNotification('تم حذف النسخة الاحتياطية بنجاح', 'success')
      setShowDeleteConfirm(null)
    } catch (error) {
      console.error('❌ Failed to delete backup:', error)
      showNotification(`فشل في حذف النسخة الاحتياطية: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`, 'error')
      setShowDeleteConfirm(null) // Close dialog even on error
    }
  }







  const handleUpdateSettings = async (settingsData: any) => {
    try {
      // تحديث الشعار المحلي فوراً إذا كان التحديث يتعلق بالشعار
      if (settingsData.clinic_logo !== undefined) {
        setLocalClinicLogo(settingsData.clinic_logo)
      }

      await updateSettings(settingsData)

      // إجبار إعادة تحميل الإعدادات لضمان التحديث الفوري في الواجهة
      await loadSettings()

      showNotification('تم حفظ إعدادات العيادة بنجاح', 'success')
    } catch (error) {
      console.error('Error updating settings:', error)
      showNotification('فشل في حفظ إعدادات العيادة', 'error')
    }
  }

  const backupStatus = getBackupStatus()

  return (
    <div className="min-h-screen bg-background dark:bg-gray-900 flex flex-col" dir="rtl">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex-1 flex flex-col">
        <div className="space-y-6 py-6 flex-1 flex flex-col min-h-0">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-card/50 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-border/50 dark:bg-gray-800/50 dark:border-gray-700/50">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground dark:text-white arabic-enhanced">الإعدادات</h1>
              <p className="text-sm sm:text-base text-muted-foreground dark:text-gray-300 mt-2 arabic-enhanced">
                إدارة إعدادات العيادة والنسخ الاحتياطية
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
              <button
                onClick={() => loadBackups()}
                disabled={isLoading}
                className="flex items-center justify-center space-x-2 space-x-reverse px-4 py-2 border border-input bg-background text-foreground dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:hover:bg-gray-700 rounded-lg hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 ease-in-out interactive-card focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 min-h-[44px] hover:scale-105 active:scale-95"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span className="whitespace-nowrap">تحديث</span>
              </button>
              <button
                onClick={async () => {
                  // Export settings data
                  const settingsData = {
                    'الوضع المظلم': isDarkMode ? 'مفعل' : 'معطل',
                    'النسخ التلقائية': autoBackupEnabled ? 'مفعلة' : 'معطلة',
                    'تكرار النسخ': backupFrequency === 'daily' ? 'يومياً' : backupFrequency === 'weekly' ? 'أسبوعياً' : 'شهرياً',
                    'إجمالي النسخ الاحتياطية': backupStatus.totalBackups,
                    'آخر نسخة احتياطية': backupStatus.lastBackup || 'لا توجد',

                    'تاريخ التصدير': formatDate(new Date())
                  }

                  const csvContent = '\uFEFF' + [
                    'الإعداد,القيمة',
                    ...Object.entries(settingsData).map(([key, value]) => `"${key}","${value}"`)
                  ].join('\n')

                  // تحويل إلى Excel مباشرة
                  await ExportService.convertCSVToExcel(csvContent, 'settings', {
                    format: 'csv',
                    includeCharts: false,
                    includeDetails: true,
                    language: 'ar'
                  })
                }}
                className="flex items-center justify-center space-x-2 space-x-reverse px-4 py-2 border border-input bg-background text-foreground dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:hover:bg-gray-700 rounded-lg hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 ease-in-out interactive-card focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 min-h-[44px] hover:scale-105 active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span className="whitespace-nowrap">تصدير الإعدادات</span>
              </button>
            </div>
          </div>

      {/* Tabs */}
      <div className="border-b border-border dark:border-gray-700 sticky top-0 bg-background/95 dark:bg-gray-900/95 backdrop-blur-sm z-10 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
        <nav className="flex space-x-1 space-x-reverse overflow-x-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent py-3">
          {[
            // { id: 'backup', name: 'النسخ الاحتياطية', icon: Database },
            { id: 'diagnostics', name: 'تشخيص النظام', icon: AlertTriangle },
            { id: 'appearance', name: 'المظهر', icon: Palette },
            { id: 'whatsapp', name: 'تذكيرات واتساب', icon: Phone },
            { id: 'shortcuts', name: 'اختصارات', icon: Keyboard },
            { id: 'security', name: 'الأمان', icon: Key },
            { id: 'clinic', name: 'العيادة', icon: SettingsIcon },
            { id: 'development', name: 'التطوير', icon: Users }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 space-x-reverse px-4 py-3 border-b-2 font-medium text-sm whitespace-nowrap rounded-t-lg transition-all duration-300 ease-in-out interactive-card w-full sm:w-auto justify-center min-w-fit hover:scale-105 active:scale-95 ${
                activeTab === tab.id
                  ? 'border-primary text-primary bg-primary/5 dark:bg-blue-500/20 dark:border-blue-500 dark:text-blue-400 shadow-sm'
                  : 'border-transparent text-muted-foreground dark:text-gray-300 hover:text-foreground dark:hover:text-white hover:border-border/50 dark:hover:border-gray-600 hover:bg-accent/30 dark:hover:bg-gray-700/50'
              }`}
              aria-selected={activeTab === tab.id}
            >
              <tab.icon className="w-4 h-4 transition-colors flex-shrink-0" />
              <span className="font-medium">{tab.name}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}

      {activeTab === 'backup' && (
        <div className="space-y-6">
          {/* Backup Status Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
            <div className="bg-card dark:bg-gray-800 rounded-xl shadow-sm border border-border dark:border-gray-700 p-4 sm:p-6 interactive-card transition-all duration-200 hover:shadow-md">
              <div className="flex items-center">
                <div className="p-3 bg-primary/10 dark:bg-blue-500/20 rounded-xl transition-colors">
                  <HardDrive className="w-6 h-6 text-primary dark:text-blue-400" />
                </div>
                <div className="mr-4 flex-1 min-w-0">
                  <p className="text-sm font-medium text-muted-foreground dark:text-gray-300">إجمالي النسخ</p>
                  <p className="text-xl sm:text-2xl font-bold text-foreground dark:text-white">{backupStatus.totalBackups}</p>
                </div>
              </div>
            </div>

            <div className="bg-card dark:bg-gray-800 rounded-xl shadow-sm border border-border dark:border-gray-700 p-4 sm:p-6 interactive-card transition-all duration-200 hover:shadow-md">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-xl transition-colors">
                  <Clock className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="mr-4 flex-1 min-w-0">
                  <p className="text-sm font-medium text-muted-foreground dark:text-gray-300">آخر نسخة احتياطية</p>
                  <p className="text-sm font-bold text-foreground dark:text-white break-words">
                    {backupStatus.lastBackup || 'لا توجد'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-card dark:bg-gray-800 rounded-xl shadow-sm border border-border dark:border-gray-700 p-4 sm:p-6 interactive-card transition-all duration-200 hover:shadow-md sm:col-span-2 lg:col-span-1">
              <div className="flex items-center">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-xl transition-colors">
                  <Calendar className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="mr-4 flex-1 min-w-0">
                  <p className="text-sm font-medium text-muted-foreground dark:text-gray-300">النسخة التالية</p>
                  <p className="text-sm font-bold text-foreground dark:text-white break-words">
                    {backupStatus.nextScheduledBackup || 'غير محدد'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Manual Backup Actions */}
          <div className="bg-card dark:bg-gray-800 rounded-xl shadow-sm border border-border dark:border-gray-700">
            <div className="p-4 sm:p-6 border-b border-border dark:border-gray-700">
              <h3 className="text-lg sm:text-xl font-semibold text-foreground dark:text-white">النسخ الاحتياطية اليدوية</h3>
              <p className="text-sm text-muted-foreground dark:text-gray-300 mt-1">
                إنشاء واستعادة النسخ الاحتياطية يدوياً (تنسيق SQLite)
              </p>
            </div>
            <div className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 flex-wrap">
                <button
                  onClick={() => handleCreateBackup(false)}
                  disabled={isCreatingBackup}
                  className="flex items-center justify-center space-x-2 space-x-reverse px-4 sm:px-6 py-3 bg-primary dark:bg-blue-600 text-primary-foreground dark:text-white rounded-lg hover:bg-primary/90 dark:hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 ease-in-out interactive-card focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 min-h-[44px] flex-1 sm:flex-none hover:scale-105 active:scale-95 hover:shadow-lg dark:hover:shadow-blue-500/25"
                >
                  <Download className="w-5 h-5" />
                  <span className="whitespace-nowrap">{isCreatingBackup ? 'جاري الإنشاء...' : 'إنشاء نسخة احتياطية'}</span>
                </button>

                <button
                  onClick={() => handleCreateBackup(true)}
                  disabled={isCreatingBackup}
                  className="flex items-center justify-center space-x-2 space-x-reverse px-4 sm:px-6 py-3 bg-blue-600 dark:bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 ease-in-out interactive-card focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 min-h-[44px] flex-1 sm:flex-none hover:scale-105 active:scale-95 hover:shadow-lg dark:hover:shadow-blue-500/25"
                >
                  <Image className="w-5 h-5" />
                  <span className="whitespace-nowrap">{isCreatingBackup ? 'جاري الإنشاء...' : 'إنشاء نسخة مع صور'}</span>
                </button>

                <button
                  onClick={handleRestoreBackup}
                  disabled={isRestoringBackup}
                  className="flex items-center justify-center space-x-2 space-x-reverse px-4 sm:px-6 py-3 bg-green-600 dark:bg-green-600 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 ease-in-out interactive-card focus:ring-2 focus:ring-green-500/50 focus:ring-offset-2 min-h-[44px] flex-1 sm:flex-none hover:scale-105 active:scale-95 hover:shadow-lg dark:hover:shadow-green-500/25"
                >
                  <Upload className="w-5 h-5" />
                  <span className="whitespace-nowrap">{isRestoringBackup ? 'جاري الاستعادة...' : 'استعادة نسخة احتياطية'}</span>
                </button>
              </div>

              <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <div className="flex">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 ml-2" />
                  <div>
                    <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">تنبيه مهم</h4>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                      استعادة النسخة الاحتياطية ستستبدل جميع البيانات الحالية. تأكد من إنشاء نسخة احتياطية حديثة قبل الاستعادة.
                    </p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-2">
                      <strong>أنواع النسخ الاحتياطية:</strong>
                    </p>
                    <ul className="text-sm text-yellow-700 dark:text-yellow-300 mt-1 mr-4">
                      <li>• <strong>نسخة عادية (.db):</strong> قاعدة البيانات فقط - سريعة وحجم صغير</li>
                      <li>• <strong>نسخة مع صور (.zip):</strong> قاعدة البيانات + جميع الصور - حماية شاملة</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Auto Backup Settings - Hidden */}
          {false && (
            <div className="bg-card rounded-lg shadow border border-border">
              <div className="p-6 border-b border-border">
                <h3 className="text-lg font-medium text-foreground">النسخ الاحتياطية التلقائية</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  إعدادات النسخ الاحتياطية التلقائية
                </p>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-foreground">تفعيل النسخ التلقائية</label>
                    <p className="text-sm text-muted-foreground">إنشاء نسخ احتياطية تلقائياً حسب الجدولة المحددة</p>
                  </div>
                  <button
                    onClick={() => setAutoBackupEnabled(!autoBackupEnabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      autoBackupEnabled ? 'bg-primary' : 'bg-muted'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
                        autoBackupEnabled ? 'translate-x-1' : 'translate-x-6'
                      }`}
                    />
                  </button>
                </div>

                {autoBackupEnabled && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      تكرار النسخ الاحتياطية
                    </label>
                    <select
                      value={backupFrequency}
                      onChange={(e) => setBackupFrequency(e.target.value as 'daily' | 'weekly' | 'monthly')}
                      className="w-full p-2 border border-input bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="daily">يومياً</option>
                      <option value="weekly">أسبوعياً</option>
                      <option value="monthly">شهرياً</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Backup List */}
          <div className="bg-card dark:bg-gray-800 rounded-xl shadow-sm border border-border dark:border-gray-700">
            <div className="p-4 sm:p-6 border-b border-border dark:border-gray-700">
              <h3 className="text-lg sm:text-xl font-semibold text-foreground dark:text-white">النسخ الاحتياطية المحفوظة</h3>
              <p className="text-sm text-muted-foreground dark:text-gray-300 mt-1">
                قائمة بجميع النسخ الاحتياطية المتاحة - اضغط على أي نسخة لاستعادتها
              </p>
            </div>
            <div className="p-4 sm:p-6">
              {isLoading ? (
                <div className="text-center py-8">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto text-muted-foreground dark:text-gray-400" />
                  <p className="mt-2 text-muted-foreground dark:text-gray-300">جاري التحميل...</p>
                </div>
              ) : backups.length === 0 ? (
                <div className="text-center py-8">
                  <Database className="w-12 h-12 mx-auto text-muted-foreground dark:text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-foreground dark:text-white">لا توجد نسخ احتياطية</h3>
                  <p className="mt-1 text-sm text-muted-foreground dark:text-gray-300">ابدأ بإنشاء أول نسخة احتياطية</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                  {backups.map((backup, index) => (
                    <div
                      key={`${backup.name}-${index}`}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-border dark:border-gray-700 rounded-lg hover:bg-accent/50 dark:hover:bg-gray-700/50 cursor-pointer transition-all duration-200 group"
                      onClick={() => handleRestoreFromPath(backup.path)}
                    >
                      <div className="flex items-start space-x-3 space-x-reverse w-full">
                        <div className="p-2 bg-primary/10 dark:bg-blue-500/20 rounded-lg flex-shrink-0">
                          <Shield className="w-5 h-5 text-primary dark:text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <h4 className="text-sm font-medium text-foreground dark:text-white break-words">{backup.name}</h4>
                            {backup.isSqliteOnly && (
                              <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-400 rounded-full whitespace-nowrap">
                                SQLite
                              </span>
                            )}
                            {backup.includesImages && (
                              <span className="px-2 py-1 text-xs bg-green-100 dark:bg-green-500/20 text-green-800 dark:text-green-400 rounded-full flex items-center gap-1 whitespace-nowrap">
                                <Image className="w-3 h-3" />
                                مع صور
                              </span>
                            )}
                            {backup.isLegacy && (
                              <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-500/20 text-gray-800 dark:text-gray-400 rounded-full whitespace-nowrap">
                                قديم
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground dark:text-gray-300">
                            <span className="whitespace-nowrap">{formatBackupDate(backup.created_at)}</span>
                            <span className="whitespace-nowrap">{formatBackupSize(backup.size)}</span>
                            {backup.version && <span className="whitespace-nowrap">إصدار {backup.version}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 space-x-reverse mt-3 sm:mt-0 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRestoreFromPath(backup.path)
                          }}
                          className="p-2 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-500/20 rounded-lg transition-all duration-300 ease-in-out interactive-card min-h-[44px] min-w-[44px] flex items-center justify-center hover:scale-110 active:scale-95 hover:shadow-md"
                          title="استعادة"
                          aria-label="استعادة النسخة الاحتياطية"
                        >
                          <Upload className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setShowDeleteConfirm(backup.name)
                          }}
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-lg transition-all duration-300 ease-in-out interactive-card min-h-[44px] min-w-[44px] flex items-center justify-center hover:scale-110 active:scale-95 hover:shadow-md"
                          title="حذف"
                          type="button"
                          aria-label="حذف النسخة الاحتياطية"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Diagnostics Tab */}
      {activeTab === 'diagnostics' && (
        <div className="w-full h-full flex flex-col min-h-0">
          <div className="bg-card dark:bg-gray-800 rounded-xl shadow-sm border border-border dark:border-gray-700 flex-1 flex flex-col min-h-0">
            <div className="p-4 sm:p-6 border-b border-border dark:border-gray-700 flex-shrink-0">
              <h3 className="text-lg sm:text-xl font-semibold text-foreground dark:text-white">تشخيص النظام</h3>
              <p className="text-sm text-muted-foreground dark:text-gray-300 mt-1">
                فحص حالة قاعدة البيانات والنظام
              </p>
            </div>
            <div className="p-4 sm:p-6 flex-1 overflow-auto min-h-0">
              <DatabaseDiagnostics />
            </div>
          </div>
        </div>
      )}

      {/* Appearance Settings Tab */}
      {activeTab === 'appearance' && (
        <div className="space-y-6">
          <div className="bg-card dark:bg-slate-800 rounded-xl shadow-sm border border-border dark:border-slate-600">
            <div className="p-4 sm:p-6 border-b border-border dark:border-slate-600">
              <h3 className="text-lg sm:text-xl font-semibold text-foreground dark:text-slate-100">إعدادات المظهر</h3>
              <p className="text-sm text-muted-foreground dark:text-slate-300 mt-1">
                تخصيص مظهر التطبيق وفقاً لتفضيلاتك
              </p>
            </div>
            <div className="p-4 sm:p-6 space-y-6">
         
           
              {/* Dark Mode Toggle */}
              <div className="flex items-start sm:items-center justify-between gap-3 flex-col sm:flex-row">
                <div className="flex items-center space-x-3 space-x-reverse">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    {isDarkMode ? (
                      <Moon className="w-5 h-5 text-primary" />
                    ) : (
                      <Sun className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground dark:text-slate-100">الوضع المظلم</label>
                    <p className="text-sm text-muted-foreground dark:text-slate-300">
                      تبديل بين الوضع الفاتح والمظلم للتطبيق
                    </p>
                  </div>
                </div>
                <button
                  onClick={toggleDarkMode}
                  className={`pr-7 relative inline-flex h-6 w-12 items-center rounded-full transition-all duration-300 ${
                    isDarkMode ? 'bg-primary' : 'bg-blue-500'
                  } interactive-card focus:ring-2 focus:ring-primary/50 focus:ring-offset-2`}
                  aria-label={isDarkMode ? 'تفعيل الوضع الفاتح' : 'تفعيل الوضع المظلم'}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-background transition-all duration-300 shadow-sm ${
                      isDarkMode ? 'translate-x-1' : 'translate-x-6'
                    }`}
                  />
                </button>
              </div>

              {/* Theme Preview */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-foreground dark:text-white">معاينة المظهر</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Light Theme Preview */}
                  <div className="p-4 border border-border rounded-lg bg-background">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h5 className="text-sm font-medium text-foreground dark:text-white">
                          {isDarkMode ? 'الوضع المظلم' : 'الوضع الفاتح'}
                        </h5>
                        <div className="w-3 h-3 rounded-full bg-primary"></div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-2 bg-muted rounded"></div>
                        <div className="h-2 bg-muted rounded w-3/4"></div>
                        <div className="h-2 bg-muted rounded w-1/2"></div>
                      </div>
                      <div className="flex space-x-2 space-x-reverse">
                        <div className="w-8 h-6 bg-primary rounded text-xs"></div>
                        <div className="w-8 h-6 bg-secondary rounded text-xs"></div>
                      </div>
                    </div>
          
          
                  </div>
                  {/* Theme Info */}
                  <div className="p-4 border border-border dark:border-gray-700 rounded-lg bg-muted/50 dark:bg-gray-700/50">
                    <h5 className="text-sm font-medium text-foreground dark:text-white mb-2">مميزات المظهر</h5>
                    <ul className="text-sm text-muted-foreground dark:text-gray-300 space-y-1">
                      <li>• تحسين قراءة النصوص العربية</li>
                      <li>• ألوان مناسبة للتطبيقات الطبية</li>
                      <li>• حفظ تلقائي للتفضيلات</li>
                      <li>• تباين عالي للوضوح</li>
                    </ul>
                  </div>
                </div>
              </div>


            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Reminder Settings Tab */}
      {activeTab === 'whatsapp' && (
        <div className="space-y-6">
          
          <div className="bg-card dark:bg-gray-800 rounded-xl shadow-sm border border-border dark:border-gray-700">
            <div className="p-4 sm:p-6 border-b border-border dark:border-gray-700">
              <h3 className="text-lg sm:text-xl font-semibold text-foreground dark:text-white">إعدادات تذكير واتساب</h3>
              <p className="text-sm text-muted-foreground dark:text-gray-300 mt-1">
                إعدادات إرسال التذكيرات عبر واتساب قبل المواعيد
              </p>
            </div>
            <div className="p-6 space-y-6">
              {/* Enable Reminder Toggle */}
              <div className="flex items-start sm:items-center justify-between gap-3 flex-col sm:flex-row">
                <div className="flex items-center space-x-3 space-x-reverse">
                <div className="p-2 bg-primary/10 dark:bg-blue-500/20 rounded-lg">
                  <Phone className="w-5 h-5 text-primary dark:text-blue-400" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground dark:text-white">تفعيل التذكير</label>
                  <p className="text-sm text-muted-foreground dark:text-gray-300">
                    إرسال تذكيرات واتساب تلقائياً قبل المواعيد
                  </p>
                </div>
                </div>
                <Switch
                  checked={enableReminder}
                  onCheckedChange={(checked) => setEnableReminder(checked)}
                />
              </div>

              

              {/* Minutes Before Input */}
              <div className="space-y-2">
                <label htmlFor="minutesBefore" className="text-sm font-medium text-foreground">
                  عدد الدقائق قبل الموعد
                </label>
                <input
                  type="number"
                  id="minutesBefore"
                  min="0"
                  max="10080"
                  value={minutesBefore}
                  onChange={(e) => setMinutesBefore(Number(e.target.value))}
                  className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-300 ease-in-out hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md shadow-sm"
                />
                <div className="flex flex-wrap gap-3 mt-4 justify-start">
                  {[15, 30, 60, 120, 180, 720, 1440].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMinutesBefore(m)}
                      className={`px-4 py-2 text-sm font-medium rounded-full border-2 transition-all duration-300 ease-in-out transform hover:scale-105 active:scale-95 ${
                        minutesBefore === m
                          ? 'bg-blue-600 dark:bg-blue-600 text-white border-blue-600 dark:border-blue-600 shadow-lg shadow-blue-500/25'
                          : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-700 dark:hover:text-blue-300'
                      }`}
                    >
                      {m >= 60 ? `${m / 60} ساعة` : `${m} دقيقة`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Allow Custom Message Toggle */}
              <div className="flex items-start sm:items-center justify-between gap-3 flex-col sm:flex-row">
                <div>
                  <label className="text-sm font-medium text-foreground">تخصيص نص الرسالة</label>
                  <p className="text-sm text-muted-foreground">
                    تفعيل هذا الخيار للسماح بكتابة رسالة تذكير مخصصة. إذا كان معطلاً، سيتم استخدام رسالة موحدة.
                  </p>
                </div>
                <Switch
                  checked={allowCustomMessage}
                  onCheckedChange={(checked) => setAllowCustomMessage(checked)}
                />
              </div>

              {/* Message Text Textarea (Conditional) */}
              {allowCustomMessage && (
                <div className="space-y-2">
                  <label htmlFor="messageText" className="text-sm font-medium text-foreground">
                    نص الرسالة المخصصة
                  </label>
                  <textarea
                    id="messageText"
                    rows={4}
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="مرحبًا {{patient_name}}، تذكير بموعدك في عيادة الأسنان بتاريخ {{appointment_date}} الساعة {{appointment_time}}. نشكرك على التزامك."
                    className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-300 ease-in-out hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md shadow-sm"
                    ref={messageTextareaRef}
                  />
                  <p className="text-xs text-muted-foreground">
                    يمكنك استخدام متغيرات مثل: اسم المريض ({'{{patient_name}}'})، تاريخ الموعد ({'{{appointment_date}}'})، وقت الموعد ({'{{appointment_time}}'})
                  </p>
                  <div className="flex flex-wrap gap-3 justify-start">
                    <button
                      type="button"
                      onClick={() => insertTokenAtCursor('{{patient_name}}')}
                      className="px-4 py-2 text-sm font-medium bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-2 border-green-200 dark:border-green-700 rounded-full hover:bg-green-200 dark:hover:bg-green-900/30 hover:border-green-300 dark:hover:border-green-600 transition-all duration-300 ease-in-out transform hover:scale-105 active:scale-95 hover:shadow-md shadow-green-500/10"
                      title="إدراج اسم المريض"
                    >
                      اسم المريض
                    </button>
                    <button
                      type="button"
                      onClick={() => insertTokenAtCursor('{{appointment_date}}')}
                      className="px-4 py-2 text-sm font-medium bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-2 border-blue-200 dark:border-blue-700 rounded-full hover:bg-blue-200 dark:hover:bg-blue-900/30 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-300 ease-in-out transform hover:scale-105 active:scale-95 hover:shadow-md shadow-blue-500/10"
                      title="إدراج تاريخ الموعد"
                    >
                      تاريخ الموعد
                    </button>
                    <button
                      type="button"
                      onClick={() => insertTokenAtCursor('{{appointment_time}}')}
                      className="px-4 py-2 text-sm font-medium bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-2 border-purple-200 dark:border-purple-700 rounded-full hover:bg-purple-200 dark:hover:bg-purple-900/30 hover:border-purple-300 dark:hover:border-purple-600 transition-all duration-300 ease-in-out transform hover:scale-105 active:scale-95 hover:shadow-md shadow-purple-500/10"
                      title="إدراج وقت الموعد"
                    >
                      وقت الموعد
                    </button>
                  </div>
                </div>
              )}

          

              {/* WhatsApp Session Status */}
          

              {/* WhatsApp Connection Management (simplified) */}
              <div className="bg-card dark:bg-gray-800 rounded-xl shadow-sm border border-border dark:border-gray-700 mt-6">
                <div className="p-4 sm:p-6 border-b border-border dark:border-gray-700">
                  <h3 className="text-lg sm:text-xl font-semibold text-foreground dark:text-white">إدارة اتصال واتساب</h3>
                  <p className="text-sm text-muted-foreground dark:text-gray-300 mt-1">
                    إدارة حالة اتصال التطبيق مع واتساب.
                  </p>
                </div>
                <div className="p-6 space-y-4">
                  {/* QR Code Linking */}
                  <div className="p-4 border-2 border-primary/20 dark:border-blue-500/20 rounded-lg bg-primary/5 dark:bg-blue-500/10">
                    <div className="flex items-start md:items-center justify-between gap-4 flex-col md:flex-row">
                      <div className="flex-1">
                        <label className="text-base font-semibold text-foreground dark:text-white mb-2 block">🔗 ربط عبر رمز QR</label>
                        <p className="text-sm text-muted-foreground dark:text-gray-300">
                          ربط حساب واتساب الخاص بك عبر رمز QR لتفعيل التذكيرات.
                        </p>
                        <p className="text-xs text-muted-foreground dark:text-gray-400 mt-2">
                          اضغط لعرض رمز QR ومسحه بتطبيق واتساب على هاتفك. سيتم إعادة تهيئة الجلسة تلقائياً.
                        </p>
                      </div>
                      <button
                        onClick={async () => {
                          try {
                            setQrData('')
                            setShowQRModal(true)

                            // Use the IPC handler to generate new QR
                            try {

                              // Add detailed debugging for IPC call
                              console.log('🔍 Debug: Checking electronAPI availability:', {
                                hasElectronAPI: !!window.electronAPI,
                                hasWhatsappReminders: !!(window.electronAPI as any)?.whatsappReminders,
                                hasGenerateNewQR: !!(window.electronAPI as any)?.whatsappReminders?.generateNewQR,
                                generateNewQRType: typeof (window.electronAPI as any)?.whatsappReminders?.generateNewQR
                              })

                              const generateNewQRFunction = (window.electronAPI as any)?.whatsappReminders?.generateNewQR
                              if (!generateNewQRFunction) {
                                console.error('❌ generateNewQR function not available')
                                showNotification('خدمة توليد رمز QR غير متاحة', 'error')
                                return
                              }

                              let generateResult
                              try {
                                generateResult = await generateNewQRFunction()
                              } catch (ipcError: any) {
                                console.error('❌ IPC call failed:', ipcError)
                                console.error('❌ IPC error details:', {
                                  message: ipcError?.message,
                                  stack: ipcError?.stack,
                                  type: ipcError?.constructor?.name
                                })
                                throw ipcError
                              }

                              if (generateResult?.success) {
                                showNotification('تم بدء عملية توليد رمز QR جديد', 'info')

                                // Check for QR after generation with multiple attempts
                                let attempts = 0
                                const maxAttempts = 10
                                const checkForQr = async () => {
                                  attempts++
                                  try {
                                    // @ts-ignore
                                    const status = await window.electronAPI?.whatsappReminders?.getStatus?.()
                                    if (status?.qr && status.qr.trim() !== '') {
                                      setQrData(status.qr)
                                      showNotification('تم توليد رمز QR بنجاح!', 'success')
                                      return
                                    } else if (attempts < maxAttempts) {
                                      setTimeout(checkForQr, 1000)
                                    } else {
                                      showNotification('لم يتم توليد رمز QR. يرجى المحاولة مرة أخرى.', 'error')
                                    }
                                  } catch (statusError) {
                                    console.warn('Failed to check status after QR generation:', statusError)
                                    if (attempts < maxAttempts) {
                                      setTimeout(checkForQr, 1000)
                                    } else {
                                      showNotification('تعذر التحقق من حالة رمز QR', 'error')
                                    }
                                  }
                                }

                                setTimeout(checkForQr, 1500)
                              } else {
                                console.warn('⚠️ QR generation failed:', generateResult?.error || 'Unknown error')
                                const errorDetails = (generateResult as any)?.details

                                let errorMessage = 'فشل في توليد رمز QR'
                                if (generateResult?.error && generateResult.error !== 'Unknown error') {
                                  errorMessage += `: ${generateResult.error}`
                                } else if (errorDetails) {
                                  errorMessage += `: ${errorDetails.type}`
                                  if (errorDetails.code !== 'N/A') {
                                    errorMessage += ` (${errorDetails.code})`
                                  }
                                } else {
                                  errorMessage += `: خطأ غير معروف`
                                }

                                showNotification(errorMessage, 'error')

                                // Log detailed error for debugging
                                if (errorDetails) {
                                  console.error('📊 Detailed error info:', {
                                    type: errorDetails.type,
                                    code: errorDetails.code,
                                    stack: errorDetails.stack
                                  })
                                }

                                console.error('📊 Full generateResult object:', generateResult)
                              }
                            } catch (initError) {
                              console.error('❌ QR generation failed:', initError)
                              showNotification(`تعذر توليد رمز QR: ${(initError as any)?.message || 'خطأ غير معروف'}`, 'error')
                            }

                            showNotification('تم طلب رمز QR جديد. امسح الرمز على هاتفك.', 'info')
                          } catch (error) {
                            console.error('❌ Failed to start QR flow:', error)
                            showNotification('تعذر بدء عملية الربط عبر QR', 'error')
                          }
                        }}
                        className="px-8 py-4 bg-gradient-to-r from-green-500 to-green-600 dark:from-green-600 dark:to-green-700 text-white rounded-2xl hover:from-green-600 hover:to-green-700 dark:hover:from-green-700 dark:hover:to-green-800 transition-all duration-300 ease-in-out flex items-center justify-center space-x-3 space-x-reverse font-semibold shadow-xl hover:shadow-2xl focus:ring-4 focus:ring-green-500/30 focus:ring-offset-2 w-full md:w-auto hover:scale-105 active:scale-95 transform"
                      >
                        <Phone className="w-5 h-5" />
                        <span>ربط عبر QR</span>
                      </button>
                    </div>
                  </div>

                  {/* Reset WhatsApp Session */}
                  <div className="flex items-start sm:items-center justify-between gap-3 p-4 border border-border dark:border-gray-700 rounded-lg bg-muted/30 dark:bg-gray-700/50 flex-col sm:flex-row">
                    <div>
                      <label className="text-sm font-medium text-foreground dark:text-white">إعادة تهيئة اتصال واتساب</label>
                      <p className="text-xs text-muted-foreground dark:text-gray-300 mt-1">حذف الجلسة الحالية لإظهار رمز QR من جديد وإعادة الربط.</p>
                    </div>
                    <button
                      onClick={() => setConfirmDeleteQROpen(true)}
                      className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 dark:from-red-600 dark:to-red-700 text-white rounded-xl hover:from-red-600 hover:to-red-700 dark:hover:from-red-700 dark:hover:to-red-800 transition-all duration-300 ease-in-out w-full sm:w-auto hover:scale-105 active:scale-95 hover:shadow-xl shadow-red-500/20 focus:ring-4 focus:ring-red-500/30 focus:ring-offset-2 transform font-medium"
                    >
                      حذف جلسة الربط (QR)
                    </button>
                  </div>

             
                </div>
              </div>


            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Tab */}
      {activeTab === 'shortcuts' && (
        <div className="w-full h-full flex flex-col min-h-0">
          <div className="bg-card dark:bg-gray-800 rounded-xl shadow-sm border border-border dark:border-gray-700 flex-1 flex flex-col min-h-0">
            <div className="p-6 sm:p-8 flex-1 overflow-auto">
              <ElegantShortcutsDisplay />
            </div>
          </div>

          {/* Tips Section */}
          <div className="bg-card dark:bg-gray-800 rounded-xl shadow-sm border border-border dark:border-gray-700">
            <div className="p-4 sm:p-6 border-b border-border dark:border-gray-700">
              <h3 className="text-lg sm:text-xl font-semibold text-foreground dark:text-white">نصائح للاستخدام</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">الأحرف العربية</h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    يمكنك استخدام الأحرف العربية أو الإنجليزية للاختصارات. مثلاً: A أو ش لإضافة مريض جديد.
                  </p>
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                  <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">التنقل السريع</h4>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    استخدم الأرقام 0-9 أو ٠-٩ للتنقل السريع بين الصفحات المختلفة.
                  </p>
                </div>
                <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                  <h4 className="font-medium text-purple-800 dark:text-purple-200 mb-2">الإجراءات السريعة</h4>
                  <p className="text-sm text-purple-700 dark:text-purple-300">
                    استخدم A/S/D أو ش/س/ي لإضافة مريض أو موعد أو دفعة بسرعة.
                  </p>
                </div>
                <div className="p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                  <h4 className="font-medium text-orange-800 dark:text-orange-200 mb-2">العمليات العامة</h4>
                  <p className="text-sm text-orange-700 dark:text-orange-300">
                    F1 للإعدادات، R/ق للتحديث، F/ب للبحث، ESC للإغلاق.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Reset WhatsApp Session */}
      <AlertDialog open={confirmResetOpen} onOpenChange={setConfirmResetOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-destructive" />
              تأكيد حذف جلسة واتساب
            </AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف جلسة الربط الحالية؟ سيتم عرض رمز QR من جديد لإعادة الربط.
              <br />
              <strong className="text-destructive">تحذير: لا يمكن التراجع عن هذا الإجراء!</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse">
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={async () => {
                try {
                  const res = await window.electronAPI?.whatsappReminders?.resetSession?.()
                  if (res?.success) {
                    showNotification('تم حذف الجلسة بنجاح. سيظهر رمز QR لإعادة الربط.', 'success')
                  } else {
                    showNotification(res?.error || 'فشل في حذف الجلسة', 'error')
                  }
                } catch (error) {
                  console.error('Error resetting WhatsApp session:', error)
                  showNotification('حدث خطأ أثناء حذف الجلسة', 'error')
                }
              }}
            >
              <Trash2 className="w-4 h-4 ml-2" />
              تأكيد الحذف
            </AlertDialogAction>
            <AlertDialogCancel className="transition-all duration-200 interactive-card">
              إلغاء
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Delete WhatsApp QR Session */}
      <AlertDialog open={confirmDeleteQROpen} onOpenChange={setConfirmDeleteQROpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-destructive" />
              تأكيد حذف جلسة واتساب
            </AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف جلسة الربط الحالية؟ سيتم عرض رمز QR من جديد لإعادة الربط.
              <br />
              <strong className="text-destructive">تحذير: لا يمكن التراجع عن هذا الإجراء!</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse">
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={async () => {
                try {
                  const res = await window.electronAPI?.whatsappReminders?.resetSession?.()
                  if (res?.success) {
                    showNotification('تمت إعادة تهيئة جلسة واتساب بنجاح. قد تحتاج لإعادة ربط الحساب.', 'success')
                  } else {
                    showNotification(res?.error || 'فشل في إعادة تهيئة الجلسة', 'error')
                  }
                } catch (error) {
                  console.error('Failed to reset WhatsApp session:', error)
                  showNotification('حدث خطأ أثناء إعادة التهيئة', 'error')
                } finally {
                  setConfirmDeleteQROpen(false)
                }
              }}
            >
              <Trash2 className="w-4 h-4 ml-2" />
              تأكيد الحذف
            </AlertDialogAction>
            <AlertDialogCancel className="transition-all duration-200 interactive-card">
              إلغاء
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Security Settings Tab */}
      {activeTab === 'security' && (
        <SecuritySettings showNotification={showNotification} />
      )}

      {/* Clinic Settings Tab */}
      {activeTab === 'clinic' && (
        <div className="space-y-6">
          <div className="bg-card dark:bg-gray-800 rounded-xl shadow-sm border border-border dark:border-gray-700">
            <div className="p-4 sm:p-6 border-b border-border dark:border-gray-700">
              <h3 className="text-lg sm:text-xl font-semibold text-foreground dark:text-white">معلومات العيادة</h3>
              <p className="text-sm text-muted-foreground dark:text-gray-300 mt-1">
                إعدادات العيادة الأساسية والمعلومات التي تظهر في الإيصالات
              </p>
            </div>
            <div className="p-6">
              <form className="space-y-6" onSubmit={(e) => {
                e.preventDefault()
                const formData = new FormData(e.currentTarget)
                const clinicData = {
                  clinic_name: formData.get('clinic_name') as string,
                  doctor_name: formData.get('doctor_name') as string,
                  clinic_address: formData.get('clinic_address') as string,
                  clinic_phone: formData.get('clinic_phone') as string,
                  clinic_email: formData.get('clinic_email') as string,
                  currency: formData.get('currency') as string,
                }
                handleUpdateSettings(clinicData)
              }}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label htmlFor="clinic_name" className="text-sm font-medium text-foreground">
                      اسم العيادة *
                    </label>
                    <input
                      type="text"
                      id="clinic_name"
                      name="clinic_name"
                      defaultValue={settings?.clinic_name || ''}
                      className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-300 ease-in-out hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md shadow-sm"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="doctor_name" className="text-sm font-medium text-foreground">
                      اسم الدكتور *
                    </label>
                    <input
                      type="text"
                      id="doctor_name"
                      name="doctor_name"
                      defaultValue={settings?.doctor_name || ''}
                      placeholder="د. محمد أحمد"
                      className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-300 ease-in-out hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md shadow-sm"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="clinic_phone" className="text-sm font-medium text-foreground">
                      رقم الهاتف
                    </label>
                    <input
                      type="tel"
                      id="clinic_phone"
                      name="clinic_phone"
                      placeholder="96395 XXX XXXX"

                      defaultValue={settings?.clinic_phone || ''}
                      className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-300 ease-in-out hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md shadow-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="clinic_email" className="text-sm font-medium text-foreground">
                      البريد الإلكتروني
                    </label>
                    <input
                      type="email"
                      id="clinic_email"
                      name="clinic_email"
                      defaultValue={settings?.clinic_email || ''}
                      placeholder="clinic@example.com"
                      className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-300 ease-in-out hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md shadow-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="clinic_address" className="text-sm font-medium text-foreground">
                    عنوان العيادة
                  </label>
                  <textarea
                    id="clinic_address"
                    name="clinic_address"
                    defaultValue={settings?.clinic_address || ''}
                    placeholder="حلب، الجمهورية العربية السورية"
                    rows={3}
                    className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-300 ease-in-out hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md shadow-sm resize-none"
                  />
                </div>

                {/* Currency Selection */}
                <div className="space-y-2">
                  <label htmlFor="currency" className="text-sm font-medium text-foreground flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    العملة المستخدمة
                  </label>
                  <select
                    id="currency"
                    name="currency"
                    defaultValue={settings?.currency || currentCurrency || 'USD'}
                    className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-300 ease-in-out hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md shadow-sm"
                    onChange={(e) => {
                      // Update currency immediately when changed
                      setCurrency(e.target.value)
                    }}
                  >
                    {Object.entries(SUPPORTED_CURRENCIES)
                      .filter(([code]) => code === 'USD' || code === 'SYP')
                      .map(([code, config]) => (
                        <option key={code} value={code}>
                          {config.nameAr} ({config.symbol}) - {config.name}
                        </option>
                      ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    العملة المختارة ستظهر في جميع أنحاء التطبيق (المدفوعات، التقارير، الإحصائيات)
                  </p>
                </div>

                {/* Clinic Logo Section */}
                <div className="space-y-4 pt-4 border-t border-border">
                  <h4 className="text-sm font-medium text-foreground">شعار العيادة</h4>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    {/* Logo Preview */}
                    <div className="flex-shrink-0">
                      <div className="w-20 h-20 border-2 border-dashed border-border rounded-lg flex items-center justify-center bg-muted/50">
                        {localClinicLogo ? (
                          <img
                            src={localClinicLogo}
                            alt="شعار العيادة"
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <div className="text-center">
                            <div className="w-8 h-8 mx-auto mb-1 text-muted-foreground">
                              📷
                            </div>
                            <span className="text-xs text-muted-foreground">لا يوجد شعار</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Logo Upload */}
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                        <input
                          type="file"
                          id="clinic_logo"
                          accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                          className="hidden"
                          onChange={handleLogoUpload}
                        />
                        <button
                          type="button"
                          onClick={() => document.getElementById('clinic_logo')?.click()}
                          disabled={logoUploading}
                          className="px-3 py-2 text-sm border border-input bg-background text-foreground rounded-md hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 ease-in-out interactive-card w-full sm:w-auto hover:scale-105 active:scale-95 hover:shadow-md"
                        >
                          {logoUploading ? 'جاري الرفع...' : 'اختيار شعار'}
                        </button>
                        {localClinicLogo && (
                          <button
                            type="button"
                            onClick={() => handleUpdateSettings({ clinic_logo: '' })}
                            disabled={logoUploading}
                            className="px-3 py-2 text-sm border border-red-200 bg-red-50 text-red-700 rounded-md hover:bg-red-100 disabled:opacity-50 transition-all duration-300 ease-in-out interactive-card w-full sm:w-auto hover:scale-105 active:scale-95 hover:shadow-md"
                          >
                            حذف الشعار
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        يُفضل استخدام صورة مربعة بحجم 200x200 بكسل أو أكبر. الحد الأقصى لحجم الملف: 5 ميجابايت. الصيغ المدعومة: PNG, JPG, SVG
                      </p>
                      {logoError && (
                        <div className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded-md border border-red-200 dark:border-red-800">
                          {logoError}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-8 py-4 bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 text-white rounded-2xl hover:from-blue-600 hover:to-blue-700 dark:hover:from-blue-700 dark:hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 ease-in-out focus:ring-4 focus:ring-blue-500/30 focus:ring-offset-2 hover:scale-105 active:scale-95 hover:shadow-2xl shadow-xl transform font-semibold"
                  >
                    {isLoading ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
                  </button>
                </div>
              </form>
            </div>
          </div>

        

        </div>
      )}

      {/* Development Team Tab */}
      {activeTab === 'development' && (
        <div className="space-y-6">
          <div className="bg-card dark:bg-gray-800 rounded-xl shadow-sm border border-border dark:border-gray-700">
            <div className="p-4 sm:p-6 border-b border-border dark:border-gray-700">
              <h3 className="text-lg sm:text-xl font-semibold text-foreground dark:text-white">معلومات فريق التطوير</h3>
              <p className="text-sm text-muted-foreground dark:text-gray-300 mt-1">
                تواصل مع فريق التطوير للدعم الفني والاستفسارات
              </p>
            </div>
            <div className="p-6 space-y-6">
              {/* Team Name */}
              <div className="flex items-center space-x-4 space-x-reverse p-4 bg-muted/50 dark:bg-gray-700/50 rounded-lg">
                <div className="p-3 bg-primary/10 dark:bg-blue-500/20 rounded-lg">
                  <Users className="w-6 h-6 text-primary dark:text-blue-400" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-foreground dark:text-white">اسم الفريق</h4>
                  <p className="text-lg font-bold text-foreground dark:text-white">ORalSoft</p>
                  <p className="text-sm text-muted-foreground dark:text-gray-300">فريق تطوير تطبيقات إدارة العيادات</p>
                </div>
              </div>

              {/* Contact Phone */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-x-4 space-x-reverse p-4 bg-muted/50 dark:bg-gray-700/50 rounded-lg gap-4">
                <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg flex-shrink-0">
                  <Phone className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-foreground dark:text-white">رقم التواصل</h4>
                  <p className="text-lg font-bold text-foreground dark:text-white">00963938352132</p>
                  <p className="text-sm text-muted-foreground dark:text-gray-300">متاح للدعم الفني من 9 صباحاً إلى 6 مساءً</p>
                </div>
                <button
                  onClick={async () => {
                    const whatsappUrl = `https://api.whatsapp.com/send/?phone=963938352132`;

                    // Try multiple methods to open external URL
                    try {
                      // Method 1: Try electronAPI system.openExternal
                      if (window.electronAPI && window.electronAPI.system && window.electronAPI.system.openExternal) {
                        await window.electronAPI.system.openExternal(whatsappUrl);
                        return;
                      }
                    } catch (error) {
                      console.log('Method 1 failed:', error);
                    }

                    try {
                      // Method 2: Try direct shell.openExternal via ipcRenderer
                      if (window.electronAPI) {
                        // @ts-ignore
                        await window.electronAPI.shell?.openExternal?.(whatsappUrl);
                        return;
                      }
                    } catch (error) {
                      console.log('Method 2 failed:', error);
                    }

                    // Method 3: Fallback to window.open
                    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
                  }}
                  className="px-4 py-2 bg-green-600 dark:bg-green-600 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-700 transition-all duration-300 ease-in-out interactive-card w-full sm:w-auto hover:scale-105 active:scale-95 hover:shadow-lg dark:hover:shadow-green-500/25"
                >
                  تواصل عبر واتساب
                </button>
              </div>

              {/* Contact Email */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-x-4 space-x-reverse p-4 bg-muted/50 dark:bg-gray-700/50 rounded-lg gap-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex-shrink-0">
                  <Mail className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-foreground dark:text-white">البريد الإلكتروني</h4>
                  <p className="text-lg font-bold text-foreground dark:text-white">ORalSoft24@gmail.com</p>
                  <p className="text-sm text-muted-foreground dark:text-gray-300">للاستفسارات والدعم الفني</p>
                </div>
                <button
                  onClick={() => window.open('mailto:ORalSoft24@gmail.com البريد', '_blank')}
                  className="px-4 py-2 bg-blue-600 dark:bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-700 transition-all duration-300 ease-in-out interactive-card w-full sm:w-auto hover:scale-105 active:scale-95 hover:shadow-lg dark:hover:shadow-blue-500/25"
                >
                  إرسال إيميل
                </button>
              </div>

              {/* Facebook Contact */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-x-4 space-x-reverse p-4 bg-muted/50 dark:bg-gray-700/50 rounded-lg gap-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex-shrink-0">
                  <Facebook className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-foreground dark:text-white">صفحة الفيسبوك</h4>
                  <p className="text-lg font-bold text-foreground dark:text-white">ORalSoft</p>
                  <p className="text-sm text-muted-foreground dark:text-gray-300">تابعنا للحصول على آخر التحديثات والأخبار</p>
                </div>
                <button
                  onClick={() => {
                    const facebookUrl = 'https://www.facebook.com/people/ORalSoft/100082266005063/?rdid=kZwmucsShbQVaBdv&share_url=https%253A%252F%252Fwww.facebook.com%252Fshare%252F1EhsuXSbaZ%252F';
                    
                    // Try multiple methods to open external URL
                    try {
                      // Method 1: Try electronAPI system.openExternal
                      if (window.electronAPI && window.electronAPI.system && window.electronAPI.system.openExternal) {
                        window.electronAPI.system.openExternal(facebookUrl);
                        return;
                      }
                    } catch (error) {
                      console.log('Method 1 failed:', error);
                    }

                    try {
                      // Method 2: Try direct shell.openExternal via ipcRenderer
                      if (window.electronAPI) {
                        // @ts-ignore
                        window.electronAPI.shell?.openExternal?.(facebookUrl);
                        return;
                      }
                    } catch (error) {
                      console.log('Method 2 failed:', error);
                    }

                    // Method 3: Fallback to window.open
                    window.open(facebookUrl, '_blank', 'noopener,noreferrer');
                  }}
                  className="px-4 py-2 bg-blue-600 dark:bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-700 transition-all duration-300 ease-in-out interactive-card w-full sm:w-auto hover:scale-105 active:scale-95 hover:shadow-lg dark:hover:shadow-blue-500/25"
                >
                  زيارة الصفحة
                </button>
              </div>

              {/* Additional Info */}
              <div className="p-4 bg-primary/5 dark:bg-blue-500/10 border border-primary/20 dark:border-blue-500/20 rounded-lg">
                <div className="flex items-start space-x-3 space-x-reverse">
                  <div className="p-2 bg-primary/10 dark:bg-blue-500/20 rounded-lg">
                    <Info className="w-5 h-5 text-primary dark:text-blue-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-foreground dark:text-white mb-2">معلومات إضافية</h4>
                    <ul className="text-sm text-muted-foreground dark:text-gray-300 space-y-1">
                      <li>• نقدم دعماً فنياً شاملاً لجميع مستخدمي التطبيق</li>
                      <li>• نستقبل اقتراحاتكم لتطوير وتحسين التطبيق</li>
                      <li>• نوفر تدريباً مجانياً على استخدام التطبيق</li>
                      <li>• نضمن الاستجابة السريعة لجميع الاستفسارات</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowDeleteConfirm(null)}
            style={{ zIndex: 9998 }}
          />

          {/* Dialog */}
          <div
            className="relative bg-card border border-border rounded-lg shadow-2xl max-w-md w-full mx-4"
            style={{ zIndex: 10000 }}
            dir="rtl"
          >
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0 w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center ml-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">تأكيد الحذف</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    هل أنت متأكد من حذف هذه النسخة الاحتياطية؟
                  </p>
                </div>
              </div>

              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
                <div className="flex">
                  <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 ml-2 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-red-800 dark:text-red-200 font-medium">
                      تحذير: لا يمكن التراجع عن هذا الإجراء
                    </p>
                    <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                      سيتم حذف النسخة الاحتياطية "{showDeleteConfirm}" نهائياً من النظام.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 space-x-reverse">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="px-4 py-2 border border-input bg-background text-foreground rounded-lg hover:bg-accent transition-all duration-300 ease-in-out interactive-card hover:scale-105 active:scale-95 hover:shadow-md"
                >
                  إلغاء
                </button>
                <button
                  onClick={() => handleDeleteBackup(showDeleteConfirm)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-300 ease-in-out interactive-card focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 hover:scale-105 active:scale-95 hover:shadow-lg dark:hover:shadow-red-500/25"
                >
                  تأكيد الحذف
                </button>
              </div>
            </div>
          </div>
        </div>
      )}



      {/* WhatsApp QR Modal */}
      {showQRModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowQRModal(false)} />
          <div className="relative bg-card/95 border border-border rounded-2xl shadow-2xl max-w-2xl w-full mx-4" dir="rtl">
            <div className="p-6 sm:p-8 space-y-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-foreground">ربط واتساب عبر رمز QR</h3>
                  <p className="text-sm text-muted-foreground mt-1">افتح واتساب على هاتفك → الإعدادات → الأجهزة المرتبطة → ربط جهاز.</p>
                </div>
                <button onClick={() => setShowQRModal(false)} className="px-2 py-1 text-sm text-muted-foreground hover:text-foreground transition-all duration-300 ease-in-out interactive-card rounded-lg hover:scale-110 active:scale-95 hover:bg-gray-100 dark:hover:bg-gray-700">✕</button>
              </div>
              <div className="flex items-center justify-center p-4 bg-white border border-border rounded-xl min-h-[512px]">
                {qrData && qrData.trim() !== '' ? (
                  qrSvg ? (
                    <div className="relative">
                      <div
                        aria-label="WhatsApp QR Code"
                        style={{ width: 512, height: 512, lineHeight: 0, shapeRendering: 'crispEdges' as any }}
                        className="block rounded-md shadow-xl select-none"
                        dangerouslySetInnerHTML={{ __html: qrSvg }}
                      />
                      {qrData.length > 0 && (
                        <div className="absolute -bottom-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                          ✓ صالح
                        </div>
                      )}
                    </div>
                  ) : qrImageUrl ? (
                    <div className="relative">
                      <img
                        alt="WhatsApp QR Code"
                        src={qrImageUrl}
                        width={512}
                        height={512}
                        style={{ imageRendering: 'pixelated' as any }}
                        className="block w-[512px] h-[512px] rounded-md shadow-xl select-none"
                        onError={(e) => {
                          console.error('❌ QR image failed to load:', e)
                          console.error('Image URL:', qrImageUrl.substring(0, 100) + '...')
                          showNotification('فشل في تحميل صورة رمز QR', 'error')
                        }}
                        onLoad={() => {
                          console.log('✅ QR image loaded successfully')
                        }}
                      />
                      {qrData.length > 0 && (
                        <div className="absolute -bottom-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                          ✓ صالح
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      <div className="text-sm text-muted-foreground">جاري توليد رمز QR...</div>
                    </div>
                  )
                ) : (
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                      <svg className="w-8 h-8 text-muted-foreground" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                      </svg>
                    </div>
                    <div className="text-sm text-muted-foreground">جاري انتظار رمز QR...</div>
                    <div className="text-xs text-muted-foreground">اضغط على "ربط عبر QR" لبدء العملية</div>
                  </div>
                )}
              </div>
              <ul className="text-xs text-muted-foreground list-disc pr-5 space-y-1">
                <li>إذا لم يتعرف واتساب على الرمز، اضبط سطوع الشاشة وتجنب الانعكاسات.</li>
                <li>إن لم يظهر الرمز خلال ثوانٍ، اضغط إعادة توليد.</li>
              </ul>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowQRModal(false)} className="px-4 py-2 border border-input rounded-lg transition-all duration-300 ease-in-out interactive-card hover:scale-105 active:scale-95 hover:shadow-md">إغلاق</button>
                <button
                  onClick={async () => {
                    try {
                      setQrData('')
                      console.log('🔄 Regenerating QR code...')

                      // Use the IPC handler to generate new QR
                      // @ts-ignore
                      const generateResult = await window.electronAPI?.whatsappReminders?.generateNewQR?.()

                      if (generateResult?.success) {
                        console.log('✅ QR regeneration initiated successfully')
                        showNotification('تم بدء عملية إعادة توليد رمز QR', 'info')

                        // Check for new QR with multiple attempts
                        let attempts = 0
                        const maxAttempts = 8
                        const checkForQr = async () => {
                          attempts++
                          try {
                            // @ts-ignore
                            const status = await window.electronAPI?.whatsappReminders?.getStatus?.()
                            if (status?.qr && status.qr.trim() !== '') {
                              console.log('🔍 New QR found after regeneration attempt', attempts)
                              setQrData(status.qr)
                              showNotification('تم إعادة توليد رمز QR بنجاح!', 'success')
                              return
                            } else if (attempts < maxAttempts) {
                              console.log('📱 No QR found, retrying... (attempt', attempts, 'of', maxAttempts, ')')
                              setTimeout(checkForQr, 1500)
                            } else {
                              console.log('📱 No QR found after', maxAttempts, 'regeneration attempts')
                              showNotification('لم يتم إعادة توليد رمز QR. يرجى المحاولة مرة أخرى.', 'error')
                            }
                          } catch (statusError) {
                            console.warn('Failed to check status after regeneration:', statusError)
                            if (attempts < maxAttempts) {
                              setTimeout(checkForQr, 1500)
                            } else {
                              showNotification('تعذر التحقق من حالة رمز QR', 'error')
                            }
                          }
                        }

                        setTimeout(checkForQr, 2000)
                      } else {
                        console.warn('⚠️ QR regeneration failed:', generateResult?.error || 'Unknown error')
                        const errorDetails = (generateResult as any)?.details

                        let errorMessage = 'فشل في إعادة توليد رمز QR'
                        if (generateResult?.error && generateResult.error !== 'Unknown error') {
                          errorMessage += `: ${generateResult.error}`
                        } else if (errorDetails) {
                          errorMessage += `: ${errorDetails.type}`
                          if (errorDetails.code !== 'N/A') {
                            errorMessage += ` (${errorDetails.code})`
                          }
                        } else {
                          errorMessage += `: خطأ غير معروف`
                        }

                        showNotification(errorMessage, 'error')

                        // Log detailed error for debugging
                        if (errorDetails) {
                          console.error('📊 Regeneration detailed error info:', {
                            type: errorDetails.type,
                            code: errorDetails.code,
                            stack: errorDetails.stack
                          })
                        }

                        console.error('📊 Full regeneration generateResult object:', generateResult)
                      }
                    } catch (error) {
                      console.error('Error regenerating QR:', error)
                      showNotification(`حدث خطأ أثناء إعادة توليد رمز QR: ${(error as any)?.message || 'خطأ غير معروف'}`, 'error')
                    }
                  }}
                  className="px-4 py-2 bg-primary text-white rounded-lg shadow-sm hover:bg-primary/90 transition-all duration-300 ease-in-out interactive-card hover:scale-105 active:scale-95 hover:shadow-lg dark:hover:shadow-blue-500/25"
                >
                  إعادة توليد QR
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notification */}
      {notification.show && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 ${
          notification.type === 'success'
            ? 'bg-green-500 text-white'
            : notification.type === 'error'
            ? 'bg-red-500 text-white'
            : 'bg-blue-500 text-white'
        }`}>
          <div className="flex items-center space-x-2 space-x-reverse">
            <span className="text-lg">
              {notification.type === 'success' ? '✅' : notification.type === 'error' ? '❌' : 'ℹ️'}
            </span>
            <span>{notification.message}</span>
          </div>
        </div>
      )}
    </div>
  </div>
</div>
  )
}