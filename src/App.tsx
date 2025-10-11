import React, { useState, useEffect, useCallback, Suspense } from 'react'
import { usePatientStore } from './store/patientStore'
import { useAppointmentStore } from './store/appointmentStore'
import { useSettingsStore } from './store/settingsStore'
import { ThemeProvider } from './contexts/ThemeContext'
import { CurrencyProvider } from './contexts/CurrencyContext'
import { useRealTimeSync } from './hooks/useRealTimeSync'
import { useRealTimeTableSync } from './hooks/useRealTimeTableSync'
import { useAuth } from './hooks/useAuth'
import { useLicense } from './hooks/useLicense'
import { enhanceKeyboardEvent } from '@/utils/arabicKeyboardMapping'
import logger from './utils/logger'
import SplashScreen from './components/SplashScreen'
import LoginScreen from './components/auth/LoginScreen'
import LicenseEntryScreen from './components/auth/LicenseEntryScreen'
import AddPatientDialog from './components/patients/AddPatientDialog'
import ConfirmDeleteDialog from './components/ConfirmDeleteDialog'
import AddAppointmentDialog from './components/AddAppointmentDialog'
import AddPaymentDialog from './components/payments/AddPaymentDialog'
import PageLoading from './components/ui/PageLoading'
import ErrorBoundary from './components/ErrorBoundary'
import ThemeToggle from './components/ThemeToggle'
import { useTreatmentNames } from './hooks/useTreatmentNames' // Import useTreatmentNames hook

// Lazy load heavy page components with optimized chunk loading
const PaymentsPage = React.lazy(() => import('./pages/Payments'))
const SettingsPage = React.lazy(() => import('./pages/Settings'))
const InventoryPage = React.lazy(() => import('./pages/Inventory'))
const ReportsPage = React.lazy(() => import('./pages/Reports'))
const EnhancedDashboard = React.lazy(() => import('./pages/EnhancedDashboard'))
const PatientsPage = React.lazy(() => import('./pages/Patients'))
const AppointmentsPage = React.lazy(() => import('./pages/Appointments'))
const Labs = React.lazy(() => import('./pages/Labs'))
const Medications = React.lazy(() => import('./pages/Medications'))
const DentalTreatments = React.lazy(() => import('./pages/DentalTreatments'))
const ClinicNeeds = React.lazy(() => import('./pages/ClinicNeeds'))
const Expenses = React.lazy(() => import('./pages/Expenses'))
const ExternalEstimate = React.lazy(() => import('./pages/ExternalEstimate'))
const ProductionBackup = React.lazy(() => import('./pages/ProductionBackup'))

// Preload critical components for faster navigation
const preloadComponent = (importFn: () => Promise<any>) => {
  // Start loading the component in the background
  const promise = importFn()
  return promise
}

// Preload commonly used components
const preloadCriticalComponents = () => {
  setTimeout(() => {
    preloadComponent(() => import('./pages/Patients'))
    preloadComponent(() => import('./pages/Appointments'))
    preloadComponent(() => import('./pages/Dashboard'))
  }, 2000) // Preload after 2 seconds to not interfere with initial load
}
import { AppSidebar } from './components/AppSidebar'
import LiveDateTime from './components/LiveDateTime'
import PaymentPasswordModal from './components/payments/PaymentPasswordModal'
import PasswordResetModal from './components/payments/PasswordResetModal'
import PasswordSetupModal from './components/payments/PasswordSetupModal'
import { isPasswordSet } from './utils/paymentSecurity'

// Reports password protection components
import ReportsPasswordModal from './components/reports/ReportsPasswordModal'
import ReportsPasswordResetModal from './components/reports/ReportsPasswordResetModal'
import ReportsPasswordSetupModal from './components/reports/ReportsPasswordSetupModal'
import { isPasswordSet as isReportsPasswordSet } from './utils/reportsSecurity'

// shadcn/ui imports
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { Toaster } from '@/components/ui/toaster'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger
} from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

import { Search } from 'lucide-react'
import { Appointment } from './types'
import './App.css'
import './styles/globals.css'

// Lazy load GlobalSearch component
const GlobalSearch = React.lazy(() => import('@/components/globalThis/GlobalSearch'))

