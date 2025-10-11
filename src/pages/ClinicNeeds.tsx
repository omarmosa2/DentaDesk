import React, { useState, useEffect } from 'react'
import { useClinicNeedsStore } from '../store/clinicNeedsStore'
import { useSettingsStore } from '@/store/settingsStore'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import {
  ClipboardList,
  Plus,
  Package,
  DollarSign,
  AlertTriangle,
  Clock,
  Download,
  FileText
} from 'lucide-react'
import { formatCurrency } from '../lib/utils'
import { getCardStyles, getIconStyles } from '../lib/cardStyles'
import AddClinicNeedDialog from '../components/clinic-needs/AddClinicNeedDialog'
import DeleteClinicNeedDialog from '../components/clinic-needs/DeleteClinicNeedDialog'
import ClinicNeedsTable from '../components/clinic-needs/ClinicNeedsTable'
import ClinicNeedsFilters from '../components/clinic-needs/ClinicNeedsFilters'
import { useToast } from '@/hooks/use-toast'
import { ExportService } from '../services/exportService'
import { PdfService } from '../services/pdfService'
import { notify } from '../services/notificationService'
import type { ClinicNeed } from '../types'

const ClinicNeeds: React.FC = () => {
  const {
    needs,
    filteredNeeds,
    isLoading,
    error,
    searchQuery,
    filters,
    categories,
    suppliers,
    totalNeeds,
    totalValue,
    pendingCount,
    orderedCount,
    receivedCount,
    urgentCount,
    loadNeeds,
    deleteNeed,
    updateNeed,
    setSearchQuery,
    setFilters,
    clearError
  } = useClinicNeedsStore()

  const { settings } = useSettingsStore()

  const { toast } = useToast()
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [editingNeed, setEditingNeed] = useState<ClinicNeed | null>(null)
  const [deletingNeed, setDeletingNeed] = useState<ClinicNeed | null>(null)

  useEffect(() => {
    loadNeeds()
  }, [loadNeeds])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters({
      ...filters,
      [key]: value === 'all' ? undefined : value
    })
  }

  const handleAddNew = () => {
    setEditingNeed(null)
    setShowAddDialog(true)
  }

  const handleEdit = (need: ClinicNeed) => {
    setEditingNeed(need)
    setShowAddDialog(true)
  }

  const handleDelete = (need: ClinicNeed) => {
    setDeletingNeed(need)
    setShowDeleteDialog(true)
  }

  const handleMarkAsReceived = async (need: ClinicNeed) => {
    try {
      // تحديث حالة الاحتياج إلى "مستلم" مع الاحتفاظ بجميع البيانات الأخرى
      const updatedData = {
        serial_number: need.serial_number,
        need_name: need.need_name,
        quantity: need.quantity,
        price: need.price,
        description: need.description,
        category: need.category,
        priority: need.priority,
        status: 'received',
        supplier: need.supplier,
        notes: need.notes
      }

      await updateNeed(need.id, updatedData)
      toast({
        title: "تم تأكيد الاستلام",
        description: `تم تأكيد استلام "${need.need_name}" وتحديث حالته إلى مستلم`,
      })
    } catch (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تأكيد الاستلام",
        variant: "destructive",
      })
    }
  }

  const handleCloseAddDialog = () => {
    setShowAddDialog(false)
    setEditingNeed(null)
  }

  const handleCloseDeleteDialog = () => {
    setShowDeleteDialog(false)
    setDeletingNeed(null)
  }

  const handleClearFilters = () => {
    setSearchQuery('')
    setFilters({})
  }

  // StatCard component with consistent styling
  const StatCard = ({ title, value, icon, color = "blue" }: any) => (
    <Card className={getCardStyles(color)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
          </div>
          <div className={`text-2xl ${getIconStyles(color)}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-red-600">
              <p>حدث خطأ: {error}</p>
              <Button onClick={clearError} className="mt-2">
                إعادة المحاولة
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <ClipboardList className="w-8 h-8 text-primary" />
            احتياجات العيادة
          </h1>
          <p className="text-muted-foreground mt-1">
            إدارة احتياجات ومتطلبات العيادة
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="w-4 h-4 ml-2" />
                تصدير
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={async () => {
                  if (filteredNeeds.length === 0) {
                    notify.noDataToExport('لا توجد بيانات احتياجات للتصدير')
                    return
                  }
                  try {
                    await ExportService.exportClinicNeedsToCSV(filteredNeeds, `احتياجات_العيادة_${new Date().toISOString().split('T')[0]}`)
                    notify.exportSuccess(`تم تصدير ${filteredNeeds.length} احتياج بنجاح إلى ملف Excel!`)
                  } catch (error) {
                    console.error('Error exporting clinic needs (Excel):', error)
                    notify.exportError('فشل في تصدير بيانات الاحتياجات (Excel)')
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
                  if (filteredNeeds.length === 0) {
                    notify.noDataToExport('لا توجد بيانات احتياجات للتصدير')
                    return
                  }
                  try {
                    const clinicNeedsReportData = {
                      totalNeeds: totalNeeds,
                      totalCost: totalValue,
                      pendingNeeds: pendingCount,
                      orderedNeeds: orderedCount,
                      receivedNeeds: receivedCount,
                      totalRemaining: totalValue - (receivedCount > 0 ? filteredNeeds.filter(n => n.status === 'received').reduce((sum, n) => sum + (n.quantity * n.price), 0) : 0),
                      clinicNeedsList: filteredNeeds,
                      filterInfo: JSON.stringify(filters),
                      dataCount: filteredNeeds.length,
                    }
                    await PdfService.exportClinicNeedsReport(clinicNeedsReportData, settings)
                    notify.exportSuccess('تم تصدير احتياجات العيادة بنجاح إلى ملف PDF!')
                  } catch (error) {
                    console.error('Error exporting clinic needs (PDF):', error)
                    notify.exportError('فشل في تصدير بيانات الاحتياجات (PDF)')
                  }
                }}
                className="arabic-enhanced"
              >
                <FileText className="w-4 h-4 ml-2" />
                تصدير PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={handleAddNew} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            إضافة احتياج جديد
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="إجمالي المواد"
          value={totalNeeds}
          icon={<Package />}
          color="blue"
        />
        <StatCard
          title="إجمالي السعر"
          value={formatCurrency(totalValue)}
          icon={<DollarSign />}
          color="green"
        />
        <StatCard
          title="آجل"
          value={pendingCount}
          icon={<Clock />}
          color="yellow"
        />
        <StatCard
          title="عاجل"
          value={urgentCount}
          icon={<AlertTriangle />}
          color="red"
        />
      </div>

      {/* Filters */}
      <ClinicNeedsFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filters={filters}
        onFilterChange={handleFilterChange}
        categories={categories}
        suppliers={suppliers}
        onClearFilters={handleClearFilters}
      />

      {/* Needs List */}
      <Card>
        <CardHeader>
          <CardTitle>قائمة الاحتياجات</CardTitle>
          <CardDescription>
            عرض جميع احتياجات العيادة مع إمكانية التعديل والحذف
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ClinicNeedsTable
            needs={filteredNeeds}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onReceiveAndDelete={handleMarkAsReceived}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>

      {/* Dialogs */}
      <AddClinicNeedDialog
        open={showAddDialog}
        onOpenChange={handleCloseAddDialog}
        editingNeed={editingNeed}
      />

      <DeleteClinicNeedDialog
        open={showDeleteDialog}
        onOpenChange={handleCloseDeleteDialog}
        need={deletingNeed}
      />
    </div>
  )
}

export default ClinicNeeds
