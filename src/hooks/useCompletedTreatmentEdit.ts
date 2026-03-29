import { useCallback } from 'react'
import { notify } from '@/services/notificationService'
import { ToothTreatment } from '@/types'

interface UseCompletedTreatmentEditProps {
  currentUser?: string
}

export const useCompletedTreatmentEdit = ({ currentUser = 'Current User' }: UseCompletedTreatmentEditProps = {}) => {
  // تحديث العلاج المكتمل مع تسجيل التدقيق
  const updateCompletedTreatment = useCallback(
    async (
      treatmentId: string,
      updates: Partial<ToothTreatment>,
      editReason: string,
      editReasonOther: string
    ) => {
      try {
        const result = await (window as any).electron?.ipcRenderer?.invoke(
          'db:treatmentEditAudit:updateCompleted',
          treatmentId,
          updates,
          editReason,
          editReasonOther,
          currentUser
        )

        if (result?.success) {
          notify.success('تم تحديث العلاج بنجاح مع تسجيل كامل في سجل التدقيق')
          return { success: true, auditId: result.auditId }
        } else {
          notify.error(result?.error || 'فشل تحديث العلاج')
          return { success: false, error: result?.error }
        }
      } catch (error) {
        console.error('Error updating treatment:', error)
        notify.error('حدث خطأ أثناء تحديث العلاج')
        return { success: false, error }
      }
    },
    [currentUser]
  )

  return {
    updateCompletedTreatment,
  }
}
