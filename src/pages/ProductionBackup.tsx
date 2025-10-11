import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { 
  Download, 
  Upload, 
  Trash2, 
  Database, 
  FileText, 
  Calendar,
  HardDrive,
  Loader2,
  Clock
} from 'lucide-react'
// import { toast } from 'sonner' // Removed - using existing notification system

interface BackupItem {
  id: string
  name: string
  path: string
  size: number
  formattedSize: string
  created_at: string
  createdDate: string
  createdTime: string
  type: 'with_images' | 'database_only'
  description: string
  version: string
}

interface BackupStats {
  totalBackups: number
  totalSize: string
  withImages: number
  databaseOnly: number
  lastBackup: string | null
}

const ProductionBackup: React.FC = () => {
  const [backups, setBackups] = useState<BackupItem[]>([])
  const [stats, setStats] = useState<BackupStats>({
    totalBackups: 0,
    totalSize: '0 Bytes',
    withImages: 0,
    databaseOnly: 0,
    lastBackup: null
  })
  const [loading, setLoading] = useState(false)
  const [backupDescription, setBackupDescription] = useState('')
  const [includeImages] = useState(false)
  const [customSavePath, setCustomSavePath] = useState('')

  // Notification system
  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    // Create a simple notification element
    const notification = document.createElement('div')
    notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm ${
      type === 'success' ? 'bg-green-500 text-white' :
      type === 'error' ? 'bg-red-500 text-white' :
      'bg-blue-500 text-white'
    }`
    notification.textContent = message
    
    document.body.appendChild(notification)
    
    // Auto remove after 3 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification)
      }
    }, 3000)
  }

  // Load backups on component mount
  useEffect(() => {
    const initializeBackup = async () => {
      try {
        // Test IPC connection first
        console.log('Testing IPC connection...')
        const testResult = await (window.electronAPI as any)?.test?.ping()
        console.log('IPC test result:', testResult)
        
        // Initialize the production backup service
        await (window.electronAPI as any)?.['production-backup']?.init()
        // Load backups and stats
        await loadBackups()
        await loadStats()
      } catch (error) {
        console.error('Failed to initialize production backup:', error)
        showNotification('فشل في تهيئة نظام النسخ الاحتياطي', 'error')
      }
    }
    
    initializeBackup()
  }, [])

  const loadBackups = async () => {
    try {
      setLoading(true)
      const result = await (window.electronAPI as any)?.['production-backup']?.list()
      if (result?.success) {
        setBackups(result.data || [])
      }
    } catch (error) {
      console.error('Failed to load backups:', error)
      showNotification('فشل في تحميل النسخ الاحتياطية', 'error')
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const result = await (window.electronAPI as any)?.['production-backup']?.stats()
      if (result?.success) {
        setStats(result.data)
      }
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }

  const openSaveDialog = async () => {
    try {
      // Check if electronAPI is available
      if (!window.electronAPI?.files) {
        showNotification('نافذة الحفظ غير متاحة في هذا الوضع', 'error')
        return
      }

      console.log('Opening save dialog...')
      console.log('Available files API:', Object.keys(window.electronAPI.files || {}))
      console.log('window.electronAPI.files.selectDirectory:', typeof window.electronAPI.files.selectDirectory)
      
      // Try selectDirectory first
      let result
      if (window.electronAPI.files.selectDirectory) {
        console.log('Using selectDirectory...')
        console.log('Calling selectDirectory with options:', {
          title: 'اختر مكان حفظ النسخة الاحتياطية',
          defaultPath: 'DentaDesk_Backup'
        })
        result = await window.electronAPI.files.selectDirectory({
          title: 'اختر مكان حفظ النسخة الاحتياطية',
          defaultPath: 'DentaDesk_Backup'
        })
        console.log('selectDirectory result:', result)
      } else if (window.electronAPI.files.saveFile) {
        console.log('Using saveFile as fallback...')
        // Fallback to saveFile dialog
        result = await window.electronAPI.files.saveFile({
          title: 'اختر مكان حفظ النسخة الاحتياطية',
          defaultPath: 'DentaDesk_Backup.zip',
          filters: [
            { name: 'ZIP Files', extensions: ['zip'] },
            { name: 'All Files', extensions: ['*'] }
          ]
        })
        
        // Extract directory from file path
        if (result && !(result as any).canceled && (result as any).filePath) {
          const filePath = String((result as any).filePath)
          const lastSlashIndex = filePath.lastIndexOf('/')
          const lastBackslashIndex = filePath.lastIndexOf('\\')
          const lastSeparatorIndex = Math.max(lastSlashIndex, lastBackslashIndex)
          let directory: string
          if (lastSeparatorIndex > 0) {
            directory = filePath.substring(0, lastSeparatorIndex)
          } else {
            directory = filePath
          }
          (result as any).filePaths = [directory]
        }
      } else {
        showNotification('نافذة الحفظ غير متاحة', 'error')
        return
      }
      
      console.log('Dialog result:', result)
      
      if (result && (result as any).error) {
        showNotification(`خطأ في نافذة الحفظ: ${(result as any).error}`, 'error')
        return
      }
      
      if (result && !(result as any).canceled && (result as any).filePaths && (result as any).filePaths.length > 0) {
        setCustomSavePath((result as any).filePaths[0])
        showNotification('تم اختيار مكان الحفظ بنجاح', 'success')
      } else if (result && (result as any).canceled) {
        console.log('User canceled the dialog')
      }
    } catch (error) {
      console.error('Failed to open save dialog:', error)
      showNotification(`فشل في فتح نافذة الحفظ: ${(error as Error).message || 'خطأ غير معروف'}`, 'error')
    }
  }

  const createBackup = async (savePath?: string) => {
    try {
      setLoading(true)
      
      // If custom path is provided, create backup file directly in that location
      if (savePath) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        const backupFileName = `DentaDesk_Backup_${timestamp}.db`
        const fullBackupPath = `${savePath}/${backupFileName}`
        
        console.log('Creating backup at custom path:', fullBackupPath)
        
        const result = await (window.electronAPI as any)?.['production-backup']?.create({
          includeImages,
          description: backupDescription,
          customPath: fullBackupPath
        })

        if (result?.success) {
          showNotification(`تم إنشاء النسخة الاحتياطية بنجاح في: ${fullBackupPath}`, 'success')
          setBackupDescription('')
          setCustomSavePath('')
          // setShowSaveDialog(false) // Removed - not needed
          await loadBackups()
          await loadStats()
        } else {
          showNotification(result?.error || 'فشل في إنشاء النسخة الاحتياطية', 'error')
        }
      } else {
        // Default backup creation
        const result = await (window.electronAPI as any)?.['production-backup']?.create({
          includeImages,
          description: backupDescription
        })

        if (result?.success) {
          showNotification('تم إنشاء النسخة الاحتياطية بنجاح', 'success')
          setBackupDescription('')
          await loadBackups()
          await loadStats()
        } else {
          showNotification(result?.error || 'فشل في إنشاء النسخة الاحتياطية', 'error')
        }
      }
    } catch (error) {
      console.error('Failed to create backup:', error)
      showNotification('فشل في إنشاء النسخة الاحتياطية', 'error')
    } finally {
      setLoading(false)
    }
  }

  const restoreBackup = async (backupId: string) => {
    try {
      setLoading(true)
      
      const result = await (window.electronAPI as any)?.['production-backup']?.restore(backupId)

      if (result?.success) {
        showNotification('تم استعادة النسخة الاحتياطية بنجاح', 'success')
        // Reload the application data
        window.location.reload()
      } else {
        showNotification(result?.error || 'فشل في استعادة النسخة الاحتياطية', 'error')
      }
    } catch (error) {
      console.error('Failed to restore backup:', error)
      showNotification('فشل في استعادة النسخة الاحتياطية', 'error')
    } finally {
      setLoading(false)
    }
  }

  const deleteBackup = async (backupId: string) => {
    try {
      setLoading(true)
      
      const result = await (window.electronAPI as any)?.['production-backup']?.delete(backupId)

      if (result?.success) {
        showNotification('تم حذف النسخة الاحتياطية', 'success')
        await loadBackups()
        await loadStats()
      } else {
        showNotification(result?.error || 'فشل في حذف النسخة الاحتياطية', 'error')
      }
    } catch (error) {
      console.error('Failed to delete backup:', error)
      showNotification('فشل في حذف النسخة الاحتياطية', 'error')
    } finally {
      setLoading(false)
    }
  }

  const exportBackup = async (backup: BackupItem) => {
    try {
      // Check if electronAPI is available
      if (!window.electronAPI?.files?.selectDirectory) {
        showNotification('نافذة التصدير غير متاحة في هذا الوضع', 'error')
        return
      }

      console.log('Opening export dialog...')
      // Open save dialog to choose export location
      const result = await window.electronAPI.files.selectDirectory({
        title: 'اختر مكان تصدير النسخة الاحتياطية',
        defaultPath: `DentaDesk_Backup_${backup.name}`
      })
      
      console.log('Export dialog result:', result)
      
      if (result && (result as any).error) {
        showNotification(`خطأ في نافذة التصدير: ${(result as any).error}`, 'error')
        return
      }
      
      if (result && !(result as any).canceled && (result as any).filePaths && (result as any).filePaths.length > 0) {
        const exportPath = (result as any).filePaths[0]
        console.log('Exporting to path:', exportPath)
        
        const exportResult = await (window.electronAPI as any)?.['production-backup']?.export(backup.id, exportPath)
        
        if (exportResult?.success) {
          showNotification('تم تصدير النسخة الاحتياطية بنجاح', 'success')
        } else {
          showNotification(exportResult?.error || 'فشل في تصدير النسخة الاحتياطية', 'error')
        }
      } else if (result && (result as any).canceled) {
        console.log('User canceled the export dialog')
      }
    } catch (error) {
      console.error('Failed to export backup:', error)
      showNotification(`فشل في تصدير النسخة الاحتياطية: ${(error as Error).message || 'خطأ غير معروف'}`, 'error')
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">نظام النسخ الاحتياطي</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">إدارة النسخ الاحتياطية</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            onClick={loadBackups}
            variant="outline"
            disabled={loading}
            className="dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:border-gray-500"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            تحديث
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-md border-0 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 dark:border dark:border-blue-800/30">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-500 dark:bg-blue-600 rounded-full shadow-lg">
                <Database className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-blue-300 mb-1 mr-4">إجمالي النسخ الاحتياطية</p>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1 mr-4">{stats.totalBackups}</p>
                <p className="text-xs text-gray-500 dark:text-blue-200 mb-1 mr-4">نسخة احتياطية</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md border-0 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 dark:border dark:border-green-800/30">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-green-500 dark:bg-green-600 rounded-full shadow-lg">
                <HardDrive className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-green-300 mb-1 mr-4">الحجم الإجمالي</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400 mb-1 mr-4">{stats.totalSize}</p>
                <p className="text-xs text-gray-500 dark:text-green-200 mb-1 mr-4">مساحة محجوزة</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create Backup Section */}
      <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 dark:border dark:border-gray-600">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center space-x-3 text-xl">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
              <Download className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-gray-800 dark:text-white pr-3 ">إنشاء نسخة احتياطية جديدة</span>
          </CardTitle>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 pr-3">
            قم بإنشاء نسخة احتياطية من قاعدة البيانات لحماية بياناتك
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label htmlFor="description" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              وصف النسخة الاحتياطية (اختياري)
            </Label>
            <Textarea
              id="description"
              placeholder="أدخل وصفاً للنسخة الاحتياطية..."
              value={backupDescription}
              onChange={(e) => setBackupDescription(e.target.value)}
              rows={3}
              className="border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-400 dark:focus:ring-blue-400"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={openSaveDialog}
              disabled={loading}
              variant="outline"
              className="h-12 border-2 border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300 font-medium rounded-lg shadow-sm hover:shadow-md transition-all duration-200 dark:border-blue-600 dark:text-blue-300 dark:hover:bg-blue-900/20 dark:hover:border-blue-500"
            >
              <FileText className="w-5 h-5 mr-2" />
              اختر مكان الحفظ
            </Button>
            
            <Button
              onClick={() => createBackup()}
              disabled={loading}
              className="h-12 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-200 dark:from-blue-700 dark:to-blue-800 dark:hover:from-blue-800 dark:hover:to-blue-900"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <Download className="w-5 h-5 mr-2" />
              )}
              إنشاء في المجلد الافتراضي
            </Button>
          </div>
          
          {customSavePath && (
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl shadow-sm dark:from-blue-900/20 dark:to-indigo-900/20 dark:border-blue-800/30">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                  <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
                    المسار المحدد:
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mb-3 font-mono bg-white dark:bg-gray-800 px-3 py-2 rounded-lg border dark:border-gray-600">
                    {customSavePath}
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-300 mb-4">
                    سيتم إنشاء ملف النسخة الاحتياطية كملف .db في هذا المجلد
                  </p>
                  <div className="flex space-x-3">
                    <Button
                      onClick={() => createBackup(customSavePath)}
                      disabled={loading}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm hover:shadow-md transition-all duration-200 dark:bg-blue-700 dark:hover:bg-blue-800"
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Download className="w-4 h-4 mr-2" />
                      )}
                      إنشاء ملف .db في المسار المحدد
                    </Button>
                    <Button
                      onClick={() => {
                        setCustomSavePath('')
                        // setShowSaveDialog(false) // Removed - not needed
                      }}
                      variant="outline"
                      size="sm"
                      className="border-gray-300 text-gray-600 hover:bg-gray-50 rounded-lg dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                      إلغاء
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Backups List */}
      <Card className="shadow-lg border-0 dark:bg-gray-800 dark:border dark:border-gray-700">
        <CardHeader className=" dark:from-gray-800 dark:to-gray-700 rounded-t-lg">
          <CardTitle className="flex items-center space-x-3 text-xl">
            <div className="p-2 bg-gray-200 dark:bg-gray-600 rounded-lg">
              <FileText className="w-6 h-6 text-gray-600 dark:text-gray-300" />
            </div>
            <span className="text-gray-800 dark:text-white pr-3">النسخ الاحتياطية المحفوظة</span>
          </CardTitle>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
            إدارة واستعادة النسخ الاحتياطية المحفوظة
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600 dark:text-blue-400" />
              <span className="mr-2 text-gray-600 dark:text-gray-300">جاري التحميل...</span>
            </div>
          ) : backups.length === 0 ? (
            <div className="text-center py-12">
              <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                <FileText className="w-10 h-10 text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-300 mb-2">لا توجد نسخ احتياطية</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">قم بإنشاء نسخة احتياطية أولى لحماية بياناتك</p>
              <Button 
                onClick={() => createBackup()}
                className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-700 dark:hover:bg-blue-800"
              >
                <Download className="w-4 h-4 mr-2" />
                إنشاء نسخة احتياطية أولى
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {backups.map((backup, index) => (
                <div
                  key={backup.id || `backup-${index}`}
                  className="border border-gray-200 dark:border-gray-600 rounded-xl p-6 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-500 transition-all duration-200 bg-white dark:bg-gray-700"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                          <Database className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg text-gray-800 dark:text-white">{backup.name}</h3>
                          <Badge 
                            variant={backup.type === 'with_images' ? 'default' : 'secondary'}
                            className="mt-1 dark:bg-gray-600 dark:text-gray-200"
                          >
                            {backup.type === 'with_images' ? 'مع الصور' : 'قاعدة بيانات'}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 dark:text-gray-300 mb-3">
                        <div key="date" className="flex items-center space-x-2 bg-gray-50 dark:bg-gray-600 px-3 py-2 rounded-lg">
                          <Calendar className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                          <span className="font-medium">{backup.createdDate || 'غير محدد'}</span>
                        </div>
                        <div key="size" className="flex items-center space-x-2 bg-gray-50 dark:bg-gray-600 px-3 py-2 rounded-lg">
                          <HardDrive className="w-4 h-4 text-green-500 dark:text-green-400" />
                          <span className="font-medium">{backup.formattedSize || 'غير محدد'}</span>
                        </div>
                        <div key="version" className="flex items-center space-x-2 bg-gray-50 dark:bg-gray-600 px-3 py-2 rounded-lg">
                          <Database className="w-4 h-4 text-purple-500 dark:text-purple-400" />
                          <span className="font-medium">v{backup.version || '1.0'}</span>
                        </div>
                        <div key="time" className="flex items-center space-x-2 bg-gray-50 dark:bg-gray-600 px-3 py-2 rounded-lg">
                          <Clock className="w-4 h-4 text-orange-500 dark:text-orange-400" />
                          <span className="font-medium">{backup.createdTime || 'غير محدد'}</span>
                        </div>
                      </div>
                      
                      {backup.description && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30 rounded-lg p-3">
                          <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">الوصف:</p>
                          <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">{backup.description}</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => exportBackup(backup)}
                        disabled={loading}
                        className="border-green-200 text-green-700 hover:bg-green-50 hover:border-green-300 dark:border-green-600 dark:text-green-400 dark:hover:bg-green-900/20 dark:hover:border-green-500"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => restoreBackup(backup.id)}
                        disabled={loading}
                        className="border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300 dark:border-blue-600 dark:text-blue-400 dark:hover:bg-blue-900/20 dark:hover:border-blue-500"
                      >
                        <Upload className="w-4 h-4" />
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteBackup(backup.id)}
                        disabled={loading}
                        className="border-red-50 text-blue-900 hover:bg-red-50 hover:border-red-300 dark:border-red-600 dark:text-red-400 dark:hover:bg-red-900/20 dark:hover:border-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default ProductionBackup
