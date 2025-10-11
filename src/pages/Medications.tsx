import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { useMedicationStore } from '@/store/medicationStore'
import { usePrescriptionStore } from '@/store/prescriptionStore'
import { usePatientStore } from '@/store/patientStore'
import { formatCurrency, formatDate } from '@/lib/utils'
import { getCardStyles, getIconStyles } from '@/lib/cardStyles'
import { useRealTimeSync } from '@/hooks/useRealTimeSync'
import TimeFilter, { TimeFilterOptions } from '@/components/ui/time-filter'
import useTimeFilteredStats from '@/hooks/useTimeFilteredStats'
import { notify } from '@/services/notificationService'
import MedicationTable from '@/components/medications/MedicationTable'
import AddMedicationDialog from '@/components/medications/AddMedicationDialog'
import DeleteMedicationDialog from '@/components/medications/DeleteMedicationDialog'
import PrescriptionTable from '@/components/medications/PrescriptionTable'
import AddPrescriptionDialog from '@/components/medications/AddPrescriptionDialog'
import DeletePrescriptionDialog from '@/components/medications/DeletePrescriptionDialog'
import {
  Plus,
  Search,
  Filter,
  Download,
  RefreshCw,
  Pill,
  FileText,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronDown,
  X
} from 'lucide-react'
import type { Medication, Prescription } from '@/types'

