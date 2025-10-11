import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Moon, Sun, Settings, RefreshCw } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'
import { useStableSettings, useStableContactInfo } from '../hooks/useStableSettings'
import { 
  StableClinicHeader, 
  StableClinicName, 
  StableDoctorName, 
  StableClinicLogo 
} from '../components/StableClinicHeader'

/**
 * مثال على استخدام المكونات المستقرة لضمان عدم اختفاء البيانات أثناء تغيير الثيم
 */
export function StableSettingsExample() {
  const { isDarkMode, toggleDarkMode } = useTheme()
  const { settings, isLoading, hasValidSettings, refreshSettings } = useStableSettings()
  const contactInfo = useStableContactInfo()

  return (
    <div className="p-6 space-y-6">
      {/* Header مع معلومات العيادة المستقرة */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <StableClinicHeader />
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleDarkMode}
                className="transition-all duration-200"
              >
                {isDarkMode ? (
                  <Sun className="h-4 w-4 mr-2" />
                ) : (
                  <Moon className="h-4 w-4 mr-2" />
                )}
                {isDarkMode ? 'فاتح' : 'مظلم'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={refreshSettings}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                تحديث
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* بطاقات معلومات مختلفة */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        
        {/* بطاقة اسم العيادة */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              اسم العيادة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <StableClinicLogo size="sm" />
              <StableClinicName className="text-lg" />
            </div>
          </CardContent>
        </Card>

        {/* بطاقة اسم الدكتور */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              اسم الدكتور
            </CardTitle>
          </CardHeader>
          <CardContent>
            <StableDoctorName className="text-lg font-medium" />
          </CardContent>
        </Card>

        {/* بطاقة حالة الإعدادات */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              حالة الإعدادات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge variant={hasValidSettings ? "default" : "destructive"}>
                {hasValidSettings ? 'مكتملة' : 'غير مكتملة'}
              </Badge>
              {isLoading && (
                <Badge variant="secondary">
                  جاري التحميل...
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* بطاقة معلومات الاتصال */}
        {contactInfo.phone && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                رقم الهاتف
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-medium text-green-600">
                {contactInfo.phone}
              </p>
            </CardContent>
          </Card>
        )}

        {contactInfo.email && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                البريد الإلكتروني
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-medium text-blue-600">
                {contactInfo.email}
              </p>
            </CardContent>
          </Card>
        )}

        {contactInfo.address && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                العنوان
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                {contactInfo.address}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* معلومات تقنية للتطوير */}
      {process.env.NODE_ENV === 'development' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              معلومات تقنية (وضع التطوير)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p><strong>الثيم الحالي:</strong> {isDarkMode ? 'مظلم' : 'فاتح'}</p>
              <p><strong>حالة التحميل:</strong> {isLoading ? 'جاري التحميل' : 'مكتمل'}</p>
              <p><strong>الإعدادات صالحة:</strong> {hasValidSettings ? 'نعم' : 'لا'}</p>
              <p><strong>معرف الإعدادات:</strong> {settings?.id || 'غير متوفر'}</p>
              <p><strong>آخر تحديث:</strong> {settings?.updated_at ? new Date(settings.updated_at).toLocaleString('ar-SA') : 'غير متوفر'}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* تعليمات الاستخدام */}
      <Card>
        <CardHeader>
          <CardTitle>تعليمات الاختبار</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>• اضغط على زر تبديل الثيم لاختبار استقرار البيانات</p>
            <p>• لاحظ أن معلومات العيادة تبقى ظاهرة دون اختفاء أو وميض</p>
            <p>• استخدم زر التحديث لإعادة تحميل الإعدادات يدوياً</p>
            <p>• في وضع التطوير، يمكنك مراقبة الحالة التقنية للإعدادات</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default StableSettingsExample
