import React, { memo, useCallback } from 'react'
import DynamicTabsCarousel from './DynamicTabsCarousel'

interface NewDashboardLayoutProps {
  onNavigateToPatients?: () => void
  onNavigateToAppointments?: () => void
  onNavigateToPayments?: () => void
  onNavigateToTreatments?: () => void
  onAddPatient?: () => void
  onAddAppointment?: () => void
  onAddPayment?: () => void
}

const NewDashboardLayout = memo(function NewDashboardLayout({
  onNavigateToPatients,
  onNavigateToAppointments,
  onNavigateToPayments,
  onNavigateToTreatments,
  onAddPatient,
  onAddAppointment,
  onAddPayment
}: NewDashboardLayoutProps) {

  const handleSearchResultSelect = useCallback((result: any) => {
    const storeData = (key: string, value: any) =>
      localStorage.setItem(key, JSON.stringify({ ...value, openDetailsModal: true }))

    switch (result.type) {
      case 'patient':
        storeData('selectedPatientForDetails', { patient: result.data })
        onNavigateToPatients?.()
        break
      case 'appointment':
        storeData('selectedAppointmentForDetails', { appointment: result.data })
        onNavigateToAppointments?.()
        break
      case 'payment':
        storeData('selectedPaymentForDetails', { payment: result.data })
        onNavigateToPayments?.()
        break
      case 'treatment':
        storeData('selectedTreatmentForDetails', {
          treatment: result.data,
          patientId: result.relatedData?.patientId
        })
        onNavigateToTreatments?.()
        break
      case 'prescription':
        storeData('selectedPrescriptionForDetails', { prescription: result.data })
        onNavigateToTreatments?.()
        break
      default:
        break
    }
  }, [])

  return (
    <div dir="rtl" className="min-h-screen">
      <main className="max-w-[1400px] mx-auto p-6 md:p-8 lg:p-10">
        <DynamicTabsCarousel
          onNavigateToPatients={onNavigateToPatients}
          onNavigateToAppointments={onNavigateToAppointments}
          onNavigateToPayments={onNavigateToPayments}
          onNavigateToTreatments={onNavigateToTreatments}
          onAddPatient={onAddPatient}
          onAddAppointment={onAddAppointment}
          onAddPayment={onAddPayment}
        />
      </main>
    </div>
  )
})

export default NewDashboardLayout
