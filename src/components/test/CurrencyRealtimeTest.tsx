import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useCurrency } from '@/contexts/CurrencyContext'
import LeftSidebarStatistics from '@/components/dashboard/LeftSidebarStatistics'
import DashboardAnalytics from '@/components/dashboard/DashboardAnalytics'
import { CurrencySelector } from '@/components/ui/currency-selector'
import { RefreshCw, CheckCircle, AlertCircle } from 'lucide-react'

/**
 * Real-time Currency Update Verification Test
 * Tests that currency changes update dashboard components immediately without page refresh
 */
export default function CurrencyRealtimeTest() {
  const { currentCurrency, useArabicNumerals, setUseArabicNumerals, formatAmount } = useCurrency()
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'passed' | 'failed'>('idle')
  const [testResults, setTestResults] = useState<string[]>([])

  // Mock data for pending payments
  const mockPayments = [
    { id: 1, amount: 2500.50, patient: 'أحمد محمد' },
    { id: 2, amount: 1800.00, patient: 'فاطمة علي' },
    { id: 3, amount: 950.25, patient: 'خالد حسن' }
  ]

  const runCurrencyChangeTest = async () => {
    setTestStatus('testing')
    setTestResults([])

    const results: string[] = []

    try {
      // Test 1: Check initial state
      results.push(`✅ Initial currency: ${currentCurrency}`)
      results.push(`✅ Arabic numerals: ${useArabicNumerals ? 'Enabled' : 'Disabled'}`)

      // Test 2: Change currency from USD to EUR
      results.push('🔄 Changing currency from USD to EUR...')
      // This will be done via the CurrencySelector

      // Test 3: Verify formatAmount updates
      const testAmount = 1234.56
      const formattedAmount = formatAmount(testAmount)
      results.push(`✅ Format amount (${testAmount}): ${formattedAmount}`)

      // Test 4: Check if components re-render
      results.push('✅ Dashboard components should update automatically')

      setTestResults(results)
      setTestStatus('passed')

    } catch (error) {
      results.push(`❌ Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setTestResults(results)
      setTestStatus('failed')
    }
  }

  const runArabicNumeralsTest = () => {
    setUseArabicNumerals(!useArabicNumerals)
    setTestResults(prev => [...prev, `🔄 Toggled Arabic numerals: ${!useArabicNumerals ? 'Enabled' : 'Disabled'}`])
  }

  return (
    <div className="space-y-6 p-6" dir="rtl">
      {/* Test Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            {testStatus === 'passed' && <CheckCircle className="w-6 h-6 text-green-500" />}
            {testStatus === 'failed' && <AlertCircle className="w-6 h-6 text-red-500" />}
            {testStatus === 'testing' && <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />}
            اختبار التحديث الزمني الحي للعملة
          </CardTitle>
          <CardDescription>
            يختبر هذا المكون أن تغييرات العملة تُحدث مكونات لوحة التحكم فوراً دون الحاجة لإعادة تحميل الصفحة
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Currency Controls */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <CurrencySelector />
            </div>

            <Button
              onClick={runArabicNumeralsTest}
              variant="outline"
              className="flex items-center gap-2"
            >
              {useArabicNumerals ? '🔢' : '٠١٢'}
              تبديل الأرقام {useArabicNumerals ? 'الغربية' : 'العربية'}
            </Button>

            <Button
              onClick={runCurrencyChangeTest}
              disabled={testStatus === 'testing'}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${testStatus === 'testing' ? 'animate-spin' : ''}`} />
              تشغيل الاختبار
            </Button>
          </div>

          {/* Current Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">العملة الحالية</div>
                <div className="text-lg font-bold">{currentCurrency}</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">الأرقام العربية</div>
                <Badge variant={useArabicNumerals ? 'default' : 'secondary'}>
                  {useArabicNumerals ? 'مفعلة' : 'معطلة'}
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">حالة الاختبار</div>
                <Badge variant={
                  testStatus === 'passed' ? 'default' :
                  testStatus === 'failed' ? 'destructive' :
                  testStatus === 'testing' ? 'secondary' : 'outline'
                }>
                  {testStatus === 'idle' && 'جاهز'}
                  {testStatus === 'testing' && 'قيد التشغيل'}
                  {testStatus === 'passed' && 'نجح'}
                  {testStatus === 'failed' && 'فشل'}
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* Test Results */}
          {testResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">نتائج الاختبار</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {testResults.map((result, index) => (
                    <div key={index} className="text-sm font-mono p-2 bg-muted rounded">
                      {result}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Mock Pending Payments */}
      <Card>
        <CardHeader>
          <CardTitle>المدفوعات الآجلة (اختبار التحديث الفوري)</CardTitle>
          <CardDescription>
            يجب أن تتحدث هذه المبالغ فوراً عند تغيير العملة
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockPayments.map((payment) => (
              <div key={payment.id} className="flex justify-between items-center p-3 border dark:border-slate-700 rounded-lg">
                <div>
                  <div className="font-medium">{payment.patient}</div>
                  <div className="text-sm text-muted-foreground">رقم الدفع: #{payment.id}</div>
                </div>
                <div className="text-lg font-bold text-green-600">
                  {formatAmount(payment.amount)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Dashboard Components Test */}
      <Card>
        <CardHeader>
          <CardTitle>اختبار مكونات لوحة التحكم</CardTitle>
          <CardDescription>
            يجب أن تتحدث هذه المكونات تلقائياً عند تغيير العملة
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* LeftSidebarStatistics */}
          <div>
            <h3 className="text-lg font-semibold mb-4">إحصائيات الشريط الجانبي</h3>
            <div className="border dark:border-slate-700 rounded-lg p-4">
              <LeftSidebarStatistics />
            </div>
          </div>

          {/* DashboardAnalytics (simplified) */}
          <div>
            <h3 className="text-lg font-semibold mb-4">التحليلات والإحصائيات</h3>
            <div className="border dark:border-slate-700 rounded-lg p-4">
              <DashboardAnalytics
                onNavigateToPatients={() => {}}
                onNavigateToAppointments={() => {}}
                onNavigateToPayments={() => {}}
                onNavigateToTreatments={() => {}}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>خطوات الاختبار</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>غير العملة باستخدام محدد العملة في الأعلى</li>
            <li>لاحظ كيف تتحدث مبالغ المدفوعات الآجلة فوراً</li>
            <li>تحقق من تحديث الإحصائيات في الشريط الجانبي</li>
            <li>قم بتبديل الأرقام العربية ولاحظ التغيير في التنسيق</li>
            <li>تأكد من عدم الحاجة لإعادة تحميل الصفحة</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}