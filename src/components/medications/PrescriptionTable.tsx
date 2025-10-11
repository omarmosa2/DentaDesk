import React, { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { usePrescriptionStore } from '@/store/prescriptionStore'
import { formatDate } from '@/lib/utils'
import { notify } from '@/services/notificationService'
import {
  Edit,
  Trash2,
  FileText,
  User,
  Calendar,
  Pill,
  Printer,
  Eye,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import PrescriptionReceiptDialog from './PrescriptionReceiptDialog'
import ViewPrescriptionDialog from './ViewPrescriptionDialog'
import type { Prescription } from '@/types'

interface PrescriptionTableProps {
  prescriptions: Prescription[]
  onEdit: (prescription: Prescription | null) => void
  onDelete: (prescription: Prescription) => void
}

export default function PrescriptionTable({ prescriptions, onEdit, onDelete }: PrescriptionTableProps) {
  const { isLoading } = usePrescriptionStore()
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Printing state
  const [showPrintDialog, setShowPrintDialog] = useState(false)
  const [printingPrescription, setPrintingPrescription] = useState<Prescription | null>(null)

  // View state
  const [showViewDialog, setShowViewDialog] = useState(false)
  const [viewingPrescription, setViewingPrescription] = useState<Prescription | null>(null)

  const handleEdit = (prescription: Prescription) => {
    onEdit(prescription)
  }

  const handleDelete = (prescription: Prescription) => {
    onDelete(prescription)
  }

  const handlePrint = (prescription: Prescription) => {
    setPrintingPrescription(prescription)
    setShowPrintDialog(true)
  }

  const handleView = (prescription: Prescription) => {
    setViewingPrescription(prescription)
    setShowViewDialog(true)
  }

  // Pagination
  const totalCount = prescriptions.length
  const totalPages = Math.ceil(totalCount / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const paginatedPrescriptions = prescriptions.slice(startIndex, startIndex + pageSize)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handlePageSizeChange = (value: string) => {
    setPageSize(parseInt(value))
    setCurrentPage(1) // Reset to first page when changing page size
  }

  const handleViewEdit = (prescription: Prescription) => {
    setShowViewDialog(false)
    onEdit(prescription)
  }

  const handleViewPrint = (prescription: Prescription) => {
    setShowViewDialog(false)
    handlePrint(prescription)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">جاري تحميل الوصفات الطبية...</p>
        </div>
      </div>
    )
  }

  if (prescriptions.length === 0) {
    return (
      <div className="text-center py-8">
        <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
        <h3 className="text-lg font-medium mb-2">لا توجد وصفات طبية</h3>
        <p className="text-muted-foreground mb-4">
          لم يتم إنشاء أي وصفات طبية بعد
        </p>
        <Button onClick={() => onEdit(null)}>
          <FileText className="w-4 h-4 ml-2" />
          إنشاء وصفة طبية جديدة
        </Button>
      </div>
    )
  }

  return (
    <>
    <div className="rounded-md border" dir="rtl">
      <Table className="table-center-all">
        <TableHeader>
          <TableRow>
            <TableHead className="text-center w-[60px]">رقم</TableHead>
            <TableHead className="text-center">اسم المريض</TableHead>
            <TableHead className="text-center">الموعد</TableHead>
            <TableHead className="text-center">عدد الأدوية</TableHead>
            <TableHead className="text-center">تاريخ الوصفة</TableHead>
            <TableHead className="text-center">ملاحظات</TableHead>
            <TableHead className="text-center w-[120px]">الإجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedPrescriptions.map((prescription, index) => (
            <TableRow key={prescription.id} className="hover:bg-muted/50">
              <TableCell className="font-medium text-center">
                {startIndex + index + 1}
              </TableCell>
              <TableCell className="text-center">
                <div className="flex items-center justify-center gap-2">
                  <User className="w-4 h-4 text-blue-600" />
                  <span className="font-medium">
                    {prescription.patient?.full_name || 'غير محدد'}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-center">
                {prescription.appointment ? (
                  <div className="flex items-center justify-center gap-2">
                    <Calendar className="w-4 h-4 text-green-600" />
                    <span className="text-sm">
                      {prescription.appointment.title}
                    </span>
                  </div>
                ) : (
                  <span className="text-muted-foreground italic">لا يوجد موعد</span>
                )}
              </TableCell>
              <TableCell className="text-center">
                <div className="flex items-center justify-center gap-2">
                  <Pill className="w-4 h-4 text-purple-600" />
                  <Badge variant="secondary">
                    {prescription.medications?.length || 0} دواء
                  </Badge>
                </div>
              </TableCell>
              <TableCell className="text-center">
                <div className="text-sm">
                  {formatDate(prescription.prescription_date)}
                </div>
              </TableCell>
              <TableCell className="text-center">
                <div className="max-w-xs mx-auto">
                  {prescription.notes ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="text-sm text-muted-foreground cursor-help">
                            {prescription.notes}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">{prescription.notes}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <span className="text-muted-foreground italic">لا توجد ملاحظات</span>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleView(prescription)}
                    className="action-btn-view action-btn-icon"
                    title="عرض التفاصيل"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePrint(prescription)}
                    className="action-btn-print action-btn-icon"
                    title="طباعة الوصفة"
                  >
                    <Printer className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(prescription)}
                    className="action-btn-warning action-btn-icon"
                    title="تعديل الوصفة"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(prescription)}
                    className="action-btn-delete action-btn-icon"
                    title="حذف الوصفة"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2 py-4">
          <div className="flex items-center space-x-6 space-x-reverse lg:space-x-8">
            <div className="flex items-center space-x-2 space-x-reverse">
              <p className="text-sm font-medium arabic-enhanced">عدد الصفوف لكل صفحة</p>
              <Select
                value={`${pageSize}`}
                onValueChange={handlePageSizeChange}
              >
                <SelectTrigger className="h-8 w-[70px]">
                  <SelectValue placeholder={pageSize} />
                </SelectTrigger>
                <SelectContent side="top">
                  {[5, 10, 20, 30, 50].map((size) => (
                    <SelectItem key={size} value={`${size}`}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex w-[100px] items-center justify-center text-sm font-medium arabic-enhanced">
              صفحة {currentPage} من {totalPages}
            </div>

            <div className="flex items-center space-x-2 space-x-reverse">
              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 lg:flex"
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
              >
                <span className="sr-only">الذهاب إلى الصفحة الأولى</span>
                <ChevronsRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <span className="sr-only">الذهاب إلى الصفحة السابقة</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                <span className="sr-only">الذهاب إلى الصفحة التالية</span>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 lg:flex"
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages}
              >
                <span className="sr-only">الذهاب إلى الصفحة الأخيرة</span>
                <ChevronsLeft className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center space-x-2 space-x-reverse text-sm text-muted-foreground arabic-enhanced">
            عرض {startIndex + 1} إلى {Math.min(startIndex + pageSize, totalCount)} من {totalCount} نتيجة
          </div>
        </div>
      )}

      {/* Table Footer with Summary */}
      <div className="border-t bg-muted/30 px-4 py-3">
        <div className="flex items-center justify-between text-sm text-muted-foreground" dir="rtl">
          <div className="flex items-center gap-4">
            <span>إجمالي الوصفات: {prescriptions.length}</span>
            <span>
              إجمالي الأدوية: {prescriptions.reduce((total, prescription) =>
                total + (prescription.medications?.length || 0), 0
              )}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span>سجل الوصفات الطبية</span>
          </div>
        </div>
      </div>
    </div>

    {/* Print Dialog */}
    {printingPrescription && (
      <PrescriptionReceiptDialog
        open={showPrintDialog}
        onOpenChange={setShowPrintDialog}
        prescription={printingPrescription}
      />
    )}

    {/* View Dialog */}
    {viewingPrescription && (
      <ViewPrescriptionDialog
        open={showViewDialog}
        onOpenChange={setShowViewDialog}
        prescription={viewingPrescription}
        onEdit={handleViewEdit}
        onPrint={handleViewPrint}
      />
    )}
  </>
  )
}
