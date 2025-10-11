import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { usePrescriptionStore } from '@/store/prescriptionStore'
import { useMedicationStore } from '@/store/medicationStore'
import { usePatientStore } from '@/store/patientStore'
import { useAppointmentStore } from '@/store/appointmentStore'
import { notify } from '@/services/notificationService'
import { FileText, Save, X, Plus, Trash2, User, Calendar, Pill } from 'lucide-react'
import type { Prescription, Medication, Patient, Appointment } from '@/types'

interface AddPrescriptionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingPrescription?: Prescription | null
  preSelectedPatientId?: string
}

interface PrescriptionMedication {
  medication_id: string
  dose: string
  medication_name?: string
}

export default function AddPrescriptionDialog({
  open,
  onOpenChange,
  editingPrescription,
  preSelectedPatientId
}: AddPrescriptionDialogProps) {
  const { createPrescription, updatePrescription, isLoading } = usePrescriptionStore()
  const { medications, loadMedications } = useMedicationStore()
  const { patients, loadPatients } = usePatientStore()
  const { appointments, loadAppointments } = useAppointmentStore()

  // Form state
  const [formData, setFormData] = useState({
    patient_id: '',
    appointment_id: '',
    prescription_date: new Date().toISOString().split('T')[0],
    notes: ''
  })

  const [prescriptionMedications, setPrescriptionMedications] = useState<PrescriptionMedication[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Load data when dialog opens
  useEffect(() => {
    if (open) {
      loadMedications()
      loadPatients()
      loadAppointments()
    }
  }, [open, loadMedications, loadPatients, loadAppointments])

  // Reset form when dialog opens/closes or editing prescription changes
  useEffect(() => {
    if (open) {
      if (editingPrescription && editingPrescription.id) {
        setFormData({
          patient_id: editingPrescription.patient_id || '',
          appointment_id: editingPrescription.appointment_id || '',
          prescription_date: editingPrescription.prescription_date || new Date().toISOString().split('T')[0],
          notes: editingPrescription.notes || ''
        })

        // Set medications
        const meds = editingPrescription.medications?.map(med => ({
          medication_id: med.medication_id,
          dose: med.dose || '',
          medication_name: med.medication_name
        })) || []
        setPrescriptionMedications(meds)
      } else {
        setFormData({
          patient_id: preSelectedPatientId || '',
          appointment_id: '',
          prescription_date: new Date().toISOString().split('T')[0],
          notes: ''
        })
        setPrescriptionMedications([])
      }
      setErrors({})
    }
  }, [open, editingPrescription])

  // Filter appointments by selected patient
  const filteredAppointments = appointments.filter(
    appointment => appointment.patient_id === formData.patient_id
  )

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.patient_id) {
      newErrors.patient_id = 'يجب اختيار مريض'
    }

    if (!formData.prescription_date) {
      newErrors.prescription_date = 'تاريخ الوصفة مطلوب'
    }

    if (prescriptionMedications.length === 0) {
      newErrors.medications = 'يجب إضافة دواء واحد على الأقل'
    }

    // Validate each medication
    prescriptionMedications.forEach((med, index) => {
      if (!med.medication_id) {
        newErrors[`medication_${index}`] = 'يجب اختيار دواء'
      }
      if (!med.dose.trim()) {
        newErrors[`dose_${index}`] = 'الجرعة مطلوبة'
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    try {
      const prescriptionData = {
        patient_id: formData.patient_id,
        appointment_id: formData.appointment_id || undefined,
        prescription_date: formData.prescription_date,
        notes: formData.notes.trim() || undefined,
        medications: prescriptionMedications.map(med => ({
          medication_id: med.medication_id,
          dose: med.dose.trim()
        }))
      }

      if (editingPrescription && editingPrescription.id) {
        await updatePrescription(editingPrescription.id, prescriptionData)
        notify.success('تم تحديث الوصفة الطبية بنجاح')
      } else {
        await createPrescription(prescriptionData)
        notify.success('تم إنشاء الوصفة الطبية بنجاح')
      }

      onOpenChange(false)
    } catch (error) {
      console.error('Error saving prescription:', error)
      notify.error(editingPrescription && editingPrescription.id ? 'فشل في تحديث الوصفة الطبية' : 'فشل في إنشاء الوصفة الطبية')
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))

    // Clear appointment when patient changes
    if (field === 'patient_id') {
      setFormData(prev => ({ ...prev, appointment_id: '' }))
    }

    // Clear error when user makes changes
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const addMedication = () => {
    setPrescriptionMedications(prev => [
      ...prev,
      { medication_id: '', dose: '' }
    ])
  }

  const removeMedication = (index: number) => {
    setPrescriptionMedications(prev => prev.filter((_, i) => i !== index))
  }

  const updateMedication = (index: number, field: keyof PrescriptionMedication, value: string) => {
    setPrescriptionMedications(prev => prev.map((med, i) => {
      if (i === index) {
        const updated = { ...med, [field]: value }

        // Update medication name when medication_id changes
        if (field === 'medication_id') {
          const medication = medications.find(m => m.id === value)
          updated.medication_name = medication?.name
        }

        return updated
      }
      return med
    }))

    // Clear errors for this medication
    const errorKeys = [`medication_${index}`, `dose_${index}`]
    setErrors(prev => {
      const newErrors = { ...prev }
      errorKeys.forEach(key => delete newErrors[key])
      return newErrors
    })
  }

  const handleClose = () => {
    if (!isLoading) {
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-right">
            <FileText className="w-5 h-5 text-green-600" />
            {editingPrescription && editingPrescription.id ? 'تعديل الوصفة الطبية' : 'إنشاء وصفة طبية جديدة'}
          </DialogTitle>
          <DialogDescription className="text-right">
            {editingPrescription && editingPrescription.id
              ? 'قم بتعديل معلومات الوصفة الطبية أدناه'
              : 'أدخل معلومات الوصفة الطبية الجديدة أدناه'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Patient Selection */}
            <div className="space-y-2">
              <Label htmlFor="patient_id" className="text-right block">
                المريض <span className="text-red-500">*</span>
              </Label>
              <Select value={formData.patient_id} onValueChange={(value) => handleInputChange('patient_id', value)}>
                <SelectTrigger className={`text-right bg-background border-input text-foreground ${errors.patient_id ? 'border-red-500' : ''}`} dir="rtl">
                  <SelectValue placeholder="اختر مريض" className="text-muted-foreground" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id}>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        {patient.full_name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.patient_id && (
                <p className="text-sm text-red-500 text-right">{errors.patient_id}</p>
              )}
            </div>

            {/* Appointment Selection */}
            <div className="space-y-2">
              <Label htmlFor="appointment_id" className="text-right block">
                الموعد (اختياري)
              </Label>
              <Select
                value={formData.appointment_id}
                onValueChange={(value) => handleInputChange('appointment_id', value)}
                disabled={!formData.patient_id}
              >
                <SelectTrigger className="text-right bg-background border-input text-foreground" dir="rtl">
                  <SelectValue placeholder={formData.patient_id ? "اختر موعد" : "اختر مريض أولاً"} className="text-muted-foreground" />
                </SelectTrigger>
                <SelectContent>
                  {filteredAppointments.map((appointment) => (
                    <SelectItem key={appointment.id} value={appointment.id}>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {appointment.title}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Prescription Date */}
          <div className="space-y-2">
            <Label htmlFor="prescription_date" className="text-right block">
              تاريخ الوصفة <span className="text-red-500">*</span>
            </Label>
            <Input
              id="prescription_date"
              type="date"
              value={formData.prescription_date}
              onChange={(e) => handleInputChange('prescription_date', e.target.value)}
              className={`text-right ${errors.prescription_date ? 'border-red-500' : ''}`}
              dir="rtl"
              disabled={isLoading}
            />
            {errors.prescription_date && (
              <p className="text-sm text-red-500 text-right">{errors.prescription_date}</p>
            )}
          </div>

          {/* Medications Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-right text-lg font-medium">
                الأدوية <span className="text-red-500">*</span>
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addMedication}
                disabled={isLoading}
              >
                <Plus className="w-4 h-4 ml-2" />
                إضافة دواء
              </Button>
            </div>

            {errors.medications && (
              <p className="text-sm text-red-500 text-right">{errors.medications}</p>
            )}

            <div className="space-y-3 max-h-60 overflow-y-auto">
              {prescriptionMedications.map((med, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">دواء {index + 1}</span>
                    {prescriptionMedications.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMedication(index)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Medication Selection */}
                    <div className="space-y-2">
                      <Label className="text-right block text-sm">
                        اسم الدواء <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={med.medication_id}
                        onValueChange={(value) => updateMedication(index, 'medication_id', value)}
                      >
                        <SelectTrigger className={`text-right bg-background border-input text-foreground ${errors[`medication_${index}`] ? 'border-red-500' : ''}`} dir="rtl">
                          <SelectValue placeholder="اختر دواء" className="text-muted-foreground" />
                        </SelectTrigger>
                        <SelectContent>
                          {medications.map((medication) => (
                            <SelectItem key={medication.id} value={medication.id}>
                              <div className="flex items-center gap-2">
                                <Pill className="w-4 h-4" />
                                {medication.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors[`medication_${index}`] && (
                        <p className="text-sm text-red-500 text-right">{errors[`medication_${index}`]}</p>
                      )}
                    </div>

                    {/* Dose */}
                    <div className="space-y-2">
                      <Label className="text-right block text-sm">
                        الجرعة <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        value={med.dose}
                        onChange={(e) => updateMedication(index, 'dose', e.target.value)}
                        placeholder="مثال: قرص واحد كل 8 ساعات"
                        className={`text-right ${errors[`dose_${index}`] ? 'border-red-500' : ''}`}
                        dir="rtl"
                        disabled={isLoading}
                      />
                      {errors[`dose_${index}`] && (
                        <p className="text-sm text-red-500 text-right">{errors[`dose_${index}`]}</p>
                      )}
                    </div>
                  </div>

                  {/* Show medication instructions if available */}
                  {med.medication_id && (
                    (() => {
                      const medication = medications.find(m => m.id === med.medication_id)
                      return medication?.instructions ? (
                        <div className="bg-blue-50 p-2 rounded text-sm">
                          <span className="font-medium text-blue-800">تعليمات الدواء: </span>
                          <span className="text-blue-700">{medication.instructions}</span>
                        </div>
                      ) : null
                    })()
                  )}
                </div>
              ))}

              {prescriptionMedications.length === 0 && (
                <div className="text-center py-8 border-2 border-dashed border-muted-foreground/25 rounded-lg">
                  <Pill className="w-12 h-12 mx-auto mb-2 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">لم يتم إضافة أي أدوية بعد</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addMedication}
                    className="mt-2"
                  >
                    <Plus className="w-4 h-4 ml-2" />
                    إضافة دواء
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-right block">
              ملاحظات إضافية
            </Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="أدخل أي ملاحظات إضافية للوصفة الطبية (اختياري)"
              className="text-right min-h-[80px]"
              dir="rtl"
              disabled={isLoading}
            />
          </div>

          <DialogFooter className="flex justify-end space-x-2 space-x-reverse">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              <X className="w-4 h-4 ml-2" />
              إلغاء
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                  جاري الحفظ...
                </div>
              ) : (
                <>
                  <Save className="w-4 h-4 ml-2" />
                  {editingPrescription ? 'تحديث الوصفة' : 'إنشاء الوصفة'}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
