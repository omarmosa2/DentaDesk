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
import { Eye, EyeOff, Lock, AlertTriangle, CheckCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  verifyPassword,
  isLockedOut,
  getFailedAttempts,
  getRemainingLockoutTime,
  isPasswordSet
} from '@/utils/paymentSecurity'

interface PaymentPasswordModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  onForgotPassword?: () => void
}

export default function PaymentPasswordModal({
  isOpen,
  onClose,
  onSuccess,
  onForgotPassword
}: PaymentPasswordModalProps) {
  const { toast } = useToast()
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isLocked, setIsLocked] = useState(false)
  const [remainingTime, setRemainingTime] = useState(0)

  // Check lockout status when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsLocked(isLockedOut())
      setRemainingTime(getRemainingLockoutTime())
      setPassword('')
      setError('')
    }
  }, [isOpen])

  // Update lockout timer
  useEffect(() => {
    if (isLocked && remainingTime > 0) {
      const timer = setInterval(() => {
        const newRemainingTime = getRemainingLockoutTime()
        setRemainingTime(newRemainingTime)
        if (newRemainingTime <= 0) {
          setIsLocked(false)
        }
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [isLocked, remainingTime])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (isLocked) {
      return
    }

    if (!password.trim()) {
      setError('يرجى إدخال كلمة المرور')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const isValid = await verifyPassword(password.trim())

      if (isValid) {
        toast({
          title: 'تم الدخول بنجاح',
          description: 'مرحباً بك في قسم المدفوعات',
          variant: 'default',
        })
        onSuccess()
        onClose()
      } else {
        const failedAttempts = getFailedAttempts()
        if (failedAttempts >= 3) {
          setIsLocked(true)
          setRemainingTime(30)
          setError('تم تجاوز عدد المحاولات المسموحة. يرجى الانتظار 30 ثانية قبل المحاولة مرة أخرى أو استخدم إعادة تعيين كلمة المرور.')
        } else {
          setError(`كلمة المرور غير صحيحة. محاولات متبقية: ${3 - failedAttempts}`)
        }
      }
    } catch (error: any) {
      setError(error.message || 'حدث خطأ أثناء التحقق من كلمة المرور')
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading && !isLocked) {
      handleSubmit(e as any)
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  if (!isPasswordSet()) {
    return null // Password not set up yet
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-md"
        onKeyDown={handleKeyDown}
        dir="rtl"
      >
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
            <Lock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <DialogTitle className="text-xl font-bold text-foreground">
            أدخل كلمة المرور للوصول إلى المدفوعات
          </DialogTitle>
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
                placeholder="أدخل كلمة المرور"
                className="pr-10 text-right"
                disabled={isLoading || isLocked}
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

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-right">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {isLocked && remainingTime > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-right">
                تم إغلاق النظام مؤقتاً. الوقت المتبقي: {remainingTime} ثانية
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
              disabled={isLoading || isLocked || !password.trim()}
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
                  دخول
                </>
              )}
            </Button>
          </DialogFooter>

          {onForgotPassword && (
            <div className="text-center pt-2">
              <Button
                type="button"
                variant="link"
                onClick={onForgotPassword}
                disabled={isLoading}
                className="text-sm text-muted-foreground hover:text-primary"
              >
                نسيت كلمة المرور؟
              </Button>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  )
}