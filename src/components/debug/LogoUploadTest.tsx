import React, { useState } from 'react'
import { useSettingsStore } from '@/store/settingsStore'

export default function LogoUploadTest() {
  const { settings, updateSettings } = useSettingsStore()
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<string>('')

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadStatus('جاري رفع الملف...')

    try {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('حجم الملف كبير جداً (الحد الأقصى 5 ميجابايت)')
      }

      // Check file type
      if (!file.type.startsWith('image/')) {
        throw new Error('يجب أن يكون الملف صورة')
      }

      // Convert to base64
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const base64 = e.target?.result as string
          console.log('Base64 length:', base64.length)
          console.log('Base64 preview:', base64.substring(0, 100) + '...')

          // Update settings
          await updateSettings({ clinic_logo: base64 })
          setUploadStatus('تم رفع الشعار بنجاح!')

          // Clear status after 3 seconds
          setTimeout(() => setUploadStatus(''), 3000)
        } catch (error) {
          console.error('Error updating settings:', error)
          setUploadStatus('فشل في حفظ الشعار: ' + (error instanceof Error ? error.message : 'خطأ غير معروف'))
        }
      }

      reader.onerror = () => {
        setUploadStatus('فشل في قراءة الملف')
      }

      reader.readAsDataURL(file)
    } catch (error) {
      console.error('Error uploading file:', error)
      setUploadStatus('خطأ: ' + (error instanceof Error ? error.message : 'خطأ غير معروف'))
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveLogo = async () => {
    try {
      setUploading(true)
      setUploadStatus('جاري حذف الشعار...')
      
      await updateSettings({ clinic_logo: '' })
      setUploadStatus('تم حذف الشعار بنجاح!')

      // Clear status after 3 seconds
      setTimeout(() => setUploadStatus(''), 3000)
    } catch (error) {
      console.error('Error removing logo:', error)
      setUploadStatus('فشل في حذف الشعار: ' + (error instanceof Error ? error.message : 'خطأ غير معروف'))
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="p-4 border rounded-lg bg-white">
      <h3 className="text-lg font-bold mb-4">اختبار رفع الشعار</h3>
      
      <div className="space-y-4">
        {/* Current Logo Status */}
        <div className="p-3 bg-gray-50 rounded">
          <strong>حالة الشعار الحالية:</strong>
          <div className="mt-2">
            {settings?.clinic_logo && settings.clinic_logo.trim() !== '' ? (
              <div className="flex items-center gap-4">
                <img
                  src={settings.clinic_logo}
                  alt="شعار العيادة"
                  className="w-16 h-16 object-cover rounded border"
                  onError={() => console.error('Failed to display current logo')}
                />
                <div>
                  <p className="text-green-600 font-medium">✅ يوجد شعار</p>
                  <p className="text-sm text-gray-600">حجم البيانات: {settings.clinic_logo.length} حرف</p>
                </div>
              </div>
            ) : (
              <p className="text-red-600">❌ لا يوجد شعار</p>
            )}
          </div>
        </div>

        {/* Upload Section */}
        <div className="space-y-2">
          <label className="block text-sm font-medium">رفع شعار جديد:</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            disabled={uploading}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          <p className="text-xs text-gray-500">
            الصيغ المدعومة: JPG, PNG, GIF | الحد الأقصى: 5 ميجابايت
          </p>
        </div>

        {/* Remove Logo Button */}
        {settings?.clinic_logo && settings.clinic_logo.trim() !== '' && (
          <button
            onClick={handleRemoveLogo}
            disabled={uploading}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
          >
            حذف الشعار الحالي
          </button>
        )}

        {/* Status */}
        {uploadStatus && (
          <div className={`p-3 rounded ${
            uploadStatus.includes('نجاح') ? 'bg-green-100 text-green-800' : 
            uploadStatus.includes('فشل') || uploadStatus.includes('خطأ') ? 'bg-red-100 text-red-800' : 
            'bg-blue-100 text-blue-800'
          }`}>
            {uploadStatus}
          </div>
        )}

        {/* Loading */}
        {uploading && (
          <div className="flex items-center gap-2 text-blue-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span>جاري المعالجة...</span>
          </div>
        )}
      </div>
    </div>
  )
}
