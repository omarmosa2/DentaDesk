import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Key, 
  Shield, 
  RefreshCw, 
  Trash2, 
  Info, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Copy,
  Eye,
  EyeOff
} from 'lucide-react'
import { useLicense } from '../../hooks/useLicense'
import { useToast } from '../../hooks/use-toast'

interface LicenseDebugPanelProps {
  isVisible?: boolean
}

export default function LicenseDebugPanel({ isVisible = false }: LicenseDebugPanelProps) {
  const { toast } = useToast()
  const {
    isLicenseValid,
    isFirstRun,
    isLoading,
    error,
    licenseData,
    machineInfo,
    refreshLicenseStatus,
    clearLicenseData,
    getLicenseInfo,
    getMachineInfo,
    validateLicenseFormat,
    formatLicenseKey
  } = useLicense()

  const [showSensitiveData, setShowSensitiveData] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isClearing, setIsClearing] = useState(false)

  // Only show in development mode
  const isDevelopment = process.env.NODE_ENV === 'development'

  if (!isDevelopment || !isVisible) {
    return null
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await refreshLicenseStatus()
      toast({
        title: 'تم التحديث',
        description: 'تم تحديث حالة الترخيص بنجاح',
        variant: 'default',
      })
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'فشل في تحديث حالة الترخيص',
        variant: 'destructive',
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleClearLicense = async () => {
    if (!confirm('هل أنت متأكد من حذف بيانات الترخيص؟ سيتطلب هذا إعادة تفعيل الترخيص.')) {
      return
    }

    setIsClearing(true)
    try {
      const result = await clearLicenseData()
      if (result.success) {
        toast({
          title: 'تم الحذف',
          description: 'تم حذف بيانات الترخيص بنجاح',
          variant: 'default',
        })
      } else {
        toast({
          title: 'فشل الحذف',
          description: result.error || 'فشل في حذف بيانات الترخيص',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء حذف بيانات الترخيص',
        variant: 'destructive',
      })
    } finally {
      setIsClearing(false)
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: 'تم النسخ',
        description: `تم نسخ ${label} إلى الحافظة`,
        variant: 'default',
      })
    }).catch(() => {
      toast({
        title: 'فشل النسخ',
        description: `فشل في نسخ ${label}`,
        variant: 'destructive',
      })
    })
  }

  const generateTestLicense = () => {
    // Generate a test license key
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    const segments = []
    for (let i = 0; i < 4; i++) {
      let segment = ''
      for (let j = 0; j < 5; j++) {
        segment += chars[Math.floor(Math.random() * chars.length)]
      }
      segments.push(segment)
    }
    return segments.join('-')
  }

  const testLicenseKey = generateTestLicense()

  return (
    <Card className="w-full max-w-4xl mx-auto border-orange-200 dark:border-orange-800">
      <CardHeader className="bg-orange-50 dark:bg-orange-950/20">
        <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
          <Shield className="w-5 h-5" />
          License Debug Panel
          <Badge variant="outline" className="text-xs">Development Only</Badge>
        </CardTitle>
        <CardDescription className="text-orange-600 dark:text-orange-300">
          Development tools for testing license functionality
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6 p-6">
        {/* License Status */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Info className="w-4 h-4" />
            License Status
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              {isLicenseValid ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <XCircle className="w-4 h-4 text-red-500" />
              )}
              <span className="text-sm">
                Valid: {isLicenseValid ? 'Yes' : 'No'}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              {isFirstRun ? (
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
              ) : (
                <CheckCircle className="w-4 h-4 text-green-500" />
              )}
              <span className="text-sm">
                First Run: {isFirstRun ? 'Yes' : 'No'}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-500' : 'text-gray-500'}`} />
              <span className="text-sm">
                Loading: {isLoading ? 'Yes' : 'No'}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              {error ? (
                <XCircle className="w-4 h-4 text-red-500" />
              ) : (
                <CheckCircle className="w-4 h-4 text-green-500" />
              )}
              <span className="text-sm">
                Error: {error ? 'Yes' : 'No'}
              </span>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}
        </div>

        <Separator />

        {/* License Data */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Key className="w-4 h-4" />
              License Data
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSensitiveData(!showSensitiveData)}
            >
              {showSensitiveData ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showSensitiveData ? 'Hide' : 'Show'} Sensitive Data
            </Button>
          </div>

          {licenseData ? (
            <div className="space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">License Key:</label>
                  <div className="flex items-center gap-2">
                    <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                      {showSensitiveData ? licenseData.license : '••••••••••••••••••••••••'}
                    </code>
                    {showSensitiveData && licenseData.license && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(licenseData.license!, 'License Key')}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Activated:</label>
                  <p className="text-sm">{licenseData.activated ? 'Yes' : 'No'}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Hardware ID:</label>
                  <div className="flex items-center gap-2">
                    <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                      {showSensitiveData ? licenseData.hwid : licenseData.hwid.substring(0, 8) + '...'}
                    </code>
                    {showSensitiveData && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(licenseData.hwid, 'Hardware ID')}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
                
                {licenseData.timestamp && (
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Activated At:</label>
                    <p className="text-sm">{new Date(licenseData.timestamp).toLocaleString()}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No license data available</p>
          )}
        </div>

        <Separator />

        {/* Machine Info */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Machine Information</h3>
          
          {machineInfo ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Platform:</label>
                <p className="text-sm">{machineInfo.platform}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Architecture:</label>
                <p className="text-sm">{machineInfo.arch}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Hardware ID:</label>
                <div className="flex items-center gap-2">
                  <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                    {showSensitiveData ? machineInfo.hwid : machineInfo.hwid.substring(0, 8) + '...'}
                  </code>
                  {showSensitiveData && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(machineInfo.hwid, 'Hardware ID')}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No machine information available</p>
          )}
        </div>

        <Separator />

        {/* Test Tools */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Test Tools</h3>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Test License Key:</label>
              <div className="flex items-center gap-2 mt-1">
                <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded flex-1">
                  {testLicenseKey}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(testLicenseKey, 'Test License Key')}
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Valid format: {validateLicenseFormat(testLicenseKey) ? 'Yes' : 'No'}
              </p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Actions */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Actions</h3>
          
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh Status
            </Button>
            
            <Button
              variant="destructive"
              onClick={handleClearLicense}
              disabled={isClearing}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear License Data
            </Button>
          </div>
          
          <p className="text-xs text-gray-500">
            ⚠️ Clearing license data will require re-activation on next app start
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
