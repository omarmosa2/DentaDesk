import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
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
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Activity,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Minus,
  Plus,
  Database,
  Zap
} from 'lucide-react'

interface SystemHealthMetrics {
  overallHealth: number // 0-100
  dataIntegrity: number // 0-100
  calculationAccuracy: number // 0-100
  realTimeSync: number // 0-100
  performanceScore: number // 0-100
}

interface FinancialSystemStatus {
  isHealthy: boolean
  lastUpdated: Date
  metrics: SystemHealthMetrics
  issues: string[]
  warnings: string[]
  recommendations: string[]
  financialSummary: {
    totalRevenue: number
    totalExpenses: number
    netProfit: number
    profitMargin: number
  }
  dataStats: {
    paymentsCount: number
    expensesCount: number
    inventoryCount: number
    labOrdersCount: number
    clinicNeedsCount: number
  }
}

export default function FinancialSystemStatus() {
  const { payments } = usePaymentStore()
  const { expenses } = useExpensesStore()
  const { inventoryItems } = useInventoryStore()
  const { labOrders } = useLabOrderStore()
  const { clinicNeeds } = useClinicNeedsStore()
  const { currentCurrency } = useCurrency()

  const [systemStatus, setSystemStatus] = useState<FinancialSystemStatus | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const validateAmount = (amount: any): number => {
    const num = Number(amount)
    return isNaN(num) || !isFinite(num) ? 0 : Math.round(num * 100) / 100
  }

  const analyzeSystemHealth = async () => {
    setIsAnalyzing(true)

    try {
      const startTime = Date.now()
      const issues: string[] = []
      const warnings: string[] = []
      const recommendations: string[] = []

      // 1. Data Integrity Analysis
      let dataIntegrityScore = 100

      const safePayments = Array.isArray(payments) ? payments : []
      const safeExpenses = Array.isArray(expenses) ? expenses : []
      const safeInventoryItems = Array.isArray(inventoryItems) ? inventoryItems : []
      const safeLabOrders = Array.isArray(labOrders) ? labOrders : []
      const safeClinicNeeds = Array.isArray(clinicNeeds) ? clinicNeeds : []

      if (safePayments.length === 0) {
        warnings.push('لا توجد مدفوعات في النظام')
        dataIntegrityScore -= 20
      }

      if (safeExpenses.length === 0) {
        warnings.push('لا توجد مصروفات مسجلة')
        dataIntegrityScore -= 10
      }

      // 2. Financial Validation
      const comprehensiveValidation = FinancialValidator.validateAllFinancialData({
        payments: safePayments,
        expenses: safeExpenses,
        inventory: safeInventoryItems,
        labOrders: safeLabOrders,
        clinicNeeds: safeClinicNeeds
      })

      let calculationAccuracyScore = comprehensiveValidation.isValid ? 100 : 70

      if (!comprehensiveValidation.isValid) {
        issues.push(...comprehensiveValidation.errors)
        calculationAccuracyScore -= comprehensiveValidation.errors.length * 10
      }

      if (comprehensiveValidation.warnings.length > 0) {
        warnings.push(...comprehensiveValidation.warnings)
        calculationAccuracyScore -= comprehensiveValidation.warnings.length * 5
      }

      // 3. Financial Calculations
      const financialStats = ComprehensiveExportService.calculateFinancialStats(
        payments, labOrders, clinicNeeds, inventoryItems, expenses
      )

      const totalRevenue = financialStats.totalRevenue
      const totalExpenses = financialStats.totalExpenses
      const netProfit = financialStats.isProfit ? financialStats.netProfit : -financialStats.lossAmount
      const profitMargin = financialStats.profitMargin

      // 4. Performance Analysis
      const analysisTime = Date.now() - startTime
      let performanceScore = 100

      if (analysisTime > 1000) {
        performanceScore -= 20
        warnings.push('تحليل النظام يستغرق وقتاً أطول من المتوقع')
      }

      // 5. Real-time Sync Score
      let realTimeSyncScore = 100

      // Check if data is recent (within last hour)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
      const recentPayments = payments.filter(p => new Date(p.payment_date) > oneHourAgo)

      if (payments.length > 0 && recentPayments.length === 0) {
        realTimeSyncScore -= 10
        warnings.push('لا توجد مدفوعات حديثة في الساعة الماضية')
      }

      // 6. Business Logic Recommendations
      if (totalExpenses > totalRevenue) {
        recommendations.push('المصروفات تتجاوز الإيرادات - يُنصح بمراجعة الميزانية')
      }

      if (profitMargin < 10) {
        recommendations.push('هامش الربح منخفض - يُنصح بتحسين الكفاءة التشغيلية')
      }

      if (inventoryItems.length === 0) {
        recommendations.push('لا توجد عناصر في المخزون - يُنصح بإضافة المواد الأساسية')
      }

      // 7. Calculate Overall Health
      const overallHealth = Math.round(
        (dataIntegrityScore + calculationAccuracyScore + realTimeSyncScore + performanceScore) / 4
      )

      const metrics: SystemHealthMetrics = {
        overallHealth: Math.max(0, Math.min(100, overallHealth)),
        dataIntegrity: Math.max(0, Math.min(100, dataIntegrityScore)),
        calculationAccuracy: Math.max(0, Math.min(100, calculationAccuracyScore)),
        realTimeSync: Math.max(0, Math.min(100, realTimeSyncScore)),
        performanceScore: Math.max(0, Math.min(100, performanceScore))
      }

      setSystemStatus({
        isHealthy: overallHealth >= 80 && issues.length === 0,
        lastUpdated: new Date(),
        metrics,
        issues,
        warnings,
        recommendations,
        financialSummary: {
          totalRevenue,
          totalExpenses,
          netProfit,
          profitMargin
        },
        dataStats: {
          paymentsCount: payments.length,
          expensesCount: expenses.length,
          inventoryCount: inventoryItems.length,
          labOrdersCount: labOrders.length,
          clinicNeedsCount: clinicNeeds.length
        }
      })

    } catch (error) {
      console.error('Error analyzing system health:', error)
      setSystemStatus({
        isHealthy: false,
        lastUpdated: new Date(),
        metrics: {
          overallHealth: 0,
          dataIntegrity: 0,
          calculationAccuracy: 0,
          realTimeSync: 0,
          performanceScore: 0
        },
        issues: [`خطأ في تحليل النظام: ${error}`],
        warnings: [],
        recommendations: ['يُنصح بإعادة تشغيل التطبيق'],
        financialSummary: { totalRevenue: 0, totalExpenses: 0, netProfit: 0, profitMargin: 0 },
        dataStats: { paymentsCount: 0, expensesCount: 0, inventoryCount: 0, labOrdersCount: 0, clinicNeedsCount: 0 }
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Auto-analyze on component mount and data changes
  useEffect(() => {
    analyzeSystemHealth()
  }, [payments, expenses, inventoryItems, labOrders, clinicNeeds])

  const getHealthColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getHealthBadge = (isHealthy: boolean) => {
    return (
      <Badge variant={isHealthy ? "default" : "destructive"}>
        {isHealthy ? "صحي" : "يحتاج انتباه"}
      </Badge>
    )
  }

  const getProgressColor = (score: number) => {
    if (score >= 90) return 'bg-green-500'
    if (score >= 70) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              حالة النظام المالي
            </CardTitle>
            <CardDescription>
              مراقبة شاملة لصحة وأداء النظام المالي في الوقت الفعلي
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {systemStatus && getHealthBadge(systemStatus.isHealthy)}
            <Button
              onClick={analyzeSystemHealth}
              disabled={isAnalyzing}
              size="sm"
              variant="outline"
            >
              {isAnalyzing ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              تحديث
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {systemStatus && (
          <>
            {/* Overall Health Score */}
            <div className="text-center p-6 border rounded-lg">
              <div className={`text-4xl font-bold ${getHealthColor(systemStatus.metrics.overallHealth)}`}>
                {systemStatus.metrics.overallHealth}%
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                الصحة العامة للنظام
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                آخر تحديث: {systemStatus.lastUpdated.toLocaleString('ar-SA')}
              </div>
            </div>

            {/* Health Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>سلامة البيانات</span>
                  <span className={getHealthColor(systemStatus.metrics.dataIntegrity)}>
                    {systemStatus.metrics.dataIntegrity}%
                  </span>
                </div>
                <Progress
                  value={systemStatus.metrics.dataIntegrity}
                  className="h-2"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>دقة الحسابات</span>
                  <span className={getHealthColor(systemStatus.metrics.calculationAccuracy)}>
                    {systemStatus.metrics.calculationAccuracy}%
                  </span>
                </div>
                <Progress
                  value={systemStatus.metrics.calculationAccuracy}
                  className="h-2"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>التزامن الفوري</span>
                  <span className={getHealthColor(systemStatus.metrics.realTimeSync)}>
                    {systemStatus.metrics.realTimeSync}%
                  </span>
                </div>
                <Progress
                  value={systemStatus.metrics.realTimeSync}
                  className="h-2"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>الأداء</span>
                  <span className={getHealthColor(systemStatus.metrics.performanceScore)}>
                    {systemStatus.metrics.performanceScore}%
                  </span>
                </div>
                <Progress
                  value={systemStatus.metrics.performanceScore}
                  className="h-2"
                />
              </div>
            </div>

            {/* Financial Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">إجمالي الإيرادات</span>
                </div>
                <div className="text-xl font-bold text-green-600">
                  <CurrencyDisplay amount={systemStatus.financialSummary.totalRevenue} currency={currentCurrency} />
                </div>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Minus className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium">إجمالي المصروفات</span>
                </div>
                <div className="text-xl font-bold text-red-600">
                  <CurrencyDisplay amount={systemStatus.financialSummary.totalExpenses} currency={currentCurrency} />
                </div>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  {systemStatus.financialSummary.netProfit >= 0 ? (
                    <Plus className="h-4 w-4 text-green-600" />
                  ) : (
                    <Minus className="h-4 w-4 text-red-600" />
                  )}
                  <span className="text-sm font-medium">صافي الربح</span>
                </div>
                <div className={`text-xl font-bold ${systemStatus.financialSummary.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  <CurrencyDisplay amount={systemStatus.financialSummary.netProfit} currency={currentCurrency} />
                </div>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  {systemStatus.financialSummary.profitMargin >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                  <span className="text-sm font-medium">هامش الربح</span>
                </div>
                <div className={`text-xl font-bold ${systemStatus.financialSummary.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {systemStatus.financialSummary.profitMargin.toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Data Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center p-3 border rounded">
                <div className="text-2xl font-bold">{systemStatus.dataStats.paymentsCount}</div>
                <div className="text-sm text-muted-foreground">مدفوعات</div>
              </div>
              <div className="text-center p-3 border rounded">
                <div className="text-2xl font-bold">{systemStatus.dataStats.expensesCount}</div>
                <div className="text-sm text-muted-foreground">مصروفات</div>
              </div>
              <div className="text-center p-3 border rounded">
                <div className="text-2xl font-bold">{systemStatus.dataStats.inventoryCount}</div>
                <div className="text-sm text-muted-foreground">مخزون</div>
              </div>
              <div className="text-center p-3 border rounded">
                <div className="text-2xl font-bold">{systemStatus.dataStats.labOrdersCount}</div>
                <div className="text-sm text-muted-foreground">مختبر</div>
              </div>
              <div className="text-center p-3 border rounded">
                <div className="text-2xl font-bold">{systemStatus.dataStats.clinicNeedsCount}</div>
                <div className="text-sm text-muted-foreground">احتياجات</div>
              </div>
            </div>

            {/* Issues and Warnings */}
            {systemStatus.issues.length > 0 && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium mb-2">مشاكل تحتاج إصلاح:</div>
                  <ul className="list-disc list-inside space-y-1">
                    {systemStatus.issues.map((issue, index) => (
                      <li key={index} className="text-sm">{issue}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {systemStatus.warnings.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium mb-2">تحذيرات:</div>
                  <ul className="list-disc list-inside space-y-1">
                    {systemStatus.warnings.map((warning, index) => (
                      <li key={index} className="text-sm">{warning}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Recommendations */}
            {systemStatus.recommendations.length > 0 && (
              <div className="p-4 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-700 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-blue-800 dark:text-blue-200">توصيات للتحسين:</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-sm text-blue-700 dark:text-blue-300">
                  {systemStatus.recommendations.map((recommendation, index) => (
                    <li key={index}>{recommendation}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
