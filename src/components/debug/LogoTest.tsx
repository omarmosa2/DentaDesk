import React, { useEffect } from 'react'
import { useSettingsStore } from '@/store/settingsStore'

export default function LogoTest() {
  const { settings, loadSettings } = useSettingsStore()

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  console.log('LogoTest - Settings:', settings)
  console.log('LogoTest - Clinic Logo:', settings?.clinic_logo)
  console.log('LogoTest - Logo length:', settings?.clinic_logo?.length)

  return (
    <div className="p-4 border rounded-lg bg-white">
      <h3 className="text-lg font-bold mb-4">اختبار الشعار</h3>
      
      <div className="space-y-4">
        <div>
          <strong>اسم العيادة:</strong> {settings?.clinic_name || 'غير محدد'}
        </div>
        
        <div>
          <strong>اسم الطبيب:</strong> {settings?.doctor_name || 'غير محدد'}
        </div>
        
        <div>
          <strong>حالة الشعار:</strong> {
            settings?.clinic_logo && settings.clinic_logo.trim() !== '' 
              ? 'موجود' 
              : 'غير موجود'
          }
        </div>
        
        {settings?.clinic_logo && settings.clinic_logo.trim() !== '' && (
          <div>
            <strong>طول البيانات:</strong> {settings.clinic_logo.length} حرف
          </div>
        )}
        
        <div>
          <strong>معاينة الشعار:</strong>
          <div className="mt-2 w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
            {settings?.clinic_logo && settings.clinic_logo.trim() !== '' ? (
              <img
                src={settings.clinic_logo}
                alt="شعار العيادة"
                className="w-full h-full object-cover rounded-lg"
                onError={(e) => {
                  console.error('Logo failed to load:', settings.clinic_logo)
                  e.currentTarget.style.display = 'none'
                }}
                onLoad={() => {
                  console.log('Logo loaded successfully!')
                }}
              />
            ) : (
              <span className="text-gray-500 text-xs">لا يوجد شعار</span>
            )}
          </div>
        </div>
        
        <div className="text-xs text-gray-500">
          <strong>تفاصيل تقنية:</strong>
          <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-32">
            {JSON.stringify(settings, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  )
}
