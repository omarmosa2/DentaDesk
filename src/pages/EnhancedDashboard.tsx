import React from 'react'
import NewDashboardLayout from '@/components/dashboard/NewDashboardLayout'

interface EnhancedDashboardProps {
  onNavigateToPatients?: () => void
  onNavigateToAppointments?: () => void
  onNavigateToPayments?: () => void
  onNavigateToTreatments?: () => void
  onAddPatient?: () => void
  onAddAppointment?: () => void
  onAddPayment?: () => void
}

export default function EnhancedDashboard({
  onNavigateToPatients,
  onNavigateToAppointments,
  onNavigateToPayments,
  onNavigateToTreatments,
  onAddPatient,
  onAddAppointment,
  onAddPayment
}: EnhancedDashboardProps) {
  return (
    <NewDashboardLayout
      onNavigateToPatients={onNavigateToPatients}
      onNavigateToAppointments={onNavigateToAppointments}
      onNavigateToPayments={onNavigateToPayments}
      onNavigateToTreatments={onNavigateToTreatments}
      onAddPatient={onAddPatient}
      onAddAppointment={onAddAppointment}
      onAddPayment={onAddPayment}
      onOpenSettings={() => window.location.hash = '#settings'}
    />
  )
}
