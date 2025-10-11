import React, { useState, useMemo, memo } from 'react'
import { Payment, Patient } from '@/types'
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
import { getTreatmentNameInArabic } from '@/utils/arabicTranslations'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Edit,
  Trash2,
  Printer,
  User,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  DollarSign
} from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'

type SortField = 'payment_date' | 'amount' | 'patient_name' | 'payment_method' | 'status' | 'receipt_number'
type SortDirection = 'asc' | 'desc'

interface PaymentTableProps {
  payments: Payment[]
  patients: Patient[]
  isLoading: boolean
  onEdit: (payment: Payment) => void
  onDelete: (payment: Payment) => void
  onShowReceipt: (payment: Payment) => void
  onViewDetails: (payment: Payment) => void
}

function PaymentTableComponent({
  payments,
  patients,
  isLoading,
  onEdit,
  onDelete,
  onShowReceipt,
  onViewDetails
}: PaymentTableProps) {
  const [sortField, setSortField] = useState<SortField>('payment_date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Create a map of patient IDs to patient objects for quick lookup
  const patientMap = useMemo(() => {
    const map = new Map<string, Patient>()
    patients.forEach(patient => {
      map.set(patient.id, patient)
    })
    return map
  }, [patients])

  // Get patient name for a payment
  const getPatientName = (payment: Payment) => {
    // First try to get patient from payment object (if loaded with JOIN)
    if (payment.patient?.full_name) {
      return payment.patient.full_name
    }
    if (payment.patient?.first_name || payment.patient?.last_name) {
      return `${payment.patient.first_name || ''} ${payment.patient.last_name || ''}`.trim()
    }

    // Fallback to patient map lookup
    const patient = patientMap.get(payment.patient_id)
    return patient?.full_name || 'مريض غير معروف'
  }

  // Sort payments (filtering is now handled by the store)
  const sortedPayments = useMemo(() => {
    let sorted = [...payments]

    // Sort payments
    sorted.sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortField) {
        case 'patient_name':
          aValue = getPatientName(a)
          bValue = getPatientName(b)
          break
        case 'payment_date':
          aValue = new Date(a.payment_date)
          bValue = new Date(b.payment_date)
          break
        case 'amount':
          aValue = a.amount
          bValue = b.amount
          break
        case 'payment_method':
          aValue = a.payment_method
          bValue = b.payment_method
          break
        case 'status':
          aValue = a.status
          bValue = b.status
          break
        case 'receipt_number':
          aValue = a.receipt_number || ''
          bValue = b.receipt_number || ''
          break
        default:
          return 0
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return sorted
  }, [payments, sortField, sortDirection, patientMap])

  // Pagination
  const totalPages = Math.ceil(sortedPayments.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const paginatedPayments = sortedPayments.slice(startIndex, startIndex + pageSize)

  // Handle sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Sortable header component
  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead
      className="cursor-pointer hover:bg-muted/50 text-center"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center justify-center space-x-1 space-x-reverse">
        {children}
        {sortField === field ? (
          sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
        ) : (
          <ArrowUpDown className="w-4 h-4 opacity-50" />
        )}
      </div>
    </TableHead>
  )

  // Get payment method label
  const getPaymentMethodLabel = (method: string) => {
    const methods = {
      cash: 'نقداً',
      bank_transfer: 'تحويل بنكي'
    }
    return methods[method as keyof typeof methods] || method
  }

  // Get status badge
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      completed: { label: 'مكتمل', variant: 'default' as const },
      partial: { label: 'جزئي', variant: 'outline' as const },
      pending: { label: 'آجل', variant: 'secondary' as const }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || { label: status, variant: 'outline' as const }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  if (isLoading) {
    return (
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>رقم الإيصال</TableHead>
              <TableHead>المريض</TableHead>
              <TableHead>المبلغ</TableHead>
              <TableHead>طريقة الدفع</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>تاريخ الدفع</TableHead>
              <TableHead>الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, index) => (
              <TableRow key={index}>
                {[...Array(7)].map((_, cellIndex) => (
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

  if (sortedPayments.length === 0) {
    return (
      <div className="border rounded-lg">
        <Table className="table-center-all">
          <TableHeader>
            <TableRow>
              <TableHead className="text-center">#</TableHead>
              <SortableHeader field="patient_name">المريض</SortableHeader>
              <TableHead className="text-center">العلاج/الموعد</TableHead>
              <SortableHeader field="amount">المبلغ والرصيد</SortableHeader>
              <SortableHeader field="payment_method">طريقة الدفع</SortableHeader>
              <SortableHeader field="status">الحالة</SortableHeader>
              <SortableHeader field="payment_date">تاريخ الدفع</SortableHeader>
              <TableHead className="text-center">
                <span className="arabic-enhanced font-medium">الإجراءات</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={8} className="text-center py-8">
                <div className="flex flex-col items-center space-y-2">
                  <DollarSign className="w-12 h-12 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">
                    لم يتم تسجيل أي مدفوعات بعد
                  </p>
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
      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="table-center-all">
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-center">
                  <span className="arabic-enhanced font-medium">#</span>
                </TableHead>
                <SortableHeader field="patient_name">
                  <span className="arabic-enhanced font-medium">المريض</span>
                </SortableHeader>
                <TableHead className="text-center">
                  <span className="arabic-enhanced font-medium">العلاج/الموعد</span>
                </TableHead>
                <SortableHeader field="amount">
                  <span className="arabic-enhanced font-medium">المبلغ والرصيد</span>
                </SortableHeader>
                <SortableHeader field="payment_method">
                  <span className="arabic-enhanced font-medium">طريقة الدفع</span>
                </SortableHeader>
                <SortableHeader field="status">
                  <span className="arabic-enhanced font-medium">الحالة</span>
                </SortableHeader>
                <SortableHeader field="payment_date">
                  <span className="arabic-enhanced font-medium">تاريخ الدفع</span>
                </SortableHeader>
                <TableHead className="text-center">
                  <span className="arabic-enhanced font-medium">الإجراءات</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedPayments.map((payment, index) => (
                <TableRow key={payment.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium text-center">
                    {startIndex + index + 1}
                  </TableCell>
                  <TableCell className="font-medium text-center">
                    <span className="arabic-enhanced">{getPatientName(payment)}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    {payment.tooth_treatment_id ? (
                      // عرض معلومات العلاج
                      <div className="space-y-1">
                        <div className="text-sm font-medium arabic-enhanced text-blue-600 dark:text-blue-400">
                          السن {payment.tooth_treatment?.tooth_number}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {getTreatmentNameInArabic(payment.tooth_treatment?.treatment_type || '')}
                        </div>
                        {payment.treatment_total_cost && (
                          <div className="text-xs text-muted-foreground">
                            تكلفة: {formatCurrency(payment.treatment_total_cost)}
                          </div>
                        )}
                        {payment.treatment_remaining_balance !== undefined && payment.treatment_remaining_balance > 0 && (
                          <div className="text-xs text-orange-600 dark:text-orange-400">
                            متبقي: {formatCurrency(payment.treatment_remaining_balance)}
                          </div>
                        )}
                      </div>
                    ) : payment.appointment_id ? (
                      // عرض معلومات الموعد (للتوافق مع النظام القديم)
                      <div className="space-y-1">
                        {(() => {
                          // تحقق من وجود تاريخ الموعد
                          const appointmentDate = payment.appointment?.start_time

                          if (appointmentDate) {
                            try {
                              const date = new Date(appointmentDate)
                              if (!isNaN(date.getTime())) {
                                return (
                                  <>
                                    <div className="text-sm font-medium arabic-enhanced">
                                      {date.toLocaleDateString('en-GB', {
                                        year: 'numeric',
                                        month: '2-digit',
                                        day: '2-digit'
                                      })}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {date.toLocaleTimeString('ar-SA', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        hour12: true
                                      })}
                                    </div>
                                  </>
                                )
                              }
                            } catch (error) {
                              console.error('Error parsing appointment date:', error)
                            }
                          }

                          // إذا لم يكن هناك تاريخ صحيح، اعرض "موعد محدد"
                          return (
                            <div className="text-sm font-medium arabic-enhanced">
                              موعد محدد
                            </div>
                          )
                        })()}

                        {payment.appointment_total_cost && (
                          <div className="text-xs text-muted-foreground">
                            تكلفة: {formatCurrency(payment.appointment_total_cost)}
                          </div>
                        )}
                        {payment.appointment_remaining_balance !== undefined && payment.appointment_remaining_balance > 0 && (
                          <div className="text-xs text-orange-600 dark:text-orange-400">
                            متبقي: {formatCurrency(payment.appointment_remaining_balance)}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground arabic-enhanced">
                        دفعة عامة
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="space-y-1">
                      <div className="font-medium text-lg">
                        {formatCurrency(payment.amount)}
                      </div>
                      {payment.tooth_treatment_id ? (
                        // للمدفوعات المرتبطة بعلاج
                        <>
                          {payment.treatment_total_cost && (
                            <div className="text-xs text-muted-foreground">
                              من أصل {formatCurrency(payment.treatment_total_cost)}
                            </div>
                          )}
                          {payment.treatment_total_paid && (
                            <div className="text-xs text-blue-600 dark:text-blue-400">
                              إجمالي مدفوع: {formatCurrency(payment.treatment_total_paid)}
                            </div>
                          )}
                          {payment.treatment_remaining_balance && payment.treatment_remaining_balance > 0 && (
                            <div className="text-xs text-orange-600 dark:text-orange-400">
                              متبقي: {formatCurrency(payment.treatment_remaining_balance)}
                            </div>
                          )}
                        </>
                      ) : payment.appointment_id ? (
                        // للمدفوعات المرتبطة بموعد
                        <>
                          {payment.total_amount_due && (
                            <div className="text-xs text-muted-foreground">
                              من أصل {formatCurrency(payment.total_amount_due)}
                            </div>
                          )}
                          {payment.total_amount_due && payment.amount_paid && (
                            <div className="text-xs text-blue-600 dark:text-blue-400">
                              إجمالي مدفوع: {formatCurrency(payment.amount_paid)}
                            </div>
                          )}
                          {payment.remaining_balance && payment.remaining_balance > 0 && (
                            <div className="text-xs text-orange-600 dark:text-orange-400">
                              متبقي: {formatCurrency(payment.remaining_balance)}
                            </div>
                          )}
                        </>
                      ) : (
                        // للمدفوعات العامة
                        <>
                          {payment.total_amount_due && (
                            <div className="text-xs text-muted-foreground">
                              من أصل {formatCurrency(payment.total_amount_due)}
                            </div>
                          )}
                          {payment.total_amount_due && (() => {
                            // حساب المبلغ المتبقي بشكل صحيح للمدفوعات العامة
                            const totalDue = payment.total_amount_due || 0
                            const totalPaid = payment.amount || 0
                            const remainingBalance = Math.max(0, totalDue - totalPaid)
                            return remainingBalance > 0 && (
                              <div className="text-xs text-orange-600 dark:text-orange-400">
                                متبقي: {formatCurrency(remainingBalance)}
                              </div>
                            )
                          })()}
                        </>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="arabic-enhanced">
                      {getPaymentMethodLabel(payment.payment_method)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {getStatusBadge(payment.status)}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="text-sm arabic-enhanced">
                      {formatDate(payment.payment_date)}
                    </div>
                  </TableCell>
                  <TableCell className="min-w-[220px] text-center">
                    <div className="flex items-center justify-center space-x-1 space-x-reverse">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="action-btn-details text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        onClick={() => onViewDetails(payment)}
                        title="عرض التفاصيل"
                      >
                        <Eye className="w-4 h-4 ml-1" />
                        <span className="text-xs arabic-enhanced">تفاصيل</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="action-btn-receipt"
                        onClick={() => onShowReceipt(payment)}
                      >
                        <Printer className="w-4 h-4 ml-1" />
                        <span className="text-xs arabic-enhanced">إيصال</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="action-btn-edit"
                        onClick={() => onEdit(payment)}
                      >
                        <Edit className="w-4 h-4 ml-1" />
                        <span className="text-xs arabic-enhanced">تعديل</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="action-btn-delete"
                        onClick={() => onDelete(payment)}
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
        </div>
      </div>

      {/* Pagination Controls */}
      {sortedPayments.length > 0 && (
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center space-x-2 space-x-reverse">
            <p className="text-sm text-muted-foreground arabic-enhanced">
              عرض {startIndex + 1} إلى {Math.min(startIndex + pageSize, sortedPayments.length)} من {sortedPayments.length} مدفوعة
            </p>
          </div>

          <div className="flex items-center space-x-6 space-x-reverse lg:space-x-8">
            <div className="flex items-center space-x-2 space-x-reverse">
              <p className="text-sm font-medium arabic-enhanced">عدد الصفوف لكل صفحة</p>
              <Select
                value={`${pageSize}`}
                onValueChange={(value) => {
                  setPageSize(Number(value))
                  setCurrentPage(1)
                }}
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
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                <span className="sr-only">الذهاب إلى الصفحة الأولى</span>
                <ChevronsRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <span className="sr-only">الذهاب إلى الصفحة السابقة</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                <span className="sr-only">الذهاب إلى الصفحة التالية</span>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 lg:flex"
                onClick={() => setCurrentPage(totalPages)}
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

export default memo(PaymentTableComponent)
