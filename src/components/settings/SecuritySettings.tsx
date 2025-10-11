import React, { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import SecurityQuestionDialog from '../auth/SecurityQuestionDialog'
import {
  Key,
  Shield,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  AlertTriangle,
  Info,
  HelpCircle,
  Edit
} from 'lucide-react'

interface SecuritySettingsProps {
  showNotification: (message: string, type: 'success' | 'error' | 'info') => void
}

// Hash function for password (same as useAuth)
async function hashPassword(password: string): Promise<string> {
  try {
    const encoder = new TextEncoder()
    const data = encoder.encode(password + 'dental_clinic_salt_2024')
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  } catch (error) {
    console.error('Error hashing password:', error)
    throw error
  }
}

export default function SecuritySettings({ showNotification }: SecuritySettingsProps) {
  const { passwordEnabled, setPassword, removePassword, changePassword } = useAuth()

  const [showSetPassword, setShowSetPassword] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false)
  const [showRemovePassword, setShowRemovePassword] = useState(false)
  const [showSecurityQuestionDialog, setShowSecurityQuestionDialog] = useState(false)
  const [securityQuestion, setSecurityQuestion] = useState('')
  const [hasSecurityQuestion, setHasSecurityQuestion] = useState(false)

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [oldPassword, setOldPassword] = useState('')
  const [removePasswordInput, setRemovePasswordInput] = useState('')
  const [showPasswords, setShowPasswords] = useState({
    new: false,
    confirm: false,
    old: false,
    remove: false
  })

  const [isLoading, setIsLoading] = useState(false)

  // Load security question on component mount
  useEffect(() => {
    loadSecurityQuestion()
  }, [])

  const loadSecurityQuestion = async () => {
    try {
      const settings = await window.electronAPI.settings.get() as any
      if (settings?.security_question) {
        setSecurityQuestion(settings.security_question)
        setHasSecurityQuestion(true)
      } else {
        setHasSecurityQuestion(false)
      }
    } catch (error) {
      console.error('Error loading security question:', error)
    }
  }

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newPassword.trim()) {
      showNotification('يرجى إدخال كلمة مرور', 'error')
      return
    }

    if (newPassword.length < 4) {
      showNotification('كلمة المرور يجب أن تكون 4 أحرف على الأقل', 'error')
      return
    }

    if (newPassword !== confirmPassword) {
      showNotification('كلمة المرور وتأكيدها غير متطابقين', 'error')
      return
    }

    setIsLoading(true)
    try {
      console.log('🔐 SecuritySettings: Setting password...')
      const success = await setPassword(newPassword)
      console.log('🔐 SecuritySettings: Password set result:', success)

      if (success) {
        showNotification('تم تعيين كلمة المرور بنجاح', 'success')
        setShowSetPassword(false)
        setNewPassword('')
        setConfirmPassword('')
        // Reset password visibility
        setShowPasswords({ new: false, confirm: false, old: false, remove: false })
      } else {
        showNotification('فشل في تعيين كلمة المرور', 'error')
      }
    } catch (error) {
      console.error('❌ SecuritySettings: Error setting password:', error)
      showNotification('حدث خطأ أثناء تعيين كلمة المرور', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!oldPassword.trim() || !newPassword.trim()) {
      showNotification('يرجى ملء جميع الحقول', 'error')
      return
    }

    if (newPassword.length < 4) {
      showNotification('كلمة المرور الجديدة يجب أن تكون 4 أحرف على الأقل', 'error')
      return
    }

    if (newPassword !== confirmPassword) {
      showNotification('كلمة المرور الجديدة وتأكيدها غير متطابقين', 'error')
      return
    }

    setIsLoading(true)
    try {
      console.log('🔐 SecuritySettings: Changing password...')
      const success = await changePassword(oldPassword, newPassword)
      console.log('🔐 SecuritySettings: Password change result:', success)

      if (success) {
        showNotification('تم تغيير كلمة المرور بنجاح', 'success')
        setShowChangePassword(false)
        setOldPassword('')
        setNewPassword('')
        setConfirmPassword('')
        // Reset password visibility
        setShowPasswords({ new: false, confirm: false, old: false, remove: false })
      } else {
        showNotification('كلمة المرور القديمة غير صحيحة', 'error')
      }
    } catch (error) {
      console.error('❌ SecuritySettings: Error changing password:', error)
      showNotification('حدث خطأ أثناء تغيير كلمة المرور', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemovePasswordWithVerification = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!removePasswordInput.trim()) {
      showNotification('يرجى إدخال كلمة المرور الحالية', 'error')
      return
    }

    setIsLoading(true)
    try {
      console.log('🔐 SecuritySettings: Verifying password for removal...')

      // Get current settings to verify password
      const currentSettings = await window.electronAPI.settings.get()

      if (!currentSettings?.app_password) {
        showNotification('لا توجد كلمة مرور مُعيّنة', 'error')
        setIsLoading(false)
        return
      }

      // Hash the input password using the same method as useAuth
      const hashedInput = await hashPassword(removePasswordInput)

      if (hashedInput !== currentSettings.app_password) {
        showNotification('كلمة المرور غير صحيحة', 'error')
        setIsLoading(false)
        return
      }

      // If password is correct, proceed with removal
      console.log('🔐 SecuritySettings: Password verified, removing...')
      const success = await removePassword()
      console.log('🔐 SecuritySettings: Password removal result:', success)

      if (success) {
        showNotification('تم إزالة كلمة المرور بنجاح', 'success')
        setShowRemovePassword(false)
        setRemovePasswordInput('')
        setShowPasswords(prev => ({ ...prev, remove: false }))
      } else {
        showNotification('فشل في إزالة كلمة المرور', 'error')
      }
    } catch (error) {
      console.error('❌ SecuritySettings: Error removing password:', error)
      showNotification('حدث خطأ أثناء إزالة كلمة المرور', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemovePassword = async () => {
    setIsLoading(true)
    try {
      console.log('🔐 SecuritySettings: Removing password...')
      const success = await removePassword()
      console.log('🔐 SecuritySettings: Password removal result:', success)

      if (success) {
        showNotification('تم إزالة كلمة المرور بنجاح', 'success')
        setShowRemoveConfirm(false)
      } else {
        showNotification('فشل في إزالة كلمة المرور', 'error')
      }
    } catch (error) {
      console.error('❌ SecuritySettings: Error removing password:', error)
      showNotification('حدث خطأ أثناء إزالة كلمة المرور', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const togglePasswordVisibility = (field: 'new' | 'confirm' | 'old' | 'remove') => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }))
  }

  const handleSecurityQuestionSave = () => {
    loadSecurityQuestion()
    showNotification('تم حفظ سؤال الأمان بنجاح', 'success')
  }

  return (
    <div className="space-y-8" dir="rtl">
      {/* Password Protection Status */}
      <div className="bg-gradient-to-br from-card/50 to-card/30 dark:from-gray-800/50 dark:to-gray-800/30 rounded-2xl shadow-xl border border-border/40 dark:border-gray-700/40 overflow-hidden">
        <div className="p-8 border-b border-border/30 dark:border-gray-700/30 bg-gradient-to-r from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20">
          <div className="flex items-center gap-4 mb-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 dark:from-primary/30 dark:to-primary/20">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-foreground dark:text-white">حماية التطبيق بكلمة مرور</h3>
              <p className="text-sm text-muted-foreground dark:text-gray-300 mt-1">
                تأمين التطبيق بكلمة مرور لمنع الوصول غير المصرح به
              </p>
            </div>
          </div>
        </div>
        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4 space-x-reverse">
              <div className={`p-4 rounded-2xl shadow-lg transition-all duration-300 ${
                passwordEnabled 
                  ? 'bg-gradient-to-br from-green-100 to-green-50 dark:from-green-900/30 dark:to-green-800/20' 
                  : 'bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-800/50 dark:to-gray-700/30'
              }`}>
                {passwordEnabled ? (
                  <Lock className="w-6 h-6 text-green-600 dark:text-green-400" />
                ) : (
                  <Unlock className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                )}
              </div>
              <div>
                <p className="text-lg font-bold text-foreground dark:text-white">
                  {passwordEnabled ? 'كلمة المرور مفعلة' : 'كلمة المرور معطلة'}
                </p>
                <p className="text-sm text-muted-foreground dark:text-gray-300">
                  {passwordEnabled
                    ? 'التطبيق محمي بكلمة مرور'
                    : 'التطبيق غير محمي بكلمة مرور'
                  }
                </p>
              </div>
            </div>
            <div className={`px-4 py-2 rounded-full text-sm font-bold shadow-lg transition-all duration-300 ${
              passwordEnabled
                ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-green-500/25'
                : 'bg-gradient-to-r from-gray-500 to-gray-600 text-white shadow-gray-500/25'
            }`}>
              {passwordEnabled ? 'مفعل' : 'معطل'}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4">
            {!passwordEnabled ? (
              <button
                onClick={() => setShowSetPassword(true)}
                className="group flex items-center space-x-3 space-x-reverse px-6 py-3 bg-gradient-to-r from-primary to-primary/90 text-white rounded-xl hover:from-primary/90 hover:to-primary/80 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
              >
                <Key className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" />
                <span className="font-semibold">تعيين كلمة مرور</span>
              </button>
            ) : (
              <>
                <button
                  onClick={() => setShowChangePassword(true)}
                  className="group flex items-center space-x-3 space-x-reverse px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
                >
                  <Key className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" />
                  <span className="font-semibold">تغيير كلمة المرور</span>
                </button>
                <button
                  onClick={() => setShowRemovePassword(true)}
                  className="group flex items-center space-x-3 space-x-reverse px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
                >
                  <Unlock className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" />
                  <span className="font-semibold">إزالة كلمة المرور</span>
                </button>
              </>
            )}
          </div>

          {/* Security Info */}
          <div className="mt-8 p-6 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10 border border-blue-200/50 dark:border-blue-800/50 rounded-2xl shadow-lg">
            <div className="flex items-start space-x-4 space-x-reverse">
              <div className="p-2 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-800/30 dark:to-blue-700/20">
                <Info className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-blue-800 dark:text-blue-200 mb-4">
                  معلومات مهمة حول الأمان
                </h4>
                <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-3">
                  <li className="flex items-start space-x-3 space-x-reverse">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                    <span>عند تفعيل كلمة المرور، ستحتاج لإدخالها في كل مرة تفتح فيها التطبيق</span>
                  </li>
                  <li className="flex items-start space-x-3 space-x-reverse">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                    <span>يُنصح باستخدام كلمة مرور قوية تحتوي على أرقام وحروف</span>
                  </li>
                  <li className="flex items-start space-x-3 space-x-reverse">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                    <span>احتفظ بكلمة المرور في مكان آمن</span>
                  </li>
                  <li className="flex items-start space-x-3 space-x-reverse">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                    <span>في حالة نسيان كلمة المرور، يمكنك استخدام سؤال الأمان لاستعادتها</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Security Question Section */}
      <div className="bg-gradient-to-br from-card/50 to-card/30 dark:from-gray-800/50 dark:to-gray-800/30 rounded-2xl shadow-xl border border-border/40 dark:border-gray-700/40 overflow-hidden">
        <div className="p-8 border-b border-border/30 dark:border-gray-700/30 bg-gradient-to-r from-amber/5 to-amber/10 dark:from-amber/10 dark:to-amber/20">
          <div className="flex items-center gap-4 mb-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-amber/20 to-amber/10 dark:from-amber/30 dark:to-amber/20">
              <HelpCircle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-foreground dark:text-white">سؤال الأمان</h3>
              <p className="text-sm text-muted-foreground dark:text-gray-300 mt-1">
                إعداد سؤال أمان لاستعادة كلمة المرور في حالة نسيانها
              </p>
            </div>
          </div>
        </div>
        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4 space-x-reverse">
              <div className={`p-4 rounded-2xl shadow-lg transition-all duration-300 ${
                hasSecurityQuestion 
                  ? 'bg-gradient-to-br from-green-100 to-green-50 dark:from-green-900/30 dark:to-green-800/20' 
                  : 'bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-800/50 dark:to-gray-700/30'
              }`}>
                {hasSecurityQuestion ? (
                  <HelpCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                ) : (
                  <HelpCircle className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                )}
              </div>
              <div>
                <h4 className="text-lg font-bold text-foreground dark:text-white">
                  {hasSecurityQuestion ? 'تم إعداد سؤال الأمان' : 'لم يتم إعداد سؤال أمان'}
                </h4>
                <p className="text-sm text-muted-foreground dark:text-gray-300">
                  {hasSecurityQuestion ? 'يمكنك استخدام سؤال الأمان لاستعادة كلمة المرور' : 'قم بإعداد سؤال أمان لاستعادة كلمة المرور'}
                </p>
              </div>
            </div>
            <div className="flex space-x-3 space-x-reverse">
              <button
                onClick={() => setShowSecurityQuestionDialog(true)}
                className="group px-6 py-3 bg-gradient-to-r from-primary to-primary/90 text-white rounded-xl hover:from-primary/90 hover:to-primary/80 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 flex items-center space-x-3 space-x-reverse"
              >
                {hasSecurityQuestion ? (
                  <>
                    <Edit className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" />
                    <span className="font-semibold">تحديث</span>
                  </>
                ) : (
                  <>
                    <HelpCircle className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" />
                    <span className="font-semibold">إعداد</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Current Security Question Display */}
          {hasSecurityQuestion && securityQuestion && (
            <div className="mb-8 p-6 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10 border border-blue-200/50 dark:border-blue-800/50 rounded-2xl shadow-lg">
              <div className="flex items-start space-x-4 space-x-reverse">
                <div className="p-2 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-800/30 dark:to-blue-700/20">
                  <HelpCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-blue-800 dark:text-blue-200 mb-2">
                    سؤال الأمان الحالي
                  </h4>
                  <p className="text-blue-700 dark:text-blue-300 font-medium">
                    {securityQuestion}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Security Question Info */}
          <div className="p-6 bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-800/10 border border-amber-200/50 dark:border-amber-800/50 rounded-2xl shadow-lg">
            <div className="flex items-start space-x-4 space-x-reverse">
              <div className="p-2 rounded-xl bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-800/30 dark:to-amber-700/20">
                <Info className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-amber-800 dark:text-amber-200 mb-4">
                  نصائح مهمة لسؤال الأمان
                </h4>
                <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-3">
                  <li className="flex items-start space-x-3 space-x-reverse">
                    <div className="w-2 h-2 rounded-full bg-amber-500 mt-2 flex-shrink-0"></div>
                    <span>اختر سؤالاً تتذكر إجابته بسهولة</span>
                  </li>
                  <li className="flex items-start space-x-3 space-x-reverse">
                    <div className="w-2 h-2 rounded-full bg-amber-500 mt-2 flex-shrink-0"></div>
                    <span>تأكد من أن الإجابة لا يمكن للآخرين تخمينها</span>
                  </li>
                  <li className="flex items-start space-x-3 space-x-reverse">
                    <div className="w-2 h-2 rounded-full bg-amber-500 mt-2 flex-shrink-0"></div>
                    <span>تجنب الأسئلة التي قد تتغير إجابتها مع الوقت</span>
                  </li>
                  <li className="flex items-start space-x-3 space-x-reverse">
                    <div className="w-2 h-2 rounded-full bg-amber-500 mt-2 flex-shrink-0"></div>
                    <span>احتفظ بإجابة السؤال في مكان آمن</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Set Password Dialog */}
      {showSetPassword && (
        <PasswordDialog
          title="تعيين كلمة مرور جديدة"
          onSubmit={handleSetPassword}
          onCancel={() => {
            setShowSetPassword(false)
            setNewPassword('')
            setConfirmPassword('')
          }}
          isLoading={isLoading}
        >
          <PasswordInput
            label="كلمة المرور الجديدة"
            value={newPassword}
            onChange={setNewPassword}
            show={showPasswords.new}
            onToggleShow={() => togglePasswordVisibility('new')}
            placeholder="أدخل كلمة مرور جديدة"
          />
          <PasswordInput
            label="تأكيد كلمة المرور"
            value={confirmPassword}
            onChange={setConfirmPassword}
            show={showPasswords.confirm}
            onToggleShow={() => togglePasswordVisibility('confirm')}
            placeholder="أعد إدخال كلمة المرور"
          />
        </PasswordDialog>
      )}

      {/* Change Password Dialog */}
      {showChangePassword && (
        <PasswordDialog
          title="تغيير كلمة المرور"
          onSubmit={handleChangePassword}
          onCancel={() => {
            setShowChangePassword(false)
            setOldPassword('')
            setNewPassword('')
            setConfirmPassword('')
          }}
          isLoading={isLoading}
        >
          <PasswordInput
            label="كلمة المرور الحالية"
            value={oldPassword}
            onChange={setOldPassword}
            show={showPasswords.old}
            onToggleShow={() => togglePasswordVisibility('old')}
            placeholder="أدخل كلمة المرور الحالية"
          />
          <PasswordInput
            label="كلمة المرور الجديدة"
            value={newPassword}
            onChange={setNewPassword}
            show={showPasswords.new}
            onToggleShow={() => togglePasswordVisibility('new')}
            placeholder="أدخل كلمة مرور جديدة"
          />
          <PasswordInput
            label="تأكيد كلمة المرور الجديدة"
            value={confirmPassword}
            onChange={setConfirmPassword}
            show={showPasswords.confirm}
            onToggleShow={() => togglePasswordVisibility('confirm')}
            placeholder="أعد إدخال كلمة المرور الجديدة"
          />
        </PasswordDialog>
      )}

      {/* Remove Password Dialog */}
      {showRemovePassword && (
        <PasswordDialog
          title="إزالة كلمة المرور"
          onSubmit={handleRemovePasswordWithVerification}
          onCancel={() => {
            setShowRemovePassword(false)
            setRemovePasswordInput('')
            setShowPasswords(prev => ({ ...prev, remove: false }))
          }}
          isLoading={isLoading}
        >
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-start space-x-3 space-x-reverse">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-red-800 dark:text-red-200">
                  تحذير: إزالة كلمة المرور ستجعل التطبيق غير محمي. يرجى إدخال كلمة المرور الحالية للتأكيد.
                </p>
              </div>
            </div>
          </div>
          <PasswordInput
            label="كلمة المرور الحالية"
            value={removePasswordInput}
            onChange={setRemovePasswordInput}
            show={showPasswords.remove}
            onToggleShow={() => togglePasswordVisibility('remove')}
            placeholder="أدخل كلمة المرور الحالية"
          />
        </PasswordDialog>
      )}

      {/* Remove Password Confirmation */}
      {showRemoveConfirm && (
        <ConfirmDialog
          title="إزالة كلمة المرور"
          message="هل أنت متأكد من إزالة كلمة المرور؟ سيصبح التطبيق غير محمي."
          onConfirm={handleRemovePassword}
          onCancel={() => setShowRemoveConfirm(false)}
          isLoading={isLoading}
          confirmText="إزالة"
          confirmClass="bg-red-600 hover:bg-red-700"
        />
      )}

      {/* Security Question Dialog */}
      <SecurityQuestionDialog
        open={showSecurityQuestionDialog}
        onOpenChange={setShowSecurityQuestionDialog}
        onSave={handleSecurityQuestionSave}
        editMode={hasSecurityQuestion}
      />
    </div>
  )
}

// Helper Components
interface PasswordInputProps {
  label: string
  value: string
  onChange: (value: string) => void
  show: boolean
  onToggleShow: () => void
  placeholder: string
}

function PasswordInput({ label, value, onChange, show, onToggleShow, placeholder }: PasswordInputProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-foreground">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full pr-3 pl-10 py-2 border border-input bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={onToggleShow}
          className="absolute inset-y-0 left-0 pl-3 flex items-center text-muted-foreground hover:text-foreground"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}

interface PasswordDialogProps {
  title: string
  children: React.ReactNode
  onSubmit: (e: React.FormEvent) => void
  onCancel: () => void
  isLoading: boolean
}

function PasswordDialog({ title, children, onSubmit, onCancel, isLoading }: PasswordDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-card border border-border rounded-lg shadow-2xl max-w-md w-full mx-4">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">{title}</h3>
          <form onSubmit={onSubmit} className="space-y-4">
            {children}
            <div className="flex justify-end space-x-3 space-x-reverse pt-4">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 border border-input bg-background text-foreground rounded-lg hover:bg-accent"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
              >
                {isLoading ? 'جاري الحفظ...' : 'حفظ'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

interface ConfirmDialogProps {
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
  isLoading: boolean
  confirmText: string
  confirmClass: string
}

function ConfirmDialog({ title, message, onConfirm, onCancel, isLoading, confirmText, confirmClass }: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-card border border-border rounded-lg shadow-2xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex items-center mb-4">
            <div className="flex-shrink-0 w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center ml-3">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">{title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{message}</p>
            </div>
          </div>
          <div className="flex justify-end space-x-3 space-x-reverse">
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-input bg-background text-foreground rounded-lg hover:bg-accent"
            >
              إلغاء
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className={`px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 ${confirmClass}`}
            >
              {isLoading ? 'جاري التنفيذ...' : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}