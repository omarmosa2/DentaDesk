import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Eye, EyeOff, Shield, AlertTriangle, CheckCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  verifySecurityAnswer,
  resetPassword,
  getSecurityQuestion,
  validatePasswordStrength
} from '@/utils/paymentSecurity'

interface PasswordResetModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function PasswordResetModal({
  isOpen,
  onClose,
  onSuccess
}: PasswordResetModalProps) {
  const { toast } = useToast()
  const [step, setStep] = useState<'answer' | 'newPassword'>('answer')
  const [securityAnswer, setSecurityAnswer] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [securityQuestion, setSecurityQuestion] = useState<string>('')

  useEffect(() => {
    if (isOpen) {
      const question = getSecurityQuestion()
      if (question) {
        setSecurityQuestion(question.question)
      }
      resetForm()
    }
  }, [isOpen])

  const resetForm = () => {
    setStep('answer')
    setSecurityAnswer('')
    setNewPassword('')
    setConfirmPassword('')
    setError('')
    setShowNewPassword(false)
    setShowConfirmPassword(false)
  }

  const handleAnswerSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!securityAnswer.trim()) {
      setError('يرجى إدخال إجابة السؤال الأماني')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const isValid = await verifySecurityAnswer(securityAnswer.trim())

      if (isValid) {
        setStep('newPassword')
      } else {
        setError('الإجابة غير صحيحة. يرجى المحاولة مرة أخرى.')
      }
    } catch (error: any) {
      setError(error.message || 'حدث خطأ أثناء التحقق من الإجابة')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newPassword.trim()) {
      setError('يرجى إدخال كلمة مرور جديدة')
      return
    }

    if (!confirmPassword.trim()) {
      setError('يرجى تأكيد كلمة المرور الجديدة')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('كلمات المرور غير متطابقة')
      return
    }

    if (!validatePasswordStrength(newPassword)) {
      setError('كلمة المرور ضعيفة. يجب أن تحتوي على 8 أحرف على الأقل، حرف كبير، حرف صغير، رقم، ورمز خاص')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const success = await resetPassword(newPassword, securityAnswer.trim())

      if (success) {
        toast({
          title: 'تم إعادة تعيين كلمة المرور بنجاح',
          description: 'يمكنك الآن استخدام كلمة المرور الجديدة للوصول إلى المدفوعات',
          variant: 'default',
        })
        onSuccess()
        onClose()
      } else {
        setError('فشل في إعادة تعيين كلمة المرور. يرجى المحاولة مرة أخرى.')
      }
    } catch (error: any) {
      setError(error.message || 'حدث خطأ أثناء إعادة تعيين كلمة المرور')
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      if (step === 'answer') {
        handleAnswerSubmit(e as any)
      } else {
        handlePasswordSubmit(e as any)
      }
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-md"
        onKeyDown={handleKeyDown}
        dir="rtl"
      >
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center">
            <Shield className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
          </div>
          <DialogTitle className="text-xl font-bold text-foreground">
            إعادة تعيين كلمة المرور
          </DialogTitle>
        </DialogHeader>

        {step === 'answer' ? (
          <form onSubmit={handleAnswerSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-right block font-medium">
                السؤال الأماني:
              </Label>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground text-right">
                  {securityQuestion}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="securityAnswer" className="text-right block">
                الإجابة
              </Label>
              <Input
                id="securityAnswer"
                type="text"
                value={securityAnswer}
                onChange={(e) => setSecurityAnswer(e.target.value)}
                placeholder="أدخل إجابتك على السؤال الأماني"
                className="text-right"
                disabled={isLoading}
                autoFocus
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-right">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
                className="w-full sm:w-auto"
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !securityAnswer.trim()}
                className="w-full sm:w-auto"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin ml-2" />
                    جاري التحقق...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 ml-2" />
                    التالي
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-right block">
                كلمة المرور الجديدة
              </Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="أدخل كلمة مرور جديدة"
                  className="pr-10 text-right"
                  disabled={isLoading}
                  autoFocus
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
                  placeholder="أعد إدخال كلمة المرور الجديدة"
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

            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-right">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <div className="text-xs text-muted-foreground text-right">
              <p>• على الأقل 4 أحرف</p>
              <p>• حرف أو رقم واحد على الأقل</p>
            </div>

            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep('answer')}
                disabled={isLoading}
                className="w-full sm:w-auto"
              >
                العودة
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !newPassword.trim() || !confirmPassword.trim()}
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
                    إعادة تعيين
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}