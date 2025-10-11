import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { usePatientStore } from '@/store/patientStore'
import { useAppointmentStore } from '@/store/appointmentStore'
import { usePaymentStore } from '@/store/paymentStore'
import { calculateAge } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { useRealTimeSync } from '@/hooks/useRealTimeSync'
import { notify } from '@/services/notificationService'
import { ExportService } from '@/services/exportService'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import AddPatientDialog from '@/components/patients/AddPatientDialog'
import PatientTable from '@/components/patients/PatientTable'
import PatientDetailsModal from '@/components/patients/PatientDetailsModal'
import EditPatientDialog from '@/components/EditPatientDialog'
import ComprehensivePendingInvoiceDialog from '@/components/payments/ComprehensivePendingInvoiceDialog'
import { Patient } from '@/types'
import {
  Plus,
  Search,
  Trash2,
  Download,
  FileText,
  Filter,
  X
} from 'lucide-react'

interface PatientsProps {
  onNavigateToTreatments?: (tab: string) => void
  onNavigateToPayments?: (tab: string) => void
}

export default function Patients({ onNavigateToTreatments, onNavigateToPayments }: PatientsProps) {
  // Enable real-time synchronization for automatic updates
  useRealTimeSync()

  const {
    filteredPatients,
    
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    
    deletePatient,
    updatePatient,
    clearError,
    loadPatients
  } = usePatientStore()

  const { loadAppointments } = useAppointmentStore()
  const { loadPayments } = usePaymentStore()

  const { toast } = useToast()
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showPendingInvoiceDialog, setShowPendingInvoiceDialog] = useState(false)
  const [selectedPatientForDetails, setSelectedPatientForDetails] = useState<Patient | null>(null)
  const [selectedPatientForEdit, setSelectedPatientForEdit] = useState<Patient | null>(null)
  const [selectedPatientForPendingInvoice, setSelectedPatientForPendingInvoice] = useState<Patient | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [patientToDelete, setPatientToDelete] = useState<string | null>(null)

  // Filter states
  const [showFilters, setShowFilters] = useState(false)
  const [genderFilter, setGenderFilter] = useState('all')
  const [ageRangeFilter, setAgeRangeFilter] = useState('all')
  const [dateAddedFilter, setDateAddedFilter] = useState<{start: string, end: string}>({start: '', end: ''})

  // Load patients on component mount
  useEffect(() => {
    loadPatients()
    loadAppointments()
    loadPayments()
  }, [loadPatients, loadAppointments, loadPayments])

  // Check for search result navigation
  useEffect(() => {
    const searchResultData = localStorage.getItem('selectedPatientForDetails')
    if (searchResultData) {
      try {
        const { patient, openDetailsModal } = JSON.parse(searchResultData)
        if (openDetailsModal && patient) {
          setSelectedPatientForDetails(patient)
          setShowDetailsModal(true)
          localStorage.removeItem('selectedPatientForDetails')
        }
      } catch (error) {
        console.error('Error parsing search result data:', error)
        localStorage.removeItem('selectedPatientForDetails')
      }
    }
  }, [])

  const handleDeletePatient = async (patientId: string) => {
    setPatientToDelete(patientId)
    setShowDeleteDialog(true)
  }

  const confirmDeletePatient = async () => {
    if (!patientToDelete) return

    try {
      await deletePatient(patientToDelete)
      notify.deleteSuccess('تم حذف المريض بنجاح')
    } catch (error) {
      notify.deleteError('فشل في حذف المريض')
    } finally {
      setShowDeleteDialog(false)
      setPatientToDelete(null)
    }
  }

  const handleViewDetails = (patient: Patient) => {
    setSelectedPatientForDetails(patient)
    setShowDetailsModal(true)
  }

  const handleEditPatient = (patient: Patient) => {
    setSelectedPatientForEdit(patient)
    setShowEditDialog(true)
  }

  const handleViewPendingInvoice = (patient: Patient) => {
    setSelectedPatientForPendingInvoice(patient)
    setShowPendingInvoiceDialog(true)
  }

  const handleUpdatePatient = async (id: string, patientData: Partial<Patient>) => {
    try {
      await updatePatient(id, patientData)
      setShowEditDialog(false)
      setSelectedPatientForEdit(null)
      toast({
        title: "نجح",
        description: "تم تحديث بيانات المريض بنجاح",
      })
    } catch (error) {
      console.error('Error updating patient:', error)
      toast({
        title: "خطأ",
        description: "فشل في تحديث بيانات المريض. يرجى المحاولة مرة أخرى",
        variant: "destructive",
      })
    }
  }

  // Apply advanced filters to patients
  const filteredPatientsWithAdvancedFilters = React.useMemo(() => {
    let filtered = [...filteredPatients]

    // Gender filter
    if (genderFilter !== 'all') {
      filtered = filtered.filter(patient => patient.gender === genderFilter)
    }

    // Age range filter
    if (ageRangeFilter !== 'all') {
      filtered = filtered.filter(patient => {
        const ageValue = typeof (patient as any).age === 'number'
          ? (patient as any).age
          : (patient as any).date_of_birth
            ? calculateAge((patient as any).date_of_birth)
            : null

        if (ageValue == null) return ageRangeFilter === 'unknown'

        switch (ageRangeFilter) {
          case 'child': return ageValue < 18
          case 'adult': return ageValue >= 18 && ageValue < 60
          case 'senior': return ageValue >= 60
          case 'unknown': return false
          default: return true
        }
      })
    }

    // Date added filter
    if (dateAddedFilter.start && dateAddedFilter.end) {
      const startDate = new Date(dateAddedFilter.start)
      const endDate = new Date(dateAddedFilter.end)
      endDate.setHours(23, 59, 59, 999) // Include the entire end date

      filtered = filtered.filter(patient => {
        if (!patient.date_added) return false
        const patientDate = new Date(patient.date_added)
        return patientDate >= startDate && patientDate <= endDate
      })
    }

    return filtered
  }, [filteredPatients, genderFilter, ageRangeFilter, dateAddedFilter])

  // Clear all filters
  const clearAllFilters = () => {
    setSearchQuery('')
    setGenderFilter('all')
    setAgeRangeFilter('all')
    setDateAddedFilter({start: '', end: ''})
    setShowFilters(false)
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={clearError}>Try Again</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-start sm:items-center justify-between gap-4 flex-col sm:flex-row">
        <div>
          <h1 className="text-heading-1 text-foreground arabic-enhanced">إدارة المرضى</h1>
          <p className="text-body text-muted-foreground mt-2 arabic-enhanced">
            إدارة معلومات المرضى وسجلاتهم الطبية
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap space-x-2 space-x-reverse">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                <Download className="w-4 h-4 ml-2" />
                تصدير
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem
                onClick={async () => {
                  if (filteredPatientsWithAdvancedFilters.length === 0) {
                    notify.noDataToExport('لا توجد بيانات مرضى للتصدير')
                    return
                  }
                  try {
                    await ExportService.exportPatientsToExcel(filteredPatientsWithAdvancedFilters)
                    notify.exportSuccess(`تم تصدير ${filteredPatientsWithAdvancedFilters.length} مريض بنجاح إلى ملف Excel!`)
                  } catch (error) {
                    console.error('Error exporting patients (Excel):', error)
                    notify.exportError('فشل في تصدير بيانات المرضى (Excel)')
                  }
                }}
                className="arabic-enhanced"
              >
                <Download className="w-4 h-4 ml-2" />
                تصدير Excel
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={async () => {
                  if (filteredPatientsWithAdvancedFilters.length === 0) {
                    notify.noDataToExport('لا توجد بيانات مرضى للتصدير')
                    return
                  }
                  try {
                    await ExportService.exportPatientsToPDF(filteredPatientsWithAdvancedFilters)
                    notify.exportSuccess(`تم تصدير ${filteredPatientsWithAdvancedFilters.length} مريض كملف PDF بنجاح!`)
                  } catch (error) {
                    console.error('Error exporting patients (PDF):', error)
                    notify.exportError('فشل في تصدير بيانات المرضى (PDF)')
                  }
                }}
                className="arabic-enhanced"
              >
                <FileText className="w-4 h-4 ml-2" />
                تصدير PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => setShowAddDialog(true)} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 ml-2" />
            إضافة مريض جديد
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4" dir="rtl">
            <div className="flex items-stretch gap-4 flex-col md:flex-row" dir="rtl">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="البحث بالاسم أو الهاتف أو البريد الإلكتروني..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10 text-right"
                  dir="rtl"
                />
              </div>
              <Collapsible open={showFilters} onOpenChange={setShowFilters}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm" className="shrink-0 w-full md:w-auto">
                    <Filter className="w-4 h-4 mr-2" />
                    تصفية
                    {(genderFilter !== 'all' || ageRangeFilter !== 'all' || dateAddedFilter.start || dateAddedFilter.end) && (
                      <span className="mr-2 w-2 h-2 bg-primary rounded-full"></span>
                    )}
                  </Button>
                </CollapsibleTrigger>
              </Collapsible>
              {(searchQuery || genderFilter !== 'all' || ageRangeFilter !== 'all' || dateAddedFilter.start || dateAddedFilter.end) && (
                <Button variant="ghost" size="sm" onClick={clearAllFilters} className="shrink-0 w-full md:w-auto">
                  <X className="w-4 h-4 mr-2" />
                  مسح الكل
                </Button>
              )}
            </div>

            {/* Advanced Filters */}
            <Collapsible open={showFilters} onOpenChange={setShowFilters}>
              <CollapsibleContent className="space-y-4" dir="rtl">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg" dir="rtl">
                  {/* Gender Filter */}
                  <div className="space-y-2 text-right">
                    <label className="text-sm font-medium">الجنس</label>
                    <Select value={genderFilter} onValueChange={setGenderFilter} dir="rtl">
                      <SelectTrigger className="text-right">
                        <SelectValue placeholder="جميع الأجناس" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">جميع الأجناس</SelectItem>
                        <SelectItem value="male">ذكر</SelectItem>
                        <SelectItem value="female">أنثى</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Age Range Filter */}
                  <div className="space-y-2 text-right">
                    <label className="text-sm font-medium">الفئة العمرية</label>
                    <Select value={ageRangeFilter} onValueChange={setAgeRangeFilter} dir="rtl">
                      <SelectTrigger className="text-right">
                        <SelectValue placeholder="جميع الأعمار" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">جميع الأعمار</SelectItem>
                        <SelectItem value="child">أطفال (أقل من 18)</SelectItem>
                        <SelectItem value="adult">بالغين (18-59)</SelectItem>
                        <SelectItem value="senior">كبار السن (60+)</SelectItem>
                        <SelectItem value="unknown">غير محدد</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Date Added Filter */}
                  <div className="space-y-2 text-right">
                    <label className="text-sm font-medium">تاريخ الإضافة</label>
                    <div className="space-y-2">
                      <Input
                        type="date"
                        placeholder="من تاريخ"
                        value={dateAddedFilter.start}
                        onChange={(e) => setDateAddedFilter(prev => ({...prev, start: e.target.value}))}
                        className="text-right"
                        dir="rtl"
                      />
                      <Input
                        type="date"
                        placeholder="إلى تاريخ"
                        value={dateAddedFilter.end}
                        onChange={(e) => setDateAddedFilter(prev => ({...prev, end: e.target.value}))}
                        className="text-right"
                        dir="rtl"
                      />
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </CardContent>
      </Card>

      {/* Patient Table */}
      <div className="space-y-6">
        <PatientTable
          patients={filteredPatientsWithAdvancedFilters}
          isLoading={isLoading}
          onEdit={handleEditPatient}
          onDelete={handleDeletePatient}
          onViewDetails={handleViewDetails}
          onViewPendingInvoice={handleViewPendingInvoice}
        />
      </div>



      {/* Add Patient Dialog */}
      <AddPatientDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
      />

      {/* Patient Details Modal */}
      <PatientDetailsModal
        patient={selectedPatientForDetails}
        open={showDetailsModal}
        onOpenChange={setShowDetailsModal}
        onEdit={handleEditPatient}
        onNavigateToTreatments={onNavigateToTreatments}
        onNavigateToPayments={onNavigateToPayments}
      />

      {/* Edit Patient Dialog */}
      <EditPatientDialog
        isOpen={showEditDialog}
        patient={selectedPatientForEdit}
        onClose={() => {
          setShowEditDialog(false)
          setSelectedPatientForEdit(null)
        }}
        onSave={handleUpdatePatient}
      />

      {/* Comprehensive Pending Invoice Dialog */}
      <ComprehensivePendingInvoiceDialog
        patient={selectedPatientForPendingInvoice}
        open={showPendingInvoiceDialog}
        onOpenChange={(open) => {
          setShowPendingInvoiceDialog(open)
          if (!open) {
            setSelectedPatientForPendingInvoice(null)
          }
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-destructive" />
              تأكيد حذف المريض
            </AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذا المريض؟ سيتم حذف جميع البيانات المرتبطة به بما في ذلك المواعيد والمدفوعات.
              <br />
              <strong className="text-destructive">تحذير: لا يمكن التراجع عن هذا الإجراء!</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse">
            <AlertDialogAction
              onClick={confirmDeletePatient}
              className="bg-destructive hover:bg-destructive/90"
            >
              <Trash2 className="w-4 h-4 ml-2" />
              تأكيد الحذف
            </AlertDialogAction>
            <AlertDialogCancel>
              إلغاء
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
