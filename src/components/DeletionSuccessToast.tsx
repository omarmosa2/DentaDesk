import React from 'react'
import { CheckCircle, Trash2, Calendar, CreditCard, Image, Package } from 'lucide-react'
import { Toast, ToastAction, ToastDescription, ToastTitle } from '@/components/ui/toast'

interface DeletionSuccessToastProps {
  patientName: string
  deletedCounts?: {
    appointments: number
    payments: number
    patient_images: number
    inventory_usage: number
    installment_payments: number
  }
  onViewDetails?: () => void
}

export default function DeletionSuccessToast({
  patientName,
  deletedCounts,
  onViewDetails
}: DeletionSuccessToastProps) {
  const totalItems = deletedCounts 
    ? deletedCounts.appointments + deletedCounts.payments + deletedCounts.patient_images + deletedCounts.inventory_usage + deletedCounts.installment_payments
    : 0

  return (
    <Toast className="border-green-200 bg-green-50">
      <div className="flex items-start space-x-3 space-x-reverse">
        <CheckCircle className="w-6 h-6 text-green-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <ToastTitle className="text-green-800 font-semibold">
            تم حذف المريض بنجاح
          </ToastTitle>
          <ToastDescription className="text-green-700 mt-1">
            <div className="space-y-2">
              <p>تم حذف المريض "{patientName}" وجميع بياناته المرتبطة</p>
              
              {deletedCounts && totalItems > 0 && (
                <div className="bg-green-100 rounded-lg p-3 mt-2">
                  <p className="text-sm font-medium text-green-800 mb-2">البيانات المحذوفة:</p>
                  <div className="grid grid-cols-2 gap-2 text-sm text-green-700">
                    {deletedCounts.appointments > 0 && (
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <Calendar className="w-4 h-4" />
                        <span>{deletedCounts.appointments} موعد</span>
                      </div>
                    )}
                    {deletedCounts.payments > 0 && (
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <CreditCard className="w-4 h-4" />
                        <span>{deletedCounts.payments} دفعة</span>
                      </div>
                    )}
                    {deletedCounts.patient_images > 0 && (
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <Image className="w-4 h-4" />
                        <span>{deletedCounts.patient_images} صورة</span>
                      </div>
                    )}
                    {deletedCounts.inventory_usage > 0 && (
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <Package className="w-4 h-4" />
                        <span>{deletedCounts.inventory_usage} استخدام مخزون</span>
                      </div>
                    )}
                    {deletedCounts.installment_payments > 0 && (
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <CreditCard className="w-4 h-4" />
                        <span>{deletedCounts.installment_payments} قسط</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-2 pt-2 border-t border-green-200">
                    <p className="text-sm font-medium text-green-800">
                      إجمالي العناصر المحذوفة: {totalItems + 1} عنصر
                    </p>
                  </div>
                </div>
              )}
              
              <div className="flex items-center space-x-2 space-x-reverse text-sm text-green-600 mt-2">
                <CheckCircle className="w-4 h-4" />
                <span>تم تحديث جميع الشاشات تلقائياً</span>
              </div>
            </div>
          </ToastDescription>
        </div>
      </div>
      
      {onViewDetails && (
        <ToastAction 
          altText="عرض التفاصيل"
          onClick={onViewDetails}
          className="text-green-700 hover:text-green-800"
        >
          عرض التفاصيل
        </ToastAction>
      )}
    </Toast>
  )
}

// Hook for showing deletion success toast
export const useDeletionSuccessToast = () => {
  const showDeletionSuccess = (
    patientName: string,
    deletedCounts?: {
      appointments: number
      payments: number
      patient_images: number
      inventory_usage: number
      installment_payments: number
    }
  ) => {
    // This would integrate with your toast system
    // For now, we'll use a simple notification
    const totalItems = deletedCounts 
      ? deletedCounts.appointments + deletedCounts.payments + deletedCounts.patient_images + deletedCounts.inventory_usage + deletedCounts.installment_payments
      : 0

    const message = `تم حذف المريض "${patientName}" بنجاح${totalItems > 0 ? ` مع ${totalItems} عنصر مرتبط` : ''}`
    
    // You can replace this with your actual toast implementation
    console.log('🎉 Deletion Success:', message)
    
    return message
  }

  return { showDeletionSuccess }
}
