import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Eye, EyeOff, Shield, AlertTriangle, CheckCircle, Settings, Lock, Unlock, ChevronDown, ChevronUp } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  changePassword,
  validatePasswordStrength,
  setupPassword,
  isPasswordSet,
  clearAllSecurityData,
  SECURITY_QUESTIONS
} from '@/utils/paymentSecurity'

export default function PasswordSettings() {
  const { toast } = useToast()
  const [hasExistingPassword, setHasExistingPassword] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [securityQuestionId, setSecurityQuestionId] = useState('')
  const [securityAnswer, setSecurityAnswer] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    // Check if password is already set
    setHasExistingPassword(isPasswordSet())
  }, [])

  const resetForm = () => {
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setSecurityQuestionId('')
    setSecurityAnswer('')
    setError('')
    setShowCurrentPassword(false)
    setShowNewPassword(false)
    setShowConfirmPassword(false)
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (hasExistingPassword && !currentPassword.trim()) {
      setError('يرجى إدخال كلمة المرور الحالية')
      return
    }

    if (!newPassword.trim()) {
      setError('يرجى إدخال كلمة مرور جديدة')
      return
    }

    if (!confirmPassword.trim()) {
      setError('يرجى تأكيد كلمة المرور الجديدة')
      return
    }

    if (hasExistingPassword && newPassword === currentPassword) {
      setError('كلمة المرور الجديدة يجب أن تكون مختلفة عن الحالية')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('كلمات المرور غير متطابقة')
      return
    }

    if (!validatePasswordStrength(newPassword)) {
      setError('كلمة المرور ضعيفة. يجب أن تحتوي على 4 أحرف على الأقل وحرف أو رقم واحد')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      let success = false

      if (hasExistingPassword) {
        // Change existing password
        success = await changePassword(currentPassword.trim(), newPassword.trim())
        if (success) {
          toast({
            title: 'تم تغيير كلمة المرور بنجاح',
            description: 'استخدم كلمة المرور الجديدة في المرات القادمة',
            variant: 'default',
          })
        }
      } else {
        // Setup new password
        if (!securityQuestionId || !securityAnswer.trim()) {
          setError('يرجى اختيار سؤال أماني والإجابة عليه')
          setIsLoading(false)
          return
        }

        const selectedQuestion = SECURITY_QUESTIONS.find(q => q.id === securityQuestionId)
        if (!selectedQuestion) {
          setError('سؤال أماني غير صالح')
          setIsLoading(false)
          return
        }

        const settings = {
          password: newPassword.trim(),
          securityQuestion: selectedQuestion,
          securityAnswer: securityAnswer.trim()
        }

        success = await setupPassword(settings)
        if (success) {
          toast({
            title: 'تم إعداد كلمة المرور بنجاح',
            description: 'سيتم طلب كلمة المرور عند الوصول لقسم المدفوعات',
            variant: 'default',
          })
          setHasExistingPassword(true)
        }
      }

      if (!success) {
        setError(hasExistingPassword
          ? 'فشل في تغيير كلمة المرور. تأكد من صحة كلمة المرور الحالية.'
          : 'فشل في إعداد كلمة المرور. يرجى المحاولة مرة أخرى.'
        )
      } else {
        resetForm()
      }
    } catch (error: any) {
      setError(error.message || 'حدث خطأ أثناء حفظ كلمة المرور')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDisablePassword = async () => {
    if (!confirm('هل أنت متأكد من حذف كلمة المرور؟ سيتم السماح بالوصول المباشر لقسم المدفوعات.')) {
      return
    }

    setIsLoading(true)
    try {
      clearAllSecurityData()
      setHasExistingPassword(false)
      resetForm()
      toast({
        title: 'تم حذف كلمة المرور',
        description: 'يمكنك الآن الوصول لقسم المدفوعات مباشرة بدون كلمة مرور',
        variant: 'default',
      })
    } catch (error) {
      console.error('Error disabling password:', error)
      toast({
        title: 'خطأ',
        description: 'فشل في حذف كلمة المرور',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handlePasswordChange(e as any)
    }
  }

  return (
    <Card className="w-full" dir="rtl">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                  {hasExistingPassword ? (
                    <Lock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  ) : (
                    <Unlock className="w-5 h-5 text-green-600 dark:text-green-400" />
                  )}
                </div>
                <div>
                  <CardTitle className="text-lg">إعدادات الأمان</CardTitle>
                  <CardDescription className="text-right">
                    {hasExistingPassword
                      ? 'تغيير كلمة مرور قسم المدفوعات'
                      : 'إعداد كلمة مرور لحماية قسم المدفوعات'
                    }
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {isExpanded ? 'إغلاق' : 'فتح'}
                </span>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent>
        <form onSubmit={handlePasswordChange} onKeyDown={handleKeyDown} className="space-y-4">
          {/* Current Password Field - Only show if password exists */}
          {hasExistingPassword && (
            <div className="space-y-2">
              <Label htmlFor="currentPassword" className="text-right block">
                كلمة المرور الحالية
              </Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور الحالية"
                  className="pr-10 text-right"
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute left-2 top-1/2 -translate-y-1/2 h-auto p-1"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  disabled={isLoading}
                >
                  {showCurrentPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="newPassword" className="text-right block">
              {hasExistingPassword ? 'كلمة المرور الجديدة' : 'كلمة المرور'}
            </Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={hasExistingPassword ? 'أدخل كلمة مرور جديدة' : 'أدخل كلمة مرور'}
                className="pr-10 text-right"
                disabled={isLoading}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute left-2 top-1/2 -translate-y-1/2 h-auto p-1"
                onClick={() => setShowNewPassword(!showNewPassword)}
                disabled={isLoading}
              >
                {showNewPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-right block">
              تأكيد كلمة المرور
            </Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="أعد إدخال كلمة المرور"
                className="pr-10 text-right"
                disabled={isLoading}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute left-2 top-1/2 -translate-y-1/2 h-auto p-1"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isLoading}
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Security Question Fields - Only show if setting up new password */}
          {!hasExistingPassword && (
            <>
              <div className="space-y-2">
                <Label className="text-right block">
                  السؤال الأماني (لإعادة التعيين في حال نسيان كلمة المرور)
                </Label>
                <Select value={securityQuestionId} onValueChange={setSecurityQuestionId} disabled={isLoading}>
                  <SelectTrigger className="text-right">
                    <SelectValue placeholder="اختر سؤال أماني" />
                  </SelectTrigger>
                  <SelectContent>
                    {SECURITY_QUESTIONS.map((question) => (
                      <SelectItem key={question.id} value={question.id} className="text-right">
                        {question.question}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="securityAnswer" className="text-right block">
                  إجابة السؤال الأماني
                </Label>
                <Input
                  id="securityAnswer"
                  type="text"
                  value={securityAnswer}
                  onChange={(e) => setSecurityAnswer(e.target.value)}
                  placeholder="أدخل إجابتك على السؤال المختار"
                  className="text-right"
                  disabled={isLoading}
                />
              </div>
            </>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-right">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <div className="text-xs text-muted-foreground text-right">
            <p className="font-medium mb-1">متطلبات كلمة المرور:</p>
            <p>• على الأقل 4 أحرف</p>
            <p>• حرف أو رقم واحد على الأقل</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={resetForm}
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              إعادة تعيين
            </Button>

            {hasExistingPassword && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDisablePassword}
                disabled={isLoading}
                className="w-full sm:w-auto"
              >
                حذف كلمة المرور
              </Button>
            )}

            <Button
              type="submit"
              disabled={isLoading || !newPassword.trim() || !confirmPassword.trim() || (hasExistingPassword ? !currentPassword.trim() : (!securityQuestionId || !securityAnswer.trim()))}
              className="w-full sm:w-auto"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin ml-2" />
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 ml-2" />
                  {hasExistingPassword ? 'حفظ التغييرات' : 'إعداد كلمة المرور'}
                </>
              )}
            </Button>
          </div>
        </form>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}