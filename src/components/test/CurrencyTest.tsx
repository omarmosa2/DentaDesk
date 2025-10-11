import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CurrencyDisplay } from '@/components/ui/currency-display'
import { CurrencySelector } from '@/components/ui/currency-selector'
import { useCurrency } from '@/contexts/CurrencyContext'
import { formatCurrency, formatChartValue, SUPPORTED_CURRENCIES } from '@/lib/utils'

/**
 * Test component to verify currency system functionality
 * This component demonstrates all currency features working dynamically
 */
export default function CurrencyTest() {
  const { currentCurrency, formatAmount, getCurrencySymbol, getCurrencyName, useArabicNumerals, setUseArabicNumerals } = useCurrency()
  
  const testAmounts = [100, 1500.50, 25000, 0.99, 999999.99]
  
  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            اختبار نظام العملة الديناميكي
            <CurrencySelector />
          </CardTitle>
          <CardDescription>
            هذا المكون يختبر جميع ميزات نظام العملة الديناميكي
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Current Currency Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">العملة الحالية</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{currentCurrency}</div>
                <div className="text-sm text-muted-foreground">
                  {getCurrencyName(undefined, true)}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">رمز العملة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{getCurrencySymbol()}</div>
                <div className="text-sm text-muted-foreground">
                  {getCurrencyName()}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">العملات المدعومة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Object.keys(SUPPORTED_CURRENCIES).length}</div>
                <div className="text-sm text-muted-foreground">
                  عملة متاحة
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Test Amounts */}
          <div>
            <h3 className="text-lg font-semibold mb-4">اختبار تنسيق المبالغ</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {testAmounts.map((amount, index) => (
                <Card key={index}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">المبلغ: {amount}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <span className="text-xs text-muted-foreground">CurrencyDisplay: </span>
                      <CurrencyDisplay amount={amount} className="font-bold" />
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">formatAmount: </span>
                      <span className="font-bold">{formatAmount(amount)}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">formatCurrency: </span>
                      <span className="font-bold">{formatCurrency(amount)}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Chart Format: </span>
                      <span className="font-bold">{formatChartValue(amount, 'currency')}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* All Supported Currencies */}
          <div>
            <h3 className="text-lg font-semibold mb-4">جميع العملات المدعومة</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(SUPPORTED_CURRENCIES).map(([code, config]) => (
                <Card key={code}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center justify-between">
                      {config.nameAr}
                      <span className="font-mono text-lg">{config.symbol}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1 text-sm">
                      <div>الكود: {config.code}</div>
                      <div>الاسم: {config.name}</div>
                      <div>المنازل العشرية: {config.decimals}</div>
                      <div>الموضع: {config.position === 'before' ? 'قبل' : 'بعد'}</div>
                      <div className="pt-2">
                        <span className="text-xs text-muted-foreground">مثال: </span>
                        <CurrencyDisplay 
                          amount={1234.56} 
                          currency={code} 
                          useGlobalCurrency={false}
                          className="font-bold"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

        </CardContent>
      </Card>

      {/* Arabic Numerals Test */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            اختبار الأرقام العربية (٠١٢٣٤٥٦٧٨٩)
            <button
              onClick={() => setUseArabicNumerals(!useArabicNumerals)}
              className={`px-4 py-2 rounded ${useArabicNumerals ? 'bg-green-500 text-white' : 'bg-gray-300 text-black'}`}
            >
              {useArabicNumerals ? 'الأرقام العربية مفعلة' : 'الأرقام العربية معطلة'}
            </button>
          </CardTitle>
          <CardDescription>
            اختبار عرض العملات باستخدام الأرقام العربية في السياق العربي من اليمين إلى اليسار
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* Arabic Numerals Status */}
          <div className="flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-center">
              <div className="text-lg font-bold mb-2">
                {useArabicNumerals ? 'الأرقام العربية مفعلة ✓' : 'الأرقام العربية معطلة ✗'}
              </div>
              <div className="text-sm text-muted-foreground">
                جميع تنسيقات العملة ستستخدم {useArabicNumerals ? 'الأرقام العربية' : 'الأرقام الغربية'}
              </div>
            </div>
          </div>

          {/* RTL Currency Examples */}
          <div>
            <h3 className="text-lg font-semibold mb-4">أمثلة على عرض العملات في السياق العربي</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* SAR Example */}
              <Card className="rtl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">الريال السعودي (SAR)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">المبلغ: ١٬٢٣٤٫٥٦</div>
                    <CurrencyDisplay
                      amount={1234.56}
                      currency="SAR"
                      useGlobalCurrency={false}
                      className="font-bold text-lg"
                    />
                  </div>
                  <div className="text-xs text-muted-foreground text-right">
                    يظهر الرمز بعد المبلغ في العملات العربية
                  </div>
                </CardContent>
              </Card>

              {/* USD Example */}
              <Card className="rtl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">الدولار الأمريكي (USD)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">المبلغ: ١٬٢٣٤٫٥٦</div>
                    <CurrencyDisplay
                      amount={1234.56}
                      currency="USD"
                      useGlobalCurrency={false}
                      className="font-bold text-lg"
                    />
                  </div>
                  <div className="text-xs text-muted-foreground text-right">
                    يظهر الرمز قبل المبلغ في العملات الغربية
                  </div>
                </CardContent>
              </Card>

              {/* AED Example */}
              <Card className="rtl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">الدرهم الإماراتي (AED)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">المبلغ: ١٬٢٣٤٫٥٦</div>
                    <CurrencyDisplay
                      amount={1234.56}
                      currency="AED"
                      useGlobalCurrency={false}
                      className="font-bold text-lg"
                    />
                  </div>
                  <div className="text-xs text-muted-foreground text-right">
                    مثال على عملة إماراتية بعلامة عشرية
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Comparison Test */}
          <div>
            <h3 className="text-lg font-semibold mb-4">مقارنة التنسيق</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">الأرقام الغربية (Western Numerals)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 font-mono text-sm">
                    <div>USD: {formatAmount(1234.56, 'USD', false)}</div>
                    <div>SAR: {formatAmount(1234.56, 'SAR', false)}</div>
                    <div>EUR: {formatAmount(1234.56, 'EUR', false)}</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">الأرقام العربية (Arabic Numerals)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 font-mono text-sm">
                    <div>USD: {formatAmount(1234.56, 'USD', true)}</div>
                    <div>SAR: {formatAmount(1234.56, 'SAR', true)}</div>
                    <div>EUR: {formatAmount(1234.56, 'EUR', true)}</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

        </CardContent>
      </Card>
    </div>
  )
}
