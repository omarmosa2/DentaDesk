import React, { useState, useRef, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useSettingsStore } from '@/store/settingsStore'
import { useStableClinicName, useStableDoctorName, useStableClinicLogo, useStableContactInfo } from '@/hooks/useStableSettings'
import { formatDate } from '@/lib/utils'
import { notify } from '@/services/notificationService'
import QRCode from 'qrcode'
import JsBarcode from 'jsbarcode'
import {
  Printer,
  Download,
  FileText,
  Settings,
  Eye,
  X,
  User,
  Calendar,
  Pill,
  Stethoscope
} from 'lucide-react'
import type { Prescription } from '@/types'

interface PrescriptionReceiptDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  prescription: Prescription
}

export default function PrescriptionReceiptDialog({
  open,
  onOpenChange,
  prescription
}: PrescriptionReceiptDialogProps) {
  const { settings, loadSettings } = useSettingsStore()
  const clinicName = useStableClinicName()
  const doctorName = useStableDoctorName()
  const clinicLogo = useStableClinicLogo()
  const { phone, email, address } = useStableContactInfo()
  const receiptRef = useRef<HTMLDivElement>(null)

  // Load settings when component mounts or dialog opens
  useEffect(() => {
    if (open && !settings) {
      loadSettings()
    }
  }, [open, settings, loadSettings])



  // Print settings state
  const [printSettings, setPrintSettings] = useState({
    printerType: '80mm', // 58mm, 80mm, a4
    includeQR: true,
    includeBarcode: true,
    includeLogo: true,
    colorMode: 'color', // color, bw
    qrType: 'text' // text, url
  })

  const [showPreview, setShowPreview] = useState(true)
  const [qrCodeDataURL, setQrCodeDataURL] = useState<string>('')
  const [barcodeDataURL, setBarcodeDataURL] = useState<string>('')

  // Generate QR Code data - Human readable format
  const generateQRData = () => {
    const prescriptionNumber = `PRX-${prescription.id.slice(-6)}`
    const patientName = prescription.patient?.full_name || 'غير محدد'
    const formattedDate = formatDate(prescription.prescription_date)
    const medicationsCount = prescription.medications?.length || 0

    return `🏥 ${clinicName}
${doctorName ? `👨‍⚕️ د. ${doctorName}` : ''}
📋 وصفة طبية رقم: ${prescriptionNumber}
👤 المريض: ${patientName}
📅 التاريخ: ${formattedDate}
💊 عدد الأدوية: ${medicationsCount}
${prescription.medications?.map((med, index) =>
  `${index + 1}. ${med.medication_name} - ${med.dose}`
).join('\n') || ''}
${prescription.notes ? `📝 ملاحظات: ${prescription.notes}` : ''}

شكراً لثقتكم بنا 🙏`
  }

  // Generate QR Code
  const generateQR = async () => {
    try {
      const qrData = generateQRData()
      const qrCodeURL = await QRCode.toDataURL(qrData, {
        width: 150,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })
      setQrCodeDataURL(qrCodeURL)
    } catch (error) {
      console.error('Error generating QR code:', error)
    }
  }

  // Generate Barcode
  const generateBarcodeSVG = () => {
    try {
      const canvas = document.createElement('canvas')
      const barcodeData = generateBarcode()

      JsBarcode(canvas, barcodeData, {
        format: 'CODE128',
        width: 2,
        height: 40,
        displayValue: false,
        margin: 0
      })

      setBarcodeDataURL(canvas.toDataURL())
    } catch (error) {
      console.error('Error generating barcode:', error)
    }
  }

  // Generate QR and Barcode when dialog opens
  useEffect(() => {
    if (open) {
      if (printSettings.includeQR) {
        generateQR()
      }
      if (printSettings.includeBarcode) {
        generateBarcodeSVG()
      }
    }
  }, [open, printSettings.includeQR, printSettings.includeBarcode, prescription, settings])

  // Generate unique barcode
  const generateBarcode = () => {
    const timestamp = new Date(prescription.prescription_date).getTime().toString().slice(-8)
    const patientId = prescription.patient_id.slice(-4)
    const medicationsCount = (prescription.medications?.length || 0).toString().padStart(2, '0')
    return `PRX${timestamp}${patientId}${medicationsCount}`
  }

  const handleThermalPrint = () => {
    if (receiptRef.current) {
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>وصفة طبية - ${prescription.id.slice(-6)}</title>
              <style>
                @page {
                  size: 80mm auto;
                  margin: 0;
                }
                body {
                  font-family: 'Arial', 'Tahoma', sans-serif;
                  direction: rtl;
                  margin: 0;
                  padding: 2mm;
                  font-size: 11px;
                  line-height: 1.3;
                  color: #000;
                  background: white;
                  width: 76mm;
                }
                .receipt {
                  width: 100%;
                  font-size: 11px;
                }
                .header {
                  text-align: center;
                  margin-bottom: 6px;
                  border-bottom: 2px solid #000;
                  padding-bottom: 4px;
                }
                .clinic-logo {
                  width: 40px;
                  height: 40px;
                  margin: 0 auto 3px;
                  border-radius: 50%;
                  overflow: hidden;
                  border: 1px solid #000;
                  flex-shrink: 0;
                }
                .clinic-logo img {
                  width: 100%;
                  height: 100%;
                  object-fit: cover;
                  border-radius: 50%;
                  max-width: 40px;
                  max-height: 40px;
                }
                .clinic-name {
                  font-size: 14px;
                  font-weight: bold;
                  margin-bottom: 2px;
                }
                .doctor-name {
                  font-size: 11px;
                  font-weight: bold;
                  margin-bottom: 1px;
                }
                .prescription-title {
                  font-size: 12px;
                  font-weight: bold;
                  margin: 4px 0;
                  text-decoration: underline;
                }
                .section {
                  margin: 4px 0;
                  padding: 2px 0;
                }
                .patient-info {
                  border: 1px solid #000;
                  padding: 3px;
                  margin: 4px 0;
                }
                .medications-list {
                  border: 1px solid #000;
                  padding: 3px;
                  margin: 4px 0;
                }
                .medication-item {
                  margin: 2px 0;
                  padding: 2px 0;
                  border-bottom: 1px dotted #666;
                }
                .medication-item:last-child {
                  border-bottom: none;
                }
                .medication-name {
                  font-weight: bold;
                  font-size: 11px;
                }
                .medication-dose {
                  font-size: 10px;
                  color: #333;
                  margin-top: 1px;
                }
                .separator {
                  text-align: center;
                  margin: 4px 0;
                  font-size: 10px;
                }
                .footer {
                  text-align: center;
                  margin-top: 6px;
                  padding-top: 4px;
                  border-top: 1px solid #000;
                  font-size: 9px;
                }
                .bottom-section {
                  display: flex;
                  justify-content: space-between;
                  align-items: flex-start;
                  margin: 6px 0;
                  gap: 8px;
                  flex-wrap: wrap;
                }
                .qr-section, .barcode-section {
                  text-align: center;
                  margin: 4px 0;
                  flex: 1;
                  min-width: 60px;
                }
                .signature-section {
                  flex: 1;
                  min-width: 80px;
                  text-align: center;
                }
                .signature-line {
                  width: 60px;
                  height: 1px;
                  border-bottom: 1px solid #000;
                  margin: 0 auto 2px;
                }
                .signature-label {
                  font-size: 7px;
                  margin-bottom: 3px;
                }
                .stamp-area {
                  width: 45px;
                  height: 35px;
                  border: 1px dashed #000;
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  margin: 0 auto;
                  background: rgba(0,0,0,0.02);
                }
                .stamp-placeholder {
                  font-size: 6px;
                  text-align: center;
                  line-height: 1.1;
                }
                .notes {
                  border: 1px solid #000;
                  padding: 3px;
                  margin: 4px 0;
                  font-style: italic;
                }
              </style>
            </head>
            <body>
              ${receiptRef.current.innerHTML}
            </body>
          </html>
        `)
        printWindow.document.close()
        printWindow.print()
      }
    }
  }

  const handlePrint = () => {
    if (receiptRef.current) {
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        const isColorMode = printSettings.colorMode === 'color'
        const printerWidth = printSettings.printerType === 'a4' ? '210mm' : printSettings.printerType

        printWindow.document.write(`
          <html>
            <head>
              <title>وصفة طبية - ${prescription.id.slice(-6)}</title>
              <style>
                body {
                  font-family: 'Arial', 'Tahoma', sans-serif;
                  direction: rtl;
                  margin: 0;
                  padding: 0;
                  font-size: ${printSettings.printerType === 'a4' ? '14px' : '12px'};
                  line-height: 1.4;
                  color: #000;
                  background: white;
                }

                .receipt {
                  width: ${printerWidth === 'a4' ? '100%' : printerWidth};
                  max-width: ${printerWidth === 'a4' ? '210mm' : printerWidth};
                  margin: 0 auto;
                  background: white;
                  font-size: ${printSettings.printerType === 'a4' ? '12px' : '11px'};
                  padding: ${printSettings.printerType === 'a4' ? '20px' : '0'};
                }

                .header {
                  text-align: center;
                  margin-bottom: 15px;
                  border-bottom: 2px solid #000;
                  padding-bottom: 10px;
                }

                .clinic-logo {
                  width: ${printSettings.printerType === 'a4' ? '60px' : '45px'};
                  height: ${printSettings.printerType === 'a4' ? '60px' : '45px'};
                  margin: 0 auto 6px;
                  border-radius: 50%;
                  overflow: hidden;
                  border: 2px solid #e0e0e0;
                  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                  flex-shrink: 0;
                }

                .clinic-logo img {
                  width: 100%;
                  height: 100%;
                  object-fit: cover;
                  border-radius: 50%;
                  max-width: ${printSettings.printerType === 'a4' ? '60px' : '45px'};
                  max-height: ${printSettings.printerType === 'a4' ? '60px' : '45px'};
                }

                .clinic-name {
                  font-size: ${printSettings.printerType === 'a4' ? '18px' : '16px'};
                  font-weight: bold;
                  margin-bottom: 5px;
                  color: ${isColorMode ? '#2563eb' : '#000'};
                }

                .doctor-name {
                  font-size: ${printSettings.printerType === 'a4' ? '14px' : '12px'};
                  font-weight: bold;
                  margin-bottom: 3px;
                  color: ${isColorMode ? '#059669' : '#000'};
                }

                .prescription-title {
                  font-size: ${printSettings.printerType === 'a4' ? '16px' : '14px'};
                  font-weight: bold;
                  margin: 10px 0;
                  text-decoration: underline;
                  color: ${isColorMode ? '#dc2626' : '#000'};
                }

                .section {
                  margin: 10px 0;
                  padding: 5px 0;
                }

                .patient-info {
                  border: 2px solid #000;
                  padding: 10px;
                  margin: 10px 0;
                  background: ${isColorMode ? '#f8fafc' : 'white'};
                }

                .medications-list {
                  border: 2px solid #000;
                  padding: 10px;
                  margin: 10px 0;
                  background: ${isColorMode ? '#fefce8' : 'white'};
                }

                .medication-item {
                  margin: 8px 0;
                  padding: 5px 0;
                  border-bottom: 1px dotted #666;
                }

                .medication-item:last-child {
                  border-bottom: none;
                }

                .medication-name {
                  font-weight: bold;
                  font-size: ${printSettings.printerType === 'a4' ? '13px' : '11px'};
                  color: ${isColorMode ? '#1e40af' : '#000'};
                }

                .medication-dose {
                  font-size: ${printSettings.printerType === 'a4' ? '11px' : '10px'};
                  color: #333;
                  margin-top: 2px;
                }

                .separator {
                  text-align: center;
                  margin: 10px 0;
                  font-size: 12px;
                }

                .footer {
                  text-align: center;
                  margin-top: 15px;
                  padding-top: 10px;
                  border-top: 1px solid #000;
                  font-size: ${printSettings.printerType === 'a4' ? '10px' : '9px'};
                }

                .bottom-section {
                  display: flex;
                  justify-content: space-between;
                  align-items: flex-start;
                  margin: 15px 0;
                  gap: 20px;
                  flex-wrap: wrap;
                }

                .qr-section, .barcode-section {
                  text-align: center;
                  margin: 10px 0;
                  flex: 1;
                  min-width: 100px;
                }

                .signature-section {
                  flex: 1;
                  min-width: 120px;
                  text-align: center;
                }

                .signature-line {
                  width: ${printSettings.printerType === 'a4' ? '120px' : '100px'};
                  height: 1px;
                  border-bottom: 1px solid #333;
                  margin: 0 auto 4px;
                }

                .signature-label {
                  font-size: ${printSettings.printerType === 'a4' ? '11px' : '9px'};
                  color: #666;
                  margin-bottom: 6px;
                }

                .stamp-area {
                  width: ${printSettings.printerType === 'a4' ? '90px' : '70px'};
                  height: ${printSettings.printerType === 'a4' ? '70px' : '55px'};
                  border: 2px dashed #999;
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  margin: 0 auto;
                  background: rgba(0,0,0,0.02);
                }

                .stamp-placeholder {
                  font-size: ${printSettings.printerType === 'a4' ? '10px' : '8px'};
                  color: #999;
                  text-align: center;
                  line-height: 1.2;
                }

                .notes {
                  border: 2px solid #000;
                  padding: 10px;
                  margin: 10px 0;
                  font-style: italic;
                  background: ${isColorMode ? '#fef3c7' : 'white'};
                }

                @media print {
                  body { margin: 0; }
                  .receipt { box-shadow: none; }
                }

                @media screen {
                  body {
                    padding: 20px;
                    background: #f5f5f5;
                  }

                  .receipt {
                    max-width: ${printSettings.printerType === 'a4' ? '600px' : '320px'};
                    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                    border-radius: 12px;
                    overflow: hidden;
                    background: white;
                    margin: 0 auto;
                  }
                }
              </style>
            </head>
            <body>
              ${receiptRef.current.innerHTML}
            </body>
          </html>
        `)
        printWindow.document.close()
        printWindow.print()
      }
    }
  }

  const handleDownload = () => {
    // For now, we'll just trigger the print dialog
    handlePrint()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-right">
            <FileText className="w-5 h-5 text-green-600" />
            طباعة الوصفة الطبية
          </DialogTitle>
          <DialogDescription className="text-right">
            معاينة وطباعة الوصفة الطبية للمريض {prescription.patient?.full_name}
          </DialogDescription>
        </DialogHeader>

        {/* Print Settings Panel */}
        <div className="border-t bg-muted/30 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium flex items-center">
              <Settings className="w-4 h-4 ml-2" />
              إعدادات الطباعة
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
              className="text-xs"
            >
              <Eye className="w-3 h-3 ml-1" />
              {showPreview ? 'إخفاء المعاينة' : 'معاينة'}
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Printer Type */}
            <div className="space-y-1">
              <label className="text-xs font-medium">نوع الطابعة</label>
              <Select
                value={printSettings.printerType}
                onValueChange={(value) => setPrintSettings(prev => ({ ...prev, printerType: value }))}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="58mm">حرارية 58mm</SelectItem>
                  <SelectItem value="80mm">حرارية 80mm</SelectItem>
                  <SelectItem value="a4">عادية A4</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Color Mode */}
            <div className="space-y-1">
              <label className="text-xs font-medium">نمط الألوان</label>
              <Select
                value={printSettings.colorMode}
                onValueChange={(value) => setPrintSettings(prev => ({ ...prev, colorMode: value }))}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="color">ملون</SelectItem>
                  <SelectItem value="bw">أبيض وأسود</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Include Logo */}
            <div className="flex items-center space-x-2 space-x-reverse">
              <input
                type="checkbox"
                id="includeLogo"
                checked={printSettings.includeLogo}
                onChange={(e) => setPrintSettings(prev => ({ ...prev, includeLogo: e.target.checked }))}
                className="rounded border-gray-300"
              />
              <label htmlFor="includeLogo" className="text-xs font-medium">
                تضمين الشعار
              </label>
            </div>

            {/* Include QR */}
            <div className="flex items-center space-x-2 space-x-reverse">
              <input
                type="checkbox"
                id="includeQR"
                checked={printSettings.includeQR}
                onChange={(e) => setPrintSettings(prev => ({ ...prev, includeQR: e.target.checked }))}
                className="rounded border-gray-300"
              />
              <label htmlFor="includeQR" className="text-xs font-medium">
                QR Code
              </label>
            </div>
          </div>

          <div className="flex items-center space-x-2 space-x-reverse">
            <input
              type="checkbox"
              id="includeBarcode"
              checked={printSettings.includeBarcode}
              onChange={(e) => setPrintSettings(prev => ({ ...prev, includeBarcode: e.target.checked }))}
              className="rounded border-gray-300"
            />
            <label htmlFor="includeBarcode" className="text-xs font-medium">
              تضمين الباركود
            </label>
          </div>
        </div>

        {/* Receipt Preview */}
        {showPreview && (
          <div className="border rounded-lg p-4 bg-gray-50 max-h-96 overflow-y-auto">
          <div ref={receiptRef} className="receipt bg-white p-4 mx-auto" style={{
            maxWidth: printSettings.printerType === 'a4' ? '600px' : '320px',
            fontFamily: 'Arial, Tahoma, sans-serif',
            direction: 'rtl'
          }}>
            {/* Header */}
            <div className="header text-center mb-4 pb-3 border-b-2 border-black">
              {/* Clinic Logo */}
              {printSettings.includeLogo && clinicLogo && clinicLogo.trim() !== '' && (
                <div className="clinic-logo mb-3" style={{
                  width: printSettings.printerType === 'a4' ? '60px' : '45px',
                  height: printSettings.printerType === 'a4' ? '60px' : '45px',
                  margin: '0 auto 8px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: '2px solid #e0e0e0',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  flexShrink: 0
                }}>
                  <img
                    src={clinicLogo}
                    alt="شعار العيادة"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      borderRadius: '50%',
                      maxWidth: printSettings.printerType === 'a4' ? '60px' : '45px',
                      maxHeight: printSettings.printerType === 'a4' ? '60px' : '45px'
                    }}
                    onError={(e) => {
                      console.log('Prescription logo failed to load:', clinicLogo)
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                </div>
              )}

              {clinicName && (
                <div className="clinic-name text-lg font-bold mb-2 text-blue-600">
                  {clinicName}
                </div>
              )}
              {doctorName && (
                <div className="doctor-name text-sm font-bold mb-1 text-green-600">
                  د. {doctorName}
                </div>
              )}
              <div className="prescription-title text-base font-bold mt-3 text-red-600 underline">
                وصفة طبية
              </div>
            </div>

            {/* Prescription Info */}
            <div className="section mb-3">
              <div className="text-sm text-center">
                <strong>رقم الوصفة:</strong> PRX-{prescription.id.slice(-6)}
              </div>
              <div className="text-sm text-center">
                <strong>التاريخ:</strong> {formatDate(prescription.prescription_date)}
              </div>
            </div>

            {/* Patient Information */}
            <div className="patient-info border-2 border-black p-3 mb-3 bg-blue-50">
              <div className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-blue-600" />
                <span className="font-bold">معلومات المريض</span>
              </div>
              <div className="text-sm">
                <strong>الاسم:</strong> {prescription.patient?.full_name || 'غير محدد'}
              </div>
              {prescription.appointment && (
                <div className="text-sm mt-1">
                  <strong>الموعد:</strong> {prescription.appointment.title}
                </div>
              )}
            </div>

            {/* Medications List */}
            <div className="medications-list border-2 border-black p-3 mb-3 bg-yellow-50">
              <div className="flex items-center gap-2 mb-3">
                <Pill className="w-4 h-4 text-orange-600" />
                <span className="font-bold">الأدوية الموصوفة ({prescription.medications?.length || 0})</span>
              </div>

              {prescription.medications && prescription.medications.length > 0 ? (
                prescription.medications.map((med, index) => (
                  <div key={index} className="medication-item mb-2 pb-2 border-b border-dotted border-gray-400 last:border-b-0">
                    <div className="medication-name font-bold text-blue-800">
                      {index + 1}. {med.medication_name}
                    </div>
                    {med.dose && (
                      <div className="medication-dose text-sm text-gray-600 mt-1">
                        الجرعة: {med.dose}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-sm text-gray-500 italic">
                  لا توجد أدوية موصوفة
                </div>
              )}
            </div>

            {/* Notes */}
            {prescription.notes && (
              <div className="notes border-2 border-black p-3 mb-3 bg-yellow-100">
                <div className="font-bold mb-2">ملاحظات الطبيب:</div>
                <div className="text-sm italic">{prescription.notes}</div>
              </div>
            )}

            {/* QR Code and Signature Section */}
            <div className="bottom-section flex justify-between items-start mb-4 gap-4 flex-wrap">
              {printSettings.includeQR && (
                <div className="qr-section text-center flex-1 min-w-[100px]">
                  {qrCodeDataURL ? (
                    <img
                      src={qrCodeDataURL}
                      alt="رمز QR للوصفة الطبية"
                      style={{
                        width: printSettings.printerType === 'a4' ? '100px' : '80px',
                        height: printSettings.printerType === 'a4' ? '100px' : '80px',
                        margin: '0 auto'
                      }}
                    />
                  ) : (
                    <div className="qr-placeholder bg-gray-200 p-4 text-sm">
                      رمز QR
                    </div>
                  )}
                  <div className="text-xs text-gray-600 mt-1">
                    امسح الرمز لعرض تفاصيل الوصفة
                  </div>
                </div>
              )}

              {/* Doctor Signature Section */}
              <div className="signature-section text-center flex-1 min-w-[120px]">
                <div className="signature-box mb-3">
                  <div
                    className="signature-line mx-auto mb-2"
                    style={{
                      width: printSettings.printerType === 'a4' ? '120px' : '100px',
                      height: '1px',
                      borderBottom: '1px solid #333'
                    }}
                  ></div>
                  <div
                    className="signature-label text-gray-600 mb-3"
                    style={{ fontSize: printSettings.printerType === 'a4' ? '11px' : '9px' }}
                  >
                    توقيع الطبيب
                  </div>
                </div>
                <div className="stamp-box">
                  <div
                    className="stamp-area border-2 border-dashed border-gray-400 rounded-full flex items-center justify-center mx-auto bg-gray-50"
                    style={{
                      width: printSettings.printerType === 'a4' ? '90px' : '70px',
                      height: printSettings.printerType === 'a4' ? '70px' : '55px'
                    }}
                  >
                    <div
                      className="stamp-placeholder text-gray-500 text-center leading-tight"
                      style={{ fontSize: printSettings.printerType === 'a4' ? '10px' : '8px' }}
                    >
                      ختم العيادة
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Barcode Section */}
            {printSettings.includeBarcode && (
              <div className="barcode-section text-center mb-3">
                {barcodeDataURL ? (
                  <img
                    src={barcodeDataURL}
                    alt="باركود الوصفة الطبية"
                    style={{
                      width: printSettings.printerType === 'a4' ? '120px' : '100px',
                      height: printSettings.printerType === 'a4' ? '30px' : '20px',
                      margin: '0 auto'
                    }}
                  />
                ) : (
                  <div className="barcode-placeholder bg-gray-200 p-2 text-xs">
                    {generateBarcode()}
                  </div>
                )}
                <div className="text-xs text-gray-600 mt-1">
                  {generateBarcode()}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="footer text-center mt-4 pt-3 border-t border-black text-xs">
              <div className="mb-1">شكراً لثقتكم بنا</div>
              <div>تاريخ الطباعة: {formatDate(new Date().toISOString())}</div>
              {clinicName && (
                <div className="mt-1 font-bold">{clinicName}</div>
              )}
            </div>
          </div>
        </div>
        )}

        <DialogFooter className="flex justify-end space-x-2 space-x-reverse">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إغلاق
          </Button>
          <Button variant="outline" onClick={handleDownload}>
            <Download className="w-4 h-4 ml-2" />
            تحميل PDF
          </Button>
          <Button variant="outline" onClick={handleThermalPrint} className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200">
            <Printer className="w-4 h-4 ml-2" />
            طباعة حرارية
          </Button>
          <Button onClick={handlePrint} className="bg-green-600 hover:bg-green-700 text-white">
            <Printer className="w-4 h-4 ml-2" />
            طباعة ذكية
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
