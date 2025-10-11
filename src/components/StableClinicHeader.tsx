import React, { memo } from 'react'
import { useStableClinicName, useStableDoctorName, useStableClinicLogo } from '../hooks/useStableSettings'
import { useTheme } from '../contexts/ThemeContext'

interface StableClinicHeaderProps {
  showLogo?: boolean
  showDoctorName?: boolean
  className?: string
}

/**
 * مكون عرض معلومات العيادة مع ضمان الاستقرار أثناء تغيير الثيم
 * يستخدم hooks مخصصة لضمان عدم اختفاء البيانات أثناء التبديل
 */
export const StableClinicHeader = memo(function StableClinicHeader({ 
  showLogo = true, 
  showDoctorName = true, 
  className = '' 
}: StableClinicHeaderProps) {
  const clinicName = useStableClinicName()
  const doctorName = useStableDoctorName()
  const clinicLogo = useStableClinicLogo()
  const { isDarkMode } = useTheme()

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      {/* شعار العيادة */}
      {showLogo && clinicLogo && (
        <div className="flex-shrink-0">
          <img
            src={clinicLogo}
            alt="شعار العيادة"
            className="h-12 w-12 rounded-lg object-cover border-2 border-border shadow-sm"
            onError={(e) => {
              // إخفاء الصورة إذا فشل تحميلها
              e.currentTarget.style.display = 'none'
            }}
          />
        </div>
      )}

      {/* معلومات العيادة */}
      <div className="flex-1 min-w-0">
        <h1 className="text-xl font-bold text-foreground truncate">
          {clinicName}
        </h1>
        {showDoctorName && (
          <p className="text-sm text-muted-foreground truncate">
            {doctorName}
          </p>
        )}
      </div>
    </div>
  )
})

/**
 * مكون مبسط لعرض اسم العيادة فقط
 */
export const StableClinicName = memo(function StableClinicName({ className = '' }: { className?: string }) {
  const clinicName = useStableClinicName()
  
  return (
    <span className={`font-semibold text-foreground ${className}`}>
      {clinicName}
    </span>
  )
})

/**
 * مكون مبسط لعرض اسم الدكتور فقط
 */
export const StableDoctorName = memo(function StableDoctorName({ className = '' }: { className?: string }) {
  const doctorName = useStableDoctorName()
  
  return (
    <span className={`text-muted-foreground ${className}`}>
      {doctorName}
    </span>
  )
})

/**
 * مكون للشعار مع معالجة الأخطاء
 */
export const StableClinicLogo = memo(function StableClinicLogo({ 
  size = 'md',
  className = '' 
}: { 
  size?: 'sm' | 'md' | 'lg'
  className?: string 
}) {
  const clinicLogo = useStableClinicLogo()
  
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16'
  }

  if (!clinicLogo) {
    return null
  }

  return (
    <img
      src={clinicLogo}
      alt="شعار العيادة"
      className={`${sizeClasses[size]} rounded-lg object-cover border-2 border-border shadow-sm ${className}`}
      onError={(e) => {
        e.currentTarget.style.display = 'none'
      }}
    />
  )
})

export default StableClinicHeader
