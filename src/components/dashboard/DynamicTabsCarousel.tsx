import React, { useState, useCallback, useMemo, memo, lazy, Suspense, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Calendar,
  BarChart3,
  Bell,
  ChevronLeft,
  ChevronRight,
  Zap
} from 'lucide-react'

// Lazy load heavy components
const QuickAccessDashboard = lazy(() => import('@/components/globalThis/QuickAccessDashboard'))
const SmartAlerts = lazy(() => import('@/components/globalThis/SmartAlerts'))
const DashboardAnalytics = lazy(() => import('@/components/dashboard/DashboardAnalytics'))

interface DynamicTabsCarouselProps {
  onNavigateToPatients?: () => void
  onNavigateToAppointments?: () => void
  onNavigateToPayments?: () => void
  onNavigateToTreatments?: () => void
  onAddPatient?: () => void
  onAddAppointment?: () => void
  onAddPayment?: () => void
}

const DynamicTabsCarousel = memo(function DynamicTabsCarousel({
  onNavigateToPatients,
  onNavigateToAppointments,
  onNavigateToPayments,
  onNavigateToTreatments,
  onAddPatient,
  onAddAppointment,
  onAddPayment
}: DynamicTabsCarouselProps) {
  const [activeTab, setActiveTab] = useState('today')
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)

  // Refs for logging
  const containerRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50

  const tabs = useMemo(() => [
    {
      id: 'today',
      title: 'اليوم',
      icon: Calendar,
      color: 'text-primary dark:text-blue-400',
      bgColor: 'bg-primary/10 dark:bg-blue-500/20'
    },
    {
      id: 'statistics',
      title: 'إحصائيات',
      icon: BarChart3,
      color: 'text-accent dark:text-green-400',
      bgColor: 'bg-accent/10 dark:bg-green-500/20'
    },
    {
      id: 'alerts',
      title: 'تنبيهات',
      icon: Bell,
      color: 'text-destructive dark:text-red-400',
      bgColor: 'bg-destructive/10 dark:bg-red-500/20'
    }
  ], [])

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }, [])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }, [])

  const onTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) return

    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    if (isLeftSwipe || isRightSwipe) {
      const currentIndex = tabs.findIndex(tab => tab.id === activeTab)
      let newIndex

      if (isLeftSwipe) {
        newIndex = currentIndex === tabs.length - 1 ? 0 : currentIndex + 1
      } else {
        newIndex = currentIndex === 0 ? tabs.length - 1 : currentIndex - 1
      }

      handleTabChange(tabs[newIndex].id)
    }
  }, [touchStart, touchEnd, tabs, activeTab])

  // Enhanced performance and responsive behavior tracking
  useEffect(() => {
    let resizeTimeout: NodeJS.Timeout

    const handleResize = () => {
      clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(() => {
      }, 250)
    }

    window.addEventListener('resize', handleResize, { passive: true })

    return () => {
      clearTimeout(resizeTimeout)
      window.removeEventListener('resize', handleResize)
    }
  }, [activeTab])

  const handleTabChange = useCallback((tabId: string) => {
    if (isTransitioning) return

    setIsTransitioning(true)
    setTimeout(() => {
      setActiveTab(tabId)
      setIsTransitioning(false)
    }, 150)
  }, [isTransitioning])

  const navigateTab = useCallback((direction: 'prev' | 'next') => {
    const currentIndex = tabs.findIndex(tab => tab.id === activeTab)
    let newIndex

    if (direction === 'next') {
      newIndex = currentIndex === tabs.length - 1 ? 0 : currentIndex + 1
    } else {
      newIndex = currentIndex === 0 ? tabs.length - 1 : currentIndex - 1
    }

    // Direct tab switching for touch navigation
    setIsTransitioning(true)
    setTimeout(() => {
      setActiveTab(tabs[newIndex].id)
      setIsTransitioning(false)
    }, 150)
  }, [tabs, activeTab, handleTabChange])

  const activeTabData = useMemo(() => tabs.find(tab => tab.id === activeTab), [tabs, activeTab])

  const renderTabContent = useMemo(() => {
    switch (activeTab) {
      case 'today':
        return (
          <div className={`h-full transition-all duration-300 ease-out ${isTransitioning ? 'opacity-0 transform translate-x-4' : 'opacity-100 transform translate-x-0'}`}>
            <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary dark:border-blue-400"></div></div>}>
              <QuickAccessDashboard
                onNavigateToPatients={onNavigateToPatients}
                onNavigateToAppointments={onNavigateToAppointments}
                onNavigateToPayments={onNavigateToPayments}
                onNavigateToTreatments={onNavigateToTreatments}
                onAddPatient={onAddPatient}
                onAddAppointment={onAddAppointment}
                onAddPayment={onAddPayment}
              />
            </Suspense>
          </div>
        )
      case 'statistics':
        return (
          <div className={`h-full transition-all duration-300 ease-out ${isTransitioning ? 'opacity-0 transform scale-95' : 'opacity-100 transform scale-100'}`}>
            <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent dark:border-green-400"></div></div>}>
              <DashboardAnalytics />
            </Suspense>
          </div>
        )
      case 'alerts':
        return (
          <div className={`h-full transition-all duration-300 ease-out ${isTransitioning ? 'opacity-0 transform translate-y-4' : 'opacity-100 transform translate-y-0'}`}>
            <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-destructive dark:border-red-400"></div></div>}>
              <SmartAlerts
                maxVisible={25}
                showHeader={true}
                compact={false}
                showReadAlerts={true}
              />
            </Suspense>
          </div>
        )
      default:
        return null
    }
  }, [activeTab, isTransitioning, onNavigateToPatients, onNavigateToAppointments, onNavigateToPayments, onNavigateToTreatments, onAddPatient, onAddAppointment, onAddPayment])

  const renderStart = performance.now()

  return (
    <div
      ref={containerRef}
      className="h-full flex flex-col rounded-xl shadow-xl dark:shadow-2xl overflow-hidden backdrop-blur-sm flex-1 min-h-0 performance-optimized tab-content-performance active gpu-accelerated"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        contain: 'layout style paint',
        willChange: 'auto',
        contentVisibility: 'visible'
      }}
    >
      {/* Enhanced Tab Navigation Header */}
      <div ref={headerRef} className="bg-muted/30 p-6 md:p-8 lg:p-10 shadow-2xl dark:border-gray-600 backdrop-blur-sm transition-colors duration-200" style={{ userSelect: 'none' }}>
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <div className="flex items-center gap-4 md:gap-6">
            {activeTabData && (
              <div className={`p-2 md:p-3 rounded-lg md:rounded-xl ${activeTabData.bgColor} shadow-sm`}>
                <activeTabData.icon className={`w-5 h-5 md:w-6 md:h-6 ${activeTabData.color}`} />
              </div>
            )}
            <div className="space-y-1">
              <h2 className="text-fluid-2xl font-bold text-foreground dark:text-white font-tajawal">
                {activeTabData?.title}
              </h2>
              <p className="text-fluid-sm text-muted-foreground dark:text-gray-300">
                {activeTab === 'today' && 'الأنشطة والمواعيد اليومية'}
                {activeTab === 'statistics' && 'تحليلات وإحصائيات شاملة'}
                {activeTab === 'alerts' && 'التنبيهات والإشعارات المهمة'}
              </p>
            </div>
          </div>

          {/* Enhanced Navigation Buttons */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateTab('prev')}
              disabled={isTransitioning}
              className="nav-btn-interactive bg-background dark:bg-gray-800 hover:bg-accent dark:hover:bg-gray-700 hover:border-primary/50 dark:hover:border-blue-500/50 border-border dark:border-gray-600 shadow-sm backdrop-blur-sm"
              aria-label="التبويب السابق"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateTab('next')}
              disabled={isTransitioning}
              className="nav-btn-interactive bg-background dark:bg-gray-800 hover:bg-accent dark:hover:bg-gray-700 hover:border-primary/50 dark:hover:border-blue-500/50 border-border dark:border-gray-600 shadow-sm backdrop-blur-sm"
              aria-label="التبويب التالي"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Enhanced Tab Indicators */}
        <div className="flex items-center justify-center gap-3 md:gap-4" role="tablist" aria-label="أشرطة التبويب">
          {tabs.map((tab, index) => {
            const Icon = tab.icon
            const isActive = tab.id === activeTab

            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                onClick={() => handleTabChange(tab.id)}
                disabled={isTransitioning}
                role="tab"
                aria-selected={isActive}
                aria-controls={`tabpanel-${tab.id}`}
                aria-label={tab.title}
                tabIndex={isActive ? 0 : -1}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowLeft') {
                    e.preventDefault()
                    navigateTab('prev')
                  } else if (e.key === 'ArrowRight') {
                    e.preventDefault()
                    navigateTab('next')
                  } else if (e.key === 'Home') {
                    e.preventDefault()
                    handleTabChange(tabs[0].id)
                  } else if (e.key === 'End') {
                    e.preventDefault()
                    handleTabChange(tabs[tabs.length - 1].id)
                  } else if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleTabChange(tab.id)
                  }
                }}
                className={`flex items-center gap-3 px-4 md:px-6 py-3 md:py-4 rounded-lg md:rounded-xl shadow-sm tab-interactive ${
                  isActive
                    ? `bg-background dark:bg-gray-700 shadow-md dark:shadow-lg ${tab.color} font-semibold ring-2 ring-offset-2 ring-current ring-opacity-20 active`
                    : 'bg-muted dark:bg-gray-600 hover:bg-accent dark:hover:bg-gray-500 hover:border-primary/30 dark:hover:border-blue-500/30 text-foreground dark:text-gray-300 hover:shadow-md backdrop-blur-sm focus:bg-accent dark:focus:bg-gray-500 focus:border-primary/30 dark:focus:border-blue-500/30'
                }`}
              >
                <Icon className={`w-4 h-4 md:w-5 md:h-5 ${isActive ? '' : 'text-muted-foreground dark:text-gray-400'}`} aria-hidden="true" />
                <span className={`text-fluid-sm ${isActive ? 'text-foreground dark:text-white' : 'text-foreground dark:text-gray-300'}`}>{tab.title}</span>
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-current rounded-full animate-pulse" aria-hidden="true" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Content Area */}
      <div ref={contentRef} className="flex-1 overflow-hidden relative min-h-0" role="tabpanel" id={`tabpanel-${activeTab}`} aria-labelledby={`tab-${activeTab}`} style={{
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column'
      }}>
        {renderTabContent}

        {/* Loading overlay */}
        {isTransitioning && (
          <div className="absolute inset-0 bg-background/50 dark:bg-gray-900/50 flex items-center justify-center z-10">
            <div className="flex items-center gap-2 text-foreground dark:text-white">
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              <span className="text-foreground dark:text-white">جاري التحميل...</span>
            </div>
          </div>
        )}
      </div>

      {/* Performance tracking - only in development */}
    </div>
  )
})

export default DynamicTabsCarousel