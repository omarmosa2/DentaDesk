import React, { useRef, useState, useEffect, memo } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useSettingsStore } from '@/store/settingsStore'
import { useStableClinicName, useStableDoctorName, useStableClinicLogo, useStableContactInfo } from '@/hooks/useStableSettings'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useCurrency } from '@/contexts/CurrencyContext'
import { Printer, Download, Receipt, Building2, Phone, MapPin, QrCode, Settings, Eye } from 'lucide-react'
import QRCode from 'qrcode'
import JsBarcode from 'jsbarcode'
import type { Payment } from '@/types'

interface PaymentReceiptDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  payment: Payment
}

function PaymentReceiptDialogComponent({ open, onOpenChange, payment }: PaymentReceiptDialogProps) {
  const settings = useSettingsStore(state => state.settings)
  const loadSettings = useSettingsStore(state => state.loadSettings)
  const { formatAmount } = useCurrency()
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

  const [showPreview, setShowPreview] = useState(false)
  const [qrCodeDataURL, setQrCodeDataURL] = useState<string>('')
  const [barcodeDataURL, setBarcodeDataURL] = useState<string>('')

  // Generate QR Code data - Human readable format
  const generateQRData = () => {
    const receiptNumber = payment.receipt_number || `RCP-${payment.id.slice(-6)}`
    const patientName = payment.patient?.full_name || 'غير محدد'
    const formattedDate = formatDate(payment.payment_date)
    const amount = formatAmount(payment.amount)

    // حساب المبلغ المتبقي للمدفوعات الجزئية
    let remainingBalanceText = ''
    if (payment.status === 'partial') {
      let remainingBalance = 0
      if (payment.appointment_id) {
        const totalDue = payment.total_amount_due || payment.appointment_total_cost || 0
        const totalPaid = payment.amount_paid || payment.amount || 0
        remainingBalance = Math.max(0, totalDue - totalPaid)
      } else {
        const totalDue = payment.total_amount_due || payment.amount || 0
        const paid = payment.amount_paid || payment.amount || 0
        remainingBalance = Math.max(0, totalDue - paid)
      }

      if (remainingBalance > 0) {
        remainingBalanceText = `⚠️ المبلغ المتبقي: ${formatAmount(remainingBalance)}`
      }
    }

    return `🏥 ${clinicName}
${doctorName ? `👨‍⚕️ ${doctorName}` : ''}

📋 إيصال دفع رقم: ${receiptNumber}
👤 المريض: ${patientName}
💰 المبلغ المدفوع: ${amount}
📅 التاريخ: ${formattedDate}
🔄 حالة الدفعة: ${getStatusLabel(payment.status)}
${payment.appointment_id ? '📅 مرتبطة بموعد: نعم' : ''}
${remainingBalanceText ? `\n${remainingBalanceText}` : ''}

✅ هذا إيصال رسمي معتمد
🔒 معرف التحقق: ${payment.id.slice(-12)}

${phone ? `📞 للاستفسار: ${phone}` : ''}
${address ? `📍 العنوان: ${address}` : ''}

شكراً لثقتكم بنا 🙏`
  }

  // Generate QR Code and Barcode
  useEffect(() => {
    const generateQR = async () => {
      try {
        const qrData = generateQRData()
        const dataURL = await QRCode.toDataURL(qrData, {
          width: 200,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        })
        setQrCodeDataURL(dataURL)
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') console.error('Error generating QR code:', error)
      }
    }

    const generateBarcodeSVG = () => {
      try {
        const canvas = document.createElement('canvas')
        const barcodeValue = generateBarcode()

        JsBarcode(canvas, barcodeValue, {
          format: 'CODE128',
          width: 2,
          height: 40,
          displayValue: false,
          margin: 0,
          background: '#ffffff',
          lineColor: '#000000'
        })

        setBarcodeDataURL(canvas.toDataURL())
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') console.error('Error generating barcode:', error)
      }
    }

    if (open) {
      if (printSettings.includeQR) {
        generateQR()
      }
      if (printSettings.includeBarcode) {
        generateBarcodeSVG()
      }
    }
  }, [open, printSettings.includeQR, printSettings.includeBarcode, payment, settings])

  // Generate unique barcode
  const generateBarcode = () => {
    const timestamp = new Date(payment.payment_date).getTime().toString().slice(-8)
    const patientId = payment.patient_id.slice(-4)
    const amount = Math.floor(payment.amount).toString().padStart(4, '0')
    return `${timestamp}${patientId}${amount}`
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
              <title>إيصال دفع - ${payment.receipt_number || payment.id.slice(-6)}</title>
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
                  padding: ${printSettings.printerType === 'a4' ? '20px 10px' : '8px 4px'};
                  background: ${isColorMode ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#f8f9fa'};
                  color: ${isColorMode ? 'white' : '#000'};
                  border-bottom: 2px solid ${isColorMode ? '#764ba2' : '#000'};
                  margin-bottom: 8px;
                  border-radius: ${printSettings.printerType === 'a4' ? '8px 8px 0 0' : '0'};
                }

                .clinic-logo {
                  width: ${printSettings.printerType === 'a4' ? '60px' : '45px'};
                  height: ${printSettings.printerType === 'a4' ? '60px' : '45px'};
                  margin: 0 auto 6px;
                  border-radius: 50%;
                  background: ${isColorMode ? 'rgba(255,255,255,0.15)' : '#e9ecef'};
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: ${printSettings.printerType === 'a4' ? '20px' : '14px'};
                  font-weight: bold;
                  color: ${isColorMode ? 'white' : '#495057'};
                  border: 2px solid ${isColorMode ? 'rgba(255,255,255,0.3)' : '#dee2e6'};
                  box-shadow: ${isColorMode ? '0 2px 8px rgba(0,0,0,0.15)' : '0 1px 4px rgba(0,0,0,0.1)'};
                  overflow: hidden;
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
                  font-size: ${printSettings.printerType === 'a4' ? '20px' : '16px'};
                  font-weight: bold;
                  margin-bottom: 4px;
                  text-transform: uppercase;
                  text-shadow: ${isColorMode ? '0 1px 2px rgba(0,0,0,0.3)' : 'none'};
                }

                .doctor-name {
                  font-size: ${printSettings.printerType === 'a4' ? '16px' : '13px'};
                  font-weight: bold;
                  margin-bottom: 3px;
                  opacity: ${isColorMode ? '0.95' : '1'};
                }

                .clinic-info {
                  font-size: ${printSettings.printerType === 'a4' ? '12px' : '10px'};
                  margin: 1px 0;
                  line-height: 1.2;
                  opacity: ${isColorMode ? '0.9' : '1'};
                }

                .receipt-title {
                  font-size: ${printSettings.printerType === 'a4' ? '18px' : '14px'};
                  font-weight: bold;
                  text-align: center;
                  padding: ${printSettings.printerType === 'a4' ? '12px 0' : '6px 0'};
                  margin: 8px 0;
                  background: ${isColorMode ? 'linear-gradient(90deg, #f8f9fa, #e9ecef, #f8f9fa)' : '#f8f9fa'};
                  border-top: 1px dashed #000;
                  border-bottom: 1px dashed #000;
                  color: #495057;
                }

                .content {
                  padding: ${printSettings.printerType === 'a4' ? '10px' : '4px'};
                }

                .section {
                  margin-bottom: ${printSettings.printerType === 'a4' ? '15px' : '8px'};
                }

                .info-row {
                  display: flex;
                  justify-content: space-between;
                  margin: ${printSettings.printerType === 'a4' ? '6px 0' : '3px 0'};
                  padding: ${printSettings.printerType === 'a4' ? '4px 0' : '2px 0'};
                  font-size: ${printSettings.printerType === 'a4' ? '13px' : '11px'};
                  border-bottom: 1px solid #f1f3f4;
                }

                .label {
                  font-weight: bold;
                  flex: 1;
                  text-align: right;
                  color: ${isColorMode ? '#495057' : '#000'};
                }

                .value {
                  flex: 1;
                  text-align: left;
                  font-weight: normal;
                  color: ${isColorMode ? '#212529' : '#000'};
                }

                .amount-section {
                  background: ${isColorMode ? 'linear-gradient(135deg, #f8f9fa, #e9ecef)' : '#f8f9fa'};
                  border: 1px solid ${isColorMode ? '#dee2e6' : '#000'};
                  border-radius: ${printSettings.printerType === 'a4' ? '8px' : '4px'};
                  padding: ${printSettings.printerType === 'a4' ? '15px' : '6px'};
                  margin-top: 8px;
                }

                .amount-row {
                  display: flex;
                  justify-content: space-between;
                  margin: ${printSettings.printerType === 'a4' ? '6px 0' : '3px 0'};
                  font-size: ${printSettings.printerType === 'a4' ? '13px' : '11px'};
                  font-weight: 500;
                }

                .total-amount {
                  font-size: ${printSettings.printerType === 'a4' ? '18px' : '14px'};
                  font-weight: bold;
                  text-align: center;
                  padding: ${printSettings.printerType === 'a4' ? '12px' : '6px'};
                  margin: 6px 0;
                  background: ${isColorMode ? 'linear-gradient(135deg, #28a745, #20c997)' : '#f0f0f0'};
                  color: ${isColorMode ? 'white' : '#000'};
                  border: 2px solid ${isColorMode ? '#28a745' : '#000'};
                  border-radius: ${printSettings.printerType === 'a4' ? '8px' : '4px'};
                  box-shadow: ${isColorMode ? '0 2px 10px rgba(40, 167, 69, 0.3)' : 'none'};
                }

                .qr-section, .barcode-section {
                  text-align: center;
                  margin: ${printSettings.printerType === 'a4' ? '15px 0' : '8px 0'};
                  padding: ${printSettings.printerType === 'a4' ? '10px' : '5px'};
                  background: ${isColorMode ? '#f8f9fa' : 'white'};
                  border: 1px dashed ${isColorMode ? '#dee2e6' : '#000'};
                  border-radius: ${printSettings.printerType === 'a4' ? '6px' : '3px'};
                }

                .qr-placeholder, .barcode-placeholder {
                  width: ${printSettings.printerType === 'a4' ? '80px' : '60px'};
                  height: ${printSettings.printerType === 'a4' ? '80px' : '60px'};
                  margin: 0 auto 5px;
                  background: ${isColorMode ? 'linear-gradient(45deg, #000, #333)' : '#000'};
                  border-radius: 4px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  color: white;
                  font-size: ${printSettings.printerType === 'a4' ? '10px' : '8px'};
                  font-weight: bold;
                }

                .barcode-placeholder {
                  height: ${printSettings.printerType === 'a4' ? '30px' : '20px'};
                  width: ${printSettings.printerType === 'a4' ? '120px' : '100px'};
                  border-radius: 2px;
                }

                .bottom-section {
                  display: flex;
                  justify-content: space-between;
                  align-items: flex-start;
                  margin: 12px 0;
                  gap: 15px;
                  flex-wrap: wrap;
                }

                .qr-section {
                  text-align: center;
                  flex: 1;
                  min-width: 80px;
                }

                .signature-section {
                  flex: 1;
                  min-width: 120px;
                  text-align: center;
                }

                .signature-box {
                  margin-bottom: 8px;
                }

                .signature-line {
                  width: ${printSettings.printerType === 'a4' ? '100px' : '80px'};
                  height: 1px;
                  border-bottom: 1px solid #333;
                  margin: 0 auto 4px;
                }

                .signature-label {
                  font-size: ${printSettings.printerType === 'a4' ? '10px' : '8px'};
                  color: #666;
                  margin-bottom: 6px;
                }

                .stamp-box {
                  margin-top: 6px;
                }

                .stamp-area {
                  width: ${printSettings.printerType === 'a4' ? '80px' : '60px'};
                  height: ${printSettings.printerType === 'a4' ? '60px' : '45px'};
                  border: 2px dashed #999;
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  margin: 0 auto;
                  background: rgba(0,0,0,0.02);
                }

                .stamp-placeholder {
                  font-size: ${printSettings.printerType === 'a4' ? '9px' : '7px'};
                  color: #999;
                  text-align: center;
                  line-height: 1.2;
                }

                .footer {
                  text-align: center;
                  padding: ${printSettings.printerType === 'a4' ? '15px 10px' : '6px 4px'};
                  background: ${isColorMode ? 'linear-gradient(135deg, #f8f9fa, #e9ecef)' : '#f8f9fa'};
                  border-top: 2px solid ${isColorMode ? '#dee2e6' : '#000'};
                  margin-top: 8px;
                  font-size: ${printSettings.printerType === 'a4' ? '12px' : '10px'};
                  border-radius: ${printSettings.printerType === 'a4' ? '0 0 8px 8px' : '0'};
                }

                .thank-you {
                  font-size: ${printSettings.printerType === 'a4' ? '16px' : '12px'};
                  font-weight: bold;
                  margin-bottom: 3px;
                  color: ${isColorMode ? '#495057' : '#000'};
                }

                .date-created {
                  font-size: ${printSettings.printerType === 'a4' ? '11px' : '9px'};
                  color: ${isColorMode ? '#6c757d' : '#666'};
                }

                .separator {
                  text-align: center;
                  margin: 6px 0;
                  font-size: 16px;
                  letter-spacing: 2px;
                  color: ${isColorMode ? '#dee2e6' : '#000'};
                }

                /* Print optimizations */
                @media print {
                  body {
                    margin: 0 !important;
                    padding: 0 !important;
                    background: white !important;
                  }

                  .receipt {
                    box-shadow: none !important;
                    border: none !important;
                    margin: 0 !important;
                  }

                  .no-print {
                    display: none !important;
                  }

                  .info-row, .amount-row {
                    page-break-inside: avoid;
                  }

                  ${isColorMode ? `
                    .header {
                      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
                      color: white !important;
                      -webkit-print-color-adjust: exact;
                    }
                    .total-amount {
                      background: linear-gradient(135deg, #28a745, #20c997) !important;
                      color: white !important;
                      -webkit-print-color-adjust: exact;
                    }
                  ` : ''}
                }

                /* Screen display styles */
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

  const handleThermalPrint = () => {
    if (receiptRef.current) {
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>إيصال حراري - ${payment.receipt_number || payment.id.slice(-6)}</title>
              <style>
                @page {
                  size: 80mm auto;
                  margin: 0;
                }
                body {
                  font-family: 'Courier New', monospace;
                  direction: rtl;
                  margin: 0;
                  padding: 2mm;
                  font-size: 10px;
                  line-height: 1.2;
                  color: #000;
                  background: white;
                  width: 76mm;
                }
                .receipt {
                  width: 100%;
                  font-size: 10px;
                }
                .header {
                  text-align: center;
                  margin-bottom: 4px;
                  border-bottom: 1px solid #000;
                  padding-bottom: 2px;
                }
                .clinic-name {
                  font-size: 12px;
                  font-weight: bold;
                  margin-bottom: 1px;
                }
                .doctor-name {
                  font-size: 10px;
                  font-weight: bold;
                }
                .clinic-info {
                  font-size: 8px;
                  margin: 0;
                }
                .receipt-title {
                  font-size: 11px;
                  font-weight: bold;
                  text-align: center;
                  margin: 3px 0;
                  border-top: 1px dashed #000;
                  border-bottom: 1px dashed #000;
                  padding: 2px 0;
                }
                .info-row, .amount-row {
                  display: flex;
                  justify-content: space-between;
                  margin: 1px 0;
                  font-size: 9px;
                }
                .separator {
                  text-align: center;
                  margin: 2px 0;
                  font-size: 8px;
                }
                .total-amount {
                  font-size: 11px;
                  font-weight: bold;
                  text-align: center;
                  margin: 3px 0;
                  border: 1px solid #000;
                  padding: 2px;
                }
                .footer {
                  text-align: center;
                  margin-top: 4px;
                  border-top: 1px solid #000;
                  padding-top: 2px;
                  font-size: 8px;
                }
                .thank-you {
                  font-size: 9px;
                  font-weight: bold;
                }
                .bottom-section {
                  display: flex;
                  justify-content: space-between;
                  align-items: flex-start;
                  margin: 4px 0;
                  gap: 6px;
                  flex-wrap: wrap;
                }
                .qr-section {
                  text-align: center;
                  flex: 1;
                  min-width: 50px;
                }
                .signature-section {
                  flex: 1;
                  min-width: 70px;
                  text-align: center;
                }
                .signature-line {
                  width: 50px;
                  height: 1px;
                  border-bottom: 1px solid #000;
                  margin: 0 auto 2px;
                }
                .signature-label {
                  font-size: 6px;
                  margin-bottom: 2px;
                }
                .stamp-area {
                  width: 35px;
                  height: 25px;
                  border: 1px dashed #000;
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  margin: 0 auto;
                  background: rgba(0,0,0,0.02);
                }
                .stamp-placeholder {
                  font-size: 5px;
                  text-align: center;
                  line-height: 1.1;
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
    // This would typically use a library like jsPDF
    // For now, we'll just trigger the print dialog
    handlePrint()
  }

  const getPaymentMethodLabel = (method: string) => {
    const methods = {
      cash: 'نقداً',
      card: 'بطاقة ائتمان',
      bank_transfer: 'تحويل بنكي',
      check: 'شيك',
      insurance: 'تأمين'
    }
    return methods[method as keyof typeof methods] || method
  }

  const getStatusLabel = (status: string) => {
    const statuses = {
      completed: 'مكتمل',
      pending: 'آجل',
      partial: 'جزئي',
      overdue: 'متأخر',
      failed: 'فاشل',
      refunded: 'مسترد'
    }
    return statuses[status as keyof typeof statuses] || status
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center text-xl font-semibold">
            <Receipt className="w-5 h-5 ml-2" />
            إيصال الدفع
          </DialogTitle>
          <DialogDescription>
            إيصال رقم {payment.receipt_number || payment.id.slice(-6)}
          </DialogDescription>
        </DialogHeader>

        <div ref={receiptRef} className="receipt">
          {/* Clinic Header */}
          <div className="header">
            {/* Clinic Logo */}
            {printSettings.includeLogo && (
              <div className="clinic-logo" style={{
                width: '60px',
                height: '60px',
                margin: '0 auto 8px',
                borderRadius: '50%',
                overflow: 'hidden',
                border: '2px solid #e0e0e0',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#f8f9fa'
              }}>
                {clinicLogo && clinicLogo.trim() !== '' ? (
                  <img
                    src={clinicLogo}
                    alt="شعار العيادة"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      borderRadius: '50%',
                      maxWidth: '60px',
                      maxHeight: '60px'
                    }}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                ) : (
                  <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#495057' }}>
                    {clinicName.charAt(0)}
                  </span>
                )}
              </div>
            )}

            <div className="clinic-name">
              {clinicName}
            </div>
            {doctorName && (
              <div className="doctor-name">
                {doctorName}
              </div>
            )}
            {phone && (
              <div className="clinic-info">
                📞 {phone}
              </div>
            )}
            {address && (
              <div className="clinic-info">
                📍 {address}
              </div>
            )}
            {email && (
              <div className="clinic-info">
                ✉️ {email}
              </div>
            )}
          </div>

          <div className="separator">═══════════════════</div>

          <div className="receipt-title">
            إيصال دفع رقم {payment.receipt_number || `RCP-${payment.id.slice(-6)}`}
          </div>

          <div className="content">
            {/* Patient and Receipt Details */}
            <div className="section">
              <div className="info-row">
                <span className="label">التاريخ:</span>
                <span className="value">{formatDate(payment.payment_date)}</span>
              </div>

              <div className="info-row">
                <span className="label">الوقت:</span>
                <span className="value">
                  {new Date(payment.payment_date).toLocaleTimeString('ar-SA', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                  })}
                </span>
              </div>

              <div className="info-row">
                <span className="label">المريض:</span>
                <span className="value">
                  {payment.patient
                    ? (payment.patient.full_name || `${payment.patient.first_name || ''} ${payment.patient.last_name || ''}`.trim())
                    : 'غير محدد'}
                </span>
              </div>

              {payment.patient?.phone && (
                <div className="info-row">
                  <span className="label">الهاتف:</span>
                  <span className="value">{payment.patient.phone}</span>
                </div>
              )}

              <div className="info-row">
                <span className="label">طريقة الدفع:</span>
                <span className="value">{getPaymentMethodLabel(payment.payment_method)}</span>
              </div>

              {payment.description && (
                <div className="info-row">
                  <span className="label">الوصف:</span>
                  <span className="value">{payment.description}</span>
                </div>
              )}

              <div className="info-row">
                <span className="label">حالة الدفعة:</span>
                <span className="value">{getStatusLabel(payment.status)}</span>
              </div>

              {/* معلومات الموعد المرتبط */}
              {payment.appointment_id && (
                <div className="info-row">
                  <span className="label">مرتبطة بموعد:</span>
                  <span className="value">نعم</span>
                </div>
              )}
            </div>

            <div className="separator">- - - - - - - - - - - - - - - -</div>

            {/* Amount Section */}
            <div className="amount-section">
              {/* معلومات الدفعة الحالية */}
              <div className="amount-row">
                <span>المبلغ المدفوع في هذه الدفعة:</span>
                <span>{formatAmount(payment.amount)}</span>
              </div>

              {payment.discount_amount && payment.discount_amount > 0 && (
                <div className="amount-row">
                  <span>الخصم:</span>
                  <span>-{formatAmount(payment.discount_amount)}</span>
                </div>
              )}

              {payment.tax_amount && payment.tax_amount > 0 && (
                <div className="amount-row">
                  <span>الضريبة:</span>
                  <span>+{formatAmount(payment.tax_amount)}</span>
                </div>
              )}

              {/* معلومات إضافية للمدفوعات الجزئية */}
              {payment.status === 'partial' && (
                <>
                  <div className="separator">- - - - - - - - - - - - - - - -</div>

                  {/* إجمالي المبلغ المطلوب */}
                  {(payment.total_amount_due || payment.appointment_total_cost) && (
                    <div className="amount-row">
                      <span>إجمالي المبلغ المطلوب:</span>
                      <span>{formatAmount(payment.total_amount_due || payment.appointment_total_cost || 0)}</span>
                    </div>
                  )}

                  {/* إجمالي المبلغ المدفوع */}
                  {payment.amount_paid && (
                    <div className="amount-row">
                      <span>إجمالي المبلغ المدفوع:</span>
                      <span>{formatAmount(payment.amount_paid)}</span>
                    </div>
                  )}

                  {/* المبلغ المتبقي */}
                  {(() => {
                    let remainingBalance = 0
                    if (payment.appointment_id) {
                      // للمدفوعات المرتبطة بمواعيد
                      const totalDue = payment.total_amount_due || payment.appointment_total_cost || 0
                      const totalPaid = payment.amount_paid || payment.amount || 0
                      remainingBalance = Math.max(0, totalDue - totalPaid)
                    } else {
                      // للمدفوعات العامة
                      const totalDue = payment.total_amount_due || payment.amount || 0
                      const paid = payment.amount_paid || payment.amount || 0
                      remainingBalance = Math.max(0, totalDue - paid)
                    }

                    return remainingBalance > 0 ? (
                      <div className="amount-row" style={{ color: '#dc3545', fontWeight: 'bold' }}>
                        <span>المبلغ المتبقي:</span>
                        <span>{formatAmount(remainingBalance)}</span>
                      </div>
                    ) : null
                  })()}
                </>
              )}

              <div className="separator">═══════════════════</div>

              <div className="total-amount">
                المبلغ الإجمالي لهذه الدفعة: {formatAmount(
                  payment.total_amount ||
                  (payment.amount + (payment.tax_amount || 0) - (payment.discount_amount || 0))
                )}
              </div>
            </div>

            {/* QR Code and Signature Section */}
            <div className="bottom-section">
              {printSettings.includeQR && (
                <div className="qr-section">
                  {qrCodeDataURL ? (
                    <img
                      src={qrCodeDataURL}
                      alt="QR Code للتحقق من الإيصال"
                      style={{
                        width: printSettings.printerType === 'a4' ? '80px' : '60px',
                        height: printSettings.printerType === 'a4' ? '80px' : '60px',
                        margin: '0 auto'
                      }}
                    />
                  ) : (
                    <div className="qr-placeholder">
                      QR
                    </div>
                  )}
                  <div style={{ fontSize: '8px', color: '#666', marginTop: '4px' }}>
                    امسح للتحقق من الإيصال
                  </div>
                </div>
              )}

              {/* Doctor Signature Section */}
              <div className="signature-section">
                <div className="signature-box">
                  <div className="signature-line"></div>
                  <div className="signature-label">توقيع الطبيب</div>
                </div>
                <div className="stamp-box">
                  <div className="stamp-area">
                    <div className="stamp-placeholder">ختم العيادة</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Barcode Section */}
            {printSettings.includeBarcode && (
              <div className="barcode-section">
                {barcodeDataURL ? (
                  <img
                    src={barcodeDataURL}
                    alt="باركود الإيصال"
                    style={{
                      width: printSettings.printerType === 'a4' ? '120px' : '100px',
                      height: printSettings.printerType === 'a4' ? '30px' : '20px',
                      margin: '0 auto'
                    }}
                  />
                ) : (
                  <div className="barcode-placeholder">
                    {generateBarcode()}
                  </div>
                )}
                <div style={{ fontSize: '8px', color: '#666', marginTop: '2px' }}>
                  {generateBarcode()}
                </div>
              </div>
            )}

            {/* لا نعرض الملاحظات في الإيصال لأنها تحتوي على معرف العلاج للربط الداخلي */}

            {/* معلومات إضافية مفيدة */}
            <div className="section">
              <div className="separator">- - - - - - - - - - - - - - - -</div>
              <div style={{ fontSize: '9px', color: '#666', textAlign: 'center', margin: '4px 0' }}>
                <div>معرف الدفعة: {payment.id.slice(-8)}</div>
                <div>طريقة الدفع: {getPaymentMethodLabel(payment.payment_method)}</div>
                {payment.status === 'partial' && (
                  <div style={{ color: '#dc3545', fontWeight: 'bold' }}>
                    ⚠️ دفعة جزئية - يرجى الاحتفاظ بالإيصال
                  </div>
                )}
                <div style={{ marginTop: '4px' }}>
                  تاريخ الطباعة: {new Date().toLocaleDateString('ar-SA')} - {new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="footer">
            <div className="separator">═══════════════════</div>
            <div className="thank-you">شكراً لثقتكم بنا</div>
            <div className="date-created">
              تم الإنشاء: {formatDate(new Date().toISOString())}
            </div>
            <div className="separator">═══════════════════</div>
          </div>
        </div>

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

export default memo(PaymentReceiptDialogComponent)
