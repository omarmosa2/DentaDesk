import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { usePatientStore } from '@/store/patientStore'
import { useDentalTreatmentStore } from '@/store/dentalTreatmentStore'
import { ToothTreatment } from '@/types'
import { usePrescriptionStore } from '@/store/prescriptionStore'
import { useSettingsStore } from '@/store/settingsStore'
import EnhancedDentalChart from '@/components/dental/EnhancedDentalChart'
import EnhancedToothDetailsDialog from '@/components/dental/EnhancedToothDetailsDialog'

import PrescriptionReceiptDialog from '@/components/medications/PrescriptionReceiptDialog'
import PatientSelectionTable from '@/components/dental/PatientSelectionTable'
import MultipleToothTreatmentDialog from '@/components/dental/MultipleToothTreatmentDialog'
import { formatDate, calculateAge } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { notify } from '@/services/notificationService'
import { useRealTimeSync } from '@/hooks/useRealTimeSync'
import {
  Search,
  User,
  Phone,
  Calendar,
  FileText,
  Printer,
  RefreshCw,
  Stethoscope,
  Camera,
  Activity,
  Info
} from 'lucide-react'

export default function DentalTreatments() {
  const { toast } = useToast()
  const { patients, loadPatients } = usePatientStore()
  const {
    toothTreatments,
    toothTreatmentImages,
    loadToothTreatments,
    loadAllToothTreatmentImages,
    loadToothTreatmentsByPatient,
    loadAllToothTreatmentImagesByPatient,
    createToothTreatment
  } = useDentalTreatmentStore()
  const { prescriptions, loadPrescriptions } = usePrescriptionStore()
  const { settings, currency } = useSettingsStore()

  const [selectedPatientId, setSelectedPatientId] = useState<string>('')
  const [selectedToothNumber, setSelectedToothNumber] = useState<number | null>(null)
  const [selectedTeeth, setSelectedTeeth] = useState<number[]>([])
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false)
  const [showToothDialog, setShowToothDialog] = useState(false)
  const [showMultipleToothDialog, setShowMultipleToothDialog] = useState(false)
  const [showPrescriptionDialog, setShowPrescriptionDialog] = useState(false)
  const [selectedPrescription, setSelectedPrescription] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const [isPrimaryTeeth, setIsPrimaryTeeth] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showTestMode, setShowTestMode] = useState(false)
  const [patientSessionStats, setPatientSessionStats] = useState<{[key: string]: any}>({})


  // Enable real-time synchronization
  useRealTimeSync()

  useEffect(() => {
    loadPatients()
    loadPrescriptions()
    loadToothTreatments() // تحميل جميع العلاجات لحساب العدد لكل مريض
    loadAllToothTreatmentImages() // تحميل جميع الصور لحساب العدد لكل مريض
  }, [loadPatients, loadPrescriptions, loadToothTreatments, loadAllToothTreatmentImages])

  // Check for pre-selected patient from localStorage
  useEffect(() => {
    const checkPreSelectedPatient = () => {
      try {
        const stored = localStorage.getItem('selectedPatientForTreatment')
        if (stored) {
          const parsed = JSON.parse(stored)
          console.log('Found pre-selected patient for treatment:', parsed)

          const preSelectedPatientId = parsed.selectedPatientId
          const preSelectedPatientName = parsed.patientName
          const showAddTreatmentGuidance = parsed.showAddTreatmentGuidance

          // Clear localStorage immediately to avoid re-processing
          localStorage.removeItem('selectedPatientForTreatment')

          // Wait for patients to load, then select the patient
          const selectPatient = async () => {
            console.log('Attempting to select patient:', preSelectedPatientId)
            console.log('Available patients:', patients.length)

            // Set search query to patient name for easy identification
            if (preSelectedPatientName) {
              setSearchQuery(preSelectedPatientName)
              // Show notification that patient was pre-selected
              notify.success(`تم تحديد المريض: ${preSelectedPatientName}`)

              // Check if we should show add treatment guidance
              if (showAddTreatmentGuidance) {
                setTimeout(() => {
                  notify.info('اختر السن المراد علاجه من الرسم البياني أدناه لإضافة علاج جديد', undefined, { duration: 5000 })
                }, 1000)
              }
            }

            // Actually select the patient
            setSelectedPatientId(preSelectedPatientId)
            console.log('Patient selected:', preSelectedPatientId)

            // Load treatments for the pre-selected patient
            loadToothTreatmentsByPatient(preSelectedPatientId)
            loadImages()

            // Load session statistics for the pre-selected patient
            const sessionStats = await getPatientSessionStats(preSelectedPatientId)
            setPatientSessionStats(prev => ({ ...prev, [preSelectedPatientId]: sessionStats }))

            // Scroll to dental chart after a short delay
            setTimeout(() => {
              const dentalChartElement = document.getElementById('dental-chart-section')
              if (dentalChartElement) {
                dentalChartElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
            }, 500)
          }

          // If patients are already loaded, select immediately
          if (patients.length > 0) {
            selectPatient()
          } else {
            // Otherwise wait a bit for patients to load
            setTimeout(selectPatient, 200)
          }
        }
      } catch (error) {
        console.error('Error reading pre-selected patient for treatment:', error)
      }
    }

    checkPreSelectedPatient()
  }, [patients.length])

  // Check for search result navigation
  useEffect(() => {
    const searchResultData = localStorage.getItem('selectedTreatmentForDetails')
    if (searchResultData) {
      try {
        const { treatment, patientId, openDetailsModal } = JSON.parse(searchResultData)
        if (openDetailsModal && treatment && patientId) {
          // Select the patient first
          setSelectedPatientId(patientId)
          loadToothTreatmentsByPatient(patientId)

          // Load session statistics for the patient
          getPatientSessionStats(patientId).then(sessionStats => {
            setPatientSessionStats(prev => ({ ...prev, [patientId]: sessionStats }))
          })

          // Set the tooth number and open dialog
          setSelectedToothNumber(treatment.tooth_number)
          setShowToothDialog(true)

          localStorage.removeItem('selectedTreatmentForDetails')
        }
      } catch (error) {
        console.error('Error parsing search result data:', error)
        localStorage.removeItem('selectedTreatmentForDetails')
      }
    }

    const prescriptionResultData = localStorage.getItem('selectedPrescriptionForDetails')
    if (prescriptionResultData) {
      try {
        const { prescription, openDetailsModal } = JSON.parse(prescriptionResultData)
        if (openDetailsModal && prescription) {
          setSelectedPrescription(prescription)
          setShowPrescriptionDialog(true)
          localStorage.removeItem('selectedPrescriptionForDetails')
        }
      } catch (error) {
        console.error('Error parsing prescription search result data:', error)
        localStorage.removeItem('selectedPrescriptionForDetails')
      }
    }
  }, [])

  // Filter patients based on search query
  const filteredPatients = patients.filter(patient =>
    patient.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    patient.phone?.includes(searchQuery) ||
    patient.serial_number.includes(searchQuery)
  )

  const selectedPatient = patients.find(p => p.id === selectedPatientId)

  // Get patient prescriptions
  const patientPrescriptions = prescriptions.filter(p => p.patient_id === selectedPatientId)

  // Calculate treatment counts for each patient
  const getPatientTreatmentCount = (patientId: string) => {
    const newSystemCount = toothTreatments.filter(t => t.patient_id === patientId).length
    return newSystemCount
  }

  // Get detailed treatment stats for patient
  const getPatientTreatmentStats = (patientId: string) => {
    const patientTreatments = toothTreatments.filter(t => t.patient_id === patientId)
    return {
      total: patientTreatments.length,
      completed: patientTreatments.filter(t => t.treatment_status === 'completed').length,
      inProgress: patientTreatments.filter(t => t.treatment_status === 'in_progress').length,
      planned: patientTreatments.filter(t => t.treatment_status === 'planned').length
    }
  }

  // Get detailed session stats for patient
  const getPatientSessionStats = async (patientId: string) => {
    try {
      // Get all treatments for this patient directly from the database to ensure fresh data
      const patientTreatments = await window.electronAPI.toothTreatments.getByPatient(patientId)
      let allSessions: any[] = []

      for (const treatment of patientTreatments) {
        const sessions = await window.electronAPI.treatmentSessions.getByTreatment(treatment.id)
        allSessions = [...allSessions, ...sessions]
      }

      return {
        total: allSessions.length,
        completed: allSessions.filter(s => s.session_status === 'completed').length,
        planned: allSessions.filter(s => s.session_status === 'planned').length,
        cancelled: allSessions.filter(s => s.session_status === 'cancelled').length
      }
    } catch (error) {
      console.error('Error getting patient session stats:', error)
      return {
        total: 0,
        completed: 0,
        planned: 0,
        cancelled: 0
      }
    }
  }

  // Update session statistics for the current patient
  const updatePatientSessionStats = async () => {
    if (selectedPatientId) {
      const sessionStats = await getPatientSessionStats(selectedPatientId)
      setPatientSessionStats(prev => ({ ...prev, [selectedPatientId]: sessionStats }))
    }
  }

  // Get last treatment date for patient
  const getLastTreatmentDate = (patientId: string) => {
    const newSystemTreatments = toothTreatments.filter(t => t.patient_id === patientId)

    if (newSystemTreatments.length === 0) return null

    const sortedTreatments = newSystemTreatments.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    return sortedTreatments[0].created_at
  }

  // Calculate total images count for patient (using new system)
  const getPatientImagesCount = (patientId: string) => {
    return toothTreatmentImages.filter(img => img.patient_id === patientId).length
  }

  const handlePatientSelect = async (patientId: string) => {
    setSelectedPatientId(patientId)
    setSelectedToothNumber(null)
    // إعادة تعيين التحديد المتعدد عند تغيير المريض
    setSelectedTeeth([])
    setIsMultiSelectMode(false)
    // تحميل العلاجات والصور للمريض المحدد
    if (patientId) {
      // تحميل العلاجات أولاً وانتظار اكتمالها
      await loadToothTreatmentsByPatient(patientId) // النظام الجديد
      loadAllToothTreatmentImagesByPatient(patientId) // تحميل الصور بالنظام الجديد

      // تحميل إحصائيات الجلسات للمريض بعد تحميل العلاجات
      const sessionStats = await getPatientSessionStats(patientId)
      setPatientSessionStats(prev => ({ ...prev, [patientId]: sessionStats }))

      // Scroll to dental chart after selection
      setTimeout(() => {
        const dentalChartElement = document.getElementById('dental-chart-section')
        if (dentalChartElement) {
          dentalChartElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 100)
    }
  }

  const handleToothClick = (toothNumber: number, isCtrlPressed: boolean = false) => {
    if (!selectedPatientId) {
      notify.warning('يرجى اختيار مريض أولاً')
      return
    }

    if (isCtrlPressed) {
      // التحديد المتعدد مع CTRL
      handleMultipleToothSelection(toothNumber)
    } else {
      // التحديد العادي - إلغاء التحديد المتعدد والعودة للوضع العادي
      setSelectedTeeth([])
      setIsMultiSelectMode(false)
      setSelectedToothNumber(toothNumber)
      setShowToothDialog(true)
    }
  }

  const handleMultipleToothSelection = (toothNumber: number) => {
    setIsMultiSelectMode(true)
    setSelectedToothNumber(null) // إلغاء التحديد الفردي

    setSelectedTeeth(prev => {
      if (prev.includes(toothNumber)) {
        // إزالة السن من التحديد إذا كان محدد مسبقاً
        const newSelection = prev.filter(t => t !== toothNumber)
        if (newSelection.length === 0) {
          setIsMultiSelectMode(false)
        }
        return newSelection
      } else {
        // إضافة السن للتحديد
        return [...prev, toothNumber]
      }
    })
  }

  const handleMultipleToothTreatment = () => {
    if (selectedTeeth.length === 0) {
      notify.warning('يرجى تحديد أسنان أولاً')
      return
    }
    setShowMultipleToothDialog(true)
  }

  const clearMultipleSelection = () => {
    setSelectedTeeth([])
    setIsMultiSelectMode(false)
  }

  const handleAddMultipleTreatments = async (treatments: Omit<ToothTreatment, 'id' | 'created_at' | 'updated_at'>[]) => {
    try {
      setIsLoading(true)

      const createdTreatments: ToothTreatment[] = []

      // إضافة كل علاج على حدة وجمع النتائج
      for (const treatmentData of treatments) {
        const createdTreatment = await createToothTreatment(treatmentData)
        if (createdTreatment) {
          createdTreatments.push(createdTreatment)
        }
      }

      // إعادة تحميل البيانات
      if (selectedPatientId) {
        await Promise.all([
          loadToothTreatmentsByPatient(selectedPatientId),
          loadAllToothTreatmentImagesByPatient(selectedPatientId)
        ])
      }

      // إلغاء التحديد المتعدد
      clearMultipleSelection()

      return createdTreatments

    } catch (error) {
      console.error('Error adding multiple treatments:', error)
      notify.error('فشل في إضافة العلاجات')
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const handleToothDialogClose = async (open: boolean) => {
    setShowToothDialog(open)
    // إعادة تحميل البيانات عند إغلاق الحوار
    if (!open && selectedPatientId) {
      loadToothTreatmentsByPatient(selectedPatientId) // النظام الجديد
      loadAllToothTreatmentImagesByPatient(selectedPatientId) // إعادة تحميل الصور بالنظام الجديد
      // تحديث إحصائيات الجلسات (الآن يتم تحديثها تلقائياً عند إضافة/تعديل/حذف الجلسات)
      await updatePatientSessionStats()
    }
  }

  // دالة لإعادة تحميل البيانات في الرسم البياني للأسنان
  const handleTreatmentUpdate = async () => {
    if (selectedPatientId) {
      // إعادة تحميل البيانات فوراً
      await Promise.all([
        loadToothTreatmentsByPatient(selectedPatientId),
        loadAllToothTreatmentImagesByPatient(selectedPatientId)
      ])

      // Force re-render by updating a state to trigger immediate UI update
      setSelectedToothNumber(prev => prev)

      // إضافة تأخير قصير ثم إعادة تحديث مرة أخرى لضمان التحديث
      setTimeout(() => {
        setSelectedToothNumber(prev => prev)
      }, 100)
    }
  }

  const handlePrintPrescription = (prescription: any) => {
    setSelectedPrescription(prescription)
    setShowPrescriptionDialog(true)
  }

  const refreshData = async () => {
    setIsLoading(true)
    try {
      await Promise.all([
        loadPatients(),
        loadPrescriptions(),
        loadToothTreatments(), // تحديث جميع العلاجات
        loadAllToothTreatmentImages() // تحديث جميع الصور بالنظام الجديد
      ])
      // تحديث العلاجات والصور للمريض المحدد
      if (selectedPatientId) {
        await Promise.all([
          loadToothTreatmentsByPatient(selectedPatientId),
          loadAllToothTreatmentImagesByPatient(selectedPatientId)
        ])
        // تحديث إحصائيات الجلسات للمريض المحدد
        const sessionStats = await getPatientSessionStats(selectedPatientId)
        setPatientSessionStats(prev => ({ ...prev, [selectedPatientId]: sessionStats }))
      }
      notify.success('تم تحديث البيانات بنجاح')
    } catch (error) {
      notify.error('حدث خطأ أثناء تحديث البيانات')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Stethoscope className="w-8 h-8 text-blue-600 dark:text-slate-300" />
            العلاجات السنية
          </h1>
          <p className="text-muted-foreground mt-2">
            إدارة شاملة للعلاجات السنية مع مخطط الأسنان التفاعلي
          </p>
        </div>
        <div className="flex gap-2">
          {/* <Button
            onClick={async () => {
              if (selectedPatientId) {
                console.log('🦷 Force refreshing tooth colors for patient:', selectedPatientId)

                // إعادة تحميل البيانات من قاعدة البيانات
                await Promise.all([
                  loadToothTreatmentsByPatient(selectedPatientId),
                  loadAllToothTreatmentImagesByPatient(selectedPatientId)
                ])

                // إرسال أحداث متعددة لإجبار التحديث
                window.dispatchEvent(new CustomEvent('tooth-color-update', {
                  detail: { type: 'force-refresh', timestamp: Date.now() }
                }))

                window.dispatchEvent(new CustomEvent('treatment-updated', {
                  detail: { type: 'force-refresh', timestamp: Date.now() }
                }))

                // تحديث الحالة لإجبار إعادة الرسم
                setSelectedToothNumber(prev => prev)

                // تأخير قصير ثم تحديث مرة أخرى
                setTimeout(() => {
                  setSelectedToothNumber(prev => prev)
                  window.dispatchEvent(new CustomEvent('treatments-loaded', {
                    detail: { patientId: selectedPatientId, force: true }
                  }))
                }, 200)

                notify.success('تم تحديث ألوان الأسنان')
              }
            }}
            disabled={!selectedPatientId}
            variant="outline"
            size="sm"
          >
            🦷 تحديث الألوان
          </Button> */}
          <Button onClick={refreshData} disabled={isLoading} variant="outline">
            <RefreshCw className={`w-4 h-4 ml-2 ${isLoading ? 'animate-spin' : ''}`} />
            تحديث البيانات
          </Button>
        </div>
      </div>

      {/* Quick Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">إجمالي المرضى</p>
                <p className="text-2xl font-bold text-foreground">{patients.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <Activity className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">إجمالي العلاجات</p>
                <p className="text-2xl font-bold text-foreground">{toothTreatments.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                <Camera className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">إجمالي الصور</p>
                <p className="text-2xl font-bold text-foreground">{toothTreatmentImages.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">الوصفات الطبية</p>
                <p className="text-2xl font-bold text-foreground">{prescriptions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Patient Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            اختيار المريض
          </CardTitle>
          <CardDescription>
            ابحث واختر المريض لعرض مخطط الأسنان والعلاجات
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="البحث السريع: اسم المريض، رقم الهاتف، أو #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
              autoComplete="off"
            />
            {searchQuery && (
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                <Badge variant="secondary" className="text-xs">
                  {filteredPatients.length} نتيجة
                </Badge>
              </div>
            )}
          </div>

          {/* Patients Table */}
          <PatientSelectionTable
            patients={filteredPatients}
            selectedPatientId={selectedPatientId}
            onPatientSelect={handlePatientSelect}
            getPatientTreatmentCount={getPatientTreatmentCount}
            getLastTreatmentDate={getLastTreatmentDate}
            getPatientImagesCount={getPatientImagesCount}
            isLoading={isLoading}
            isCompact={!!selectedPatient}
          />

          {/* Selected Patient Info */}
          {selectedPatient && (
            <Card className="bg-muted/30 dark:bg-muted/20 border-border">
              <CardContent className="pt-4 bg-muted/30 dark:bg-muted/20">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="font-medium text-foreground">{selectedPatient.full_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">الجنس:</span>
                    <Badge variant="secondary">
                      {selectedPatient.gender === 'male' ? 'ذكر' : 'أنثى'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-foreground">{selectedPatient.age} سنة</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <a
                      href={`https://wa.me/${selectedPatient.phone?.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-600 dark:text-green-400 hover:underline"
                    >
                      {selectedPatient.phone}
                    </a>
                  </div>
                </div>

                {/* Treatment Statistics */}
                {(() => {
                  const stats = getPatientTreatmentStats(selectedPatientId)
                  const imagesCount = getPatientImagesCount(selectedPatientId)
                  const sessionStats = patientSessionStats[selectedPatientId] || { total: 0, completed: 0, planned: 0, cancelled: 0 }

                  return (
                    <div className="border-t border-border pt-4 space-y-4">
                      {/* Treatment Statistics */}
                      <div>
                        <h4 className="text-sm font-medium text-foreground mb-3">إحصائيات العلاجات</h4>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                              <Activity className="w-3 h-3 ml-1" />
                              {stats.total} إجمالي
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-green-50 dark:bg-green-900 text-green-700 dark:text-green-300">
                              ✓ {stats.completed} مكتمل
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-orange-50 dark:bg-orange-900 text-orange-700 dark:text-orange-300">
                              ⏳ {stats.inProgress} قيد التنفيذ
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-gray-50 dark:bg-card text-gray-700 dark:text-gray-300">
                              📋 {stats.planned} مخطط
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-purple-50 dark:bg-purple-900 text-purple-700 dark:text-purple-300">
                              <Camera className="w-3 h-3 ml-1" />
                              {imagesCount} صورة
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Session Statistics */}
                      <div>
                        <h4 className="text-sm font-medium text-foreground mb-3">إحصائيات الجلسات</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-indigo-50 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
                              <Calendar className="w-3 h-3 ml-1" />
                              {sessionStats.total} إجمالي
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300">
                              ✅ {sessionStats.completed} مكتملة
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-amber-50 dark:bg-amber-900 text-amber-700 dark:text-amber-300">
                              📅 {sessionStats.planned} مخططة
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-300">
                              ❌ {sessionStats.cancelled} ملغية
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })()}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>



      {/* Enhanced Mode Toggle */}
      {selectedPatient && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">نظام العلاجات المتعددة</h3>
                <p className="text-sm text-muted-foreground">
                  النظام المحسن: يدعم عدة علاجات للسن الواحد مع الألوان العالمية
                </p>
              </div>

            </div>
          </CardContent>
        </Card>
      )}

      {/* Multi-Select Indicators */}
      {selectedPatient && isMultiSelectMode && selectedTeeth.length > 0 && (
        <Card className="bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-orange-500"></div>
                  <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
                    تم تحديد {selectedTeeth.length} سن
                  </span>
                </div>
                <div className="text-xs text-orange-600 dark:text-orange-400">
                  الأسنان المحددة: {selectedTeeth.sort((a, b) => a - b).join(', ')}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleMultipleToothTreatment}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  إضافة علاج للأسنان المحددة
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={clearMultipleSelection}
                  className="border-orange-300 text-orange-700 hover:bg-orange-100 dark:border-orange-700 dark:text-orange-300 dark:hover:bg-orange-900/20"
                >
                  إلغاء التحديد
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions for Multi-Select */}
      {selectedPatient && !isMultiSelectMode && (
        <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
              <Info className="w-4 h-4" />
              <span>
                <strong>نصيحة:</strong> اضغط CTRL + النقر لتحديد عدة أسنان وإضافة نفس العلاج لها
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dental Chart */}
      {selectedPatient && (
        <div id="dental-chart-section">
          <EnhancedDentalChart
            patientId={selectedPatientId}
            onToothClick={handleToothClick}
            selectedTooth={selectedToothNumber}
            selectedTeeth={selectedTeeth}
            isMultiSelectMode={isMultiSelectMode}
            isPrimaryTeeth={isPrimaryTeeth}
            onPrimaryTeethChange={setIsPrimaryTeeth}
          />
        </div>
      )}

      {/* Prescriptions List */}
      {selectedPatient && patientPrescriptions.length > 0 && (
        <Card className="bg-card dark:bg-card border-border">
          <CardHeader className="bg-card dark:bg-card">
            <CardTitle className="flex items-center gap-2 text-foreground">
              <FileText className="w-5 h-5" />
              الوصفات الطبية
            </CardTitle>
          </CardHeader>
          <CardContent className="bg-card dark:bg-card">
            <div className="space-y-2">
              {patientPrescriptions.map((prescription) => (
                <div
                  key={prescription.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="font-medium">
                      وصفة طبية - {formatDate(prescription.prescription_date)}
                    </div>
                    {prescription.notes && (
                      <div className="text-sm text-muted-foreground">
                        {prescription.notes}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePrintPrescription(prescription)}
                  >
                    <Printer className="w-4 h-4 ml-2" />
                    طباعة
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!selectedPatient && !showTestMode && (
        <Card>
          <CardContent className="text-center py-12">
            <Stethoscope className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">اختر مريض لبدء العلاج</h3>
            <p className="text-muted-foreground">
              استخدم البحث أعلاه لاختيار مريض وعرض مخطط الأسنان التفاعلي
            </p>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <EnhancedToothDetailsDialog
        open={showToothDialog}
        onOpenChange={handleToothDialogClose}
        patientId={selectedPatientId}
        toothNumber={selectedToothNumber}
        isPrimaryTeeth={isPrimaryTeeth}
        onSessionStatsUpdate={updatePatientSessionStats}
        onTreatmentUpdate={handleTreatmentUpdate}
      />

      {selectedPrescription && (
        <PrescriptionReceiptDialog
          open={showPrescriptionDialog}
          onOpenChange={setShowPrescriptionDialog}
          prescription={selectedPrescription}
        />
      )}

      {/* Multiple Tooth Treatment Dialog */}
      <MultipleToothTreatmentDialog
        open={showMultipleToothDialog}
        onOpenChange={setShowMultipleToothDialog}
        patientId={selectedPatientId}
        selectedTeeth={selectedTeeth}
        onAddTreatments={handleAddMultipleTreatments}
      />
    </div>
  )
}
