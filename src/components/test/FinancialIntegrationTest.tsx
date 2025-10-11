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
import { CheckCircle, XCircle, AlertTriangle, TestTube, Calculator } from 'lucide-react'

interface TestResult {
  testName: string
  passed: boolean
  expected: number
  actual: number
  tolerance: number
  error?: string
}

interface FinancialIntegrationTestResult {
  overallPassed: boolean
  tests: TestResult[]
  summary: {
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
  executionTime: number
}

export default function FinancialIntegrationTest() {
  const { payments, loadPayments } = usePaymentStore()
  const { expenses, loadExpenses } = useExpensesStore()
  const { inventoryItems, loadItems } = useInventoryStore()
  const { labOrders, loadLabOrders } = useLabOrderStore()
  const { clinicNeeds, loadNeeds } = useClinicNeedsStore()
  const { currentCurrency } = useCurrency()

  const [testResult, setTestResult] = useState<FinancialIntegrationTestResult | null>(null)
  const [isRunning, setIsRunning] = useState(false)

  const validateAmount = (amount: any): number => {
    const num = Number(amount)
    return isNaN(num) || !isFinite(num) ? 0 : Math.round(num * 100) / 100
  }

  const runComprehensiveTest = async () => {
    setIsRunning(true)
    const startTime = Date.now()
    
    try {
      // تحميل جميع البيانات
      await Promise.all([
        loadPayments(),
        loadExpenses(),
        loadItems(),
        loadLabOrders(),
        loadNeeds()
      ])

      const tests: TestResult[] = []

      // اختبار 1: حساب إجمالي الإيرادات
      const expectedRevenue = validateAmount(
        payments
          .filter(p => p.status === 'completed' || p.status === 'partial')
          .reduce((sum, payment) => sum + validateAmount(payment.amount), 0)
      )

      const comprehensiveStats = ComprehensiveExportService.calculateFinancialStats(
        payments, labOrders, clinicNeeds, inventoryItems, expenses
      )

      tests.push({
        testName: 'إجمالي الإيرادات',
        passed: Math.abs(expectedRevenue - comprehensiveStats.totalRevenue) < 0.01,
        expected: expectedRevenue,
        actual: comprehensiveStats.totalRevenue,
        tolerance: 0.01
      })

      // اختبار 2: حساب المصروفات المباشرة
      const expectedDirectExpenses = validateAmount(
        expenses
          .filter(e => e.status === 'paid')
          .reduce((sum, e) => sum + validateAmount(e.amount), 0)
      )

      tests.push({
        testName: 'المصروفات المباشرة',
        passed: Math.abs(expectedDirectExpenses - comprehensiveStats.clinicExpensesTotal) < 0.01,
        expected: expectedDirectExpenses,
        actual: comprehensiveStats.clinicExpensesTotal,
        tolerance: 0.01
      })

      // اختبار 3: حساب تكلفة المخزون
      const expectedInventoryCost = validateAmount(
        inventoryItems.reduce((sum, item) => {
          const cost = validateAmount(item.cost_per_unit || 0)
          const quantity = validateAmount(item.quantity || 0)
          return sum + (cost * quantity)
        }, 0)
      )

      tests.push({
        testName: 'تكلفة المخزون',
        passed: Math.abs(expectedInventoryCost - comprehensiveStats.inventoryExpenses) < 0.01,
        expected: expectedInventoryCost,
        actual: comprehensiveStats.inventoryExpenses,
        tolerance: 0.01
      })

      // اختبار 4: حساب تكلفة احتياجات العيادة
      const expectedClinicNeedsCost = validateAmount(
        clinicNeeds
          .filter(need => need.status === 'received' || need.status === 'ordered')
          .reduce((sum, need) => sum + (validateAmount(need.quantity) * validateAmount(need.price)), 0)
      )

      tests.push({
        testName: 'تكلفة احتياجات العيادة',
        passed: Math.abs(expectedClinicNeedsCost - comprehensiveStats.clinicNeedsTotal) < 0.01,
        expected: expectedClinicNeedsCost,
        actual: comprehensiveStats.clinicNeedsTotal,
        tolerance: 0.01
      })

      // اختبار 5: حساب تكلفة طلبات المختبر
      const expectedLabCost = validateAmount(
        labOrders.reduce((sum, order) => sum + validateAmount(order.paid_amount || 0), 0)
      )

      tests.push({
        testName: 'تكلفة طلبات المختبر',
        passed: Math.abs(expectedLabCost - comprehensiveStats.labOrdersTotal) < 0.01,
        expected: expectedLabCost,
        actual: comprehensiveStats.labOrdersTotal,
        tolerance: 0.01
      })

      // اختبار 6: حساب إجمالي المصروفات
      const expectedTotalExpenses = expectedDirectExpenses + expectedInventoryCost + expectedClinicNeedsCost + expectedLabCost

      tests.push({
        testName: 'إجمالي المصروفات',
        passed: Math.abs(expectedTotalExpenses - comprehensiveStats.totalExpenses) < 0.01,
        expected: expectedTotalExpenses,
        actual: comprehensiveStats.totalExpenses,
        tolerance: 0.01
      })

      // اختبار 7: حساب صافي الربح
      const expectedNetProfit = expectedRevenue - expectedTotalExpenses
      const actualNetProfit = comprehensiveStats.isProfit ? comprehensiveStats.netProfit : -comprehensiveStats.lossAmount

      tests.push({
        testName: 'صافي الربح',
        passed: Math.abs(expectedNetProfit - actualNetProfit) < 0.01,
        expected: expectedNetProfit,
        actual: actualNetProfit,
        tolerance: 0.01
      })

      // اختبار 8: حساب هامش الربح
      const expectedProfitMargin = expectedRevenue > 0 ? (expectedNetProfit / expectedRevenue) * 100 : 0

      tests.push({
        testName: 'هامش الربح (%)',
        passed: Math.abs(expectedProfitMargin - comprehensiveStats.profitMargin) < 0.1,
        expected: expectedProfitMargin,
        actual: comprehensiveStats.profitMargin,
        tolerance: 0.1
      })

      // اختبار 9: التحقق من صحة البيانات
      const validationResult = FinancialValidator.validateAllFinancialData({
        payments,
        expenses,
        inventory: inventoryItems,
        labOrders,
        clinicNeeds
      })

      tests.push({
        testName: 'صحة البيانات المالية',
        passed: validationResult.isValid,
        expected: 1,
        actual: validationResult.isValid ? 1 : 0,
        tolerance: 0,
        error: validationResult.errors.join(', ')
      })

      const overallPassed = tests.every(test => test.passed)
      const executionTime = Date.now() - startTime

      setTestResult({
        overallPassed,
        tests,
        summary: {
          totalRevenue: expectedRevenue,
          totalExpenses: expectedTotalExpenses,
          netProfit: expectedNetProfit,
          profitMargin: expectedProfitMargin
        },
        dataStats: {
          paymentsCount: payments.length,
          expensesCount: expenses.length,
          inventoryCount: inventoryItems.length,
          labOrdersCount: labOrders.length,
          clinicNeedsCount: clinicNeeds.length
        },
        executionTime
      })

    } catch (error) {
      console.error('Error running financial integration test:', error)
      setTestResult({
        overallPassed: false,
        tests: [{
          testName: 'تشغيل الاختبار',
          passed: false,
          expected: 1,
          actual: 0,
          tolerance: 0,
          error: `خطأ في تشغيل الاختبار: ${error}`
        }],
        summary: { totalRevenue: 0, totalExpenses: 0, netProfit: 0, profitMargin: 0 },
        dataStats: { paymentsCount: 0, expensesCount: 0, inventoryCount: 0, labOrdersCount: 0, clinicNeedsCount: 0 },
        executionTime: Date.now() - startTime
      })
    } finally {
      setIsRunning(false)
    }
  }

  useEffect(() => {
    runComprehensiveTest()
  }, [])

  const getTestIcon = (passed: boolean) => {
    return passed ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    )
  }

