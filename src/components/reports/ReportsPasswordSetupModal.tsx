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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Eye, EyeOff, Shield, AlertTriangle, CheckCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  setupPassword,
  SECURITY_QUESTIONS,
  validatePasswordStrength,
  SecurityQuestion,
  PasswordSettings
} from '@/utils/reportsSecurity'

interface ReportsPasswordSetupModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function ReportsPasswordSetupModal({
  isOpen,
  onClose,
  onSuccess
}: ReportsPasswordSetupModalProps) {
  const { toast } = useToast()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [securityQuestionId, setSecurityQuestionId] = useState('')
  const [securityAnswer, setSecurityAnswer] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      resetForm()
    }
  }, [isOpen])

  const resetForm = () => {
    setPassword('')
    setConfirmPassword('')
    setSecurityQuestionId('')
    setSecurityAnswer('')
    setError('')
    setShowPassword(false)
    setShowConfirmPassword(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!password.trim()) {
      setError('يرجى إدخال كلمة مرور')
      return
    }

    if (!confirmPassword.trim()) {
      setError('يرجى تأكيد كلمة المرور')
      return
    }

    if (password !== confirmPassword) {
      setError('كلمات المرور غير متطابقة')
      return
    }

    if (!validatePasswordStrength(password)) {
      setError('كلمة المرور ضعيفة. يجب أن تحتوي على 4 أحرف على الأقل وحرف أو رقم واحد')
      return
    }

    if (!securityQuestionId || !securityAnswer.trim()) {
      setError('يرجى اختيار سؤال أماني والإجابة عليه')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const selectedQuestion = SECURITY_QUESTIONS.find(q => q.id === securityQuestionId)
      if (!selectedQuestion) {
        setError('سؤال أماني غير صالح')
        setIsLoading(false)
        return
      }

      const settings: PasswordSettings = {
        password: password.trim(),
        securityQuestion: selectedQuestion,
        securityAnswer: securityAnswer.trim()
      }

      const success = await setupPassword(settings)

      if (success) {
        toast({
          title: 'تم إعداد كلمة المرور بنجاح',
          description: 'سيتم طلب كلمة المرور عند الوصول لقسم التقارير',
          variant: 'default',
        })
        onSuccess()
        onClose()
      } else {
        setError('فشل في إعداد كلمة المرور. يرجى المحاولة مرة أخرى.')
      }
    } catch (error: any) {
      setError(error.message || 'حدث خطأ أثناء إعداد كلمة المرور')
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSubmit(e as any)
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
          <div className="mx-auto mb-4 w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
            <Shield className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <DialogTitle className="text-xl font-bold text-foreground">
            إعداد كلمة المرور
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-2">
            حماية قسم التقارير بكلمة مرور
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password" className="text-right block">
              كلمة المرور
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="أدخل كلمة مرور"
                className="pr-10 text-right"
                disabled={isLoading}
                autoFocus
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute left-2 top-1/2 -translate-y-1/2 h-auto p-1"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                {showPassword ? (
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
              disabled={isLoading || !password.trim() || !confirmPassword.trim() || !securityQuestionId || !securityAnswer.trim()}
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
                  إعداد كلمة المرور
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

