import React, { memo, useMemo, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  UserPlus,
  Calendar,
  CreditCard,
  Plus,
  X
} from 'lucide-react'

interface FloatingQuickActionsProps {
  onAddPatient?: () => void
  onAddAppointment?: () => void
  onAddPayment?: () => void
}

const FloatingQuickActions = memo(function FloatingQuickActions({
  onAddPatient,
  onAddAppointment,
  onAddPayment
}: FloatingQuickActionsProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const actions = useMemo(() => [
    {
      label: 'إضافة مريض',
      icon: UserPlus,
      color: 'bg-primary hover:bg-primary/90',
      onClick: onAddPatient
    },
    {
      label: 'حجز موعد',
      icon: Calendar,
      color: 'bg-medical hover:bg-medical/90',
      onClick: onAddAppointment
    },
    {
      label: 'تسجيل دفعة',
      icon: CreditCard,
      color: 'bg-accent hover:bg-accent/90',
      onClick: onAddPayment
    }
  ], [onAddPatient, onAddAppointment, onAddPayment])

  const toggleExpanded = () => setIsExpanded(!isExpanded)

  // Enhanced Keyboard handling
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isExpanded) {
        setIsExpanded(false)
      } else if (event.key === 'Enter' && !isExpanded) {
        setIsExpanded(true)
      } else if (event.key === ' ' && !isExpanded) {
        event.preventDefault()
        setIsExpanded(true)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isExpanded])

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (isExpanded && !target.closest('.floating-actions')) {
        setIsExpanded(false)
      }
    }

    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isExpanded])

  return (
    <div className="floating-actions fixed bottom-5 right-4 sm:bottom-6 sm:right-5 md:bottom-8 md:right-6 lg:bottom-8 lg:right-8 z-50 performance-optimized gpu-accelerated touch-optimized responsive-container" dir="rtl" style={{
      contain: 'layout style paint',
      willChange: 'auto',
      touchAction: 'manipulation'
    }}>
      {/* FAB Menu */}
      <div className={`flex flex-col-reverse items-end gap-2 sm:gap-3 mb-3 sm:mb-4 transition-all duration-300 ease-out will-change-transform ${isExpanded ? 'opacity-100 visible transform translate-y-0 scale-100' : 'opacity-0 invisible transform translate-y-2 scale-95'}`}>
        {actions.map((action, index) => {
          const Icon = action.icon
          return (
            <Button
              key={index}
              onClick={() => {
                action.onClick?.()
                setIsExpanded(false)
              }}
              className={`btn-interactive flex items-center gap-2 px-3 py-3 sm:px-4 rounded-full font-medium ${action.color} text-white min-h-[44px] sm:min-h-[48px] w-[44px] sm:w-[48px] justify-center shadow-lg hover:shadow-xl focus:ring-2 focus:ring-white/20 focus:ring-offset-2`}
              aria-label={action.label}
            >
              <Icon className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
            </Button>
          )
        })}
      </div>

      {/* Main FAB Button */}
      <Button
        onClick={toggleExpanded}
        className="fab-interactive w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-primary hover:bg-primary/90 shadow-lg flex items-center justify-center"
        aria-label={isExpanded ? 'إغلاق الإجراءات السريعة' : 'فتح الإجراءات السريعة'}
      >
        {isExpanded ? <X className="w-5 h-5 sm:w-6 sm:h-6 text-white" /> : <Plus className="w-5 h-5 sm:w-6 sm:h-6 text-white" />}
      </Button>
    </div>
  )
})

export default FloatingQuickActions