function AppContent() {
  // ALL HOOKS MUST BE CALLED IN THE SAME ORDER EVERY TIME
  // This prevents "Rendered more hooks than during the previous render" error

  // Theme and UI hooks (always first)
  const { toast } = useToast()

  // Authentication and license hooks
  const { isAuthenticated, isLoading: authLoading, passwordEnabled, login } = useAuth()
  const {
    isLicenseValid,
    isFirstRun,
    isLoading: licenseLoading,
    error: licenseError,
    machineInfo,
    activateLicense
  } = useLicense()
  // Custom hooks (always in same order)
  useRealTimeSync()
  useRealTimeTableSync()
  useTreatmentNames()

  // Store hooks (always in same order)
  const { loadPatients, patients } = usePatientStore()
  const {
    isLoading: appointmentsLoading,
    loadAppointments,
    createAppointment,
    updateAppointment,
    deleteAppointment
  } = useAppointmentStore()
  const { loadSettings } = useSettingsStore()

  // State hooks (always in same order)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [showAddPatient, setShowAddPatient] = useState(false)
  const [showAddPayment, setShowAddPayment] = useState(false)
  const [loginLoading, setLoginLoading] = useState(false)
  const [showPaymentPasswordModal, setShowPaymentPasswordModal] = useState(false)
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false)
  const [showPasswordSetupModal, setShowPasswordSetupModal] = useState(false)
  const [isPaymentsAuthenticated, setIsPaymentsAuthenticated] = useState(false)
  const [showReportsPasswordModal, setShowReportsPasswordModal] = useState(false)
  const [showReportsPasswordResetModal, setShowReportsPasswordResetModal] = useState(false)
  const [showReportsPasswordSetupModal, setShowReportsPasswordSetupModal] = useState(false)
  const [isReportsAuthenticated, setIsReportsAuthenticated] = useState(false)
  const [showGlobalSearch, setShowGlobalSearch] = useState(false)
  const [showDiagnostics, setShowDiagnostics] = useState(false)
  const [showSplash, setShowSplash] = useState(true)

  // Appointment states
  const [showAddAppointment, setShowAddAppointment] = useState(false)
  const [showEditAppointment, setShowEditAppointment] = useState(false)
  const [showDeleteAppointmentConfirm, setShowDeleteAppointmentConfirm] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)

  // Callback hooks
  const handleSearchResultSelect = useCallback((result: any) => {
    logger.search('Search result selected:', result)

    // Navigate to appropriate tab based on result type
    switch (result.type) {
      case 'patient':
        setActiveTab('patients')
        break
      case 'appointment':
        setActiveTab('appointments')
        break
      case 'payment':
        handleTabChange('payments')
        break
      case 'treatment':
        setActiveTab('dental-treatments')
        break
      case 'prescription':
        setActiveTab('medications')
        break
      default:
        // Default to dashboard if type is unknown
        setActiveTab('dashboard')
        break
    }

    // Close the search overlay
    setShowGlobalSearch(false)
  }, [])

  // Custom tab change handler with optional password protection
  const handleTabChange = (tab: string) => {
    if (tab === 'payments') {
      if (isPasswordSet()) {
        // Password is set, check if already authenticated
        if (!isPaymentsAuthenticated) {
          setShowPaymentPasswordModal(true)
        } else {
          setActiveTab('payments')
        }
      } else {
        // No password set, allow direct access
        setActiveTab('payments')
      }
    } else if (tab === 'reports') {
      if (isReportsPasswordSet()) {
        // Password is set, check if already authenticated
        if (!isReportsAuthenticated) {
          setShowReportsPasswordModal(true)
        } else {
          setActiveTab('reports')
        }
      } else {
        // No password set, allow direct access
        setActiveTab('reports')
      }
    } else {
      // Reset payments authentication when switching away
      if (isPaymentsAuthenticated) {
        setIsPaymentsAuthenticated(false)
      }
      // Reset reports authentication when switching away
      if (isReportsAuthenticated) {
        setIsReportsAuthenticated(false)
      }
      setActiveTab(tab)
    }
  }

  // Effect hooks (all grouped together)
  useEffect(() => {
    logger.start('App component mounted')

    // Check if electronAPI is available
    if (typeof window !== 'undefined') {
      logger.system('electronAPI available:', !!window.electronAPI)
      logger.system('window.electron available:', !!window.electron)
    }

    // Preload critical components for faster navigation
    preloadCriticalComponents()

    return () => {
      logger.stop('App component unmounting')
    }
  }, [])

  // Setup keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // تجاهل الاختصارات إذا كان المستخدم يكتب في input أو textarea
      // إلا إذا كان يستخدم Ctrl أو Alt
      const target = event.target as HTMLElement
      const isTyping = (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true' ||
        target.getAttribute('type') === 'number' ||
        target.closest('[data-prevent-shortcuts="true"]') ||
        target.closest('[data-no-global-shortcuts="true"]') ||
        target.hasAttribute('data-prevent-shortcuts') ||
        target.hasAttribute('data-no-global-shortcuts')
      )

      // تجاهل الاختصارات إذا كان Ctrl مضغوطاً (ما عدا F1)
      if (event.ctrlKey && event.key !== 'F1') {
        return
      }

      // السماح بالاختصارات المهمة حتى أثناء الكتابة
      const isImportantShortcut = event.altKey

      if (isTyping && !isImportantShortcut) {
        // تسجيل للتشخيص
        logger.debug('Ignoring shortcut for typing element:', {
          key: event.key,
          tagName: target.tagName,
          hasPreventAttr: target.hasAttribute('data-prevent-shortcuts'),
          hasNoGlobalAttr: target.hasAttribute('data-no-global-shortcuts')
        })
        return
      }

      // استخدام الدالة المحسنة لمعالجة أحداث لوحة المفاتيح
      const enhanced = enhanceKeyboardEvent(event)

      // Use a switch statement for cleaner and potentially faster shortcut handling
      switch (enhanced.mappedKey.toLowerCase()) {
        case '0':
          enhanced.preventDefault()
          setActiveTab('dashboard')
          break
        case '1':
          enhanced.preventDefault()
          setActiveTab('patients')
          break
        case '2':
          enhanced.preventDefault()
          setActiveTab('appointments')
          break
        case '3':
          enhanced.preventDefault()
          handleTabChange('payments')
          break
        case '4':
          enhanced.preventDefault()
          setActiveTab('labs')
          break
        case '5':
          enhanced.preventDefault()
          setActiveTab('dental-treatments')
          break
        case '6':
          enhanced.preventDefault()
          setActiveTab('expenses')
          break
        case '7':
          enhanced.preventDefault()
          setActiveTab('reports')
          break
        case '8':
          enhanced.preventDefault()
          setActiveTab('production-backup')
          break
        case '9':
          enhanced.preventDefault()
          setActiveTab('settings')
          break
        case 'a': // Quick actions
          enhanced.preventDefault()
          logger.ui('Shortcut A/ش pressed - Opening Add Patient dialog')
          setShowAddPatient(true)
          break
        case 's':
          enhanced.preventDefault()
          logger.ui('Shortcut S/س pressed - Opening Add Appointment dialog')
          setShowAddAppointment(true)
          break
        case 'd':
          enhanced.preventDefault()
          logger.ui('Shortcut D/ي pressed - Opening Add Payment dialog')
          setShowAddPayment(true)
          break
        case 'r': // Refresh
          enhanced.preventDefault()
          logger.ui('Shortcut R/ق pressed - Triggering data refresh')
          // Instead of full page reload, trigger a more targeted data refresh
          // This would typically involve calling load functions from your Zustand stores
          loadSettings(); // Example: Refresh settings
          loadPatients(); // Example: Refresh patients data
          loadAppointments(); // Example: Refresh appointments data
          // Add other data loading/refresh calls as needed for the current active tab
          break
        case 'f': // Search
          enhanced.preventDefault()
          logger.ui('Shortcut F/ب pressed - Opening global search')
          setShowGlobalSearch(true)
          break
        case 'F1': // Open Settings (F1 is handled directly by event.key)
          event.preventDefault()
          logger.ui('Opening Settings')
          setActiveTab('settings')
          break
        case 'F12': // F12 diagnostic shortcut (handled separately due to Electron dev tools)
          event.preventDefault()
          setShowDiagnostics(true)
          break
      }
    }

    // Always add/remove event listener to maintain consistent hook order
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleTabChange, loadSettings, loadPatients, loadAppointments]) // Added dependencies for refresh functions

  // F12 diagnostic shortcut (moved into the main handleKeyDown for consistency and to avoid double handling)
  // Removed separate useEffect for F12, as it's now part of the main handler

  // Handle successful payment authentication
  const handlePaymentAuthSuccess = () => {
    setIsPaymentsAuthenticated(true)
    setActiveTab('payments')
  }

  // Handle password setup success
  const handlePasswordSetupSuccess = () => {
    setIsPaymentsAuthenticated(true)
    setActiveTab('payments')
  }

  // Handle password reset success
  const handlePasswordResetSuccess = () => {
    setShowPasswordResetModal(false)
    // After reset, user needs to authenticate again
    setTimeout(() => {
      setShowPaymentPasswordModal(true)
    }, 500)
  }

  // Handle successful reports authentication
  const handleReportsAuthSuccess = () => {
    setIsReportsAuthenticated(true)
    setActiveTab('reports')
  }

  // Handle reports password setup success
  const handleReportsPasswordSetupSuccess = () => {
    setIsReportsAuthenticated(true)
    setActiveTab('reports')
  }

  // Handle reports password reset success
  const handleReportsPasswordResetSuccess = () => {
    setShowReportsPasswordResetModal(false)
    // After reset, user needs to authenticate again
    setTimeout(() => {
      setShowReportsPasswordModal(true)
    }, 500)
  }

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    toast({
      title: type === 'success' ? 'نجح' : 'خطأ',
      description: message,
      variant: type === 'error' ? 'destructive' : 'default',
    })
  }

  // Store hooks moved to top level to ensure consistent hook order


  useEffect(() => {
    // Initialize app only if both license is valid AND authenticated
    const initializeApp = async () => {
      if (isLicenseValid && isAuthenticated) {
        logger.time('App Data Initialization')
        logger.start('Initializing app with valid license and authentication')

        // Stage 1: Load critical settings first (non-blocking for UI)
        logger.time('Settings Loading')
        await loadSettings().then(() => {
          logger.timeEnd('Settings Loading')
        }).catch(error => {
          logger.error('Settings loading failed:', error)
        })

        // Stage 2: Load data progressively (without fixed delays)
        logger.time('Patients Loading')
        loadPatients().then(() => {
          logger.timeEnd('Patients Loading')
        }).catch(error => {
          logger.error('Patients loading failed:', error)
        })

        logger.time('Appointments Loading')
        loadAppointments().then(() => {
          logger.timeEnd('Appointments Loading')
          logger.timeEnd('App Data Initialization')
        }).catch(error => {
          logger.error('Appointments loading failed:', error)
        })
      } else {
        logger.loading('Waiting for license validation and authentication before initializing app')
      }
    }

    initializeApp()
  }, [isLicenseValid, isAuthenticated, loadPatients, loadAppointments, loadSettings])

  const handleLogin = async (password: string): Promise<boolean> => {
    setLoginLoading(true)
    try {
      const success = await login(password)
      return success
    } finally {
      setLoginLoading(false)
    }
  }

  const handleLicenseActivation = async (licenseKey: string): Promise<{ success: boolean; error?: string }> => {
    try {
      logger.license('Handling license activation...')
      const result = await activateLicense(licenseKey)

      if (result.success) {
        logger.success('License activated successfully')
        toast({
          title: 'نجح التفعيل',
          description: 'تم تفعيل الترخيص بنجاح',
          variant: 'default',
        })
      } else {
        logger.failure('License activation failed:', result.error)
        toast({
          title: 'فشل التفعيل',
          description: result.error || 'فشل في تفعيل الترخيص',
          variant: 'destructive',
        })
      }

      return result
    } catch (error) {
      logger.error('License activation error:', error)
      const errorMessage = 'حدث خطأ أثناء تفعيل الترخيص'
      toast({
        title: 'خطأ',
        description: errorMessage,
        variant: 'destructive',
      })
      return {
        success: false,
        error: errorMessage
      }
    }
  }

  // Show splash screen on first load only
  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} duration={6000} />
  }

  // Show loading screen while checking license or auth status
  if (licenseLoading || authLoading) {
    return (
      <div className="min-h-screen bg-background dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground dark:text-gray-300">
            {licenseLoading ? 'جاري التحقق من الترخيص...' : 'جاري التحميل...'}
          </p>
          <p className="text-sm text-muted-foreground dark:text-gray-400 mt-2">
            إذا استمر هذا التحميل، حاول إعادة تشغيل التطبيق
          </p>
        </div>
      </div>
    )
  }

  // Show error screen if there's a license error
  if (licenseError && !isFirstRun) {
    return (
      <div className="min-h-screen bg-background dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-500 dark:text-red-400 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold mb-2 dark:text-white">خطأ في الترخيص</h2>
          <p className="text-muted-foreground dark:text-gray-300 mb-4">{licenseError}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-primary text-primary-foreground px-4 py-2 rounded hover:bg-primary/90 dark:bg-blue-600 dark:hover:bg-blue-700"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    )
  }

  // Diagnostic screen state - now moved to top level hooks section

  // F12 diagnostic shortcut moved to top level hooks section

  if (showDiagnostics) {
    return (
      <div className="min-h-screen bg-background dark:bg-gray-900 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-6 dark:text-white">تشخيص التطبيق</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card dark:bg-gray-800 p-4 rounded-lg">
              <h2 className="text-lg font-semibold mb-3 dark:text-white">حالة التطبيق</h2>
              <div className="space-y-2">
                <p className="dark:text-gray-300">ترخيص صالح: {isLicenseValid ? '✅' : '❌'}</p>
                <p className="dark:text-gray-300">مصادق عليه: {isAuthenticated ? '✅' : '❌'}</p>
                <p className="dark:text-gray-300">كلمة مرور مطلوبة: {passwordEnabled ? '✅' : '❌'}</p>
                <p className="dark:text-gray-300">أول تشغيل: {isFirstRun ? '✅' : '❌'}</p>
              </div>
            </div>
            <div className="bg-card dark:bg-gray-800 p-4 rounded-lg">
              <h2 className="text-lg font-semibold mb-3 dark:text-white">واجهات API</h2>
              <div className="space-y-2">
                <p className="dark:text-gray-300">electronAPI متوفر: {!!window.electronAPI ? '✅' : '❌'}</p>
                <p className="dark:text-gray-300">electron متوفر: {!!window.electron ? '✅' : '❌'}</p>
                <p className="dark:text-gray-300">window.electronAPI.patients: {!!window.electronAPI?.patients ? '✅' : '❌'}</p>
              </div>
            </div>
          </div>
          <div className="mt-6">
            <button
              onClick={() => setShowDiagnostics(false)}
              className="bg-primary text-primary-foreground px-4 py-2 rounded hover:bg-primary/90 dark:bg-blue-600 dark:hover:bg-blue-700"
            >
              إغلاق التشخيص
            </button>
          </div>
        </div>
      </div>
    )
  }

  // CRITICAL: Show license entry screen if license is invalid or first run
  // This must come BEFORE authentication check to ensure license is validated first
  if (!isLicenseValid || isFirstRun) {
    return (
      <LicenseEntryScreen
        onActivate={handleLicenseActivation}
        isLoading={licenseLoading}
        machineInfo={machineInfo || undefined}
      />
    )
  }

  // Show login screen if password is enabled and user is not authenticated
  // This only shows AFTER license is validated
  if (passwordEnabled && !isAuthenticated) {
    return <LoginScreen onLogin={handleLogin} isLoading={loginLoading} />
  }







  // Appointment handlers
  const handleConfirmDeleteAppointment = async () => {
    if (selectedAppointment) {
      try {
        await deleteAppointment(selectedAppointment.id)
        setShowDeleteAppointmentConfirm(false)
        setSelectedAppointment(null)
        logger.success('Appointment deleted successfully')
        showNotification("تم حذف الموعد بنجاح", "success")
      } catch (error) {
        logger.error('Error deleting appointment:', error)
        showNotification("فشل في حذف الموعد. يرجى المحاولة مرة أخرى", "error")
      }
    }
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'patients':
        return <PatientsPage onNavigateToTreatments={setActiveTab} onNavigateToPayments={setActiveTab} />;
      case 'appointments':
        return <AppointmentsPage />;
      case 'payments':
        return <PaymentsPage />;
      case 'inventory':
        return <InventoryPage />;
      case 'labs':
        return <Labs />;
      case 'medications':
        return <Medications />;
      case 'dental-treatments':
        return <DentalTreatments />;
      case 'clinic-needs':
        return <ClinicNeeds />;
      case 'expenses':
        return <Expenses />;
      case 'reports':
        return <ReportsPage />;
      case 'external-estimate':
        return <ExternalEstimate />;
      case 'production-backup':
        return <ProductionBackup />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <EnhancedDashboard
          onNavigateToPatients={() => setActiveTab('patients')}
          onNavigateToAppointments={() => setActiveTab('appointments')}
          onNavigateToPayments={() => setActiveTab('payments')}
          onNavigateToTreatments={() => setActiveTab('dental-treatments')}
          onAddPatient={() => setShowAddPatient(true)}
          onAddAppointment={() => setShowAddAppointment(true)}
          onAddPayment={() => setShowAddPayment(true)}
        />;
    }
  };

  // Get current page title
  const getCurrentPageTitle = () => {
    const pageMap = {
      dashboard: 'لوحة التحكم',
      patients: 'المرضى',
      appointments: 'المواعيد',
      payments: 'المدفوعات',
      inventory: 'المخزون',
      labs: 'المختبرات',
      medications: 'الأدوية والوصفات',
      'dental-treatments': 'العلاجات السنية',
      'clinic-needs': 'احتياجات العيادة',
      'expenses': 'مصروفات العيادة',
      reports: 'التقارير',
      'external-estimate': 'فاتورة تقديرية خارجية',
      settings: 'الإعدادات'
    }
    return pageMap[activeTab as keyof typeof pageMap] || 'لوحة التحكم'
  }

  return (
    <SidebarProvider>
      <div className="flex w-full group/sidebar-layout h-screen min-h-screen">
        <AppSidebar 
          activeTab={activeTab} 
          onTabChange={handleTabChange} 
        />
        <SidebarInset 
          className="flex-1"
        >
     <header className="flex flex-row-reverse items-center justify-between h-16 w-full bg-background/95 backdrop-blur border-b border-border/40 dark:bg-gray-900/95 dark:border-gray-700 px-4 gap-4" dir="rtl">

      {/* ✅ Right Side - التاريخ والساعة */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground dark:text-gray-300 bg-accent/20 dark:bg-gray-700/50 px-4 py-1 rounded-full font-mono">
        <LiveDateTime />
      </div>



      {/* ✅ Left Side - البحث والتنقل والإعدادات */}
      <div className="flex flex-row-reverse items-center gap-4">



        {/* زر الوضع الليلي */}
        <ThemeToggle />
        {/* فاصل بصري */}
        <Separator orientation="vertical" className="h-6 dark:bg-gray-600" />

        {/* البحث الشامل */}
        <div className="relative w-64 max-w-xs">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground dark:text-gray-400 w-5 h-5" />
          <Input
            placeholder="بحث شامل... (F)"
            className="pr-10 pl-4 py-2 bg-slate-50 dark:bg-gray-800 dark:border-gray-600 border border-border rounded-lg shadow-sm dark:shadow-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent cursor-pointer text-right dark:text-white"
            readOnly
            onClick={() => setShowGlobalSearch(true)}
            aria-label="البحث الشامل"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                setShowGlobalSearch(true)
              }
            }}
          />
          <span
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground dark:text-gray-300 bg-background/70 dark:bg-gray-800/70 px-2 py-0.5 rounded"
            aria-hidden="true"
          >
            F
          </span>
        </div>

        {/* المسار (Breadcrumb) */}
        <Breadcrumb>
          <BreadcrumbList className="flex flex-row-reverse items-center">
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink
                href="#"
                className="text-muted-foreground dark:text-gray-300 hover:text-foreground dark:hover:text-white transition-colors duration-200"
              >
                🦷 نظام إدارة العيادة السنية
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage className="font-semibold text-sky-600 dark:text-blue-400">
                {getCurrentPageTitle()}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
  {/* زر القائمة الجانبية */}
        <SidebarTrigger />
      </div>
    </header>
          <div className="flex flex-1 flex-col gap-6 p-12 pt-6 max-w-full overflow-hidden relative rtl-layout dark:bg-gray-900">
            <div className="w-full max-w-none content-wrapper">
              <ErrorBoundary>
                <Suspense fallback={<PageLoading message="جاري تحميل الصفحة..." />}>
                  {renderContent()}
                </Suspense>
              </ErrorBoundary>
            </div>


          </div>
        </SidebarInset>
      </div>
      {/* Dialogs */}

      {/* Add Patient Dialog */}
      <AddPatientDialog
        open={showAddPatient}
        onOpenChange={setShowAddPatient}
      />

      {/* Add Appointment Dialog */}
      <AddAppointmentDialog
        isOpen={showAddAppointment}
        onClose={() => setShowAddAppointment(false)}
        onSave={async (appointmentData) => {
          try {
            await createAppointment(appointmentData)
            setShowAddAppointment(false)
            logger.success('New appointment created successfully')
            showNotification("تم إضافة الموعد الجديد بنجاح", "success")
          } catch (error) {
            logger.error('Error creating appointment:', error)
            showNotification("فشل في إضافة الموعد. يرجى المحاولة مرة أخرى", "error")
          }
        }}
        patients={patients}
        treatments={[]} // Will be loaded from treatments store later
      />

      {/* Edit Appointment Dialog */}
      {showEditAppointment && selectedAppointment && (
        <AddAppointmentDialog
          isOpen={showEditAppointment}
          onClose={() => {
            setShowEditAppointment(false)
            setSelectedAppointment(null)
          }}
          onSave={async (appointmentData) => {
            try {
              await updateAppointment(selectedAppointment.id, appointmentData)
              setShowEditAppointment(false)
              setSelectedAppointment(null)
              logger.success('Appointment updated successfully')
              showNotification("تم تحديث الموعد بنجاح", "success")
            } catch (error) {
              logger.error('Error updating appointment:', error)
              showNotification("فشل في تحديث الموعد. يرجى المحاولة مرة أخرى", "error")
            }
          }}
          patients={patients}
          treatments={[]}
          initialData={selectedAppointment}
        />
      )}

      {/* Delete Appointment Confirmation Dialog */}
      {showDeleteAppointmentConfirm && selectedAppointment && (
        <ConfirmDeleteDialog
          isOpen={showDeleteAppointmentConfirm}
          patient={null}
          appointment={selectedAppointment}
          onClose={() => {
            setShowDeleteAppointmentConfirm(false)
            setSelectedAppointment(null)
          }}
          onConfirm={handleConfirmDeleteAppointment}
          isLoading={appointmentsLoading}
        />
      )}

      {/* Add Payment Dialog */}
      <AddPaymentDialog
        open={showAddPayment}
        onOpenChange={setShowAddPayment}
      />



        {/* Password Protection Modals - Payments */}
        <PaymentPasswordModal
          isOpen={showPaymentPasswordModal}
          onClose={() => setShowPaymentPasswordModal(false)}
          onSuccess={handlePaymentAuthSuccess}
          onForgotPassword={() => {
            setShowPaymentPasswordModal(false)
            setShowPasswordResetModal(true)
          }}
        />

        <PasswordResetModal
          isOpen={showPasswordResetModal}
          onClose={() => setShowPasswordResetModal(false)}
          onSuccess={handlePasswordResetSuccess}
        />

        <PasswordSetupModal
          isOpen={showPasswordSetupModal}
          onClose={() => setShowPasswordSetupModal(false)}
          onSuccess={handlePasswordSetupSuccess}
        />

        {/* Password Protection Modals - Reports */}
        <ReportsPasswordModal
          isOpen={showReportsPasswordModal}
          onClose={() => setShowReportsPasswordModal(false)}
          onSuccess={handleReportsAuthSuccess}
          onForgotPassword={() => {
            setShowReportsPasswordModal(false)
            setShowReportsPasswordResetModal(true)
          }}
        />

        <ReportsPasswordResetModal
          isOpen={showReportsPasswordResetModal}
          onClose={() => setShowReportsPasswordResetModal(false)}
          onSuccess={handleReportsPasswordResetSuccess}
        />

        <ReportsPasswordSetupModal
          isOpen={showReportsPasswordSetupModal}
          onClose={() => setShowReportsPasswordSetupModal(false)}
          onSuccess={handleReportsPasswordSetupSuccess}
        />

        {/* Global Search Overlay */}
        {showGlobalSearch && (
          <div className="fixed inset-0 bg-black/50 dark:bg-gray-900/50 z-50 flex items-start justify-center pt-24">
            <div className="w-full max-w-2xl mx-4">
              <Suspense fallback={<div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 dark:border-blue-400"></div></div>}>
                <GlobalSearch
                  onResultSelect={handleSearchResultSelect}
                  onClose={() => setShowGlobalSearch(false)}
                  autoFocus={true}
                />
              </Suspense>
            </div>
          </div>
        )}

        <Toaster />
      </SidebarProvider>
    );
  }

function App() {
  return (
    <ThemeProvider>
      <CurrencyProvider>
        <AppContent />
      </CurrencyProvider>
    </ThemeProvider>
  );
}


export default App;