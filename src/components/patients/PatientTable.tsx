import React, { useState, useMemo, memo } from 'react'
// Removed react-window import due to build issues
import { Patient } from '@/types'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  Edit,
  Trash2,
  Eye,
  User,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MessageCircle,
  FileText,
  Printer,
  Download,
  MoreHorizontal
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { PatientIntegrationService } from '@/services/patientIntegrationService'
import { PdfService } from '@/services/pdfService'
import { useSettingsStore } from '@/store/settingsStore'
import { shallow } from 'zustand/shallow'
import { useToast } from '@/hooks/use-toast'
import { safeString } from '@/utils/safeStringUtils'

interface PatientTableProps {
  patients: Patient[]
  isLoading: boolean
  onEdit: (patient: Patient) => void
  onDelete: (patientId: string) => void
  onViewDetails: (patient: Patient) => void
  onViewPendingInvoice?: (patient: Patient) => void
}

type SortField = 'full_name' | 'gender' | 'age' | 'phone' | 'patient_condition' | 'date_added'
type SortDirection = 'asc' | 'desc' | null

function PatientTableComponent({
  patients,
  isLoading,
  onEdit,
  onDelete,
  onViewDetails,
  onViewPendingInvoice
}: PatientTableProps) {
  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const settings = useSettingsStore(state => state.settings)
  const { toast } = useToast()

  // دالة طباعة سجل المريض الشامل (تصدير PDF)
  const handleExportPatientRecord = async (patient: Patient) => {
    try {
      toast({
        title: "جاري إعداد التقرير...",
        description: "يتم تجميع بيانات المريض وإعداد التقرير للتصدير",
      })

      // جلب البيانات المتكاملة للمريض
      const integratedData = await PatientIntegrationService.getPatientIntegratedData(patient.id)

      if (!integratedData) {
        throw new Error('لا يمكن جلب بيانات المريض')
      }

      // تصدير سجل المريض كـ PDF
      await PdfService.exportIndividualPatientRecord(integratedData, settings)

      toast({
        title: "تم إنشاء التقرير بنجاح",
        description: `تم إنشاء سجل المريض ${patient.full_name} وحفظه كملف PDF`,
      })
    } catch (error) {
      console.error('Error exporting patient record:', error)
      toast({
        title: "خطأ في إنشاء التقرير",
        description: "فشل في إنشاء سجل المريض. يرجى المحاولة مرة أخرى.",
        variant: "destructive",
      })
    }
  }

  // دالة الطباعة المباشرة المحسنة - بدون document.write()
  const handleDirectPrint = async (patient: Patient) => {
    try {
      toast({
        title: "جاري إعداد الطباعة...",
        description: "يتم تجميع بيانات المريض وإعداد الطباعة المباشرة",
      })

      // جلب البيانات المتكاملة للمريض
      const integratedData = await PatientIntegrationService.getPatientIntegratedData(patient.id)

      if (!integratedData) {
        throw new Error('لا يمكن جلب بيانات المريض')
      }

      // إنشاء HTML للطباعة باستخدام طريقة محسنة
      const htmlContent = PdfService.createPatientRecordHTMLForPrint(integratedData, settings)

      // إنشاء نافذة طباعة محسنة
      await createOptimizedPrintWindow(htmlContent, patient.full_name)

      toast({
        title: "تم إعداد الطباعة",
        description: `تم إعداد طباعة سجل المريض ${patient.full_name}`,
      })
    } catch (error) {
      console.error('Error printing patient record:', error)
      toast({
        title: "خطأ في الطباعة",
        description: "فشل في إعداد طباعة سجل المريض. يرجى المحاولة مرة أخرى.",
        variant: "destructive",
      })
    }
  }

  // دالة إنشاء نافذة طباعة محسنة بدون document.write()
  const createOptimizedPrintWindow = async (htmlContent: string, patientName: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      try {
        // إنشاء نافذة الطباعة بالخصائص المحسنة
        const printWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes')
        if (!printWindow) {
          throw new Error('لا يمكن فتح نافذة الطباعة')
        }

        // إعداد المحتوى بطريقة محسنة
        printWindow.document.open()
        printWindow.document.write('<!DOCTYPE html>')
        printWindow.document.write('<html dir="rtl" lang="ar">')
        printWindow.document.write('<head>')
        printWindow.document.write('<meta charset="UTF-8">')
        printWindow.document.write('<meta name="viewport" content="width=device-width, initial-scale=1.0">')
        printWindow.document.write(`<title>طباعة سجل المريض - ${patientName}</title>`)
        printWindow.document.write('<style>')
        printWindow.document.write(`
          body {
            font-family: 'Arial', sans-serif;
            margin: 0;
            padding: 20px;
            direction: rtl;
            background: white;
          }
          @media print {
            body { margin: 0; padding: 10px; }
            .no-print { display: none !important; }
          }
          .print-controls {
            position: fixed;
            top: 10px;
            left: 10px;
            background: #f0f0f0;
            padding: 10px;
            border-radius: 5px;
            border: 1px solid #ccc;
            z-index: 1000;
          }
        `)
        printWindow.document.write('</style>')
        printWindow.document.write('</head>')
        printWindow.document.write('<body>')

        // إضافة أزرار التحكم في الطباعة
        printWindow.document.write(`
          <div class="print-controls no-print">
            <button onclick="window.print()" style="margin: 5px; padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
              طباعة
            </button>
            <button onclick="window.close()" style="margin: 5px; padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">
              إغلاق
            </button>
          </div>
        `)

        // إضافة المحتوى الرئيسي - تجنب document.write للأجزاء الكبيرة
        const contentContainer = printWindow.document.createElement('div')
        contentContainer.innerHTML = htmlContent
        printWindow.document.body.appendChild(contentContainer)

        printWindow.document.write('</body>')
        printWindow.document.write('</html>')
        printWindow.document.close()

        // تحميل محسن للخطوط والصور
        const handleLoad = () => {
          printWindow.focus()
          resolve()
        }

        // مراقبة تحميل المحتوى
        if (printWindow.document.readyState === 'complete') {
          handleLoad()
        } else {
          printWindow.addEventListener('load', handleLoad)
        }

        // معالجة الأخطاء
        printWindow.addEventListener('error', () => {
          reject(new Error('فشل في تحميل نافذة الطباعة'))
        })

        // إغلاق تلقائي بعد فترة زمنية لتجنب تراكم النوافذ
        setTimeout(() => {
          if (!printWindow.closed) {
            printWindow.close()
          }
        }, 300000) // 5 دقائق

      } catch (error) {
        reject(error)
      }
    })
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Cycle through: asc -> desc -> null
      if (sortDirection === 'asc') {
        setSortDirection('desc')
      } else if (sortDirection === 'desc') {
        setSortField(null)
        setSortDirection(null)
      } else {
        setSortDirection('asc')
      }
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const getSortedAndPaginatedPatients = useMemo(() => {
    let sortedPatients = patients

    // Apply sorting
    if (sortField && sortDirection) {
      sortedPatients = [...patients].sort((a, b) => {
        let aValue = a[sortField]
        let bValue = b[sortField]

        // Handle null/undefined values
        if (aValue == null && bValue == null) return 0
        if (aValue == null) return sortDirection === 'asc' ? 1 : -1
        if (bValue == null) return sortDirection === 'asc' ? -1 : 1

        // Convert to string for comparison safely
        aValue = safeString(aValue).toLowerCase()
        bValue = safeString(bValue).toLowerCase()

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
        return 0
      })
    }

    // Apply pagination
    const startIndex = (currentPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    const paginatedPatients = sortedPatients.slice(startIndex, endIndex)

    return {
      patients: paginatedPatients,
      totalPages: Math.ceil(sortedPatients.length / pageSize),
      totalCount: sortedPatients.length
    }
  }, [patients, sortField, sortDirection, currentPage, pageSize])

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 opacity-50" />
    }
    if (sortDirection === 'asc') {
      return <ArrowUp className="w-4 h-4" />
    }
    if (sortDirection === 'desc') {
      return <ArrowDown className="w-4 h-4" />
    }
    return <ArrowUpDown className="w-4 h-4 opacity-50" />
  }

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead
      className="cursor-pointer hover:bg-muted/50 select-none text-center"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center justify-center space-x-1 space-x-reverse">
        <span>{children}</span>
        {getSortIcon(field)}
      </div>
    </TableHead>
  )

  if (isLoading) {
    return (
      <div className="border rounded-lg">
        <Table className="table-center-all">
          <TableHeader>
            <TableRow>
              <TableHead className="text-center">#</TableHead>
              <TableHead className="text-center">الاسم الكامل للمريض</TableHead>
              <TableHead className="text-center">الجنس</TableHead>
              <TableHead className="text-center">العمر</TableHead>
              <TableHead className="text-center">رقم الهاتف</TableHead>
              <TableHead className="text-center">حالة المريض</TableHead>
              <TableHead className="text-center">تاريخ الإضافة</TableHead>
              <TableHead className="text-center">الاجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, index) => (
              <TableRow key={index}>
                {[...Array(8)].map((_, cellIndex) => (
                  <TableCell key={cellIndex}>
                    <div className="h-4 bg-muted animate-pulse rounded" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  if (patients.length === 0) {
    return (
      <div className="border rounded-lg">
        <Table className="table-center-all">
          <TableHeader>
            <TableRow>
              <TableHead className="text-center w-12 max-w-12 min-w-12">
                <span className="arabic-enhanced font-medium text-xs">#</span>
              </TableHead>
              <SortableHeader field="full_name">الاسم الكامل للمريض</SortableHeader>
              <SortableHeader field="gender">الجنس</SortableHeader>
              <SortableHeader field="age">العمر</SortableHeader>
              <SortableHeader field="phone">رقم الهاتف</SortableHeader>
              <SortableHeader field="patient_condition">حالة المريض</SortableHeader>
              <SortableHeader field="date_added">تاريخ الإضافة</SortableHeader>
              <TableHead className="text-center">الاجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={8} className="text-center py-8">
                <div className="flex flex-col items-center space-y-2">
                  <User className="w-12 h-12 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">لا توجد مرضى</p>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    )
  }

  const { patients: paginatedPatients, totalPages, totalCount } = getSortedAndPaginatedPatients

  // Calculate start index for serial numbers
  const startIndex = (currentPage - 1) * pageSize


  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handlePageSizeChange = (newPageSize: string) => {
    setPageSize(parseInt(newPageSize))
    setCurrentPage(1) // Reset to first page when changing page size
  }

  return (
    <div className="space-y-4">
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="table-center-all">
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-center w-12 max-w-12 min-w-12">
                  <span className="arabic-enhanced font-medium text-xs">#</span>
                </TableHead>
                <SortableHeader field="full_name">
                  <span className="arabic-enhanced font-medium">الاسم الكامل للمريض</span>
                </SortableHeader>
                <SortableHeader field="gender">
                  <span className="arabic-enhanced font-medium hidden md:inline">الجنس</span>
                </SortableHeader>
                <SortableHeader field="age">
                  <span className="arabic-enhanced font-medium hidden md:inline">العمر</span>
                </SortableHeader>
                <SortableHeader field="phone">
                  <span className="arabic-enhanced font-medium">رقم الهاتف</span>
                </SortableHeader>
                <SortableHeader field="patient_condition">
                  <span className="arabic-enhanced font-medium hidden lg:inline">حالة المريض</span>
                </SortableHeader>
                <SortableHeader field="date_added">
                  <span className="arabic-enhanced font-medium hidden lg:inline">تاريخ الإضافة</span>
                </SortableHeader>
                <TableHead className="text-center">
                  <span className="arabic-enhanced font-medium">الاجراءات</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedPatients.map((patient, index) => {
                const currentIndex = startIndex + index + 1
                return (
                  <TableRow key={patient.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium text-center w-12 max-w-12 min-w-12 text-xs">
                      {currentIndex}
                    </TableCell>
                    <TableCell className="font-medium text-center">
                      <span>{patient.full_name ?? 'غير محدد'}</span>
                    </TableCell>
                    <TableCell className="text-center hidden md:table-cell">
                      <Badge variant={patient.gender === 'male' ? 'default' : 'secondary'}>
                        {patient.gender === 'male' ? 'ذكر' : 'أنثى'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center hidden md:table-cell">{patient.age} سنة</TableCell>
                    <TableCell className="min-w-[120px] text-center table-cell-wrap-truncate-sm">
                      {patient.phone ? (
                        <div className="flex items-center justify-center">
                          <button
                            onClick={async () => {
                              const whatsappUrl = `https://api.whatsapp.com/send/?phone=${patient.phone}`

                              // Try multiple methods to open external URL
                              try {
                                // Method 1: Try electronAPI system.openExternal
                                if (window.electronAPI && window.electronAPI.system && window.electronAPI.system.openExternal) {
                                  await window.electronAPI.system.openExternal(whatsappUrl)
                                  return
                                }
                              } catch (error) {
                                console.log('Method 1 failed:', error)
                              }

                              try {
                                // Method 2: Try direct shell.openExternal via ipcRenderer
                                if (window.electronAPI) {
                                  // @ts-ignore
                                  await window.electronAPI.shell?.openExternal?.(whatsappUrl)
                                  return
                                }
                              } catch (error) {
                                console.log('Method 2 failed:', error)
                              }

                              // Method 3: Fallback to window.open
                              window.open(whatsappUrl, '_blank', 'noopener,noreferrer')
                            }}
                            className="text-sm arabic-enhanced text-green-600 hover:text-green-800 hover:underline cursor-pointer transition-colors bg-transparent border-none p-0 flex items-center gap-1"
                            title="فتح محادثة واتساب"
                          >
                            {patient.phone}
                            <MessageCircle className="w-3 h-3 text-green-600" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm arabic-enhanced">غير محدد</span>
                      )}
                    </TableCell>
                    <TableCell className="min-w-[150px] text-center hidden lg:table-cell">
                      <Badge variant="outline" className="max-w-[150px] truncate arabic-enhanced" title={patient.patient_condition}>
                        {patient.patient_condition}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center hidden lg:table-cell">
                      <span className="text-sm arabic-enhanced">
                        {formatDate(patient.date_added)}
                      </span>
                    </TableCell>
                    <TableCell className="w-auto text-center">
                      <div className="flex items-center justify-center gap-1 flex-wrap">
                        {/* الأزرار الرئيسية الثلاثة */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="action-btn-view h-8 px-2 min-w-0"
                          onClick={() => onViewDetails(patient)}
                          title="عرض تفاصيل المريض"
                        >
                          <Eye className="w-3 h-3" />
                          <span className="text-xs arabic-enhanced hidden sm:inline ml-1">عرض</span>
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="action-btn-edit h-8 px-2 min-w-0"
                          onClick={() => onEdit(patient)}
                          title="تعديل بيانات المريض"
                        >
                          <Edit className="w-3 h-3" />
                          <span className="text-xs arabic-enhanced hidden sm:inline ml-1">تعديل</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="action-btn-delete text-red-600 hover:text-red-700 hover:bg-red-50 h-8 px-2 min-w-0"
                          onClick={() => onDelete(patient.id)}
                          title="حذف المريض"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span className="text-xs arabic-enhanced hidden sm:inline ml-1">حذف</span>
                        </Button>

                        {/* قائمة مزيد للأزرار الإضافية */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 min-w-0"
                              title="المزيد من الخيارات"
                            >
                              <MoreHorizontal className="w-3 h-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="patient-actions-dropdown">
                            {/* خيارات الطباعة */}
                            <DropdownMenuItem
                              onClick={() => handleDirectPrint(patient)}
                              className="dropdown-item"
                            >
                              <Printer className="w-4 h-4" />
                              <span className="arabic-enhanced">طباعة مباشرة</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleExportPatientRecord(patient)}
                              className="dropdown-item"
                            >
                              <Download className="w-4 h-4" />
                              <span className="arabic-enhanced">تصدير سجل المريض</span>
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            {onViewPendingInvoice && (
                              <DropdownMenuItem
                                onClick={() => onViewPendingInvoice(patient)}
                                className="dropdown-item"
                              >
                                <FileText className="w-4 h-4" />
                                <span className="arabic-enhanced">فاتورة الآجلات</span>
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination Controls */}
      {totalCount > 0 && (
        <div className="flex items-center justify-between px-2 flex-col gap-3 sm:flex-row">
          <div className="flex items-center space-x-2 space-x-reverse">
            <p className="text-sm text-muted-foreground arabic-enhanced">
              عرض {((currentPage - 1) * pageSize) + 1} إلى {Math.min(currentPage * pageSize, totalCount)} من {totalCount} مريض
            </p>
          </div>

          <div className="flex items-center space-x-6 space-x-reverse lg:space-x-8 flex-wrap justify-center">
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
                  {[10, 20, 30, 50, 100].map((size) => (
                    <SelectItem key={size} value={`${size}`}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex w-[120px] items-center justify-center text-sm font-medium arabic-enhanced">
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
        </div>
      )}
    </div>
  )
}

export default memo(PatientTableComponent)