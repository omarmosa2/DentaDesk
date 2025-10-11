import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { usePaymentStore } from '@/store/paymentStore'
import { usePatientStore } from '@/store/patientStore'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency, formatDate } from '@/lib/utils'
import { getCardStyles, getIconStyles } from '@/lib/cardStyles'
import { useRealTimeSync } from '@/hooks/useRealTimeSync'
import { useRealTimeTableSync } from '@/hooks/useRealTimeTableSync'
import TimeFilter, { TimeFilterOptions } from '@/components/ui/time-filter'
import useTimeFilteredStats from '@/hooks/useTimeFilteredStats'
import AddPaymentDialog from '@/components/payments/AddPaymentDialog'
import EditPaymentDialog from '@/components/payments/EditPaymentDialog'
import DeletePaymentDialog from '@/components/payments/DeletePaymentDialog'
import PaymentReceiptDialog from '@/components/payments/PaymentReceiptDialog'
import PaymentDetailsDialog from '@/components/payments/PaymentDetailsDialog'
import PaymentTable from '@/components/payments/PaymentTable'
import PasswordSettings from '@/components/payments/PasswordSettings'
import {
  Plus,
  DollarSign,
  Clock,
  AlertTriangle,
  TrendingUp,
  RefreshCw,
  Download,
  FileText,
  Search,
  Filter,
  X
} from 'lucide-react'
import type { Payment } from '@/types'
import { notify } from '@/services/notificationService'
import { ExportService } from '@/services/exportService'