export default function Medications() {
  const { medications, loadMedications, isLoading: medicationsLoading } = useMedicationStore()
  const {
    prescriptions,
    filteredPrescriptions,
    totalPrescriptions,
    recentPrescriptions,
    loadPrescriptions,
    setSearchQuery: setPrescriptionSearchQuery,
    setPatientFilter,
    setDateRangeFilter,
    clearFilters,
    isLoading: prescriptionsLoading
  } = usePrescriptionStore()
  const { patients, loadPatients } = usePatientStore()

  // Time filtering for prescriptions
  const prescriptionStats = useTimeFilteredStats({
    data: prescriptions,
    dateField: 'prescription_date',
    initialFilter: { preset: 'all', startDate: '', endDate: '' } // Show all data by default
  })

  // UI State
  const [activeTab, setActiveTab] = useState('prescriptions')
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // Medication dialogs
  const [showAddMedicationDialog, setShowAddMedicationDialog] = useState(false)
  const [showDeleteMedicationDialog, setShowDeleteMedicationDialog] = useState(false)
  const [editingMedication, setEditingMedication] = useState<Medication | null>(null)
  const [deletingMedication, setDeletingMedication] = useState<Medication | null>(null)

  // Prescription dialogs
  const [showAddPrescriptionDialog, setShowAddPrescriptionDialog] = useState(false)
  const [showDeletePrescriptionDialog, setShowDeletePrescriptionDialog] = useState(false)
  const [editingPrescription, setEditingPrescription] = useState<Prescription | null>(null)
  const [deletingPrescription, setDeletingPrescription] = useState<Prescription | null>(null)

  // Filters
  const [patientFilter, setPatientFilterLocal] = useState('all')
  const [dateRangeFilter, setDateRangeFilterLocal] = useState({ start: '', end: '' })

  // Enable real-time synchronization
  useRealTimeSync()

  // Load data on component mount
  useEffect(() => {
    loadMedications()
    loadPrescriptions()
    loadPatients()
  }, [loadMedications, loadPrescriptions, loadPatients])

  // Medication handlers
  const handleAddMedication = () => {
    setEditingMedication(null)
    setShowAddMedicationDialog(true)
  }

  const handleEditMedication = (medication: Medication) => {
    setEditingMedication(medication)
    setShowAddMedicationDialog(true)
  }

  const handleDeleteMedication = (medication: Medication) => {
    setDeletingMedication(medication)
    setShowDeleteMedicationDialog(true)
  }

  const handleCloseAddMedicationDialog = () => {
    setShowAddMedicationDialog(false)
    setEditingMedication(null)
  }

  const handleCloseDeleteMedicationDialog = () => {
    setShowDeleteMedicationDialog(false)
    setDeletingMedication(null)
  }

  // Prescription handlers
  const handleAddPrescription = () => {
    setEditingPrescription(null)
    setShowAddPrescriptionDialog(true)
  }

  const handleEditPrescription = (prescription: Prescription | null) => {
    setEditingPrescription(prescription)
    setShowAddPrescriptionDialog(true)
  }

  const handleDeletePrescription = (prescription: Prescription) => {
    setDeletingPrescription(prescription)
    setShowDeletePrescriptionDialog(true)
  }

  const handleCloseAddPrescriptionDialog = () => {
    setShowAddPrescriptionDialog(false)
    setEditingPrescription(null)
  }

  const handleCloseDeletePrescriptionDialog = () => {
    setShowDeletePrescriptionDialog(false)
    setDeletingPrescription(null)
  }

  // Filter handlers
  const handlePatientFilterChange = (value: string) => {
    setPatientFilterLocal(value)
    setPatientFilter(value)
  }

  const handleDateRangeChange = (field: 'start' | 'end', value: string) => {
    const newRange = { ...dateRangeFilter, [field]: value }
    setDateRangeFilterLocal(newRange)
    setDateRangeFilter(newRange)
  }

  const handleClearFilters = () => {
    setPatientFilterLocal('all')
    setDateRangeFilterLocal({ start: '', end: '' })
    setPrescriptionSearchQuery('')
    clearFilters()
  }

  const handleRefresh = async () => {
    try {
      await Promise.all([
        loadMedications(),
        loadPrescriptions(),
        loadPatients()
      ])
      notify.success('تم تحديث البيانات بنجاح')
    } catch (error) {
      notify.error('فشل في تحديث البيانات')
    }
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between" dir="rtl">
        <div>
          <h1 className="text-3xl font-bold text-foreground text-right">الأدوية والوصفات الطبية</h1>
          <p className="text-muted-foreground mt-2 text-right">
            إدارة الأدوية والوصفات الطبية للمرضى
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={medicationsLoading || prescriptionsLoading}
          >
            <RefreshCw className={`w-4 h-4 ml-2 ${(medicationsLoading || prescriptionsLoading) ? 'animate-spin' : ''}`} />
            تحديث
          </Button>
          <Button onClick={activeTab === 'medications' ? handleAddMedication : handleAddPrescription}>
            <Plus className="w-4 h-4 ml-2" />
            {activeTab === 'medications' ? 'إضافة دواء' : 'إضافة وصفة طبية'}
          </Button>
        </div>
      </div>

      {/* Time Filter Section */}
      <TimeFilter
        value={prescriptionStats.timeFilter}
        onChange={prescriptionStats.handleFilterChange}
        onClear={prescriptionStats.resetFilter}
        title="فلترة زمنية - الوصفات الطبية"
        defaultOpen={false}
      />

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" dir="rtl">
        <Card className={getCardStyles('blue')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-right">إجمالي الأدوية</CardTitle>
            <Pill className={getIconStyles('blue')} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-right">{medications.length}</div>
            <p className="text-xs text-muted-foreground text-right">
              الأدوية المتاحة في النظام
            </p>
          </CardContent>
        </Card>

        <Card className={getCardStyles('green')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-right">
              {prescriptionStats.timeFilter.preset === 'all' || (!prescriptionStats.timeFilter.startDate && !prescriptionStats.timeFilter.endDate) ? 'إجمالي الوصفات' : 'الوصفات المفلترة'}
            </CardTitle>
            <FileText className={getIconStyles('green')} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-right">
              {prescriptionStats.timeFilter.preset === 'all' || (!prescriptionStats.timeFilter.startDate && !prescriptionStats.timeFilter.endDate)
                ? prescriptions.length
                : prescriptionStats.filteredData.length}
            </div>
            <p className="text-xs text-muted-foreground text-right">
              {prescriptionStats.timeFilter.preset === 'all' || (!prescriptionStats.timeFilter.startDate && !prescriptionStats.timeFilter.endDate)
                ? 'وصفات إجمالية'
                : 'وصفات في الفترة المحددة'}
            </p>
            {prescriptionStats.trend && (
              <div className={`text-xs flex items-center mt-1 ${
                prescriptionStats.trend.isPositive ? 'text-green-600' : 'text-red-600'
              }`}>
                <span>{Math.abs(prescriptionStats.trend.changePercent)}% من الفترة السابقة</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className={getCardStyles('purple')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-right">الوصفات الحديثة</CardTitle>
            <Clock className={getIconStyles('purple')} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-right">{recentPrescriptions}</div>
            <p className="text-xs text-muted-foreground text-right">
              آخر 30 يوماً
            </p>
          </CardContent>
        </Card>

        <Card className={getCardStyles('yellow')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-right">المرضى النشطون</CardTitle>
            <CheckCircle className={getIconStyles('yellow')} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-right">{patients.length}</div>
            <p className="text-xs text-muted-foreground text-right">
              المرضى المسجلون
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader dir="rtl">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-right">البحث والفلاتر</CardTitle>
              <CardDescription className="text-right">
                البحث في الأدوية والوصفات الطبية
              </CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4 ml-2" />
              {showFilters ? 'إخفاء الفلاتر' : 'إظهار الفلاتر'}
              <ChevronDown className={`w-4 h-4 mr-2 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4" dir="rtl">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder={activeTab === 'medications' ? 'البحث في الأدوية...' : 'البحث في الوصفات الطبية...'}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  if (activeTab === 'prescriptions') {
                    setPrescriptionSearchQuery(e.target.value)
                  }
                }}
                className="pr-10 text-right"
                dir="rtl"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('')
                    if (activeTab === 'prescriptions') {
                      setPrescriptionSearchQuery('')
                    }
                  }}
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>

            {/* Advanced Filters for Prescriptions */}
            {activeTab === 'prescriptions' && (
              <Collapsible open={showFilters} onOpenChange={setShowFilters}>
                <CollapsibleContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Patient Filter */}
                    <div>
                      <label className="text-sm font-medium text-right block mb-2">
                        فلترة حسب المريض
                      </label>
                      <Select value={patientFilter} onValueChange={handlePatientFilterChange}>
                        <SelectTrigger className="text-right" dir="rtl">
                          <SelectValue placeholder="اختر مريض" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">جميع المرضى</SelectItem>
                          {patients.map((patient) => (
                            <SelectItem key={patient.id} value={patient.id}>
                              {patient.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Date Range Filter */}
                    <div>
                      <label className="text-sm font-medium text-right block mb-2">
                        من تاريخ
                      </label>
                      <Input
                        type="date"
                        value={dateRangeFilter.start}
                        onChange={(e) => handleDateRangeChange('start', e.target.value)}
                        className="text-right"
                        dir="rtl"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-right block mb-2">
                        إلى تاريخ
                      </label>
                      <Input
                        type="date"
                        value={dateRangeFilter.end}
                        onChange={(e) => handleDateRangeChange('end', e.target.value)}
                        className="text-right"
                        dir="rtl"
                      />
                    </div>
                  </div>

                  {/* Clear Filters Button */}
                  <div className="flex justify-end">
                    <Button variant="outline" onClick={handleClearFilters}>
                      <X className="w-4 h-4 ml-2" />
                      مسح الفلاتر
                    </Button>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4" dir="rtl">
        <div className="flex items-center justify-between" dir="rtl">
          <TabsList className="grid w-fit grid-cols-2">
            <TabsTrigger value="prescriptions" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              الوصفات الطبية
            </TabsTrigger>
            <TabsTrigger value="medications" className="flex items-center gap-2">
              <Pill className="w-4 h-4" />
              إدارة الأدوية
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Prescriptions Tab */}
        <TabsContent value="prescriptions" className="space-y-4" dir="rtl">
          <Card>
            <CardHeader dir="rtl">
              <CardTitle className="flex items-center gap-2 text-right">
                <FileText className="w-5 h-5" />
                الوصفات الطبية
              </CardTitle>
              <CardDescription className="text-right">
                إدارة جميع الوصفات الطبية للمرضى
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PrescriptionTable
                prescriptions={filteredPrescriptions}
                onEdit={handleEditPrescription}
                onDelete={handleDeletePrescription}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Medications Management Tab */}
        <TabsContent value="medications" className="space-y-4" dir="rtl">
          <Card>
            <CardHeader dir="rtl">
              <CardTitle className="flex items-center gap-2 text-right">
                <Pill className="w-5 h-5" />
                إدارة الأدوية
              </CardTitle>
              <CardDescription className="text-right">
                إدارة معلومات الأدوية المتاحة
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MedicationTable
                medications={medications}
                onEdit={handleEditMedication}
                onDelete={handleDeleteMedication}
                searchQuery={searchQuery}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <AddMedicationDialog
        open={showAddMedicationDialog}
        onOpenChange={handleCloseAddMedicationDialog}
        editingMedication={editingMedication}
      />

      <DeleteMedicationDialog
        open={showDeleteMedicationDialog}
        onOpenChange={handleCloseDeleteMedicationDialog}
        medication={deletingMedication}
      />

      <AddPrescriptionDialog
        open={showAddPrescriptionDialog}
        onOpenChange={handleCloseAddPrescriptionDialog}
        editingPrescription={editingPrescription}
      />

      <DeletePrescriptionDialog
        open={showDeletePrescriptionDialog}
        onOpenChange={handleCloseDeletePrescriptionDialog}
        prescription={deletingPrescription}
      />
    </div>
  )
}
