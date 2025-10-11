import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import './enhanced-dental-images.css'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CurrencyDisplay } from '@/components/ui/currency-display'
import { useDentalTreatmentStore } from '@/store/dentalTreatmentStore'
import { usePatientStore } from '@/store/patientStore'
import { getToothInfo, getTreatmentColor, IMAGE_TYPE_OPTIONS, getTreatmentByValue } from '@/data/teethData'
import { ToothTreatment } from '@/types'
import { notify } from '@/services/notificationService'
import MultipleToothTreatments from './MultipleToothTreatments'
import DentalImage from './DentalImage'
import './dental-images.css'
import { cn } from '@/lib/utils'
import { useTheme } from '@/contexts/ThemeContext'
import {
  Layers,
  Camera,
  FileText,
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Sparkles,
  Plus,
  Trash2,
  GripVertical,
  Upload,
  X,
  Eye,
  GitCompare
} from 'lucide-react'

interface EnhancedToothDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  patientId: string
  toothNumber: number | null
  isPrimaryTeeth?: boolean
  onSessionStatsUpdate?: () => void
  onTreatmentUpdate?: () => void
}

export default function EnhancedToothDetailsDialog({
  open,
  onOpenChange,
  patientId,
  toothNumber,
  isPrimaryTeeth = false,
  onSessionStatsUpdate,
  onTreatmentUpdate
}: EnhancedToothDetailsDialogProps) {
  const { patients } = usePatientStore()
  const {
    toothTreatments,
    images,
    toothTreatmentImages,
    loadToothTreatmentsByTooth,
    loadImagesByTreatment,
    loadToothTreatmentImagesByTooth,
    loadAllToothTreatmentImagesByPatient,
    createToothTreatment,
    updateToothTreatment,
    deleteToothTreatment,
    reorderToothTreatments,
    createToothTreatmentImage,
    deleteToothTreatmentImage,
    clearImages,
    clearToothTreatmentImages
  } = useDentalTreatmentStore()

  const { isDarkMode } = useTheme()
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('treatments')
  const [selectedImages, setSelectedImages] = useState<Array<{file: File, type: string, treatmentId?: string}>>([])
  const [selectedTreatmentId, setSelectedTreatmentId] = useState<string>('')
  const [showComparison, setShowComparison] = useState(false)
  const [selectedComparisonTreatment, setSelectedComparisonTreatment] = useState<string>('')

  const patient = patients.find(p => p.id === patientId)
  const toothInfo = toothNumber ? getToothInfo(toothNumber, isPrimaryTeeth) : null

  // Filter treatments for this specific tooth
  const currentToothTreatments = (toothTreatments || []).filter(
    t => t.patient_id === patientId && t.tooth_number === toothNumber
  )

  // Get the primary treatment color (highest priority active treatment)
  const getPrimaryToothColor = (): string => {
    if (currentToothTreatments.length === 0) {
      return '#22c55e' // Default healthy color
    }

    // Check if all treatments are completed - if so, return healthy color
    const allCompleted = currentToothTreatments.every(t => t.treatment_status === 'completed')
    if (allCompleted) {
      return '#22c55e' // Return healthy color when all treatments are completed
    }

    // Sort by priority and find the most relevant active treatment
    const sortedTreatments = [...currentToothTreatments].sort((a, b) => a.priority - b.priority)

    // Prioritize in-progress treatments first, then planned treatments
    const activeTreatment = sortedTreatments.find(t =>
      t.treatment_status === 'in_progress'
    ) || sortedTreatments.find(t =>
      t.treatment_status === 'planned'
    ) || sortedTreatments[0]

    return activeTreatment?.treatment_color || '#22c55e'
  }

  // Get treatment status summary
  const getTreatmentSummary = () => {
    const total = currentToothTreatments.length
    const completed = currentToothTreatments.filter(t => t.treatment_status === 'completed').length
    const inProgress = currentToothTreatments.filter(t => t.treatment_status === 'in_progress').length
    const planned = currentToothTreatments.filter(t => t.treatment_status === 'planned').length
    const cancelled = currentToothTreatments.filter(t => t.treatment_status === 'cancelled').length

    return { total, completed, inProgress, planned, cancelled }
  }

  useEffect(() => {
    if (open && patientId && toothNumber) {
      // Load treatments for this specific tooth
      loadToothTreatmentsByTooth(patientId, toothNumber)
      // Load images for this tooth
      loadToothTreatmentImagesByTooth(patientId, toothNumber)
      // Clear old images initially (only for the old system)
      clearImages()
      // Note: Don't clear toothTreatmentImages to preserve image counters for other teeth
    }
  }, [open, patientId, toothNumber, loadToothTreatmentsByTooth, loadToothTreatmentImagesByTooth, clearImages])

  // Listen for tooth color updates
  useEffect(() => {
    const handleToothColorUpdate = async () => {
      if (open && patientId && toothNumber) {
        await loadToothTreatmentsByTooth(patientId, toothNumber)
      }
    }

    window.addEventListener('tooth-color-update', handleToothColorUpdate)

    return () => {
      window.removeEventListener('tooth-color-update', handleToothColorUpdate)
    }
  }, [open, patientId, toothNumber, loadToothTreatmentsByTooth])

  const handleAddTreatment = async (treatmentData: Omit<ToothTreatment, 'id' | 'created_at' | 'updated_at'>): Promise<ToothTreatment | null> => {
    try {
      setIsLoading(true)
      const newTreatment = await createToothTreatment(treatmentData)
      notify.success('تم إضافة العلاج بنجاح')
      // إعادة تحميل البيانات في الرسم البياني للأسنان
      onTreatmentUpdate?.()
      return newTreatment
    } catch (error) {
      notify.error('فشل في إضافة العلاج')
      console.error('Error adding treatment:', error)
      return null
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateTreatment = async (id: string, updates: Partial<ToothTreatment>): Promise<void> => {
    try {
      setIsLoading(true)
      console.log('🦷 Dialog: Updating treatment:', id, updates)

      // محاولة تحديث العلاج
      await updateToothTreatment(id, updates)
      console.log('🦷 Dialog: Treatment updated in store')

      // إعادة تحميل البيانات للسن الحالي
      if (toothNumber) {
        try {
          await loadToothTreatmentsByTooth(patientId, toothNumber)
          console.log('🦷 Dialog: Tooth treatments reloaded')
        } catch (reloadError) {
          console.warn('🦷 Dialog: Failed to reload tooth treatments, but update was successful:', reloadError)
        }
      }

      // إعادة تحميل البيانات في الرسم البياني للأسنان فوراً
      onTreatmentUpdate?.()

      console.log('🦷 Dialog: Treatment updated successfully')
      notify.success('تم تحديث العلاج بنجاح')

      // التأكد من عدم رمي خطأ
      return Promise.resolve()
    } catch (error) {
      console.error('🦷 Dialog: Error updating treatment:', error)
      notify.error('فشل في تحديث العلاج')
      // رمي الخطأ فقط إذا كان خطأ حقيقي في التحديث
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteTreatment = async (id: string) => {
    try {
      setIsLoading(true)
      await deleteToothTreatment(id)
      notify.success('تم حذف العلاج بنجاح')
      // إعادة تحميل البيانات في الرسم البياني للأسنان
      onTreatmentUpdate?.()
    } catch (error) {
      notify.error('فشل في حذف العلاج')
      console.error('Error deleting treatment:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleReorderTreatments = async (treatmentIds: string[]) => {
    if (!toothNumber) return

    try {
      setIsLoading(true)

      // Optimistic update: Update local state immediately for better UX
      const currentTreatments = toothTreatments.filter(
        t => t.patient_id === patientId && t.tooth_number === toothNumber
      )

      console.log('Reordering treatments:', {
        patientId,
        toothNumber,
        treatmentIds,
        currentTreatments: currentTreatments.map(t => ({ id: t.id, priority: t.priority }))
      })

      await reorderToothTreatments(patientId, toothNumber, treatmentIds)

      // Reload treatments to ensure consistency
      await loadToothTreatmentsByTooth(patientId, toothNumber)

      notify.success('تم إعادة ترتيب العلاجات بنجاح')
    } catch (error) {
      notify.error('فشل في إعادة ترتيب العلاجات')
      console.error('Error reordering treatments:', error)

      // Reload treatments to revert any optimistic updates
      await loadToothTreatmentsByTooth(patientId, toothNumber)
    } finally {
      setIsLoading(false)
    }
  }

  // Image handling functions
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>, imageType: string) => {
    const files = Array.from(event.target.files || [])
    const newImages = files.map(file => ({
      file,
      type: imageType,
      treatmentId: selectedTreatmentId && selectedTreatmentId !== 'none' ? selectedTreatmentId : undefined
    }))
    setSelectedImages(prev => [...prev, ...newImages])

    // Reset input value to allow selecting the same file again
    event.target.value = ''
  }

  const removeSelectedImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index))
  }

  const handleImagePreview = (imagePath: string) => {
    // Open image in a new window or modal
    if (window.electronAPI && window.electronAPI.files && window.electronAPI.files.openImagePreview) {
      window.electronAPI.files.openImagePreview(imagePath)
    } else {
      // Fallback: open in new tab
      window.open(`file://${imagePath}`, '_blank')
    }
  }

  // Get comparison images for a specific treatment
  const getComparisonImages = (treatmentId: string) => {
    const treatmentImages = (toothTreatmentImages || []).filter(img =>
      img.tooth_treatment_id === treatmentId &&
      img.tooth_number === toothNumber &&
      img.patient_id === patientId
    )

    const beforeImages = treatmentImages.filter(img => img.image_type === 'before')
    const afterImages = treatmentImages.filter(img => img.image_type === 'after')

    return { beforeImages, afterImages }
  }

  // Get treatments that have both before and after images
  const getTreatmentsWithComparisons = () => {
    return currentToothTreatments.filter(treatment => {
      const { beforeImages, afterImages } = getComparisonImages(treatment.id)
      return beforeImages.length > 0 && afterImages.length > 0
    })
  }

  const uploadImage = async (file: File, imageType: string): Promise<string> => {
    try {
      // Check if Electron API is available
      if (window.electronAPI && window.electronAPI.files && window.electronAPI.files.uploadDentalImage) {
        // Convert file to ArrayBuffer
        const arrayBuffer = await file.arrayBuffer()

        // Create unique filename with timestamp
        const timestamp = Date.now()
        const extension = file.name.split('.').pop() || 'jpg'
        const uniqueFileName = `${file.name.split('.')[0]}_${timestamp}.${extension}`

        // Upload file using Electron API with new parameters
        const filePath = await window.electronAPI.files.uploadDentalImage(
          arrayBuffer,
          uniqueFileName,
          patientId,
          toothNumber || 0,
          imageType,
          patient?.full_name || 'Unknown_Patient',
          toothInfo?.arabicName || `Tooth_${toothNumber}`
        )

        console.log('Image uploaded successfully:', filePath)
        return filePath
      } else {
        // Fallback: Save to public/upload directory
        console.warn('Electron API not available, using public/upload fallback')
        return await saveImageToPublicUpload(file, imageType)
      }
    } catch (error) {
      console.error('Error uploading image:', error)
      throw new Error('فشل في رفع الصورة')
    }
  }

  const saveImageToPublicUpload = async (file: File, imageType: string): Promise<string> => {
    try {
      // Convert file to base64
      const reader = new FileReader()

      return new Promise((resolve, reject) => {
        reader.onload = async () => {
          try {
            const base64Data = reader.result as string

            // Try to use Electron API for saving to public/upload
            if (window.electronAPI && window.electronAPI.files && window.electronAPI.files.saveDentalImage) {
              // Create unique filename with timestamp
              const timestamp = Date.now()
              const extension = file.name.split('.').pop() || 'jpg'
              const uniqueFileName = `${file.name.split('.')[0]}_${timestamp}.${extension}`

              const relativePath = await window.electronAPI.files.saveDentalImage(
                base64Data,
                uniqueFileName,
                patientId,
                toothNumber || 0,
                imageType,
                patient?.full_name || 'Unknown_Patient',
                toothInfo?.arabicName || `Tooth_${toothNumber}`
              )
              console.log('Image saved via Electron API:', relativePath)
              resolve(relativePath)
            } else {
              // Fallback: create a simulated path with new structure (Patient/ImageType/ToothName)
              const timestamp = Date.now()
              const extension = file.name.split('.').pop() || 'jpg'
              const cleanPatientName = (patient?.full_name || 'Unknown_Patient').replace(/[^a-zA-Z0-9\u0600-\u06FF\s]/g, '').replace(/\s+/g, '_')
              const cleanToothName = (toothInfo?.arabicName || `Tooth_${toothNumber}`).replace(/[^a-zA-Z0-9\u0600-\u06FF\s]/g, '').replace(/\s+/g, '_')
              const fileName = `${file.name.split('.')[0]}_${timestamp}.${extension}`
              const relativePath = `dental_images/${cleanPatientName}/${imageType || 'other'}/${fileName}`

              console.log('Using fallback path:', relativePath)
              resolve(relativePath)
            }
          } catch (error) {
            console.error('Error in saveImageToPublicUpload:', error)
            reject(error)
          }
        }

        reader.onerror = () => {
          console.error('Error reading file')
          reject(new Error('فشل في قراءة الملف'))
        }

        reader.readAsDataURL(file)
      })
    } catch (error) {
      console.error('Error in saveImageToPublicUpload:', error)
      throw new Error('فشل في حفظ الصورة')
    }
  }

  const handleSaveImages = async () => {
    if (selectedImages.length === 0) return

    try {
      setIsLoading(true)

      for (const item of selectedImages) {
        const imagePath = await uploadImage(item.file, item.type)
        const imageData = {
          tooth_treatment_id: item.treatmentId || null,
          patient_id: patientId,
          tooth_number: toothNumber,
          image_path: imagePath,
          image_type: item.type,
          description: `${item.type} - السن رقم ${toothNumber}`,
          taken_date: new Date().toISOString()
        }


        await createToothTreatmentImage(imageData)
      }

      // Clear selected images and reload all images for this patient
      setSelectedImages([])
      await loadAllToothTreatmentImagesByPatient(patientId)

      notify.success('تم حفظ الصور بنجاح')
    } catch (error) {
      notify.error('فشل في حفظ الصور')
      console.error('Error saving images:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteImage = async (imageId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الصورة؟')) {
      return
    }

    try {
      setIsLoading(true)
      await deleteToothTreatmentImage(imageId)

      // إعادة تحميل جميع الصور للمريض لتحديث العرض
      await loadAllToothTreatmentImagesByPatient(patientId)

      notify.success('تم حذف الصورة بنجاح')
    } catch (error) {
      notify.error('فشل في حذف الصورة')
      console.error('Error deleting image:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!toothInfo) return null

  const summary = getTreatmentSummary()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-right">
            <div
              className="w-8 h-8 rounded-lg border-2 border-white shadow-md flex items-center justify-center"
              style={{ backgroundColor: getPrimaryToothColor() }}
            >
              <span className="text-white font-bold text-sm">{toothNumber}</span>
            </div>
            <div>
              <h2 className="text-xl font-bold">تفاصيل السن رقم {toothNumber}</h2>
              <p className="text-base text-muted-foreground">{toothInfo.arabicName}</p>
            </div>
            {summary.total > 0 && (
              <Badge variant="secondary" className="mr-auto">
                <Layers className="w-4 h-4 ml-1" />
                {summary.total} علاج
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription className="text-right">
            المريض: {patient?.full_name}
          </DialogDescription>
          {summary.total > 0 && (
            <div className="flex gap-2 mt-2">
              {summary.completed > 0 && (
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  <CheckCircle className="w-3 h-3 ml-1" />
                  {summary.completed} مكتمل
                </Badge>
              )}
              {summary.inProgress > 0 && (
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  <Activity className="w-3 h-3 ml-1" />
                  {summary.inProgress} قيد التنفيذ
                </Badge>
              )}
              {summary.planned > 0 && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  <Clock className="w-3 h-3 ml-1" />
                  {summary.planned} مخطط
                </Badge>
              )}
              {summary.cancelled > 0 && (
                <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                  <AlertCircle className="w-3 h-3 ml-1" />
                  {summary.cancelled} ملغي
                </Badge>
              )}
            </div>
          )}
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" dir="rtl">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="treatments" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              العلاجات النشطة
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              العلاجات المكتملة ({summary.completed})
            </TabsTrigger>
            <TabsTrigger value="images" className="flex items-center gap-2">
              <Camera className="w-4 h-4" />
              الصور ({(toothTreatmentImages || []).filter(img => img.tooth_number === toothNumber && img.patient_id === patientId).length})
            </TabsTrigger>
          </TabsList>

          {/* Active Treatments Tab */}
          <TabsContent value="treatments" className="space-y-4" dir="rtl">
            <MultipleToothTreatments
              patientId={patientId}
              toothNumber={toothNumber}
              toothName={toothInfo.arabicName}
              treatments={currentToothTreatments.filter(t => t.treatment_status !== 'completed')}
              onAddTreatment={handleAddTreatment}
              onUpdateTreatment={handleUpdateTreatment}
              onDeleteTreatment={handleDeleteTreatment}
              onReorderTreatments={handleReorderTreatments}
              onSessionStatsUpdate={onSessionStatsUpdate}
              onTreatmentUpdate={onTreatmentUpdate}
            />
          </TabsContent>

          {/* Completed Treatments Tab */}
          <TabsContent value="completed" className="space-y-4" dir="rtl">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className={cn(
                    "w-5 h-5",
                    isDarkMode ? "text-green-400" : "text-green-600"
                  )} />
                  العلاجات المكتملة
                </CardTitle>
                <CardDescription>
                  جميع العلاجات التي تم إكمالها لهذا السن
                </CardDescription>
              </CardHeader>
              <CardContent>
                {currentToothTreatments.filter(t => t.treatment_status === 'completed').length === 0 ? (
                  <div className="text-center p-8 text-muted-foreground">
                    <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>لا توجد علاجات مكتملة لهذا السن</p>
                    <p className="text-sm">العلاجات المكتملة ستظهر هنا</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {currentToothTreatments
                      .filter(t => t.treatment_status === 'completed')
                      .sort((a, b) => a.priority - b.priority)
                      .map((treatment) => (
                        <Card key={treatment.id} className={cn(
                          "transition-all duration-200 hover:shadow-md",
                          isDarkMode
                            ? "border-green-700/50 bg-green-950/30 hover:bg-green-950/40"
                            : "border-green-200 bg-green-50 hover:bg-green-100/50"
                        )}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div
                                  className={cn(
                                    "w-4 h-4 rounded-full border",
                                    isDarkMode ? "border-white/30" : "border-white/50"
                                  )}
                                  style={{ backgroundColor: treatment.treatment_color }}
                                />
                                <div>
                                  <h4 className={cn(
                                    "font-medium",
                                    isDarkMode ? "text-green-200" : "text-green-800"
                                  )}>
                                    {getTreatmentByValue(treatment.treatment_type)?.label || treatment.treatment_type}
                                  </h4>
                                  <p className={cn(
                                    "text-sm",
                                    isDarkMode ? "text-green-300" : "text-green-600"
                                  )}>
                                    الأولوية: {treatment.priority}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <Badge variant="secondary" className={cn(
                                  "transition-colors",
                                  isDarkMode
                                    ? "bg-green-900/50 text-green-200 border-green-700/50"
                                    : "bg-green-100 text-green-800 border-green-200"
                                )}>
                                  <CheckCircle className="w-3 h-3 ml-1" />
                                  مكتمل
                                </Badge>
                                {treatment.completion_date && (
                                  <p className={cn(
                                    "text-xs mt-1",
                                    isDarkMode ? "text-green-300" : "text-green-600"
                                  )}>
                                    تاريخ الإكمال: {(() => {
                                      const date = new Date(treatment.completion_date)
                                      const day = date.getDate().toString().padStart(2, '0')
                                      const month = (date.getMonth() + 1).toString().padStart(2, '0')
                                      const year = date.getFullYear()
                                      return `${day}/${month}/${year}`
                                    })()}
                                  </p>
                                )}
                              </div>
                            </div>
                            {treatment.notes && (
                              <div className={cn(
                                "mt-3 p-3 rounded-lg text-sm transition-colors",
                                isDarkMode
                                  ? "bg-green-900/30 text-green-200 border border-green-700/30"
                                  : "bg-green-100 text-green-700 border border-green-200"
                              )}>
                                <strong>ملاحظات:</strong> {treatment.notes}
                              </div>
                            )}
                            {treatment.cost && (
                              <div className={cn(
                                "mt-3 p-3 rounded-lg text-sm font-medium transition-colors",
                                isDarkMode
                                  ? "bg-blue-900/30 text-blue-200 border border-blue-700/30"
                                  : "bg-blue-50 text-blue-700 border border-blue-200"
                              )}>
                                <div className="flex items-center justify-between">
                                  <span>التكلفة:</span>
                                  <CurrencyDisplay
                                    amount={treatment.cost}
                                    className="font-semibold"
                                  />
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Images Tab */}
          <TabsContent value="images" className="space-y-4" dir="rtl">
            {/* Image Upload Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  رفع صور جديدة
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Treatment Selection */}
                <div className="space-y-2">
                  <Label htmlFor="treatment-select">ربط الصور بعلاج محدد (اختياري)</Label>
                  <Select value={selectedTreatmentId} onValueChange={setSelectedTreatmentId}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر علاج لربط الصور به (أو اتركه فارغاً)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">بدون ربط بعلاج محدد</SelectItem>
                      {(toothTreatments || [])
                        .filter(treatment => treatment.patient_id === patientId && treatment.tooth_number === toothNumber)
                        .map((treatment) => (
                          <SelectItem key={treatment.id} value={treatment.id}>
                            {getTreatmentByValue(treatment.treatment_type)?.label || treatment.treatment_type} - {treatment.treatment_status === 'completed' ? 'مكتمل' :
                             treatment.treatment_status === 'in_progress' ? 'قيد التنفيذ' :
                             treatment.treatment_status === 'planned' ? 'مخطط' : 'ملغي'}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Image type selection buttons */}
                <div className="space-y-2">
                  <Label>اختر نوع الصورة لرفعها</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {IMAGE_TYPE_OPTIONS.map((type) => (
                      <Button
                        key={type.value}
                        variant="outline"
                        className="image-type-button h-auto p-4 flex flex-col items-center gap-2 min-h-[80px] border-2 border-dashed hover:border-solid transition-all duration-200"
                        asChild
                      >
                        <label htmlFor={`image-upload-${type.value}`} className="cursor-pointer w-full h-full flex flex-col items-center justify-center gap-2">
                          <span className="text-2xl">{type.icon}</span>
                          <span className="text-xs font-medium text-center leading-tight">{type.label}</span>
                          <input
                            id={`image-upload-${type.value}`}
                            type="file"
                            multiple
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleImageUpload(e, type.value)}
                          />
                        </label>
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Selected images preview */}
                {selectedImages.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">الصور المحددة للرفع:</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {selectedImages.map((item, index) => (
                        <div key={index} className="selected-image-preview relative group">
                          <div className="relative">
                            <img
                              src={URL.createObjectURL(item.file)}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-24 object-cover rounded-lg border-2 border-dashed border-gray-300"
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg" />
                            <Button
                              variant="destructive"
                              size="sm"
                              className="absolute -top-2 -right-2 w-6 h-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => removeSelectedImage(index)}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                          <div className="mt-1 text-xs text-center">
                            <div className="flex items-center justify-center gap-1">
                              <span>{IMAGE_TYPE_OPTIONS.find(t => t.value === item.type)?.icon}</span>
                              <span>{IMAGE_TYPE_OPTIONS.find(t => t.value === item.type)?.label}</span>
                            </div>
                            {item.treatmentId && (
                              <div className="text-blue-600 mt-1">
                                مربوط بعلاج: {(() => {
                                  const treatment = (toothTreatments || []).find(t => t.id === item.treatmentId)
                                  return treatment ? getTreatmentByValue(treatment.treatment_type)?.label || treatment.treatment_type : 'علاج'
                                })()}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Selected Images Preview */}
                {selectedImages.length > 0 && (
                  <div className="space-y-2">
                    <Label>الصور المحددة للرفع:</Label>
                    <div className="flex flex-wrap gap-2">
                      {selectedImages.map((item, index) => (
                        <div key={index} className="relative">
                          <Badge variant="outline" className="pr-6">
                            {item.file.name} ({item.type})
                            {item.treatmentId && (
                              <span className="text-blue-600 ml-1">
                                - {(() => {
                                  const treatment = (toothTreatments || []).find(t => t.id === item.treatmentId)
                                  return treatment ? getTreatmentByValue(treatment.treatment_type)?.label || treatment.treatment_type : 'علاج'
                                })()}
                              </span>
                            )}
                          </Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="absolute -top-1 -right-1 h-4 w-4 p-0"
                            onClick={() => setSelectedImages(prev => prev.filter((_, i) => i !== index))}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <Button onClick={handleSaveImages} disabled={isLoading} className="w-full">
                      <Upload className="w-4 h-4 ml-2" />
                      حفظ الصور ({selectedImages.length})
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Existing Images Display */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 justify-between">
                  <div className="flex items-center gap-2">
                    <Eye className="w-5 h-5" />
                    الصور المحفوظة ({(toothTreatmentImages || []).filter(img => img.tooth_number === toothNumber && img.patient_id === patientId).length})
                  </div>
                  {getTreatmentsWithComparisons().length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowComparison(!showComparison)}
                      className="flex items-center gap-2"
                    >
                      <GitCompare className="w-4 h-4" />
                      {showComparison ? 'إخفاء المقارنة' : 'مقارنة'}
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Comparison View */}
                {showComparison && getTreatmentsWithComparisons().length > 0 && (
                  <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-green-50 dark:from-gray-900 dark:to-gray-800 rounded-lg border border-blue-200 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <GitCompare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">مقارنة الصور</h3>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
                      <Label htmlFor="comparison-treatment" className="text-sm font-medium text-gray-700 dark:text-gray-200 whitespace-nowrap">
                        اختر العلاج للمقارنة:
                      </Label>
                      <Select
                        value={selectedComparisonTreatment}
                        onValueChange={setSelectedComparisonTreatment}
                      >
                        <SelectTrigger className="w-full sm:w-64 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-500 text-gray-900 dark:text-gray-100">
                          <SelectValue placeholder="اختر العلاج..." />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-500">
                          {getTreatmentsWithComparisons().map((treatment) => (
                            <SelectItem key={treatment.id} value={treatment.id} className="text-gray-900 dark:text-gray-100 dark:hover:bg-gray-600">
                              {getTreatmentByValue(treatment.treatment_type)?.label || treatment.treatment_type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {!selectedComparisonTreatment && (
                      <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
                        <div className="text-gray-500 dark:text-gray-400">
                          <GitCompare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p className="text-sm">اختر علاجاً من القائمة أعلاه لعرض المقارنة</p>
                        </div>
                      </div>
                    )}

                    {selectedComparisonTreatment && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {(() => {
                          const { beforeImages, afterImages } = getComparisonImages(selectedComparisonTreatment)
                          const selectedTreatment = currentToothTreatments.find(t => t.id === selectedComparisonTreatment)

                          return (
                            <>
                              {/* Before Images */}
                              <div className="space-y-3">
                                <h4 className="font-medium text-center text-green-700 dark:text-green-300 flex items-center justify-center gap-2 bg-green-100 dark:bg-green-900/50 py-2 px-4 rounded-lg">
                                  <span className="w-3 h-3 bg-green-500 dark:bg-green-400 rounded-full shadow-sm"></span>
                                  قبل العلاج
                                </h4>
                                <div className="grid grid-cols-1 gap-3">
                                  {beforeImages.map((image) => (
                                    <div key={image.id} className="relative group">
                                      <div className="relative overflow-hidden rounded-lg border-2 border-green-300 dark:border-green-600 shadow-md hover:shadow-lg transition-shadow">
                                        <DentalImage
                                          imagePath={image.image_path}
                                          alt="قبل العلاج"
                                          className="w-full h-48 object-cover"
                                        />
                                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <Button
                                            variant="secondary"
                                            size="sm"
                                            className="w-8 h-8 p-0 bg-black/80 hover:bg-black/95 text-white border-2 border-white/30 hover:border-white/80 rounded-full backdrop-blur-sm shadow-lg transition-all duration-300"
                                            onClick={() => handleImagePreview(image.image_path)}
                                          >
                                            <Eye className="w-4 h-4" />
                                          </Button>
                                        </div>
                                      </div>
                                      {image.taken_date && (
                                        <p className="text-xs text-gray-600 dark:text-gray-300 text-center mt-1 bg-white dark:bg-gray-700 rounded px-2 py-1 shadow-sm">
                                          {new Date(image.taken_date).toLocaleDateString('en-GB')}
                                        </p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* After Images */}
                              <div className="space-y-3">
                                <h4 className="font-medium text-center text-blue-700 dark:text-blue-300 flex items-center justify-center gap-2 bg-blue-100 dark:bg-blue-900/50 py-2 px-4 rounded-lg">
                                  <span className="w-3 h-3 bg-blue-500 dark:bg-blue-400 rounded-full shadow-sm"></span>
                                  بعد العلاج
                                </h4>
                                <div className="grid grid-cols-1 gap-3">
                                  {afterImages.map((image) => (
                                    <div key={image.id} className="relative group">
                                      <div className="relative overflow-hidden rounded-lg border-2 border-blue-300 dark:border-blue-600 shadow-md hover:shadow-lg transition-shadow">
                                        <DentalImage
                                          imagePath={image.image_path}
                                          alt="بعد العلاج"
                                          className="w-full h-48 object-cover"
                                        />
                                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <Button
                                            variant="secondary"
                                            size="sm"
                                            className="w-8 h-8 p-0 bg-black/80 hover:bg-black/95 text-white border-2 border-white/30 hover:border-white/80 rounded-full backdrop-blur-sm shadow-lg transition-all duration-300"
                                            onClick={() => handleImagePreview(image.image_path)}
                                          >
                                            <Eye className="w-4 h-4" />
                                          </Button>
                                        </div>
                                      </div>
                                      {image.taken_date && (
                                        <p className="text-xs text-gray-600 dark:text-gray-300 text-center mt-1 bg-white dark:bg-gray-700 rounded px-2 py-1 shadow-sm">
                                          {new Date(image.taken_date).toLocaleDateString('en-GB')}
                                        </p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </>
                          )
                        })()}
                      </div>
                    )}

                    {selectedComparisonTreatment && (
                      <div className="mt-4 p-3 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm">
                        <p className="text-sm text-center text-gray-700 dark:text-gray-200">
                          <strong className="text-gray-900 dark:text-white">العلاج:</strong> {(() => {
                            const treatment = currentToothTreatments.find(t => t.id === selectedComparisonTreatment)
                            return treatment ? getTreatmentByValue(treatment.treatment_type)?.label || treatment.treatment_type : ''
                          })()}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {(toothTreatmentImages || []).filter(img => img.tooth_number === toothNumber && img.patient_id === patientId).length === 0 ? (
                  <div className="text-center p-8 text-muted-foreground">
                    <Camera className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>لا توجد صور محفوظة لهذا السن</p>
                    <p className="text-sm">قم برفع صور جديدة باستخدام النموذج أعلاه</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Group images by treatment */}
                    {currentToothTreatments.map((treatment) => {
                      const treatmentImages = (toothTreatmentImages || []).filter(img =>
                        img.tooth_treatment_id === treatment.id &&
                        img.tooth_number === toothNumber &&
                        img.patient_id === patientId
                      )



                      if (treatmentImages.length === 0) return null

                      return (
                        <Card key={treatment.id} className="treatment-images-card border-2 border-blue-200 dark:border-blue-700">
                          <CardHeader className="pb-3 bg-blue-50 dark:bg-blue-900/20">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                              <span className="font-medium text-blue-700 dark:text-blue-300">
                                {getTreatmentByValue(treatment.treatment_type)?.label || treatment.treatment_type}
                              </span>
                              <Badge variant="secondary" className="mr-auto bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300">
                                {treatmentImages.length} صورة
                              </Badge>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {IMAGE_TYPE_OPTIONS.map((imageType) => {
                              const typeImages = treatmentImages.filter(img => img.image_type === imageType.value)
                              if (typeImages.length === 0) return null

                              return (
                                <div key={imageType.value} className="space-y-2">
                                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                    <span className="image-type-icon">{imageType.icon}</span>
                                    <span className="image-type-label">{imageType.label}</span>
                                    <Badge variant="outline" className="text-xs">
                                      {typeImages.length}
                                    </Badge>
                                  </div>
                                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                    {typeImages.map((image) => (
                                      <div key={image.id} className="saved-image-card group relative bg-card border border-border rounded-lg p-2 hover:shadow-lg transition-all duration-300">
                                        <div className="relative overflow-hidden rounded-lg border border-border">
                                          <DentalImage
                                            imagePath={image.image_path}
                                            alt={image.description || imageType.label}
                                            className="w-full h-24 object-cover transition-transform group-hover:scale-105"
                                          />
                                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all" />

                                          {/* Action buttons */}
                                          <div className="absolute top-2 right-2 flex flex-row items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                            <Button
                                              variant="secondary"
                                              size="sm"
                                              className="w-8 h-8 p-0 bg-black/80 hover:bg-black/95 text-white border-2 border-white/30 hover:border-white/80 rounded-full backdrop-blur-sm shadow-lg transition-all duration-300"
                                              onClick={() => handleImagePreview(image.image_path)}
                                            >
                                              <Eye className="w-4 h-4" />
                                            </Button>
                                            <Button
                                              variant="destructive"
                                              size="sm"
                                              className="w-8 h-8 p-0 bg-red-500/90 hover:bg-red-500 dark:bg-red-600/90 dark:hover:bg-red-600 rounded-full shadow-lg transition-all duration-300"
                                              onClick={() => handleDeleteImage(image.id)}
                                            >
                                              <Trash2 className="w-4 h-4" />
                                            </Button>
                                          </div>
                                        </div>

                                        {/* Image info */}
                                        <div className="mt-2 space-y-1">
                                          {image.taken_date && (
                                            <p className="text-xs text-gray-600 dark:text-gray-300 text-center bg-white dark:bg-gray-700 rounded px-2 py-1 shadow-sm">
                                              {new Date(image.taken_date).toLocaleDateString('en-GB')}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )
                            })}
                          </CardContent>
                        </Card>
                      )
                    })}

                    {/* Images without treatment association */}
                    {(() => {
                      const unassociatedImages = (toothTreatmentImages || []).filter(img =>
                        !img.tooth_treatment_id &&
                        img.tooth_number === toothNumber &&
                        img.patient_id === patientId
                      )

                      if (unassociatedImages.length === 0) return null

                      return (
                        <Card className="unassociated-images-card border-2 border-gray-200 dark:border-gray-600">
                          <CardHeader className="pb-3 bg-gray-50 dark:bg-gray-800">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <span className="w-3 h-3 bg-gray-500 rounded-full"></span>
                              <span className="font-medium text-gray-700 dark:text-gray-300">
                                صور غير مرتبطة بعلاج محدد
                              </span>
                              <Badge variant="secondary" className="mr-auto">
                                {unassociatedImages.length} صورة
                              </Badge>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {IMAGE_TYPE_OPTIONS.map((imageType) => {
                              const typeImages = unassociatedImages.filter(img => img.image_type === imageType.value)
                              if (typeImages.length === 0) return null

                              return (
                                <div key={imageType.value} className="space-y-2">
                                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                    <span className="image-type-icon">{imageType.icon}</span>
                                    <span className="image-type-label">{imageType.label}</span>
                                    <Badge variant="outline" className="text-xs">
                                      {typeImages.length}
                                    </Badge>
                                  </div>
                                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                    {typeImages.map((image) => (
                                      <div key={image.id} className="saved-image-card group relative bg-card border border-border rounded-lg p-2 hover:shadow-lg transition-all duration-300">
                                        <div className="relative overflow-hidden rounded-lg border border-border">
                                          <DentalImage
                                            imagePath={image.image_path}
                                            alt={image.description || imageType.label}
                                            className="w-full h-24 object-cover transition-transform group-hover:scale-105"
                                          />
                                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all" />

                                          {/* Action buttons */}
                                          <div className="absolute top-2 right-2 flex flex-row items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                            <Button
                                              variant="secondary"
                                              size="sm"
                                              className="w-8 h-8 p-0 bg-black/80 hover:bg-black/95 text-white border-2 border-white/30 hover:border-white/80 rounded-full backdrop-blur-sm shadow-lg transition-all duration-300"
                                              onClick={() => handleImagePreview(image.image_path)}
                                            >
                                              <Eye className="w-4 h-4" />
                                            </Button>
                                            <Button
                                              variant="destructive"
                                              size="sm"
                                              className="w-8 h-8 p-0 bg-red-500/90 hover:bg-red-500 dark:bg-red-600/90 dark:hover:bg-red-600 rounded-full shadow-lg transition-all duration-300"
                                              onClick={() => handleDeleteImage(image.id)}
                                            >
                                              <Trash2 className="w-4 h-4" />
                                            </Button>
                                          </div>
                                        </div>

                                        {/* Image info */}
                                        <div className="mt-2 space-y-1">
                                          {image.taken_date && (
                                            <p className="text-xs text-gray-600 dark:text-gray-300 text-center bg-white dark:bg-gray-700 rounded px-2 py-1 shadow-sm">
                                              {new Date(image.taken_date).toLocaleDateString('en-GB')}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )
                            })}
                          </CardContent>
                        </Card>
                      )
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>


        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
