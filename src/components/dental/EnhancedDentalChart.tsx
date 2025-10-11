import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { useDentalTreatmentStore } from '@/store/dentalTreatmentStore'
import { useTheme } from '@/contexts/ThemeContext'
import { getToothInfo, PERMANENT_TEETH_DATA, PRIMARY_TEETH_DATA, TREATMENT_CATEGORIES, getTreatmentByValue, TREATMENT_STATUS_OPTIONS } from '@/data/teethData'
import { ToothTreatment } from '@/types'
import { cn } from '@/lib/utils'
import { Layers, Activity, CheckCircle, Clock, AlertCircle } from 'lucide-react'

interface EnhancedDentalChartProps {
  patientId: string
  onToothClick: (toothNumber: number, isCtrlPressed?: boolean) => void
  selectedTooth?: number | null
  selectedTeeth?: number[]
  isMultiSelectMode?: boolean
  className?: string
  isPrimaryTeeth?: boolean
  onPrimaryTeethChange?: (isPrimary: boolean) => void
}

export default function EnhancedDentalChart({
  patientId,
  onToothClick,
  selectedTooth,
  selectedTeeth = [],
  isMultiSelectMode = false,
  className,
  isPrimaryTeeth: externalIsPrimaryTeeth = false,
  onPrimaryTeethChange
}: EnhancedDentalChartProps) {
  const {
    toothTreatments,
    toothTreatmentImages,
    loadToothTreatmentsByPatient,
    loadToothTreatmentImagesByTooth,
    loadAllToothTreatmentImagesByPatient
  } = useDentalTreatmentStore()
  const { isDarkMode } = useTheme()
  const [hoveredTooth, setHoveredTooth] = useState<number | null>(null)
  const [internalIsPrimaryTeeth, setInternalIsPrimaryTeeth] = useState(false)
  const [forceUpdate, setForceUpdate] = useState(0)

  // Use external state if provided, otherwise use internal state
  const isPrimaryTeeth = onPrimaryTeethChange ? externalIsPrimaryTeeth : internalIsPrimaryTeeth
  const setIsPrimaryTeeth = onPrimaryTeethChange || setInternalIsPrimaryTeeth

  useEffect(() => {
    if (patientId) {
      loadToothTreatmentsByPatient(patientId)
      // Load all images for this patient at once
      loadAllToothTreatmentImagesByPatient(patientId)
    }
  }, [patientId, loadToothTreatmentsByPatient, loadAllToothTreatmentImagesByPatient])

  // Function to force immediate data reload and UI update
  const forceDataReload = async () => {
    if (patientId) {
      // تم إزالة console.log لتقليل الرسائل
      await Promise.all([
        loadToothTreatmentsByPatient(patientId),
        loadAllToothTreatmentImagesByPatient(patientId)
      ])
      setForceUpdate(prev => prev + 1)
    }
  }

  // Expose forceDataReload to window for debugging
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).forceToothColorUpdate = forceDataReload
      (window as any).triggerToothColorUpdate = () => {
        window.dispatchEvent(new CustomEvent('tooth-color-update', {
          detail: { type: 'manual-trigger', timestamp: Date.now() }
        }))
      }
    }
  }, [patientId])

  // Force re-render when images change to update counters
  useEffect(() => {
    // This effect will trigger re-render when toothTreatmentImages changes
    // ensuring that image counters are updated
  }, [toothTreatmentImages])

  // Force re-render when treatments change to update colors
  useEffect(() => {
    // This effect will trigger re-render when toothTreatments changes
    // ensuring that tooth colors are updated immediately
    setForceUpdate(prev => prev + 1)
  }, [toothTreatments])

  // Additional effect to force update when treatment status changes
  useEffect(() => {
    // Listen for treatment updates and force re-render
    const handleTreatmentUpdate = () => {
      setForceUpdate(prev => prev + 1)
    }

    // Listen for tooth color updates specifically
    const handleToothColorUpdate = async (event: any) => {
      // تم إزالة console.log لتقليل الرسائل عند تمرير الماوس
      await forceDataReload()
    }

    window.addEventListener('treatment-updated', handleTreatmentUpdate)
    window.addEventListener('treatment-changed', handleTreatmentUpdate)
    window.addEventListener('tooth-color-update', handleToothColorUpdate)
    window.addEventListener('treatments-loaded', handleTreatmentUpdate)

    return () => {
      window.removeEventListener('treatment-updated', handleTreatmentUpdate)
      window.removeEventListener('treatment-changed', handleTreatmentUpdate)
      window.removeEventListener('tooth-color-update', handleToothColorUpdate)
      window.removeEventListener('treatments-loaded', handleTreatmentUpdate)
    }
  }, [patientId])

  // Get teeth data based on primary/permanent selection
  const teethData = isPrimaryTeeth ? PRIMARY_TEETH_DATA : PERMANENT_TEETH_DATA
  const upperTeeth = teethData.filter(tooth => tooth.position === 'upper')
  const lowerTeeth = teethData.filter(tooth => tooth.position === 'lower')

  // Get treatments for a specific tooth
  const getToothTreatments = (toothNumber: number): ToothTreatment[] => {
    const treatments = toothTreatments.filter(
      t => t.patient_id === patientId && t.tooth_number === toothNumber
    ).sort((a, b) => a.priority - b.priority)

    // تم إزالة console.log لتقليل الرسائل عند تمرير الماوس

    return treatments
  }

  // Get primary color for a tooth (based on highest priority active treatment)
  const getToothPrimaryColor = (toothNumber: number): string => {
    const treatments = getToothTreatments(toothNumber)

    if (treatments.length === 0) {
      return '#22c55e' // Default healthy color
    }

    // Check if all treatments are completed - if so, return healthy color
    const allCompleted = treatments.every(t => t.treatment_status === 'completed')

    if (allCompleted) {
      return '#22c55e' // Return healthy color when all treatments are completed
    }

    // Prioritize in-progress treatments first, then planned treatments
    const activeTreatment = treatments.find(t =>
      t.treatment_status === 'in_progress'
    ) || treatments.find(t =>
      t.treatment_status === 'planned'
    ) || treatments[0]

    return activeTreatment?.treatment_color || '#22c55e'
  }

  // Get treatment status summary for a tooth
  const getToothSummary = (toothNumber: number) => {
    const treatments = getToothTreatments(toothNumber)
    const total = treatments.length
    const completed = treatments.filter(t => t.treatment_status === 'completed').length
    const inProgress = treatments.filter(t => t.treatment_status === 'in_progress').length
    const planned = treatments.filter(t => t.treatment_status === 'planned').length

    return { total, completed, inProgress, planned, treatments }
  }

  // Get images count for specific tooth
  const getToothImagesCount = (toothNumber: number): number => {
    if (!patientId) return 0

    const filteredImages = toothTreatmentImages.filter(img =>
      img.tooth_number === toothNumber &&
      img.patient_id === patientId
    )

    return filteredImages.length
  }

  // Reload images for a specific tooth (useful after delete/add operations)
  const reloadToothImages = async (toothNumber: number) => {
    if (patientId) {
      await loadToothTreatmentImagesByTooth(patientId, toothNumber)
    }
  }

  // Reload all images for the current patient
  const reloadAllImages = async () => {
    if (patientId) {
      await loadAllToothTreatmentImagesByPatient(patientId)
    }
  }

  // Note: reloadAllImages function is available for internal use

  // Render individual tooth
  const renderTooth = (toothNumber: number) => {
    const toothInfo = getToothInfo(toothNumber, isPrimaryTeeth)
    const summary = getToothSummary(toothNumber)
    const primaryColor = getToothPrimaryColor(toothNumber)
    const imagesCount = getToothImagesCount(toothNumber)
    const isSelected = selectedTooth === toothNumber
    const isMultiSelected = selectedTeeth.includes(toothNumber)
    const isHovered = hoveredTooth === toothNumber

    if (!toothInfo) return null

    return (
      <Tooltip key={toothNumber}>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "relative h-16 w-16 p-1 transition-all duration-200 border-2 overflow-hidden",
              "flex flex-col items-center justify-center text-xs font-medium",
              isSelected && "ring-2 ring-blue-500 ring-offset-2",
              isMultiSelected && "ring-2 ring-orange-500 ring-offset-2 border-orange-400",
              isHovered && "scale-105 shadow-lg"
            )}
            style={{
              borderColor: primaryColor,
              color: '#000000',
              textShadow: '0 0 2px rgba(255,255,255,0.8)'
            }}
            onClick={(e) => {
              const isCtrlPressed = e.ctrlKey || e.metaKey
              onToothClick(toothNumber, isCtrlPressed)
            }}
            onMouseEnter={() => setHoveredTooth(toothNumber)}
            onMouseLeave={() => setHoveredTooth(null)}
          >
            {/* Background with treatment colors covering the entire button */}
            <div className="absolute inset-0">
              {summary.total === 0 ? (
                /* Healthy tooth - single color */
                <div
                  className="w-full h-full"
                  style={{
                    backgroundColor: isSelected ? primaryColor : (isHovered ? primaryColor + '40' : primaryColor + '20')
                  }}
                />
              ) : summary.total === 1 ? (
                /* Single treatment - check if completed for healthy color */
                (() => {
                  const isCompleted = summary.treatments[0].treatment_status === 'completed'
                  const color = isCompleted ? primaryColor : summary.treatments[0].treatment_color
                  // تم إزالة console.log لتقليل الرسائل
                  return (
                    <div
                      className="w-full h-full"
                      style={{
                        backgroundColor: color,
                        opacity: isSelected ? 0.95 : (isHovered ? 0.85 :
                          (summary.treatments[0].treatment_status === 'completed' ? 0.8 :
                           summary.treatments[0].treatment_status === 'in_progress' ? 0.75 : 0.7))
                      }}
                    />
                  )
                })()
              ) : summary.total === 2 ? (
                /* Two treatments - check if all completed for healthy color */
                (() => {
                  const allCompleted = summary.treatments.every(t => t.treatment_status === 'completed')
                  // تم إزالة console.log لتقليل الرسائل
                  return allCompleted
                })() ? (
                  <div
                    className="w-full h-full"
                    style={{
                      backgroundColor: primaryColor,
                      opacity: isSelected ? 0.95 : (isHovered ? 0.85 : 0.8)
                    }}
                  />
                ) : (
                  /* Two treatments - split vertically */
                  <>
                    <div
                      className="absolute top-0 left-0 w-full h-1/2 border-b-2 border-white/50"
                      style={{
                        backgroundColor: summary.treatments[0].treatment_status === 'completed' ? primaryColor : summary.treatments[0].treatment_color,
                        opacity: isSelected ? 0.95 : (isHovered ? 0.85 :
                          (summary.treatments[0].treatment_status === 'completed' ? 0.8 :
                           summary.treatments[0].treatment_status === 'in_progress' ? 0.75 : 0.7))
                      }}
                    />
                    <div
                      className="absolute bottom-0 left-0 w-full h-1/2"
                      style={{
                        backgroundColor: summary.treatments[1].treatment_status === 'completed' ? primaryColor : summary.treatments[1].treatment_color,
                        opacity: isSelected ? 0.95 : (isHovered ? 0.85 :
                          (summary.treatments[1].treatment_status === 'completed' ? 0.8 :
                           summary.treatments[1].treatment_status === 'in_progress' ? 0.75 : 0.7))
                      }}
                    />
                  </>
                )
              ) : summary.total === 3 ? (
                /* Three treatments - check if all completed for healthy color */
                summary.treatments.every(t => t.treatment_status === 'completed') ? (
                  <div
                    className="w-full h-full"
                    style={{
                      backgroundColor: primaryColor,
                      opacity: isSelected ? 0.95 : (isHovered ? 0.85 : 0.8)
                    }}
                  />
                ) : (
                  /* Three treatments - top half + bottom split */
                  <>
                    <div
                      className="absolute top-0 left-0 w-full h-1/2 border-b-2 border-white/50"
                      style={{
                        backgroundColor: summary.treatments[0].treatment_status === 'completed' ? primaryColor : summary.treatments[0].treatment_color,
                        opacity: isSelected ? 0.95 : (isHovered ? 0.85 :
                          (summary.treatments[0].treatment_status === 'completed' ? 0.8 :
                           summary.treatments[0].treatment_status === 'in_progress' ? 0.75 : 0.7))
                      }}
                    />
                    <div
                      className="absolute bottom-0 left-0 w-1/2 h-1/2 border-r-2 border-white/50"
                      style={{
                        backgroundColor: summary.treatments[1].treatment_status === 'completed' ? primaryColor : summary.treatments[1].treatment_color,
                        opacity: isSelected ? 0.95 : (isHovered ? 0.85 :
                          (summary.treatments[1].treatment_status === 'completed' ? 0.8 :
                           summary.treatments[1].treatment_status === 'in_progress' ? 0.75 : 0.7))
                      }}
                    />
                    <div
                      className="absolute bottom-0 right-0 w-1/2 h-1/2"
                      style={{
                        backgroundColor: summary.treatments[2].treatment_status === 'completed' ? primaryColor : summary.treatments[2].treatment_color,
                        opacity: isSelected ? 0.95 : (isHovered ? 0.85 :
                          (summary.treatments[2].treatment_status === 'completed' ? 0.8 :
                           summary.treatments[2].treatment_status === 'in_progress' ? 0.75 : 0.7))
                      }}
                    />
                  </>
                )
              ) : (
                /* Four or more treatments - check if all completed for healthy color */
                summary.treatments.every(t => t.treatment_status === 'completed') ? (
                  <div
                    className="w-full h-full"
                    style={{
                      backgroundColor: primaryColor,
                      opacity: isSelected ? 0.95 : (isHovered ? 0.85 : 0.8)
                    }}
                  />
                ) : (
                  /* Four or more treatments - quadrants */
                  <>
                    <div
                      className="absolute top-0 left-0 w-1/2 h-1/2 border-r-2 border-b-2 border-white/50"
                      style={{
                        backgroundColor: summary.treatments[0].treatment_status === 'completed' ? primaryColor : summary.treatments[0].treatment_color,
                        opacity: isSelected ? 0.95 : (isHovered ? 0.85 :
                          (summary.treatments[0].treatment_status === 'completed' ? 0.8 :
                           summary.treatments[0].treatment_status === 'in_progress' ? 0.75 : 0.7))
                      }}
                    />
                    <div
                      className="absolute top-0 right-0 w-1/2 h-1/2 border-b-2 border-white/50"
                      style={{
                        backgroundColor: summary.treatments[1].treatment_status === 'completed' ? primaryColor : summary.treatments[1].treatment_color,
                        opacity: isSelected ? 0.95 : (isHovered ? 0.85 :
                          (summary.treatments[1].treatment_status === 'completed' ? 0.8 :
                           summary.treatments[1].treatment_status === 'in_progress' ? 0.75 : 0.7))
                      }}
                    />
                    <div
                      className="absolute bottom-0 left-0 w-1/2 h-1/2 border-r-2 border-white/50"
                      style={{
                        backgroundColor: summary.treatments[2].treatment_status === 'completed' ? primaryColor : summary.treatments[2].treatment_color,
                        opacity: isSelected ? 0.95 : (isHovered ? 0.85 :
                          (summary.treatments[2].treatment_status === 'completed' ? 0.8 :
                           summary.treatments[2].treatment_status === 'in_progress' ? 0.75 : 0.7))
                      }}
                    />
                    <div
                      className="absolute bottom-0 right-0 w-1/2 h-1/2"
                      style={{
                        backgroundColor: summary.treatments[3].treatment_status === 'completed' ? primaryColor : summary.treatments[3].treatment_color,
                        opacity: isSelected ? 0.95 : (isHovered ? 0.85 :
                          (summary.treatments[3].treatment_status === 'completed' ? 0.8 :
                           summary.treatments[3].treatment_status === 'in_progress' ? 0.75 : 0.7))
                      }}
                    />
                  </>
                )
              )}
            </div>

            {/* Tooth number - positioned above the colors */}
            <div
              className="relative z-10 text-xs font-bold mb-1 px-1 rounded"
              style={{
                backgroundColor: 'rgba(255,255,255,0.95)',
                color: '#000000',
                textShadow: 'none'
              }}
            >
              {toothNumber}
            </div>

            {/* Small tooth icon indicator with treatment count - positioned above the colors */}
            <div className="relative z-10">
              <div
                className="w-6 h-6 rounded-sm border-2 border-white flex items-center justify-center text-xs font-bold"
                style={{
                  backgroundColor: summary.total > 0 ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.7)',
                  color: summary.total > 0 ? '#1f2937' : '#6b7280',
                  textShadow: 'none'
                }}
              >
                {summary.total > 0 ? summary.total : '✓'}
              </div>
            </div>

            {/* Images count indicator */}
            {imagesCount > 0 && (
              <div className="absolute -top-2 -left-2 z-20">
                <div
                  className={`${imagesCount > 9 ? 'w-7 h-6 px-1' : 'w-6 h-6'} rounded-full border-2 border-white bg-blue-600 flex items-center justify-center text-white font-bold shadow-lg transition-transform duration-200 hover:scale-110`}
                  style={{
                    fontSize: imagesCount > 9 ? '10px' : '12px',
                    fontWeight: '800',
                    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4), 0 2px 4px rgba(0,0,0,0.3)',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                    textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                    minWidth: '24px'
                  }}
                >
                  {imagesCount > 99 ? '99+' : imagesCount}
                </div>
              </div>
            )}

            {/* Status indicators */}
            {summary.inProgress > 0 && (
              <div className="absolute -bottom-1 -left-1 z-20">
                <div className="w-3 h-3 bg-yellow-500 rounded-full border border-white" />
              </div>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-2">
            <div className="font-semibold">
              السن رقم {toothNumber} - {toothInfo.arabicName}
            </div>

            {summary.total > 0 ? (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm">
                  <Layers className="w-3 h-3" />
                  <span>{summary.total} علاج مسجل</span>
                </div>

                <div className="flex flex-wrap gap-1">
                  {summary.completed > 0 && (
                    <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                      <CheckCircle className="w-2 h-2 ml-1" />
                      {summary.completed} مكتمل
                    </Badge>
                  )}
                  {summary.inProgress > 0 && (
                    <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
                      <Activity className="w-2 h-2 ml-1" />
                      {summary.inProgress} قيد التنفيذ
                    </Badge>
                  )}
                  {summary.planned > 0 && (
                    <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                      <Clock className="w-2 h-2 ml-1" />
                      {summary.planned} مخطط
                    </Badge>
                  )}
                </div>

                {/* Show top 3 treatments with more details */}
                <div className="space-y-1 mt-2">
                  {summary.treatments.slice(0, 3).map((treatment, index) => (
                    <div key={treatment.id} className="text-xs flex items-center gap-2 p-1 rounded bg-gray-50 dark:bg-gray-700">
                      <div
                        className="w-2.5 h-2.5 rounded-full border border-white/50"
                        style={{
                          backgroundColor: treatment.treatment_color,
                          opacity: treatment.treatment_status === 'completed' ? 1 :
                                  treatment.treatment_status === 'in_progress' ? 0.8 : 0.6
                        }}
                      />
                      <span className="font-medium text-blue-600">#{treatment.priority}</span>
                      <span className="flex-1">{getTreatmentByValue(treatment.treatment_type)?.label || treatment.treatment_type}</span>
                      <Badge
                        variant="outline"
                        className="text-xs px-1 py-0"
                        style={{
                          borderColor: treatment.treatment_color,
                          color: treatment.treatment_color
                        }}
                      >
                        {TREATMENT_STATUS_OPTIONS.find(s => s.value === treatment.treatment_status)?.label}
                      </Badge>
                    </div>
                  ))}
                  {summary.total > 3 && (
                    <div className="text-xs text-muted-foreground text-center">
                      و {summary.total - 3} علاج آخر... انقر لعرض الكل
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                لا توجد علاجات مسجلة
              </div>
            )}

            {imagesCount > 0 && (
              <div className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 p-1 rounded">
                📷 {imagesCount} صورة
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <TooltipProvider>
      <Card className={cn("w-full", className)} id="dental-chart-section" key={`dental-chart-${forceUpdate}`}>
        <CardHeader className="pb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="space-y-2">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Activity className="w-6 h-6 text-blue-600" />
                مخطط الأسنان التفاعلي
              </CardTitle>
              <CardDescription className="text-base">
                انقر على أي سن لعرض وإدارة العلاجات المتعددة
              </CardDescription>
            </div>

            <div className="flex items-center space-x-3 space-x-reverse p-3 bg-muted/50 rounded-lg">
              <Label htmlFor="teeth-type" className="text-sm font-medium">
                أسنان لبنية
              </Label>
              <Checkbox
                id="teeth-type"
                checked={isPrimaryTeeth}
                onCheckedChange={setIsPrimaryTeeth}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-8 bg-card dark:bg-card">
          {/* Treatment Categories Legend */}
          <div className="flex flex-wrap justify-center gap-3 p-4 bg-muted/30 rounded-lg">
            {TREATMENT_CATEGORIES.slice(0, 6).map((category) => (
              <Badge
                key={category.value}
                variant="secondary"
                className="text-sm px-3 py-2"
                style={{
                  backgroundColor: category.color + '20',
                  color: category.color,
                  borderColor: category.color + '40'
                }}
              >
                <span className="ml-2">{category.icon}</span>
                {category.label}
              </Badge>
            ))}
          </div>

          {/* Upper Jaw */}
          <div className="space-y-4 p-4 bg-muted/20 rounded-lg">
            <div className="text-center text-lg font-semibold text-foreground">
              {isPrimaryTeeth ? 'الفك العلوي اللبني' : 'الفك العلوي'}
            </div>
            <div className={`grid gap-2 justify-center ${isPrimaryTeeth ? 'grid-cols-10' : 'grid-cols-16'}`}>
              {upperTeeth.map(tooth => renderTooth(tooth.number))}
            </div>
          </div>

          {/* Lower Jaw */}
          <div className="space-y-4 p-4 bg-muted/20 rounded-lg">
            <div className="text-center text-lg font-semibold text-foreground">
              {isPrimaryTeeth ? 'الفك السفلي اللبني' : 'الفك السفلي'}
            </div>
            <div className={`grid gap-2 justify-center ${isPrimaryTeeth ? 'grid-cols-10' : 'grid-cols-16'}`}>
              {lowerTeeth.map(tooth => renderTooth(tooth.number))}
            </div>
          </div>

          {/* Instructions */}
          <div className="text-center space-y-4 p-4 bg-muted/30 rounded-lg">
            <div className="text-sm text-muted-foreground">
              انقر على أي سن لعرض تفاصيل العلاج وإدارة العلاجات المتعددة
            </div>
            <div className="flex justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                  #
                </div>
                <span>عدد العلاجات</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-500 rounded-full" />
                <span>قيد التنفيذ</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}
