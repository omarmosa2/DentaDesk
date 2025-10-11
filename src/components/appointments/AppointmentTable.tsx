import React, { useState, useMemo, memo } from 'react'
import { Appointment, Patient } from '@/types'
import { useToast } from '@/hooks/use-toast'
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
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
  Calendar,
  Clock,
  Search,
  Filter
} from 'lucide-react'
import { formatDateTime, formatTime, getStatusColor } from '@/lib/utils'

interface AppointmentTableProps {
  appointments: Appointment[]
  patients: Patient[]
  isLoading: boolean
  onEdit: (appointment: Appointment) => void
  onDelete: (appointmentId: string) => void
  onViewPatient: (patient: Patient) => void
  onSelectAppointment?: (appointment: Appointment) => void
}

type SortField = 'patient_name' | 'start_time' | 'end_time' | 'status' | 'title'
type SortDirection = 'asc' | 'desc'

function AppointmentTableComponent({
  appointments,
  patients,
  isLoading,
  onEdit,
  onDelete,
  onViewPatient,
  onSelectAppointment
}: AppointmentTableProps) {
  const { toast } = useToast()
  const [sortField, setSortField] = useState<SortField>('start_time')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Create a map of patient IDs to patient objects for quick lookup
  const patientMap = useMemo(() => {
    const map = new Map<string, Patient>()
    patients.forEach(patient => {
      map.set(patient.id, patient)
    })
    return map
  }, [patients])

  // Enhanced appointments with patient data and filtering
  const enhancedAppointments = useMemo(() => {
    if (appointments.length > 0) {
    }

    let filtered = appointments.map(appointment => {
      const enhancedAppointment = {
        ...appointment,
        // Use patient data from appointment if available, otherwise fallback to patientMap
        patient: appointment.patient || patientMap.get(appointment.patient_id),
        patient_name: appointment.patient_name || appointment.patient?.full_name || patientMap.get(appointment.patient_id)?.full_name || 'مريض غير معروف'
      }

      if (appointment.patient_name === 'مريض غير معروف' && process.env.NODE_ENV !== 'production') {
      }

      return enhancedAppointment
    })

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(appointment =>
        appointment.patient_name.toLowerCase().includes(query) ||
        appointment.title.toLowerCase().includes(query) ||
        appointment.description?.toLowerCase().includes(query)
      )
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(appointment => appointment.status === statusFilter)
    }

    return filtered
  }, [appointments, patientMap, searchQuery, statusFilter])

  // Sorting logic
  const sortedAppointments = useMemo(() => {
    return [...enhancedAppointments].sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortField) {
        case 'patient_name':
          aValue = a.patient_name.toLowerCase()
          bValue = b.patient_name.toLowerCase()
          break
        case 'start_time':
          aValue = new Date(a.start_time)
          bValue = new Date(b.start_time)
          break
        case 'end_time':
          aValue = new Date(a.end_time)
          bValue = new Date(b.end_time)
          break
        case 'status':
          aValue = a.status
          bValue = b.status
          break
        case 'title':
          aValue = a.title.toLowerCase()
          bValue = b.title.toLowerCase()
          break
        default:
          return 0
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }, [enhancedAppointments, sortField, sortDirection])

  // Pagination
  const totalCount = sortedAppointments.length
  const totalPages = Math.ceil(totalCount / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const paginatedAppointments = sortedAppointments.slice(startIndex, startIndex + pageSize)

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handlePageSizeChange = (value: string) => {
    setPageSize(parseInt(value))
    setCurrentPage(1) // Reset to first page when changing page size
  }

  // Reset page when search or filter changes
  React.useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, statusFilter])

  const SortableHeader = ({ field, children, className }: { field: SortField; children: React.ReactNode; className?: string }) => (
    <TableHead
      className={`cursor-pointer hover:bg-muted/50 select-none text-center ${className || ''}`}
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1 justify-center">
        {children}
        {sortField === field ? (
          sortDirection === 'asc' ? (
            <ArrowUp className="w-4 h-4" />
          ) : (
            <ArrowDown className="w-4 h-4" />
          )
        ) : (
          <ArrowUpDown className="w-4 h-4 opacity-50" />
        )}
      </div>
    </TableHead>
  )

  const getStatusText = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'مجدول'
      case 'completed':
        return 'مكتمل'
      case 'cancelled':
        return 'ملغي'
      case 'no_show':
        return 'لم يحضر'
      default:
        return status
    }
  }

  if (isLoading) {
    return (
      <div className="border rounded-lg" dir="rtl">
        <Table className="table-center-all">
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-center">#</TableHead>
              <TableHead className="text-center">اسم المريض</TableHead>
              <TableHead className="text-center">تاريخ ووقت البداية</TableHead>
              <TableHead className="text-center">تاريخ ووقت النهاية</TableHead>
              <TableHead className="text-center">حالة الموعد</TableHead>
              <TableHead className="text-center">الاجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8">
                <div className="flex flex-col items-center gap-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <p className="text-muted-foreground arabic-enhanced">جاري تحميل المواعيد...</p>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    )
  }

  if (appointments.length === 0) {
    return (
      <div className="border rounded-lg" dir="rtl">
        <Table className="table-center-all">
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-center">#</TableHead>
              <TableHead className="text-center">اسم المريض</TableHead>
              <TableHead className="text-center">تاريخ ووقت البداية</TableHead>
              <TableHead className="text-center">تاريخ ووقت النهاية</TableHead>
              <TableHead className="text-center">حالة الموعد</TableHead>
              <TableHead className="text-center">الاجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8">
                <div className="flex flex-col items-center gap-2">
                  <Calendar className="w-12 h-12 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground arabic-enhanced">لا توجد مواعيد</p>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    )
  }

  return (
    <div className="space-y-4" dir="rtl">
      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="البحث في المواعيد..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 arabic-enhanced text-right"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="تصفية حسب الحالة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الحالات</SelectItem>
              <SelectItem value="scheduled">مجدول</SelectItem>
              <SelectItem value="completed">مكتمل</SelectItem>
              <SelectItem value="cancelled">ملغي</SelectItem>
              <SelectItem value="no_show">لم يحضر</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="text-sm text-muted-foreground arabic-enhanced">
          إجمالي المواعيد: {enhancedAppointments.length}
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="table-center-all w-full">
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-center min-w-[80px]">
                  <span className="arabic-enhanced font-medium">#</span>
                </TableHead>
                <SortableHeader field="patient_name" className="min-w-[180px]">
                  <span className="arabic-enhanced font-medium">اسم المريض</span>
                </SortableHeader>
                <SortableHeader field="start_time" className="min-w-[140px]">
                  <span className="arabic-enhanced font-medium">تاريخ ووقت البداية</span>
                </SortableHeader>
                <SortableHeader field="end_time" className="min-w-[140px]">
                  <span className="arabic-enhanced font-medium">تاريخ ووقت النهاية</span>
                </SortableHeader>
                <SortableHeader field="status" className="min-w-[100px]">
                  <span className="arabic-enhanced font-medium">حالة الموعد</span>
                </SortableHeader>
                <TableHead className="text-center min-w-[200px]">
                  <span className="arabic-enhanced font-medium">الاجراءات</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedAppointments.map((appointment, index) => (
                <TableRow
                  key={appointment.id}
                  className="hover:bg-muted/50 cursor-pointer"
                  onClick={() => onSelectAppointment?.(appointment)}
                >
                  <TableCell className="font-medium text-center">
                    {startIndex + index + 1}
                  </TableCell>
                  <TableCell className="font-medium text-center">
                    <span className="arabic-enhanced" title={appointment.patient_name}>
                      {appointment.patient_name}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="text-sm font-medium arabic-enhanced">
                      {formatDateTime(appointment.start_time)}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="text-sm font-medium arabic-enhanced">
                      {formatDateTime(appointment.end_time)}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant="outline"
                      className={`${getStatusColor(appointment.status)} arabic-enhanced text-xs whitespace-nowrap`}
                    >
                      {getStatusText(appointment.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1 flex-wrap">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="action-btn-edit"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          onEdit(appointment)
                        }}
                      >
                        <Edit className="w-4 h-4 ml-1" />
                        <span className="text-xs arabic-enhanced">تعديل</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="action-btn-delete"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          onDelete(appointment.id)
                        }}
                      >
                        <Trash2 className="w-4 h-4 ml-1" />
                        <span className="text-xs arabic-enhanced">حذف</span>
                      </Button>
                      {(appointment.patient || patientMap.get(appointment.patient_id)) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="action-btn-view"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            const patient = appointment.patient || patientMap.get(appointment.patient_id)
                            if (patient) {
                              onViewPatient(patient)
                            }
                          }}
                        >
                          <Eye className="w-4 h-4 ml-1" />
                          <span className="text-xs arabic-enhanced">عرض المريض</span>
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination Controls */}
      {totalCount > 0 && (
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground arabic-enhanced">
              عرض {((currentPage - 1) * pageSize) + 1} إلى {Math.min(currentPage * pageSize, totalCount)} من {totalCount} موعد
            </p>
          </div>

          <div className="flex items-center gap-6 lg:gap-8">
            <div className="flex items-center gap-2">
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

            <div className="flex w-[100px] items-center justify-center text-sm font-medium arabic-enhanced">
              صفحة {currentPage} من {totalPages}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 lg:flex"
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
              >
                <span className="sr-only">الذهاب إلى الصفحة الأولى</span>
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <span className="sr-only">الذهاب إلى الصفحة السابقة</span>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                <span className="sr-only">الذهاب إلى الصفحة التالية</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 lg:flex"
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages}
              >
                <span className="sr-only">الذهاب إلى الصفحة الأخيرة</span>
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default memo(AppointmentTableComponent)
