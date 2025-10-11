import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, CheckCircle, Database, RefreshCw } from 'lucide-react'

interface DatabaseStatus {
  connected: boolean
  tablesCount?: number
  dbPath?: string
  isOpen?: boolean
  fileSize?: string
  lastModified?: string
  tableNames?: string[]
  hasMoreTables?: boolean
  error?: string
}

const __DEV__ = process.env.NODE_ENV !== 'production'

export function DatabaseDiagnostics() {
  const [status, setStatus] = useState<DatabaseStatus | null>(null)
  const [loading, setLoading] = useState(false)

  const checkDatabaseStatus = async () => {
    setLoading(true)
    try {
      // Check if electronAPI is available
      if (!(window as any).electronAPI?.database?.getStatus) {
        throw new Error('Database API not available')
      }

      const result = await (window as any).electronAPI.database.getStatus()
      setStatus(result)

      // Log result for debugging
      __DEV__ && console.log('Database status:', result)
    } catch (error) {
      console.error('Database status check failed:', error)
      setStatus({
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkDatabaseStatus()
  }, [])


  const getStatusIcon = () => {
    if (!status) return <Database className="h-4 w-4" />
    return status.connected ?
      <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" /> :
      <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
  }

  return (
    <div className="w-full h-full flex flex-col">
      <Card className="w-full h-full flex flex-col">
        <CardHeader className="flex-shrink-0">
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            تشخيص قاعدة البيانات
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 flex-1 flex flex-col overflow-auto">
        <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
          <span className="font-medium">حالة الاتصال:</span>
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <Badge variant={status?.connected ? 'default' : 'destructive'}>
              {status?.connected ? 'متصل' : 'غير متصل'}
            </Badge>
          </div>
        </div>

        {status?.dbPath && (
          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <span className="font-medium">مسار قاعدة البيانات:</span>
            <code className="text-sm bg-gray-500 dark:bg-gray-700 dark:text-gray-100 px-2 py-1 rounded border dark:border-gray-600">
              {status.dbPath}
            </code>
          </div>
        )}

        {status?.tablesCount !== undefined && (
          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <span className="font-medium">عدد الجداول:</span>
            <Badge variant="outline">{status.tablesCount}</Badge>
          </div>
        )}

        {status?.isOpen !== undefined && (
          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <span className="font-medium">حالة قاعدة البيانات:</span>
            <Badge variant={status.isOpen ? 'default' : 'secondary'}>
              {status.isOpen ? 'مفتوحة' : 'مغلقة'}
            </Badge>
          </div>
        )}

        {status?.fileSize && (
          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <span className="font-medium">حجم الملف:</span>
            <Badge variant="outline">{status.fileSize}</Badge>
          </div>
        )}

        {status?.lastModified && (
          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <span className="font-medium">آخر تعديل:</span>
            <code className="text-xs bg-gray-500 dark:bg-gray-700 dark:text-gray-100 px-2 py-1 rounded border dark:border-gray-600">
              {new Date(status.lastModified).toLocaleString('ar-EG')}
            </code>
          </div>
        )}

        {status?.tableNames && status.tableNames.length > 0 && (
          <div className="space-y-2 flex-1 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <span className="font-medium">الجداول الموجودة:</span>
            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
              {status.tableNames.map((tableName, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {tableName}
                </Badge>
              ))}
              {status.hasMoreTables && (
                <Badge variant="outline" className="text-xs">
                  +المزيد...
                </Badge>
              )}
            </div>
          </div>
        )}

        {status?.error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <div className="flex items-center gap-2 text-red-800 dark:text-red-400">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">خطأ:</span>
            </div>
            <p className="text-red-700 dark:text-red-300 mt-1 text-sm">{status.error}</p>
          </div>
        )}

        <div className="flex-shrink-0 mt-auto">
          <Button 
            onClick={checkDatabaseStatus} 
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                جاري الفحص...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                إعادة فحص
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
    </div>
  )
}
