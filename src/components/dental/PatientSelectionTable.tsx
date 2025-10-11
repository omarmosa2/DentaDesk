import React, { useState, useMemo } from 'react'
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
  Phone,
  User,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Calendar,
  Activity,
  Camera
} from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface PatientSelectionTableProps {
  patients: Patient[]
  selectedPatientId: string | null
  onPatientSelect: (patientId: string) => void
  getPatientTreatmentCount: (patientId: string) => number
  getLastTreatmentDate: (patientId: string) => string | null
  getPatientImagesCount?: (patientId: string) => number
  isLoading?: boolean
  isCompact?: boolean
}

type SortField = 'full_name' | 'gender' | 'age' | 'phone' | 'patient_condition'
type SortDirection = 'asc' | 'desc' | null

export default function PatientSelectionTable({
  patients,
  selectedPatientId,
  onPatientSelect,
  getPatientTreatmentCount,
  getLastTreatmentDate,
  getPatientImagesCount,
  isLoading = false,
  isCompact = false
}: PatientSelectionTableProps) {
  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(isCompact ? 5 : 10)
  const [showAllPatients, setShowAllPatients] = useState(false)

  // If a patient is selected and we're in compact mode, show only selected patient unless showAllPatients is true
  const displayPatients = useMemo(() => {
    if (isCompact && selectedPatientId && !showAllPatients) {
      return patients.filter(p => p.id === selectedPatientId)
    }
    return patients
  }, [patients, isCompact, selectedPatientId, showAllPatients])

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
    let sortedPatients = displayPatients

    // Apply sorting
    if (sortField && sortDirection) {
      sortedPatients = [...displayPatients].sort((a, b) => {
        let aValue = a[sortField]
        let bValue = b[sortField]

        // Handle null/undefined values
        if (aValue == null && bValue == null) return 0
        if (aValue == null) return sortDirection === 'asc' ? 1 : -1
        if (bValue == null) return sortDirection === 'asc' ? -1 : 1

        // Convert to string for comparison
        aValue = String(aValue).toLowerCase()
        bValue = String(bValue).toLowerCase()

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
  }, [displayPatients, sortField, sortDirection, currentPage, pageSize])

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
            <TableRow className="bg-muted/50">
              <TableHead className="text-center w-16">#</TableHead>
              <TableHead className="text-center">اسم المريض</TableHead>
              <TableHead className="text-center">الجنس</TableHead>
              <TableHead className="text-center">العمر</TableHead>
              <TableHead className="text-center">رقم الهاتف</TableHead>
              <TableHead className="text-center">عدد العلاجات</TableHead>
              <TableHead className="text-center">آخر زيارة</TableHead>
              <TableHead className="text-center">الإجراءات</TableHead>
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
      <div className="text-center py-8 text-muted-foreground">
        <User className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>لا توجد مرضى مطابقين لبحثك</p>
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
      {/* Table Header Info */}
      <div className="bg-slate-50 dark:bg-slate-800/60 px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-t-lg">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600 dark:text-slate-300 font-medium">
            عرض {paginatedPatients.length} من أصل {totalCount} مريض
          </span>
          <div className="flex items-center gap-3">
            {selectedPatientId && (
              <span className="text-blue-600 dark:text-blue-400 font-semibold bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-full">
                المريض المحدد: {patients.find(p => p.id === selectedPatientId)?.full_name}
              </span>
            )}
            {isCompact && selectedPatientId && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAllPatients(!showAllPatients)}
                className="text-xs bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border-slate-300 dark:border-slate-600"
              >
                {showAllPatients ? 'إخفاء المرضى الآخرين' : 'عرض جميع المرضى'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="border border-slate-200 dark:border-slate-700 rounded-b-lg overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
        <div className="overflow-x-auto bg-white dark:bg-slate-900">
          <Table className="table-center-all bg-white dark:bg-slate-900">
            <TableHeader className="bg-slate-100 dark:bg-slate-800">
              <TableRow className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800">
                <TableHead className="text-center w-16 text-slate-700 dark:text-slate-200 font-semibold">
                  <span className="font-semibold">#</span>
                </TableHead>
                <SortableHeader field="full_name">
                  <span className="font-semibold text-slate-700 dark:text-slate-200">اسم المريض</span>
                </SortableHeader>
                <SortableHeader field="gender">
                  <span className="font-semibold text-slate-700 dark:text-slate-200">الجنس</span>
                </SortableHeader>
                <SortableHeader field="age">
                  <span className="font-semibold text-slate-700 dark:text-slate-200">العمر</span>
                </SortableHeader>
                <SortableHeader field="phone">
                  <span className="font-semibold text-slate-700 dark:text-slate-200">رقم الهاتف</span>
                </SortableHeader>
                <TableHead className="text-center text-slate-700 dark:text-slate-200">
                  <span className="font-semibold">عدد العلاجات</span>
                </TableHead>
                <TableHead className="text-center text-slate-700 dark:text-slate-200">
                  <span className="font-semibold">آخر زيارة</span>
                </TableHead>
                <TableHead className="text-center text-slate-700 dark:text-slate-200">
                  <span className="font-semibold">الإجراءات</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="bg-white dark:bg-slate-900">
              {paginatedPatients.map((patient, index) => (
                <TableRow
                  key={patient.id}
                  className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-200 dark:border-slate-700 ${
                    selectedPatientId === patient.id ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700' : 'bg-white dark:bg-slate-900'
                  }`}
                >
                  <TableCell className="font-medium text-slate-600 dark:text-slate-400">
                    {startIndex + index + 1}
                  </TableCell>
                  <TableCell className="font-medium table-cell-wrap-truncate-md">
                    <span className="text-slate-800 dark:text-slate-200 font-medium">{patient.full_name}</span>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={patient.gender === 'male' ? 'default' : 'secondary'}
                      className={`${
                        patient.gender === 'male' 
                          ? 'bg-blue-500 hover:bg-blue-600 text-white border-blue-500' 
                          : 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-700'
                      }`}
                    >
                      {patient.gender === 'male' ? 'ذكر' : 'أنثى'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                      <span className="text-slate-700 dark:text-slate-300 font-medium">{patient.age} سنة</span>
                    </div>
                  </TableCell>
                  <TableCell className="table-cell-wrap-truncate-sm">
                    {patient.phone ? (
                      <a
                        href={`https://wa.me/${patient.phone?.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 hover:underline flex items-center justify-center gap-1 font-medium"
                      >
                        <Phone className="w-3 h-3" />
                        {patient.phone}
                      </a>
                    ) : (
                      <span className="text-slate-500 dark:text-slate-400">غير محدد</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-2">
                      <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700 font-medium">
                        <Activity className="w-3 h-3 ml-1" />
                        {getPatientTreatmentCount(patient.id)} علاج
                      </Badge>
                      {getPatientImagesCount && getPatientImagesCount(patient.id) > 0 && (
                        <Badge variant="outline" className="bg-green-50 dark:bg-green-900/40 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700 font-medium">
                          <Camera className="w-3 h-3 ml-1" />
                          {getPatientImagesCount(patient.id)} صورة
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getLastTreatmentDate(patient.id) ? (
                      <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                        {formatDate(getLastTreatmentDate(patient.id)!)}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500 dark:text-slate-500">لا توجد زيارات</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant={selectedPatientId === patient.id ? "default" : "outline"}
                      onClick={() => onPatientSelect(patient.id)}
                      className={`text-xs font-medium ${
                        selectedPatientId === patient.id 
                          ? 'bg-blue-500 hover:bg-blue-600 text-white border-blue-500 shadow-sm' 
                          : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {selectedPatientId === patient.id ? 'محدد' : 'اختيار'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination Controls */}
      {totalCount > pageSize && (
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg">
          <div className="flex items-center space-x-2 space-x-reverse">
            <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">
              عرض {((currentPage - 1) * pageSize) + 1} إلى {Math.min(currentPage * pageSize, totalCount)} من {totalCount} مريض
            </p>
          </div>

          <div className="flex items-center space-x-6 space-x-reverse lg:space-x-8">
            <div className="flex items-center space-x-2 space-x-reverse">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">عدد الصفوف لكل صفحة</p>
              <Select
                value={`${pageSize}`}
                onValueChange={handlePageSizeChange}
              >
                <SelectTrigger className="h-8 w-[70px] border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700">
                  <SelectValue placeholder={pageSize} />
                </SelectTrigger>
                <SelectContent side="top">
                  {[5, 10, 15, 20].map((size) => (
                    <SelectItem key={size} value={`${size}`}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex w-[100px] items-center justify-center text-sm font-medium text-slate-700 dark:text-slate-200">
              صفحة {currentPage} من {totalPages}
            </div>

            <div className="flex items-center space-x-2 space-x-reverse">
              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 lg:flex bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300"
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
              >
                <span className="sr-only">الذهاب إلى الصفحة الأولى</span>
                <ChevronsRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="h-8 w-8 p-0 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <span className="sr-only">الذهاب إلى الصفحة السابقة</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="h-8 w-8 p-0 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                <span className="sr-only">الذهاب إلى الصفحة التالية</span>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 lg:flex bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300"
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