export default function Payments() {
  // Enable real-time synchronization for automatic updates
  useRealTimeSync()
  useRealTimeTableSync()

  const { toast } = useToast()
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showReceiptDialog, setShowReceiptDialog] = useState(false)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)
  const [preSelectedPatientId, setPreSelectedPatientId] = useState<string | undefined>(undefined)



  const {
    payments,
    filteredPayments,
    isLoading,
    error,
    searchQuery,
    statusFilter,
    paymentMethodFilter,
    totalRevenue,
    pendingAmount,
    totalRemainingBalance,
    partialPaymentsCount,
    pendingPaymentsCount,
    paymentMethodStats,
    loadPayments,
    deletePayment,
    clearError,
    setSearchQuery,
    setStatusFilter,
    setPaymentMethodFilter
  } = usePaymentStore()

  const { loadPatients, patients } = usePatientStore()

  // Time filtering for payments
  const paymentStats = useTimeFilteredStats({
    data: payments,
    dateField: 'payment_date',
    initialFilter: { preset: 'all', startDate: '', endDate: '' } // Show all data by default
  })

  useEffect(() => {
    loadPayments()
    loadPatients()
  }, [loadPayments, loadPatients])

  // Check for pre-selected patient from localStorage
  useEffect(() => {
    const checkPreSelectedPatient = () => {
      try {
        const stored = localStorage.getItem('selectedPatientForPayment')
        if (stored) {
          const parsed = JSON.parse(stored)

          // Set pre-selected patient
          setPreSelectedPatientId(parsed.selectedPatientId)

          // Open add dialog if requested
          if (parsed.openAddDialog) {
            setShowAddDialog(true)
          }

          // Clear localStorage after reading
          localStorage.removeItem('selectedPatientForPayment')
        }
      } catch (error) {
        console.error('Error reading pre-selected patient for payment:', error)
      }
    }

    checkPreSelectedPatient()
  }, [])

  // Check for search result navigation
  useEffect(() => {
    const searchResultData = localStorage.getItem('selectedPaymentForDetails')
    if (searchResultData) {
      try {
        const { payment, openDetailsModal } = JSON.parse(searchResultData)
        if (openDetailsModal && payment) {
          setSelectedPayment(payment)
          setShowReceiptDialog(true) // Open receipt dialog for payment details
          localStorage.removeItem('selectedPaymentForDetails')
        }
      } catch (error) {
        console.error('Error parsing search result data:', error)
        localStorage.removeItem('selectedPaymentForDetails')
      }
    }
  }, [])

  useEffect(() => {
    if (error) {
      toast({
        title: 'خطأ',
        description: error,
        variant: 'destructive',
      })
      clearError()
    }
  }, [error, toast, clearError])

  const handleEditPayment = (payment: Payment) => {
    setSelectedPayment(payment)
    setShowEditDialog(true)
  }

  const handleDeletePayment = (payment: Payment) => {
    setSelectedPayment(payment)
    setShowDeleteDialog(true)
  }

  const handleShowReceipt = (payment: Payment) => {
    setSelectedPayment(payment)
    setShowReceiptDialog(true)
  }

  const handleViewDetails = (payment: Payment) => {
    setSelectedPayment(payment)
    setShowDetailsDialog(true)
  }

  const handleAddPayment = () => {
    setPreSelectedPatientId(undefined) // Clear any pre-selection for manual add
    setShowAddDialog(true)
  }

  const clearAllFilters = () => {
    setSearchQuery('')
    setStatusFilter('all')
    setPaymentMethodFilter('all')
  }

  const hasActiveFilters = searchQuery !== '' || statusFilter !== 'all' || paymentMethodFilter !== 'all'



  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-heading-1 text-foreground arabic-enhanced">إدارة الواردات</h1>
          <p className="text-body text-muted-foreground mt-2 arabic-enhanced">
            تتبع المدفوعات والفواتير والسجلات المالية
          </p>
        </div>
        <div className="flex items-center space-x-2 space-x-reverse">
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
              if (payments.length === 0) {
                notify.noDataToExport('لا توجد بيانات مدفوعات للتصدير')
                return
              }
                  try {
                    let dataToExport = [...payments]
                    if (paymentStats.timeFilter.startDate && paymentStats.timeFilter.endDate) {
                      const startDate = new Date(paymentStats.timeFilter.startDate)
                      const endDate = new Date(paymentStats.timeFilter.endDate)
                      endDate.setHours(23, 59, 59, 999)
                      dataToExport = dataToExport.filter(payment => {
                        const paymentDate = new Date(payment.payment_date)
                        return paymentDate >= startDate && paymentDate <= endDate
                      })
                    }
                    if (searchQuery) {
                      dataToExport = dataToExport.filter(payment => {
                        const patientName = patients.find(p => p.id === payment.patient_id)?.full_name || ''
                        return (
                          payment.receipt_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          payment.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          payment.amount.toString().includes(searchQuery) ||
                          payment.payment_method.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          payment.status.toLowerCase().includes(searchQuery.toLowerCase())
                        )
                      })
                    }
                    if (statusFilter !== 'all') {
                      dataToExport = dataToExport.filter(payment => payment.status === statusFilter)
                    }
                    if (paymentMethodFilter !== 'all') {
                      dataToExport = dataToExport.filter(payment => payment.payment_method === paymentMethodFilter)
                    }
                    await ExportService.exportPaymentsToExcel(dataToExport)
                    notify.exportSuccess(`تم تصدير ${dataToExport.length} دفعة بنجاح إلى ملف Excel!`)
                  } catch (error) {
                    console.error('Error exporting payments (Excel):', error)
                    notify.exportError('فشل في تصدير بيانات المدفوعات (Excel)')
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
                  if (payments.length === 0) {
                    notify.noDataToExport('لا توجد بيانات مدفوعات للتصدير')
                    return
                  }
                  try {
                let dataToExport = [...payments]
                if (paymentStats.timeFilter.startDate && paymentStats.timeFilter.endDate) {
                  const startDate = new Date(paymentStats.timeFilter.startDate)
                  const endDate = new Date(paymentStats.timeFilter.endDate)
                  endDate.setHours(23, 59, 59, 999)
                  dataToExport = dataToExport.filter(payment => {
                    const paymentDate = new Date(payment.payment_date)
                    return paymentDate >= startDate && paymentDate <= endDate
                  })
                }
                if (searchQuery) {
                  dataToExport = dataToExport.filter(payment => {
                        const patientName = patients.find(p => p.id === payment.patient_id)?.full_name || ''
                  return (
                    payment.receipt_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    payment.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    payment.amount.toString().includes(searchQuery) ||
                    payment.payment_method.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    payment.status.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                })
              }
              if (statusFilter !== 'all') {
                dataToExport = dataToExport.filter(payment => payment.status === statusFilter)
              }
              if (paymentMethodFilter !== 'all') {
                dataToExport = dataToExport.filter(payment => payment.payment_method === paymentMethodFilter)
              }
                    await ExportService.exportPaymentsToPDF(dataToExport)
                    notify.exportSuccess(`تم تصدير ${dataToExport.length} دفعة كملف PDF بنجاح!`)
              } catch (error) {
                    console.error('Error exporting payments (PDF):', error)
                    notify.exportError('فشل في تصدير بيانات المدفوعات (PDF)')
                  }
                }}
                className="arabic-enhanced"
              >
                <FileText className="w-4 h-4 ml-2" />
                تصدير PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={handleAddPayment}>
            <Plus className="w-4 h-4 ml-2" />
            تسجيل دفعة جديدة
          </Button>
        </div>
      </div>

      {/* Time Filter Section */}
      <TimeFilter
        value={paymentStats.timeFilter}
        onChange={paymentStats.handleFilterChange}
        onClear={paymentStats.resetFilter}
        title="فلترة زمنية - المدفوعات"
        defaultOpen={false}
      />

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className={getCardStyles("green")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {paymentStats.timeFilter.preset === 'all' || (!paymentStats.timeFilter.startDate && !paymentStats.timeFilter.endDate) ? 'إجمالي الإيرادات' : 'الإيرادات المفلترة'}
            </CardTitle>
            <DollarSign className={`h-4 w-4 ${getIconStyles("green")}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {paymentStats.timeFilter.preset === 'all' || (!paymentStats.timeFilter.startDate && !paymentStats.timeFilter.endDate)
                ? formatCurrency(totalRevenue)
                : formatCurrency(paymentStats.financialStats.totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">
              {paymentStats.timeFilter.preset === 'all' || (!paymentStats.timeFilter.startDate && !paymentStats.timeFilter.endDate)
                ? 'من المدفوعات المكتملة والجزئية'
                : 'من المدفوعات المكتملة والجزئية في الفترة المحددة'}
            </p>
            {paymentStats.trend && (
              <div className={`text-xs flex items-center mt-1 ${
                paymentStats.trend.isPositive ? 'text-green-600' : 'text-red-600'
              }`}>
                <TrendingUp className={`w-3 h-3 ml-1 ${paymentStats.trend.isPositive ? '' : 'rotate-180'}`} />
                <span>{Math.abs(paymentStats.trend.changePercent)}% من الفترة السابقة</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className={getCardStyles("red")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {paymentStats.timeFilter.preset === 'all' || (!paymentStats.timeFilter.startDate && !paymentStats.timeFilter.endDate) ? 'المبالغ غير المدفوعة' : 'المبالغ غير المدفوعة المفلترة'}
            </CardTitle>
            <AlertTriangle className={`h-4 w-4 ${getIconStyles("red")}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {paymentStats.timeFilter.preset === 'all' || (!paymentStats.timeFilter.startDate && !paymentStats.timeFilter.endDate)
                ? formatCurrency(pendingAmount)
                : formatCurrency(paymentStats.financialStats.pendingAmount)}
            </div>
            <p className="text-xs text-muted-foreground">
              {paymentStats.timeFilter.preset === 'all' || (!paymentStats.timeFilter.startDate && !paymentStats.timeFilter.endDate)
                ? 'من العلاجات والمواعيد الآجلة'
                : 'من العلاجات والمواعيد الآجلة في الفترة المحددة'}
            </p>
          </CardContent>
        </Card>

        <Card className={getCardStyles("yellow")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {paymentStats.timeFilter.preset === 'all' || (!paymentStats.timeFilter.startDate && !paymentStats.timeFilter.endDate) ? 'المبالغ المتبقية' : 'المبالغ المتبقية المفلترة'}
            </CardTitle>
            <Clock className={`h-4 w-4 ${getIconStyles("yellow")}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {(() => {
                // حساب المبالغ المتبقية للبيانات المفلترة
                let dataToCalculate = [...payments]

                // تطبيق الفلترة الزمنية
                if (paymentStats.timeFilter.startDate && paymentStats.timeFilter.endDate) {
                  const startDate = new Date(paymentStats.timeFilter.startDate)
                  const endDate = new Date(paymentStats.timeFilter.endDate)
                  endDate.setHours(23, 59, 59, 999)

                  dataToCalculate = dataToCalculate.filter(payment => {
                    const paymentDate = new Date(payment.payment_date)
                    return paymentDate >= startDate && paymentDate <= endDate
                  })
                }

                // تطبيق فلاتر البحث والحالة وطريقة الدفع
                if (searchQuery) {
                  dataToCalculate = dataToCalculate.filter(payment => {
                    const patientName = patients.find(p => p.id === payment.patient_id)?.full_name || ''
                    return (
                      payment.receipt_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      payment.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      payment.amount.toString().includes(searchQuery) ||
                      payment.payment_method.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      payment.status.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                  })
                }

                if (statusFilter !== 'all') {
                  dataToCalculate = dataToCalculate.filter(payment => payment.status === statusFilter)
                }

                if (paymentMethodFilter !== 'all') {
                  dataToCalculate = dataToCalculate.filter(payment => payment.payment_method === paymentMethodFilter)
                }

                // دالة مساعدة للتحقق من صحة المبالغ (نفس المستخدمة في التصدير)
                const validateAmount = (amount: any): number => {
                  const num = Number(amount)
                  return isNaN(num) || !isFinite(num) ? 0 : Math.round(num * 100) / 100
                }

                // حساب المبالغ المتبقية من المدفوعات الجزئية بدقة (نفس منطق التصدير المحدث)
                // تجميع المدفوعات حسب العلاج والموعد
                const treatmentGroups = new Map<string, { totalDue: number, totalPaid: number }>()
                const appointmentGroups = new Map<string, { totalDue: number, totalPaid: number }>()
                let generalRemainingBalance = 0

                dataToCalculate.forEach(payment => {
                  if (payment.status === 'partial') {
                    if (payment.tooth_treatment_id) {
                      // مدفوعات مرتبطة بعلاجات
                      const treatmentId = payment.tooth_treatment_id
                      const totalDue = validateAmount(payment.treatment_total_cost || payment.total_amount_due || 0)
                      const paidAmount = validateAmount(payment.amount)

                      if (!treatmentGroups.has(treatmentId)) {
                        treatmentGroups.set(treatmentId, { totalDue, totalPaid: 0 })
                      }

                      const group = treatmentGroups.get(treatmentId)!
                      group.totalPaid += paidAmount
                    } else if (payment.appointment_id) {
                      // مدفوعات مرتبطة بمواعيد (للتوافق مع النظام القديم)
                      const appointmentId = payment.appointment_id
                      const totalDue = validateAmount(payment.total_amount_due || 0)
                      const paidAmount = validateAmount(payment.amount)

                      if (!appointmentGroups.has(appointmentId)) {
                        appointmentGroups.set(appointmentId, { totalDue, totalPaid: 0 })
                      }

                      const group = appointmentGroups.get(appointmentId)!
                      group.totalPaid += paidAmount
                    } else {
                      // مدفوعات عامة غير مرتبطة بمواعيد أو علاجات
                      const totalDue = validateAmount(payment.total_amount_due || payment.amount)
                      const paid = validateAmount(payment.amount_paid || payment.amount)
                      generalRemainingBalance += Math.max(0, totalDue - paid)
                    }
                  }
                })

                // حساب إجمالي المبالغ المتبقية من العلاجات
                const treatmentRemainingBalance = Array.from(treatmentGroups.values()).reduce((sum, group) => {
                  return sum + Math.max(0, group.totalDue - group.totalPaid)
                }, 0)

                // حساب إجمالي المبالغ المتبقية من المواعيد
                const appointmentRemainingBalance = Array.from(appointmentGroups.values()).reduce((sum, group) => {
                  return sum + Math.max(0, group.totalDue - group.totalPaid)
                }, 0)

                // إجمالي المبالغ المتبقية
                const filteredRemainingBalance = validateAmount(treatmentRemainingBalance + appointmentRemainingBalance + generalRemainingBalance)

                // استخدام البيانات من الـ store للحالة غير المفلترة
                const isFiltered = paymentStats.timeFilter.startDate && paymentStats.timeFilter.endDate
                return isFiltered ? formatCurrency(filteredRemainingBalance) : formatCurrency(totalRemainingBalance)
              })()}
            </div>
            <p className="text-xs text-muted-foreground">
              {(() => {
                // حساب عدد المدفوعات الجزئية المفلترة
                let dataToCalculate = [...payments]

                // تطبيق نفس الفلاتر
                if (paymentStats.timeFilter.startDate && paymentStats.timeFilter.endDate) {
                  const startDate = new Date(paymentStats.timeFilter.startDate)
                  const endDate = new Date(paymentStats.timeFilter.endDate)
                  endDate.setHours(23, 59, 59, 999)

                  dataToCalculate = dataToCalculate.filter(payment => {
                    const paymentDate = new Date(payment.payment_date)
                    return paymentDate >= startDate && paymentDate <= endDate
                  })
                }

                if (searchQuery) {
                  dataToCalculate = dataToCalculate.filter(payment => {
                    const patientName = patients.find(p => p.id === payment.patient_id)?.full_name || ''
                    return (
                      payment.receipt_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      payment.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      payment.amount.toString().includes(searchQuery) ||
                      payment.payment_method.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      payment.status.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                  })
                }

                if (statusFilter !== 'all') {
                  dataToCalculate = dataToCalculate.filter(payment => payment.status === statusFilter)
                }

                if (paymentMethodFilter !== 'all') {
                  dataToCalculate = dataToCalculate.filter(payment => payment.payment_method === paymentMethodFilter)
                }

                const filteredPartialCount = dataToCalculate.filter(p => p.status === 'partial').length

                return paymentStats.timeFilter.preset === 'all' || (!paymentStats.timeFilter.startDate && !paymentStats.timeFilter.endDate)
                  ? `من ${partialPaymentsCount} دفعة جزئية`
                  : `من ${filteredPartialCount} دفعة جزئية في الفترة المحددة`
              })()}
            </p>
          </CardContent>
        </Card>

        <Card className={getCardStyles("purple")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {paymentStats.timeFilter.preset === 'all' || (!paymentStats.timeFilter.startDate && !paymentStats.timeFilter.endDate) ? 'معدل الإنجاز' : 'معدل الإنجاز المفلتر'}
            </CardTitle>
            <TrendingUp className={`h-4 w-4 ${getIconStyles("purple")}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {(() => {
                // حساب معدل الإنجاز (المدفوعات المكتملة / إجمالي المدفوعات)
                let dataToCalculate = [...payments]

                // تطبيق الفلترة الزمنية
                if (paymentStats.timeFilter.startDate && paymentStats.timeFilter.endDate) {
                  const startDate = new Date(paymentStats.timeFilter.startDate)
                  const endDate = new Date(paymentStats.timeFilter.endDate)
                  endDate.setHours(23, 59, 59, 999)

                  dataToCalculate = dataToCalculate.filter(payment => {
                    const paymentDate = new Date(payment.payment_date)
                    return paymentDate >= startDate && paymentDate <= endDate
                  })
                }

                const totalPayments = dataToCalculate.length
                const completedPayments = dataToCalculate.filter(p => p.status === 'completed').length
                const successRate = totalPayments > 0 ? ((completedPayments / totalPayments) * 100).toFixed(1) : '0.0'

                return `${successRate}%`
              })()}
            </div>
            <p className="text-xs text-muted-foreground">
              {(() => {
                let dataToCalculate = [...payments]

                if (paymentStats.timeFilter.startDate && paymentStats.timeFilter.endDate) {
                  const startDate = new Date(paymentStats.timeFilter.startDate)
                  const endDate = new Date(paymentStats.timeFilter.endDate)
                  endDate.setHours(23, 59, 59, 999)

                  dataToCalculate = dataToCalculate.filter(payment => {
                    const paymentDate = new Date(payment.payment_date)
                    return paymentDate >= startDate && paymentDate <= endDate
                  })
                }

                const completedCount = dataToCalculate.filter(p => p.status === 'completed').length
                const totalCount = dataToCalculate.length

                return paymentStats.timeFilter.preset === 'all' || (!paymentStats.timeFilter.startDate && !paymentStats.timeFilter.endDate)
                  ? `${completedCount} مكتملة من ${totalCount} إجمالي`
                  : `${completedCount} مكتملة من ${totalCount} في الفترة المحددة`
              })()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Password Settings */}
      <PasswordSettings />

      {/* Search and Filter Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg arabic-enhanced">البحث والتصفية</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-2 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="البحث في المدفوعات..."
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
                  <SelectItem value="completed">مكتمل</SelectItem>
                  <SelectItem value="pending">آجل</SelectItem>
                  <SelectItem value="partial">جزئي</SelectItem>
                  <SelectItem value="overdue">متأخر</SelectItem>
                  <SelectItem value="failed">فاشل</SelectItem>
                  <SelectItem value="refunded">مسترد</SelectItem>
                </SelectContent>
              </Select>
              <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="تصفية حسب طريقة الدفع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع طرق الدفع</SelectItem>
                  <SelectItem value="cash">نقداً</SelectItem>
                  <SelectItem value="card">بطاقة ائتمان</SelectItem>
                  <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                  <SelectItem value="check">شيك</SelectItem>
                  <SelectItem value="insurance">تأمين</SelectItem>
                </SelectContent>
              </Select>
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  onClick={clearAllFilters}
                  className="flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  مسح الفلاتر
                </Button>
              )}
            </div>
          </div>
          {hasActiveFilters && (
            <div className="mt-4 text-sm text-muted-foreground arabic-enhanced">
              عرض {filteredPayments.length} من أصل {payments.length} مدفوعة
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payments Table */}
      <PaymentTable
        payments={filteredPayments}
        patients={patients}
        isLoading={isLoading}
        onEdit={handleEditPayment}
        onDelete={handleDeletePayment}
        onShowReceipt={handleShowReceipt}
        onViewDetails={handleViewDetails}
      />

      {/* Dialogs */}
      <AddPaymentDialog
        open={showAddDialog}
        onOpenChange={(open) => {
          setShowAddDialog(open)
          if (!open) {
            // Clear pre-selected patient when dialog closes
            setPreSelectedPatientId(undefined)
          }
        }}
        preSelectedPatientId={preSelectedPatientId}
      />

      {selectedPayment && (
        <>
          <EditPaymentDialog
            open={showEditDialog}
            onOpenChange={setShowEditDialog}
            payment={selectedPayment}
          />

          <DeletePaymentDialog
            open={showDeleteDialog}
            onOpenChange={setShowDeleteDialog}
            payment={selectedPayment}
          />

          <PaymentReceiptDialog
            open={showReceiptDialog}
            onOpenChange={setShowReceiptDialog}
            payment={selectedPayment}
          />

          <PaymentDetailsDialog
            open={showDetailsDialog}
            onOpenChange={setShowDetailsDialog}
            payment={selectedPayment}
            patients={patients}
          />
        </>
      )}
    </div>
  )
}
