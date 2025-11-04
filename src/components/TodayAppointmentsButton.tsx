import React from 'react'
import { CalendarDays } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

// Types
import type { Appointment } from '@/types'

// Extend window type (Electron preload exposes electronAPI)
declare global {
	interface Window {
		electronAPI: any
	}
}

// Helper: format time like 10:30 صباحًا / 07:15 مساءً using English numerals
function formatArabicAmPmTime(dateInput: string | Date): string {
	const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
	if (isNaN(date.getTime())) return '--'
	// Base in en-US to keep Western numerals, then replace AM/PM with Arabic
	const base = date.toLocaleTimeString('en-US', {
		hour: '2-digit',
		minute: '2-digit',
		hour12: true
	})
	return base.replace('AM', 'صباحًا').replace('PM', 'مساءً')
}

// Helper: Arabic label and color for status
function getStatusMeta(status: Appointment['status']): { label: string; className: string } {
	switch (status) {
		case 'scheduled':
			return { label: 'قادم', className: 'text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800' }
		case 'completed':
			return { label: 'منتهٍ', className: 'text-gray-600 bg-gray-100 dark:text-gray-300 dark:bg-gray-800 border-gray-200 dark:border-gray-700' }
		case 'cancelled':
			return { label: 'ملغى', className: 'text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900/30 border-red-200 dark:border-red-800' }
		case 'no_show':
		default:
			return { label: 'لم يحضر', className: 'text-gray-600 bg-gray-100 dark:text-gray-300 dark:bg-gray-800 border-gray-200 dark:border-gray-700' }
	}
}

// Component: Floating button that opens a dialog showing today’s appointments
const TodayAppointmentsButton: React.FC = () => {
	const [open, setOpen] = React.useState(false)
	const [loading, setLoading] = React.useState(false)
	const [appointments, setAppointments] = React.useState<Appointment[]>([])

	// Load appointments on dialog open
	React.useEffect(() => {
		let isMounted = true
		async function load() {
			if (!open) return
			setLoading(true)
			try {
				const all: Appointment[] = await window.electronAPI?.appointments?.getAll?.() || []
				// Filter only today by comparing toDateString of start_time
				const todayStr = new Date().toDateString()
				const todays = all.filter((apt) => new Date(apt.start_time).toDateString() === todayStr)
				if (isMounted) setAppointments(todays)
			} catch (err) {
				console.error('Failed to load appointments:', err)
				if (isMounted) setAppointments([])
			} finally {
				if (isMounted) setLoading(false)
			}
		}
		load()
		return () => { isMounted = false }
	}, [open])

	// Render a single appointment card
	const renderAppointment = (apt: Appointment) => {
		const patientName = apt.patient?.full_name || (apt as any).patient_name || 'مريض غير معروف'
		const doctorName = apt.doctor?.name || (apt as any).doctor_name || 'غير محدد'
		const specialty = apt.doctor?.specialty || apt.doctor_specialty
		const timeLabel = formatArabicAmPmTime(apt.start_time)
		const statusMeta = getStatusMeta(apt.status)

		return (
			<Card key={apt.id} className="border rounded-xl">
				<CardHeader className="pb-2" dir="rtl">
					<CardTitle className="text-base arabic-enhanced flex items-center justify-between">
						<span className="truncate">🧍‍♂️ {patientName}</span>
						<span className={cn('text-xs rounded-full px-2 py-0.5 border', statusMeta.className)}>{statusMeta.label}</span>
					</CardTitle>
					<CardDescription className="text-xs flex items-center gap-3 flex-wrap">
						<span className="whitespace-nowrap">👨‍⚕️ {doctorName}</span>
						<span className="whitespace-nowrap">⏰ {timeLabel}</span>
						{specialty ? (<span className="whitespace-nowrap">🩺 {specialty}</span>) : null}
					</CardDescription>
				</CardHeader>
				<CardContent className="pt-0" />
			</Card>
		)
	}

	return (
		<>
			{/* Floating action button with tooltip */}
			<TooltipProvider>
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							onClick={() => setOpen(true)}
							variant="default"
							size="icon"
							className="fixed bottom-6 left-6 z-50 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow"
							aria-label="مواعيد اليوم"
						>
							<CalendarDays className="h-6 w-6" />
						</Button>
					</TooltipTrigger>
					<TooltipContent side="top" className="arabic-enhanced">مواعيد اليوم</TooltipContent>
				</Tooltip>
			</TooltipProvider>

			{/* Dialog: Today’s appointments */}
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="sm:max-w-lg" dir="rtl">
					<DialogHeader>
						<DialogTitle className="arabic-enhanced">📅 مواعيد اليوم</DialogTitle>
					</DialogHeader>

					<div className="space-y-3 max-h-[60vh] overflow-auto pr-1">
						{loading && (
							<div className="text-center text-muted-foreground py-8 arabic-enhanced">جاري التحميل...</div>
						)}

						{!loading && appointments.length === 0 && (
							<div className="flex items-center justify-center py-10 text-muted-foreground arabic-enhanced">
								لا توجد مواعيد لهذا اليوم 🙌
							</div>
						)}

						{!loading && appointments.length > 0 && appointments
							.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
							.map(renderAppointment)}
					</div>

					<DialogFooter>
						<Button variant="outline" onClick={() => setOpen(false)} className="arabic-enhanced">
							إغلاق
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	)
}

export default TodayAppointmentsButton