  const getTestBadge = (passed: boolean) => {
    return (
      <Badge variant={passed ? "default" : "destructive"}>
        {passed ? "نجح" : "فشل"}
      </Badge>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TestTube className="h-5 w-5" />
              اختبار التكامل المالي الشامل
            </CardTitle>
            <CardDescription>
              فحص شامل لضمان التكامل الصحيح بين جميع مكونات النظام المالي
            </CardDescription>
          </div>
          <Button 
            onClick={runComprehensiveTest}
            disabled={isRunning}
            size="sm"
          >
            {isRunning ? (
              <TestTube className="h-4 w-4 animate-pulse mr-2" />
            ) : (
              <TestTube className="h-4 w-4 mr-2" />
            )}
            تشغيل الاختبار
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {testResult && (
          <>
            {/* نتيجة الاختبار العامة */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-2">
                {getTestIcon(testResult.overallPassed)}
                <span className="font-medium">
                  نتيجة الاختبار: {getTestBadge(testResult.overallPassed)}
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                وقت التنفيذ: {testResult.executionTime}ms
              </div>
            </div>

            {/* إحصائيات البيانات */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center p-3 border rounded">
                <div className="text-2xl font-bold">{testResult.dataStats.paymentsCount}</div>
                <div className="text-sm text-muted-foreground">مدفوعات</div>
              </div>
              <div className="text-center p-3 border rounded">
                <div className="text-2xl font-bold">{testResult.dataStats.expensesCount}</div>
                <div className="text-sm text-muted-foreground">مصروفات</div>
              </div>
              <div className="text-center p-3 border rounded">
                <div className="text-2xl font-bold">{testResult.dataStats.inventoryCount}</div>
                <div className="text-sm text-muted-foreground">مخزون</div>
              </div>
              <div className="text-center p-3 border rounded">
                <div className="text-2xl font-bold">{testResult.dataStats.labOrdersCount}</div>
                <div className="text-sm text-muted-foreground">مختبر</div>
              </div>
              <div className="text-center p-3 border rounded">
                <div className="text-2xl font-bold">{testResult.dataStats.clinicNeedsCount}</div>
                <div className="text-sm text-muted-foreground">احتياجات</div>
              </div>
            </div>

            {/* الملخص المالي */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="text-sm text-muted-foreground">إجمالي الإيرادات</div>
                <div className="text-xl font-bold text-green-600">
                  <CurrencyDisplay amount={testResult.summary.totalRevenue} currency={currentCurrency} />
                </div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-sm text-muted-foreground">إجمالي المصروفات</div>
                <div className="text-xl font-bold text-red-600">
                  <CurrencyDisplay amount={testResult.summary.totalExpenses} currency={currentCurrency} />
                </div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-sm text-muted-foreground">صافي الربح</div>
                <div className={`text-xl font-bold ${testResult.summary.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  <CurrencyDisplay amount={testResult.summary.netProfit} currency={currentCurrency} />
                </div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-sm text-muted-foreground">هامش الربح</div>
                <div className={`text-xl font-bold ${testResult.summary.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {testResult.summary.profitMargin.toFixed(1)}%
                </div>
              </div>
            </div>

            {/* نتائج الاختبارات التفصيلية */}
            <div className="space-y-2">
              <h4 className="font-medium">نتائج الاختبارات التفصيلية</h4>
              <div className="space-y-2">
                {testResult.tests.map((test, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center gap-2">
                      {getTestIcon(test.passed)}
                      <span className="font-medium">{test.testName}</span>
                      {getTestBadge(test.passed)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {test.testName.includes('%') ? (
                        <>متوقع: {test.expected.toFixed(1)}% | فعلي: {test.actual.toFixed(1)}%</>
                      ) : test.testName === 'صحة البيانات المالية' ? (
                        <>صحيح: {test.passed ? 'نعم' : 'لا'}</>
                      ) : (
                        <>
                          متوقع: <CurrencyDisplay amount={test.expected} currency={currentCurrency} /> | 
                          فعلي: <CurrencyDisplay amount={test.actual} currency={currentCurrency} />
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* الأخطاء */}
            {testResult.tests.some(test => !test.passed) && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium mb-2">اختبارات فاشلة:</div>
                  <ul className="list-disc list-inside space-y-1">
                    {testResult.tests
                      .filter(test => !test.passed)
                      .map((test, index) => (
                        <li key={index} className="text-sm">
                          {test.testName}: {test.error || `فرق ${Math.abs(test.expected - test.actual).toFixed(2)}`}
                        </li>
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
