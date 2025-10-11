import React from 'react'
import { useTheme, useThemeClasses } from '../../contexts/ThemeContext'
import { Button } from './button'
import { Input } from './input'
import { Card, CardContent, CardHeader, CardTitle } from './card'
import { Badge } from './badge'
import { 
  Search, 
  Plus, 
  Settings, 
  User, 
  Calendar, 
  Bell,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle
} from 'lucide-react'

export function EnhancedUIDemo() {
  const { isDarkMode } = useTheme()
  const themeClasses = useThemeClasses()

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-heading-1 arabic-enhanced">
          عرض توضيحي للواجهة المحسنة
        </h1>
        <div className="text-body-small">
          الوضع الحالي: {isDarkMode ? 'مظلم' : 'فاتح'}
        </div>
      </div>

      {/* Buttons Demo */}
      <Card className="card-enhanced">
        <CardHeader>
          <CardTitle className="text-heading-3">الأزرار المحسنة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button variant="default" size="default">
              <Plus className="w-4 h-4 ml-2" />
              إضافة جديد
            </Button>
            <Button variant="secondary" size="default">
              <Settings className="w-4 h-4 ml-2" />
              الإعدادات
            </Button>
            <Button variant="outline" size="default">
              <Search className="w-4 h-4 ml-2" />
              بحث
            </Button>
            <Button variant="ghost" size="default">
              <User className="w-4 h-4 ml-2" />
              الملف الشخصي
            </Button>
            <Button variant="destructive" size="default">
              <XCircle className="w-4 h-4 ml-2" />
              حذف
            </Button>
            <Button variant="success" size="default">
              <CheckCircle className="w-4 h-4 ml-2" />
              موافق
            </Button>
            <Button variant="warning" size="default">
              <AlertTriangle className="w-4 h-4 ml-2" />
              تحذير
            </Button>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <Button variant="default" size="sm">صغير</Button>
            <Button variant="default" size="default">عادي</Button>
            <Button variant="default" size="lg">كبير</Button>
            <Button variant="default" size="icon">
              <Bell className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Inputs Demo */}
      <Card className="card-enhanced">
        <CardHeader>
          <CardTitle className="text-heading-3">حقول الإدخال المحسنة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-body-small font-medium mb-2 block">
                اسم المريض
              </label>
              <Input 
                placeholder="أدخل اسم المريض..." 
                className="w-full"
              />
            </div>
            <div>
              <label className="text-body-small font-medium mb-2 block">
                رقم الهاتف
              </label>
              <Input 
                placeholder="05xxxxxxxx" 
                className="w-full"
              />
            </div>
            <div>
              <label className="text-body-small font-medium mb-2 block">
                البريد الإلكتروني
              </label>
              <Input 
                type="email"
                placeholder="example@email.com" 
                className="w-full"
              />
            </div>
            <div>
              <label className="text-body-small font-medium mb-2 block">
                تاريخ الميلاد
              </label>
              <Input 
                type="date"
                className="w-full"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Badges Demo */}
      <Card className="card-enhanced">
        <CardHeader>
          <CardTitle className="text-heading-3">شارات الحالة المحسنة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <div className={themeClasses.statusScheduled}>
              <Calendar className="w-3 h-3 ml-1" />
              مجدول
            </div>
            <div className={themeClasses.statusCompleted}>
              <CheckCircle className="w-3 h-3 ml-1" />
              مكتمل
            </div>
            <div className={themeClasses.statusInProgress}>
              <Clock className="w-3 h-3 ml-1" />
              قيد التنفيذ
            </div>
            <div className={themeClasses.statusCancelled}>
              <XCircle className="w-3 h-3 ml-1" />
              ملغي
            </div>
            <div className={themeClasses.statusNoShow}>
              <AlertTriangle className="w-3 h-3 ml-1" />
              لم يحضر
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cards Demo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="card-green">
          <CardHeader>
            <CardTitle className="text-heading-3 text-green-800 dark:text-green-400">
              بطاقة خضراء
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-body text-green-700 dark:text-green-300">
              هذه بطاقة بتصميم أخضر محسن للوضع المظلم والفاتح
            </p>
          </CardContent>
        </Card>

        <Card className="card-blue">
          <CardHeader>
            <CardTitle className="text-heading-3 text-blue-800 dark:text-blue-400">
              بطاقة زرقاء
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-body text-blue-700 dark:text-blue-300">
              هذه بطاقة بتصميم أزرق محسن للوضع المظلم والفاتح
            </p>
          </CardContent>
        </Card>

        <Card className="card-purple">
          <CardHeader>
            <CardTitle className="text-heading-3 text-purple-800 dark:text-purple-400">
              بطاقة بنفسجية
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-body text-purple-700 dark:text-purple-300">
              هذه بطاقة بتصميم بنفسجي محسن للوضع المظلم والفاتح
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Typography Demo */}
      <Card className="card-enhanced">
        <CardHeader>
          <CardTitle className="text-heading-3">الخطوط والنصوص المحسنة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-heading-1 arabic-enhanced">
            عنوان رئيسي كبير
          </div>
          <div className="text-heading-2 arabic-enhanced">
            عنوان فرعي متوسط
          </div>
          <div className="text-heading-3 arabic-enhanced">
            عنوان صغير
          </div>
          <div className="text-body-large">
            نص كبير - هذا نص تجريبي لعرض الخط الكبير مع تحسينات الوضع المظلم والفاتح
          </div>
          <div className="text-body">
            نص عادي - هذا نص تجريبي لعرض الخط العادي مع تحسينات الوضع المظلم والفاتح
          </div>
          <div className="text-body-small">
            نص صغير - هذا نص تجريبي لعرض الخط الصغير مع تحسينات الوضع المظلم والفاتح
          </div>
          <div className="text-caption">
            نص تفسيري - هذا نص تجريبي لعرض النص التفسيري مع تحسينات الوضع المظلم والفاتح
          </div>
        </CardContent>
      </Card>

      {/* Table Demo */}
      <Card className="card-enhanced">
        <CardHeader>
          <CardTitle className="text-heading-3">جدول محسن</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="table-enhanced w-full">
              <thead>
                <tr>
                  <th className="p-3 text-right">اسم المريض</th>
                  <th className="p-3 text-right">رقم الهاتف</th>
                  <th className="p-3 text-right">الحالة</th>
                  <th className="p-3 text-right">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                <tr className="table-enhanced">
                  <td className="p-3">أحمد محمد</td>
                  <td className="p-3">0501234567</td>
                  <td className="p-3">
                    <span className={themeClasses.statusCompleted}>مكتمل</span>
                  </td>
                  <td className="p-3">2024-01-15</td>
                </tr>
                <tr className="table-enhanced">
                  <td className="p-3">فاطمة علي</td>
                  <td className="p-3">0507654321</td>
                  <td className="p-3">
                    <span className={themeClasses.statusScheduled}>مجدول</span>
                  </td>
                  <td className="p-3">2024-01-16</td>
                </tr>
                <tr className="table-enhanced">
                  <td className="p-3">محمد سالم</td>
                  <td className="p-3">0509876543</td>
                  <td className="p-3">
                    <span className={themeClasses.statusInProgress}>قيد التنفيذ</span>
                  </td>
                  <td className="p-3">2024-01-17</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default EnhancedUIDemo
