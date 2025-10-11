import { useEffect, useState, useCallback } from 'react'
import { updateCustomTreatmentCache, reloadCustomTreatments } from '@/utils/arabicTranslations'

/**
 * Hook لإدارة أسماء العلاجات المخصصة
 */
export const useTreatmentNames = () => {
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // تحميل العلاجات المخصصة عند تحميل المكون
    const loadTreatments = async () => {
      setIsLoading(true)
      try {
        await reloadCustomTreatments()
      } finally {
        setIsLoading(false)
      }
    }

    loadTreatments()
  }, [])

  // دالة لتحديث اسم علاج مخصص في الكاش
  const updateTreatmentName = useCallback((treatmentId: string, treatmentName: string) => {
    updateCustomTreatmentCache(treatmentId, treatmentName)
  }, [])

  // دالة لإعادة تحميل جميع العلاجات المخصصة
  const refreshTreatmentNames = useCallback(async () => {
    setIsLoading(true)
    try {
      await reloadCustomTreatments()
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    updateTreatmentName,
    refreshTreatmentNames,
    isLoading
  }
}
