import React, { useState, useMemo } from 'react'
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
import { useLabStore } from '@/store/labStore'
import { useLabOrderStore } from '@/store/labOrderStore'
import { formatDate } from '@/lib/utils'
import { notify } from '@/services/notificationService'
import {
  Edit,
  Trash2,
  Building2,
  MapPin,
  TestTube,
  MoreHorizontal,
  MessageCircle,
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
import type { Lab } from '@/types'

interface LabTableProps {
  labs: Lab[]
  onEdit: (lab: Lab) => void
  onDelete: (lab: Lab) => void
  searchQuery: string
}

export default function LabTable({ labs, onEdit, onDelete, searchQuery }: LabTableProps) {
  const { isLoading } = useLabStore()
  const { getOrdersByLab } = useLabOrderStore()
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Filter labs based on search query
  const filteredLabs = labs.filter(lab =>
    lab.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (lab.contact_info && lab.contact_info.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (lab.address && lab.address.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  // Pagination
  const totalCount = filteredLabs.length
  const totalPages = Math.ceil(totalCount / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const paginatedLabs = filteredLabs.slice(startIndex, startIndex + pageSize)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handlePageSizeChange = (value: string) => {
    setPageSize(parseInt(value))
    setCurrentPage(1) // Reset to first page when changing page size
  }

  const handleEdit = (lab: Lab) => {
    onEdit(lab)
  }

  const handleDelete = (lab: Lab) => {
    // Check if lab has any orders
    const labOrders = getOrdersByLab(lab.id)
    if (labOrders.length > 0) {
      notify.warning(`لا يمكن حذف المختبر "${lab.name}" لأنه يحتوي على ${labOrders.length} طلب`)
      return
    }
    onDelete(lab)
  }

  const getLabOrdersCount = (labId: string) => {
    return getOrdersByLab(labId).length
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-muted-foreground">جاري تحميل المختبرات...</p>
        </div>
      </div>
    )
  }

  if (filteredLabs.length === 0) {
    return (
      <div className="text-center py-8">
        <Building2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold text-muted-foreground mb-2">
          {searchQuery ? 'لا توجد نتائج' : 'لا توجد مختبرات'}
        </h3>
        <p className="text-muted-foreground">
          {searchQuery
            ? `لم يتم العثور على مختبرات تطابق "${searchQuery}"`
            : 'لم يتم إضافة أي مختبرات بعد'
          }
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-md border" dir="rtl">
      <Table className="table-center-all">
        <TableHeader>
          <TableRow>
            <TableHead className="text-center">#</TableHead>
            <TableHead className="text-center">اسم المختبر</TableHead>
            <TableHead className="text-center">معلومات الاتصال</TableHead>
            <TableHead className="text-center">العنوان</TableHead>
            <TableHead className="text-center">عدد الطلبات</TableHead>
            <TableHead className="text-center">تاريخ الإضافة</TableHead>
            <TableHead className="text-center w-[100px]">الإجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedLabs.map((lab, index) => (
            <TableRow key={lab.id} className="hover:bg-muted/50">
              <TableCell className="font-medium text-center">
                {startIndex + index + 1}
              </TableCell>
              <TableCell className="font-medium text-center table-cell-wrap-truncate-md">
                <div className="flex items-center gap-2 justify-center">
                  {lab.name}
                  <Building2 className="h-4 w-4 text-blue-600" />
                </div>
              </TableCell>
              <TableCell className="text-center table-cell-wrap-truncate-sm">
                {lab.contact_info ? (
                  <div className="flex items-center justify-center">
                    <button
                      onClick={async () => {
                        // تنظيف رقم الهاتف من الرموز والمسافات
                        const cleanPhone = lab.contact_info?.replace(/[^\d]/g, '') || ''
                        const whatsappUrl = `https://api.whatsapp.com/send/?phone=${cleanPhone}`

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

                        // Method 3: Fallback to window.open with external behavior
                        window.open(whatsappUrl, '_blank', 'noopener,noreferrer')
                      }}
                      className="text-sm text-green-600 hover:text-green-700 hover:underline transition-colors cursor-pointer flex items-center gap-1"
                    >
                      {lab.contact_info}
                      <MessageCircle className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm">غير محدد</span>
                )}
              </TableCell>
              <TableCell className="text-center">
                {lab.address ? (
                  <div className="flex items-center gap-2 justify-center">
                    <span className="text-sm">{lab.address}</span>
                    <MapPin className="h-4 w-4 text-orange-600" />
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm">غير محدد</span>
                )}
              </TableCell>
              <TableCell className="text-center">
                <div className="flex justify-center">
                  <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                    {getLabOrdersCount(lab.id)}
                    <TestTube className="h-3 w-3" />
                  </Badge>
                </div>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground text-center">
                {formatDate(lab.created_at)}
              </TableCell>
              <TableCell className="min-w-[140px] text-center">
                <div className="flex items-center justify-center space-x-1 space-x-reverse">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="action-btn-edit"
                    onClick={() => handleEdit(lab)}
                  >
                    <Edit className="w-4 h-4 ml-1" />
                    <span className="text-xs arabic-enhanced">تعديل</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="action-btn-delete"
                    onClick={() => handleDelete(lab)}
                  >
                    <Trash2 className="w-4 h-4 ml-1" />
                    <span className="text-xs arabic-enhanced">حذف</span>
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
    </div>
  )
}
