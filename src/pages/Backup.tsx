import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Shield, Download, Upload, RefreshCw, Trash2, AlertCircle, CheckCircle, Clock, Database, Image, Sync } from 'lucide-react'
import { useBackupStore } from '@/store/backupStore'
import { notify } from '@/services/notificationService'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface BackupInfo {
  name: string
  path: string
  size: number
  created_at: string
  formattedSize: string
  version?: string
  platform?: string
  database_type?: string
  backup_format?: string
  includes_images?: boolean
  isZipBackup?: boolean
}

export default function Backup() {
  const {
    backups,
    isLoading,
    error,
    isCreatingBackup,
    isRestoringBackup,
    loadBackups,
    createBackup,
    restoreBackup,
    deleteBackup,
    clearError,
    formatBackupDate,
    getBackupStatus,
    runBackupTest
  } = useBackupStore()

  const [selectedBackup, setSelectedBackup] = useState<string | null>(null)
  const [showTestResults, setShowTestResults] = useState(false)
  const [showRestoreDialog, setShowRestoreDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [backupToRestore, setBackupToRestore] = useState<string | null>(null)
  const [backupToDelete, setBackupToDelete] = useState<string | null>(null)
  const [isSyncingImages, setIsSyncingImages] = useState(false)

  useEffect(() => {
    loadBackups()
  }, [loadBackups])

  const handleCreateBackup = async (withImages = false) => {
    try {
      clearError()
      await createBackup(null, withImages)
      const message = withImages
        ? 'تم إنشاء النسخة الاحتياطية مع الصور بنجاح'
        : 'تم إنشاء النسخة الاحتياطية بنجاح'
      notify.backupSuccess(message)
    } catch (error) {
      console.error('Failed to create backup:', error)
      notify.backupError('فشل في إنشاء النسخة الاحتياطية')
    }
  }

  const handleRestoreBackup = async (backupPath: string) => {
    setBackupToRestore(backupPath)
    setShowRestoreDialog(true)
  }

  const confirmRestoreBackup = async () => {
    if (!backupToRestore) return

    try {
      clearError()
      const success = await restoreBackup(backupToRestore)
      if (success) {
        // Refresh all images after restore
        try {
          const { refreshAllImages } = await import('../store/dentalTreatmentStore')
          await refreshAllImages()
        } catch (error) {
          console.warn('Could not refresh images after restore:', error)
        }

        notify.restoreSuccess('تم استعادة النسخة الاحتياطية بنجاح! سيتم إعادة تحميل التطبيق...')
        // Reload the page to reflect changes
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      }
    } catch (error) {
      console.error('Failed to restore backup:', error)
      notify.restoreError('فشل في استعادة النسخة الاحتياطية')
    } finally {
      setShowRestoreDialog(false)
      setBackupToRestore(null)
    }
  }

  const handleDeleteBackup = async (backupName: string) => {
    setBackupToDelete(backupName)
    setShowDeleteDialog(true)
  }

  const confirmDeleteBackup = async () => {
    if (!backupToDelete) return

    try {
      await deleteBackup(backupToDelete)
      await loadBackups() // Refresh the list
      notify.deleteSuccess('تم حذف النسخة الاحتياطية بنجاح')
    } catch (error) {
      console.error('Failed to delete backup:', error)
      notify.deleteError('فشل في حذف النسخة الاحتياطية')
    } finally {
      setShowDeleteDialog(false)
      setBackupToDelete(null)
    }
  }

  const handleSelectBackupFile = async () => {
    try {
      const result = await window.electronAPI.dialog.showOpenDialog({
        title: 'اختر ملف النسخة الاحتياطية',
        filters: [
          { name: 'نسخ احتياطية مع صور', extensions: ['zip'] },
          { name: 'ملفات قاعدة البيانات', extensions: ['db', 'sqlite'] },
          { name: 'ملفات النسخ الاحتياطية القديمة', extensions: ['json'] },
          { name: 'جميع الملفات', extensions: ['*'] }
        ],
        properties: ['openFile']
      })

      if (!result.canceled && result.filePaths.length > 0) {
        await handleRestoreBackup(result.filePaths[0])
      }
    } catch (error) {
      console.error('Failed to select backup file:', error)
    }
  }

  const handleRunBackupTest = async () => {
    setShowTestResults(true)
    try {
      clearError()
      const result = await runBackupTest()

      if (result.success) {
        notify.testSuccess('اختبار النسخ الاحتياطي نجح! تحقق من وحدة التحكم للحصول على التفاصيل.')
      } else {
        notify.testError(`اختبار النسخ الاحتياطي فشل: ${result.error || 'خطأ غير معروف'}`)
      }

      console.log('🧪 Backup test results:', result)
    } catch (error) {
      console.error('Backup test failed:', error)
      notify.testError('فشل في تشغيل اختبار النسخ الاحتياطي')
    } finally {
      setShowTestResults(false)
    }
  }

  const backupStatus = getBackupStatus()

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">النسخ الاحتياطي والاستعادة</h1>
          <p className="text-muted-foreground mt-2">
            احم بياناتك بالنسخ الاحتياطي الآمن
          </p>
        </div>
        <div className="flex space-x-2 space-x-reverse">
            <Button onClick={() => handleCreateBackup(false)} disabled={isCreatingBackup}>
              {isCreatingBackup ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              إنشاء نسخة احتياطية
            </Button>
            <Button onClick={() => handleCreateBackup(true)} disabled={isCreatingBackup} variant="outline" className="bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100">
              {isCreatingBackup ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Image className="w-4 h-4 mr-2" />
              )}
              إنشاء نسخة احتياطية مع صور
            </Button>
          <Button variant="outline" onClick={handleSelectBackupFile} disabled={isRestoringBackup}>
            {isRestoringBackup ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 mr-2" />
            )}
            استعادة من ملف
          </Button>
          <Button variant="secondary" onClick={handleRunBackupTest} disabled={showTestResults}>
            {showTestResults ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Database className="w-4 h-4 mr-2" />
            )}
            اختبار النظام
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Backup Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            حالة النسخ الاحتياطي
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{backupStatus.totalBackups}</div>
              <div className="text-sm text-muted-foreground">إجمالي النسخ</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {backupStatus.lastBackup ? formatBackupDate(backupStatus.lastBackup) : 'لا يوجد'}
              </div>
              <div className="text-sm text-muted-foreground">آخر نسخة احتياطية</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {backupStatus.nextScheduledBackup || 'غير مجدول'}
              </div>
              <div className="text-sm text-muted-foreground">النسخة التالية</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Backup List Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              النسخ الاحتياطية المتاحة
            </span>
            <Button variant="outline" size="sm" onClick={loadBackups} disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              تحديث
            </Button>
          </CardTitle>
          <CardDescription>
            قائمة بجميع النسخ الاحتياطية المتاحة في النظام
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <RefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground">جاري تحميل النسخ الاحتياطية...</p>
            </div>
          ) : backups.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">لا توجد نسخ احتياطية</h3>
              <p className="text-muted-foreground mb-4">
                لم يتم العثور على أي نسخ احتياطية. قم بإنشاء نسخة احتياطية أولاً.
              </p>
              <div className="flex space-x-2 space-x-reverse justify-center">
                <Button onClick={() => handleCreateBackup(false)} disabled={isCreatingBackup}>
                  <Download className="w-4 h-4 mr-2" />
                  إنشاء أول نسخة احتياطية
                </Button>
                <Button onClick={() => handleCreateBackup(true)} disabled={isCreatingBackup} variant="outline" className="bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100">
                  <Image className="w-4 h-4 mr-2" />
                  مع صور
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {backups.map((backup: BackupInfo) => (
                <div
                  key={backup.name}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{backup.name}</h4>
                      <Badge variant="secondary" className="text-xs">
                        {backup.database_type === 'sqlite' ? 'SQLite' : 'قديم'}
                      </Badge>
                      {backup.backup_format === 'sqlite_only' && (
                        <Badge variant="outline" className="text-xs">
                          محسن
                        </Badge>
                      )}
                      {backup.includes_images && (
                        <Badge variant="default" className="text-xs bg-blue-600">
                          <Image className="w-3 h-3 mr-1" />
                          مع صور
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatBackupDate(backup.created_at)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Database className="w-3 h-3" />
                          {backup.formattedSize}
                        </span>
                        {backup.version && (
                          <span className="text-xs">
                            الإصدار: {backup.version}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground/70">
                        {backup.path}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRestoreBackup(backup.path)}
                      disabled={isRestoringBackup}
                    >
                      {isRestoringBackup ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4" />
                      )}
                      استعادة
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteBackup(backup.name)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                      حذف
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instructions Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            تعليمات مهمة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <strong>إنشاء النسخ الاحتياطية:</strong> يمكن إنشاء نسخ احتياطية لقاعدة البيانات فقط (.db) أو مع الصور (.zip).
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Image className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <strong>النسخ مع الصور:</strong> تتضمن جميع صور المرضى والأشعة السينية، لكنها تستغرق وقتاً أطول وحجماً أكبر.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <strong>الاستعادة:</strong> عند استعادة نسخة احتياطية، سيتم استبدال جميع البيانات الحالية.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
              <div>
                <strong>تحذير:</strong> تأكد من إنشاء نسخة احتياطية حديثة قبل استعادة نسخة قديمة.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Database className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <strong>اختبار النظام:</strong> استخدم زر "اختبار النظام" للتحقق من سلامة عملية النسخ والاستعادة.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-orange-600" />
              تأكيد استعادة النسخة الاحتياطية
            </AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من استعادة هذه النسخة الاحتياطية؟ سيتم استبدال جميع البيانات الحالية وإعادة تحميل التطبيق.
              <br />
              <strong className="text-destructive">تحذير: هذا الإجراء لا يمكن التراجع عنه!</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse">
            <AlertDialogAction
              onClick={confirmRestoreBackup}
              className="bg-orange-600 hover:bg-orange-700"
              disabled={isRestoringBackup}
            >
              {isRestoringBackup ? (
                <>
                  <RefreshCw className="w-4 h-4 ml-2 animate-spin" />
                  جاري الاستعادة...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 ml-2" />
                  تأكيد الاستعادة
                </>
              )}
            </AlertDialogAction>
            <AlertDialogCancel disabled={isRestoringBackup}>
              إلغاء
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-destructive" />
              تأكيد حذف النسخة الاحتياطية
            </AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذه النسخة الاحتياطية؟ لن تتمكن من استعادتها مرة أخرى.
              <br />
              <strong>النسخة الاحتياطية: {backupToDelete}</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse">
            <AlertDialogAction
              onClick={confirmDeleteBackup}
              className="bg-destructive hover:bg-destructive/90"
            >
              <Trash2 className="w-4 h-4 ml-2" />
              تأكيد الحذف
            </AlertDialogAction>
            <AlertDialogCancel>
              إلغاء
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}