import React, { useState, useEffect } from 'react'
import { Eye, EyeOff, Lock, Shield, AlertCircle, Moon, Sun, HelpCircle } from 'lucide-react'
import { useTheme, useThemeClasses } from '../../contexts/ThemeContext'
import { useStableClinicLogo } from '../../hooks/useStableSettings'
import PasswordRecoveryDialog from './PasswordRecoveryDialog'

interface LoginScreenProps {
  onLogin: (password: string) => Promise<boolean>
  isLoading?: boolean
}

export default function LoginScreen({ onLogin, isLoading = false }: LoginScreenProps) {
  const { isDarkMode, toggleDarkMode } = useTheme()
  const themeClasses = useThemeClasses()
  const clinicLogo = useStableClinicLogo()

  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [attempts, setAttempts] = useState(0)
  const [isBlocked, setIsBlocked] = useState(false)
  const [blockTimeLeft, setBlockTimeLeft] = useState(0)
  const [showRecoveryDialog, setShowRecoveryDialog] = useState(false)

  // Block user after 5 failed attempts for 5 minutes
  const MAX_ATTEMPTS = 5
  const BLOCK_DURATION = 5 * 60 * 1000 // 5 minutes in milliseconds

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isBlocked && blockTimeLeft > 0) {
      interval = setInterval(() => {
        setBlockTimeLeft(prev => {
          if (prev <= 1000) {
            setIsBlocked(false)
            setAttempts(0)
            setError('')
            return 0
          }
          return prev - 1000
        })
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isBlocked, blockTimeLeft])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (isBlocked) {
      setError(`تم حظر المحاولات لمدة ${Math.ceil(blockTimeLeft / 60000)} دقيقة`)
      return
    }

    if (!password.trim()) {
      setError('يرجى إدخال كلمة المرور')
      return
    }

    setError('')

    try {
      const success = await onLogin(password)

      if (success) {
        setAttempts(0)
        setPassword('')
      } else {
        const newAttempts = attempts + 1
        setAttempts(newAttempts)

        if (newAttempts >= MAX_ATTEMPTS) {
          setIsBlocked(true)
          setBlockTimeLeft(BLOCK_DURATION)
          setError(`تم تجاوز عدد المحاولات المسموحة. تم حظر المحاولات لمدة 5 دقائق`)
        } else {
          setError(`كلمة مرور خاطئة. المحاولات المتبقية: ${MAX_ATTEMPTS - newAttempts}`)
        }
        setPassword('')
      }
    } catch (error) {
      setError('حدث خطأ أثناء التحقق من كلمة المرور')
      console.error('Login error:', error)
    }
  }

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const handlePasswordReset = () => {
    // Reset login state after password recovery
    setAttempts(0)
    setIsBlocked(false)
    setBlockTimeLeft(0)
    setError('')
    setPassword('')
  }

  return (
    <div className="min-h-screen login-gradient-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Enhanced Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-transparent to-secondary/3"></div>
      <div className="absolute inset-0 bg-gradient-to-tl from-accent/5 via-transparent to-primary/3"></div>

      {/* Animated Background Elements - More Elegant */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-br from-primary/8 to-secondary/4 rounded-full login-floating-orb"></div>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-tl from-secondary/8 to-accent/4 rounded-full login-floating-orb" style={{animationDelay: '2s'}}></div>
      <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-gradient-to-r from-accent/8 to-primary/4 rounded-full login-floating-orb" style={{animationDelay: '4s'}}></div>

      {/* Theme Toggle Button */}
      <button
        onClick={toggleDarkMode}
        className={`absolute top-6 right-6 p-4 rounded-full ${themeClasses.card} backdrop-blur-md hover:scale-110 hover:rotate-12 transition-all duration-300 z-20 shadow-lg hover:shadow-xl border border-border/30`}
        title={isDarkMode ? 'تبديل إلى الوضع الفاتح' : 'تبديل إلى الوضع المظلم'}
      >
        {isDarkMode ? (
          <Sun className="w-6 h-6 text-yellow-400 drop-shadow-sm transition-transform duration-300" />
        ) : (
          <Moon className="w-6 h-6 text-primary drop-shadow-sm transition-transform duration-300" />
        )}
      </button>

      <div className="w-full max-w-md relative z-10">
        {/* Logo and Title */}
        <div className="text-center mb-12">
          <div className="mx-auto w-28 h-28 bg-gradient-to-br from-primary/20 via-primary/15 to-secondary/20 rounded-full flex items-center justify-center mb-8 shadow-2xl backdrop-blur-sm border border-primary/20 hover:scale-105 hover:shadow-3xl transition-all duration-500 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent rounded-full animate-pulse"></div>
            {clinicLogo ? (
              <img 
                src={clinicLogo} 
                alt="Clinic Logo" 
                className="w-full h-full object-cover rounded-full relative z-10"
              />
            ) : (
              <Shield className="w-14 h-14 text-primary drop-shadow-lg relative z-10" />
            )}
          </div>
          <h1 className={`text-5xl font-bold ${themeClasses.textPrimary} arabic-enhanced mb-4 drop-shadow-lg`}>
            نظام إدارة العيادة
          </h1>
          <p className={`${themeClasses.textSecondary} arabic-enhanced text-xl font-medium opacity-90`}>
            يرجى إدخال كلمة المرور للدخول
          </p>
        </div>

        {/* Login Form */}
        <div className={`${themeClasses.card} backdrop-blur-xl rounded-3xl p-10 login-card-glow hover:scale-[1.02] transition-all duration-500 border border-border/50 relative overflow-hidden`}>
          {/* Card Background Gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 rounded-3xl"></div>
          <div className="relative z-10">
          <form onSubmit={handleSubmit} className="space-y-6" dir="rtl">
            {/* Password Input */}
            <div className="space-y-3">
              <label htmlFor="password" className={`block text-lg font-semibold ${themeClasses.textPrimary} arabic-enhanced`}>
                كلمة المرور
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                  <Lock className="w-6 h-6 text-muted-foreground" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading || isBlocked}
                  className={`w-full pr-14 pl-14 py-4 border-2 ${themeClasses.input} rounded-xl focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-lg backdrop-blur-sm`}
                  placeholder="أدخل كلمة المرور"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading || isBlocked}
                  className="absolute inset-y-0 left-0 pl-4 flex items-center text-muted-foreground hover:text-foreground focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {showPassword ? (
                    <EyeOff className="w-6 h-6" />
                  ) : (
                    <Eye className="w-6 h-6" />
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className={`flex items-center space-x-3 space-x-reverse p-4 ${themeClasses.alertError} rounded-xl backdrop-blur-sm`}>
                <AlertCircle className="w-6 h-6 text-destructive flex-shrink-0" />
                <span className="text-base font-medium text-destructive arabic-enhanced">{error}</span>
              </div>
            )}

            {/* Block Timer */}
            {isBlocked && blockTimeLeft > 0 && (
              <div className={`text-center p-4 ${themeClasses.alertWarning} rounded-xl backdrop-blur-sm`}>
                <p className="text-base font-semibold arabic-enhanced">
                  الوقت المتبقي للحظر: {formatTime(blockTimeLeft)}
                </p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || isBlocked || !password.trim()}
              className={`w-full py-4 px-6 ${themeClasses.buttonPrimary} rounded-xl font-bold text-xl focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 arabic-enhanced`}
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-3 space-x-reverse">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span className="arabic-enhanced">جاري التحقق...</span>
                </div>
              ) : isBlocked ? (
                <span className="arabic-enhanced">محظور مؤقتاً</span>
              ) : (
                <span className="arabic-enhanced">دخول</span>
              )}
            </button>

            {/* Attempts Counter */}
            {attempts > 0 && !isBlocked && (
              <div className="text-center">
                <p className={`text-base ${themeClasses.textSecondary} font-medium arabic-enhanced`}>
                  المحاولات المتبقية: {MAX_ATTEMPTS - attempts} من {MAX_ATTEMPTS}
                </p>
              </div>
            )}

            {/* Forgot Password Link */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => setShowRecoveryDialog(true)}
                className={`text-sm ${themeClasses.textSecondary} hover:text-primary transition-colors duration-200 arabic-enhanced flex items-center justify-center gap-2 mx-auto`}
              >
                <HelpCircle className="w-4 h-4" />
                نسيت كلمة المرور؟
              </button>
            </div>
          </form>
          </div>
        </div>

        {/* Password Recovery Dialog */}
        <PasswordRecoveryDialog
          open={showRecoveryDialog}
          onOpenChange={setShowRecoveryDialog}
          onPasswordReset={handlePasswordReset}
        />

        {/* Footer */}
        <div className="text-center mt-12">
          <div className={`inline-flex items-center space-x-3 space-x-reverse px-8 py-4 ${themeClasses.card} backdrop-blur-md rounded-full shadow-lg hover:shadow-xl transition-all duration-300 border border-border/30`}>
            <Shield className="w-5 h-5 text-primary" />
            <p className={`text-base ${themeClasses.textSecondary} font-semibold arabic-enhanced`}>
              نظام إدارة العيادة - DentaDesk
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
