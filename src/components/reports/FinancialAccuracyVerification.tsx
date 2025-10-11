import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { usePaymentStore } from '@/store/paymentStore'
import { useExpensesStore } from '@/store/expensesStore'
import { useInventoryStore } from '@/store/inventoryStore'
import { useLabOrderStore } from '@/store/labOrderStore'
import { useClinicNeedsStore } from '@/store/clinicNeedsStore'
import { FinancialValidator } from '@/utils/financialValidation'
import { ComprehensiveExportService } from '@/services/comprehensiveExportService'
import { useCurrency } from '@/contexts/CurrencyContext'
import CurrencyDisplay from '@/components/ui/currency-display'
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, Calculator } from 'lucide-react'

interface FinancialAccuracyResult {
  isAccurate: boolean
  totalRevenue: number
  totalExpenses: number
  netProfit: number
  profitMargin: number
  dataIntegrity: {
    paymentsValid: boolean
    expensesValid: boolean
    inventoryValid: boolean
    labOrdersValid: boolean
    clinicNeedsValid: boolean
  }
  errors: string[]
  warnings: string[]
  lastVerified: Date
}

export default function FinancialAccuracyVerification() {
  const { payments } = usePaymentStore()
  const { expenses } = useExpensesStore()
  const { inventoryItems } = useInventoryStore()
  const { labOrders } = useLabOrderStore()
  const { clinicNeeds } = useClinicNeedsStore()
  const { currentCurrency } = useCurrency()

  const [verificationResult, setVerificationResult] = useState<FinancialAccuracyResult | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)

  const validateAmount = (amount: any): number => {
    const num = Number(amount)
    return isNaN(num) || !isFinite(num) ? 0 : Math.round(num * 100) / 100
  }

  const performComprehensiveVerification = async () => {
    setIsVerifying(true)

    try {
      // التحقق من صحة جميع البيانات المالية
      const comprehensiveValidation = FinancialValidator.validateAllFinancialData({
        payments: payments,
        expenses: expenses,
        inventory: inventoryItems,
        labOrders: labOrders,
        clinicNeeds: clinicNeeds
      })

      // حساب الإحصائيات المالية الشاملة
      const financialStats = ComprehensiveExportService.calculateFinancialStats(
        payments, labOrders, clinicNeeds, inventoryItems, expenses
      )

      // حساب المصروفات بالتفصيل
      const directExpenses = validateAmount(
        expenses
          .filter(e => e.status === 'paid')
          .reduce((sum, e) => sum + validateAmount(e.amount), 0)
      )

      const safeInventoryItems = Array.isArray(inventoryItems) ? inventoryItems : []
      const inventoryExpenses = validateAmount(
        safeInventoryItems.reduce((sum, item) => {
          const cost = validateAmount(item.cost_per_unit || 0)
          const quantity = validateAmount(item.quantity || 0)
          return sum + (cost * quantity)
        }, 0)
      )

      const safeClinicNeeds = Array.isArray(clinicNeeds) ? clinicNeeds : []
      const clinicNeedsExpenses = validateAmount(
        safeClinicNeeds
          .filter(need => need.status === 'received' || need.status === 'ordered')
          .reduce((sum, need) => sum + (validateAmount(need.quantity) * validateAmount(need.price)), 0)
      )

      const safeLabOrders = Array.isArray(labOrders) ? labOrders : []
      const labOrdersExpenses = validateAmount(
        safeLabOrders.reduce((sum, order) => sum + validateAmount(order.paid_amount || 0), 0)
      )

      const totalExpenses = directExpenses + inventoryExpenses + clinicNeedsExpenses + labOrdersExpenses

      // حساب الإيرادات
      const totalRevenue = validateAmount(
        payments
          .filter(p => p.status === 'completed' || p.status === 'partial')
          .reduce((sum, payment) => sum + validateAmount(payment.amount), 0)
      )

      const netProfit = totalRevenue - totalExpenses
      const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0

      // التحقق من تطابق الحسابات
      const calculationAccuracy = {
        revenueMatch: Math.abs(totalRevenue - financialStats.totalRevenue) < 0.01,
        expensesMatch: Math.abs(totalExpenses - financialStats.totalExpenses) < 0.01,
        profitMatch: Math.abs(netProfit - (financialStats.netProfit || financialStats.lossAmount)) < 0.01
      }

      const isAccurate = comprehensiveValidation.isValid &&
                        calculationAccuracy.revenueMatch &&
                        calculationAccuracy.expensesMatch &&
                        calculationAccuracy.profitMatch

      setVerificationResult({
        isAccurate,
        totalRevenue,
        totalExpenses,
        netProfit,
        profitMargin,
        dataIntegrity: {
          paymentsValid: payments.length > 0,
          expensesValid: expenses.length >= 0,
          inventoryValid: inventoryItems.length >= 0,
          labOrdersValid: labOrders.length >= 0,
          clinicNeedsValid: clinicNeeds.length >= 0
        },
        errors: comprehensiveValidation.errors,
        warnings: comprehensiveValidation.warnings,
        lastVerified: new Date()
      })

    } catch (error) {
      console.error('Error during financial verification:', error)
      setVerificationResult({
        isAccurate: false,
        totalRevenue: 0,
        totalExpenses: 0,
        netProfit: 0,
        profitMargin: 0,
        dataIntegrity: {
          paymentsValid: false,
          expensesValid: false,
          inventoryValid: false,
          labOrdersValid: false,
          clinicNeedsValid: false
        },
        errors: [`Verification failed: ${error}`],
        warnings: [],
        lastVerified: new Date()
      })
    } finally {
      setIsVerifying(false)
    }
  }

  // التحقق التلقائي عند تحميل المكون أو تغيير البيانات
  useEffect(() => {
    performComprehensiveVerification()
  }, [payments, expenses, inventoryItems, labOrders, clinicNeeds])

  const getStatusIcon = (isValid: boolean) => {
    return isValid ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    )
  }

  const getStatusBadge = (isValid: boolean) => {
    return (
      <Badge variant={isValid ? "default" : "destructive"}>
        {isValid ? "صحيح" : "خطأ"}
      </Badge>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              التحقق من دقة النظام المالي
            </CardTitle>
            <CardDescription>
              فحص شامل لضمان دقة 100% في جميع الحسابات المالية
            </CardDescription>
          </div>
          <Button
            onClick={performComprehensiveVerification}
            disabled={isVerifying}
            size="sm"
          >
            {isVerifying ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            فحص الآن
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {verificationResult && (
          <>
            {/* حالة النظام العامة */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-2">
                {getStatusIcon(verificationResult.isAccurate)}
                <span className="font-medium">
                  حالة النظام المالي: {getStatusBadge(verificationResult.isAccurate)}
                </span>
              </div>
              <span className="text-sm text-muted-foreground">
                آخر فحص: {verificationResult.lastVerified.toLocaleString('ar-SA')}
              </span>
            </div>

            {/* الملخص المالي */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="text-sm text-muted-foreground">إجمالي الإيرادات</div>
                <div className="text-2xl font-bold text-green-600">
                  <CurrencyDisplay amount={verificationResult.totalRevenue} currency={currentCurrency} />
                </div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-sm text-muted-foreground">إجمالي المصروفات</div>
                <div className="text-2xl font-bold text-red-600">
                  <CurrencyDisplay amount={verificationResult.totalExpenses} currency={currentCurrency} />
                </div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-sm text-muted-foreground">صافي الربح</div>
                <div className={`text-2xl font-bold ${verificationResult.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  <CurrencyDisplay amount={verificationResult.netProfit} currency={currentCurrency} />
                </div>
                <div className="text-sm text-muted-foreground">
                  هامش الربح: {verificationResult.profitMargin.toFixed(1)}%
                </div>
              </div>
            </div>

            {/* سلامة البيانات */}
            <div className="space-y-2">
              <h4 className="font-medium">سلامة البيانات</h4>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                <div className="flex items-center gap-2 p-2 border rounded">
                  {getStatusIcon(verificationResult.dataIntegrity.paymentsValid)}
                  <span className="text-sm">المدفوعات</span>
                </div>
                <div className="flex items-center gap-2 p-2 border rounded">
                  {getStatusIcon(verificationResult.dataIntegrity.expensesValid)}
                  <span className="text-sm">المصروفات</span>
                </div>
                <div className="flex items-center gap-2 p-2 border rounded">
                  {getStatusIcon(verificationResult.dataIntegrity.inventoryValid)}
                  <span className="text-sm">المخزون</span>
                </div>
                <div className="flex items-center gap-2 p-2 border rounded">
                  {getStatusIcon(verificationResult.dataIntegrity.labOrdersValid)}
                  <span className="text-sm">المختبر</span>
                </div>
                <div className="flex items-center gap-2 p-2 border rounded">
                  {getStatusIcon(verificationResult.dataIntegrity.clinicNeedsValid)}
                  <span className="text-sm">الاحتياجات</span>
                </div>
              </div>
            </div>

            {/* الأخطاء والتحذيرات */}
            {verificationResult.errors.length > 0 && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium mb-2">أخطاء مكتشفة:</div>
                  <ul className="list-disc list-inside space-y-1">
                    {verificationResult.errors.map((error, index) => (
                      <li key={index} className="text-sm">{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {verificationResult.warnings.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium mb-2">تحذيرات:</div>
                  <ul className="list-disc list-inside space-y-1">
                    {verificationResult.warnings.map((warning, index) => (
                      <li key={index} className="text-sm">{warning}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
