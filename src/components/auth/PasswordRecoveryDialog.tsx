import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Eye, EyeOff, Key, HelpCircle, CheckCircle, AlertCircle } from 'lucide-react'
import { hashPassword } from '../../utils/crypto'

interface PasswordRecoveryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPasswordReset: () => void
}

export default function PasswordRecoveryDialog({
  open,
  onOpenChange,
  onPasswordReset
}: PasswordRecoveryDialogProps) {
  const [step, setStep] = useState<'question' | 'answer' | 'newPassword'>('question')
  const [securityQuestion, setSecurityQuestion] = useState('')
  const [userAnswer, setUserAnswer] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Reset state when dialog opens/closes
  React.useEffect(() => {
    if (open) {
      loadSecurityQuestion()
      setStep('question')
      setUserAnswer('')
      setNewPassword('')
      setConfirmPassword('')
      setError('')
      setSuccess('')
    }
  }, [open])

  const loadSecurityQuestion = async () => {
    try {
      const settings = await window.electronAPI.settings.get()
      if (settings?.security_question) {
        setSecurityQuestion(settings.security_question)
        setStep('answer')
      } else {
        setError('لم يتم تعيين سؤال أمان. يرجى التواصل مع المسؤول.')
      }
    } catch (error) {
      console.error('Error loading security question:', error)
      setError('حدث خطأ في تحميل سؤال الأمان')
    }
  }

  const verifySecurityAnswer = async () => {
    if (!userAnswer.trim()) {
      setError('يرجى إدخال إجابة سؤال الأمان')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const settings = await window.electronAPI.settings.get()
      if (!settings?.security_answer) {
        setError('لم يتم تعيين إجابة سؤال الأمان')
        setIsLoading(false)
        return
      }

      // Hash the user's answer and compare
      const hashedAnswer = await hashPassword(userAnswer.trim().toLowerCase())

      if (hashedAnswer === settings.security_answer) {
        setStep('newPassword')
        setError('')
      } else {
        setError('إجابة سؤال الأمان غير صحيحة')
      }
    } catch (error) {
      console.error('Error verifying security answer:', error)
      setError('حدث خطأ في التحقق من إجابة سؤال الأمان')
    } finally {
      setIsLoading(false)
    }
  }

  const resetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      setError('يرجى إدخال كلمة المرور الجديدة وتأكيدها')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('كلمة المرور وتأكيدها غير متطابقتين')
      return
    }

    if (newPassword.length < 4) {
      setError('كلمة المرور يجب أن تكون 4 أحرف على الأقل')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      // Hash the new password
      const hashedPassword = await hashPassword(newPassword)

      // Update the password in settings
      await window.electronAPI.settings.update({
        app_password: hashedPassword
      })

      setSuccess('تم تغيير كلمة المرور بنجاح')

      // Wait a moment then close dialog and notify parent
      setTimeout(() => {
        onPasswordReset()
        onOpenChange(false)
      }, 2000)

    } catch (error) {
      console.error('Error resetting password:', error)
      setError('حدث خطأ في تغيير كلمة المرور')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setStep('question')
    setUserAnswer('')
    setNewPassword('')
    setConfirmPassword('')
    setError('')
    setSuccess('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-right">
            <Key className="w-5 h-5 text-primary" />
            استعادة كلمة المرور
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Step 1: Loading Security Question */}
          {step === 'question' && (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-sm text-muted-foreground mt-2">جاري تحميل سؤال الأمان...</p>
            </div>
          )}

          {/* Step 2: Answer Security Question */}
          {step === 'answer' && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <HelpCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-1">
                      سؤال الأمان
                    </h4>
                    <p className="text-blue-700 dark:text-blue-300">
                      {securityQuestion}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="answer">الإجابة</Label>
                <Input
                  id="answer"
                  type="text"
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  placeholder="أدخل إجابة سؤال الأمان"
                  className="text-right"
                  onKeyDown={(e) => e.key === 'Enter' && verifySecurityAnswer()}
                />
              </div>

              <Button
                onClick={verifySecurityAnswer}
                disabled={isLoading || !userAnswer.trim()}
                className="w-full"
              >
                {isLoading ? 'جاري التحقق...' : 'تحقق من الإجابة'}
              </Button>
            </div>
          )}

          {/* Step 3: Set New Password */}
          {step === 'newPassword' && (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <p className="text-green-800 dark:text-green-200 font-medium">
                    تم التحقق بنجاح! يمكنك الآن تعيين كلمة مرور جديدة
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">كلمة المرور الجديدة</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="أدخل كلمة المرور الجديدة"
                    className="text-right pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="أعد إدخال كلمة المرور"
                    className="text-right pr-10"
                    onKeyDown={(e) => e.key === 'Enter' && resetPassword()}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                onClick={resetPassword}
                disabled={isLoading || !newPassword || !confirmPassword}
                className="w-full"
              >
                {isLoading ? 'جاري التغيير...' : 'تغيير كلمة المرور'}
              </Button>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Alert */}
          {success && (
            <Alert className="border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-200">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {/* Cancel Button */}
          {step !== 'question' && !success && (
            <Button variant="outline" onClick={handleClose} className="w-full">
              إلغاء
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
