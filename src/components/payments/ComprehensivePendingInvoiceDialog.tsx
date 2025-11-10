import React, { useState, useEffect, useRef, memo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'
import {
  Patient,
  Payment,
  Appointment,
  ToothTreatment,
  PendingPaymentsFilter,
  PendingPaymentsSummary,
  ComprehensiveInvoiceSettings,
  ComprehensiveInvoiceData,
  PendingPaymentItem
} from '@/types'
import { PendingPaymentsService } from '@/services/pendingPaymentsService'
import { PdfService } from '@/services/pdfService'
import { usePaymentStore } from '@/store/paymentStore'
import { useAppointmentStore } from '@/store/appointmentStore'
import { useDentalTreatmentStore } from '@/store/dentalTreatmentStore'
import { useSettingsStore } from '@/store/settingsStore'
import { formatCurrency, formatDate } from '@/lib/utils'
import QRCode from 'qrcode'
import JsBarcode from 'jsbarcode'
import {
  FileText,
  Download,
  MessageCircle,
  Calendar,
  DollarSign,
  Percent,
  Calculator,
  CheckCircle,
  AlertTriangle,
  Filter,
  Settings,
  Printer,
  Share2,
  Eye
} from 'lucide-react'

interface ComprehensivePendingInvoiceDialogProps {
  patient: Patient | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function ComprehensivePendingInvoiceDialog({
  patient,
  open,
  onOpenChange
}: ComprehensivePendingInvoiceDialogProps) {
  const { toast } = useToast()
  const { payments, updatePayment } = usePaymentStore()
  const { appointments } = useAppointmentStore()
  const { toothTreatments, loadToothTreatments, loadToothTreatmentsByPatient } = useDentalTreatmentStore()
  const { settings } = useSettingsStore()

  const [isLoading, setIsLoading] = useState(false)
  const [pendingSummary, setPendingSummary] = useState<PendingPaymentsSummary | null>(null)
  const [invoiceData, setInvoiceData] = useState<ComprehensiveInvoiceData | null>(null)
  const [showSettings, setShowSettings] = useState(false)

  // فلتر البيانات
  const [filter, setFilter] = useState<PendingPaymentsFilter>({
    date_range: 'last_3_months'
  })

  // إعدادات الفاتورة
  const [invoiceSettings, setInvoiceSettings] = useState<ComprehensiveInvoiceSettings>({
    apply_discount: false,
    discount_type: 'percentage',
    discount_value: 0,
    discount_reason: '',
    include_tax: false,
    tax_rate: 0,
    include_clinic_logo: true,
    include_patient_details: true,
    include_payment_terms: true,
    payment_terms_text: '',
    footer_notes: 'شكراً لثقتكم بنا'
  })

  // إعدادات الطباعة الحرارية - نفس إعدادات ايصالات المدفوعات
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

  const invoiceRef = useRef<HTMLDivElement>(null)

  // توليد بيانات QR Code مع تفاصيل شاملة
  const generateQRData = () => {
    if (!pendingSummary || !patient) return ''

    const receiptNumber = generateBarcode() // استخدام نفس رقم الباركود
    const patientName = patient.full_name || 'غير محدد'
    const patientPhone = patient.phone || 'غير محدد'
    const patientId = patient.id.toString().padStart(4, '0')
    const formattedDate = formatDate(new Date().toISOString().split('T')[0])
    const clinicName = settings?.clinic_name || 'عيادة الأسنان'
    const doctorName = settings?.doctor_name || 'الطبيب'
    const clinicPhone = settings?.clinic_phone || 'غير محدد'
    const clinicAddress = settings?.clinic_address || 'غير محدد'

    // تفاصيل المبالغ
    const subtotal = formatCurrency(pendingSummary.subtotal)
    const discount = pendingSummary.total_discount > 0 ? formatCurrency(pendingSummary.total_discount) : '0'
    const tax = pendingSummary.total_tax > 0 ? formatCurrency(pendingSummary.total_tax) : '0'
    const finalTotal = formatCurrency(pendingSummary.final_total)

    // عدد العناصر وفترة الفاتورة
    const itemsCount = pendingSummary.items.length
    const dateRange = `${formatDate(pendingSummary.date_range.from)} - ${formatDate(pendingSummary.date_range.to)}`

    // تفاصيل العناصر (أول 3 عناصر فقط لتوفير المساحة)
    const itemsDetails = pendingSummary.items.slice(0, 3).map((item, index) => {
      return `${index + 1}. ${item.appointment_title || item.treatment_type || item.description} - ${formatCurrency(item.amount)}${item.tooth_name ? ` (🦷 ${item.tooth_name})` : ''}`
    }).join('\n')

    const moreItems = pendingSummary.items.length > 3 ? `\n... و ${pendingSummary.items.length - 3} عنصر إضافي` : ''

    return `🏥 ${clinicName}
👨‍⚕️ د. ${doctorName}
📞 ${clinicPhone}
📍 ${clinicAddress}

📋 فاتورة المدفوعات الآجلة
🔢 رقم الفاتورة: ${receiptNumber}
📅 تاريخ الإصدار: ${formattedDate}
📅 فترة الفاتورة: ${dateRange}

👤 بيانات المريض:
🆔 رقم المريض: ${patientId}
👤 الاسم: ${patientName}
📞 الهاتف: ${patientPhone}

📋 تفاصيل العناصر (${itemsCount} عنصر):
${itemsDetails}${moreItems}

💰 ملخص المبالغ:
المجموع الفرعي: ${subtotal}
الخصم: ${discount}
الضريبة: ${tax}
━━━━━━━━━━━━━━━━━━━━
المجموع النهائي: ${finalTotal}

${invoiceSettings.discount_reason ? `💸 سبب الخصم: ${invoiceSettings.discount_reason}\n` : ''}${invoiceSettings.notes ? `📝 ملاحظات: ${invoiceSettings.notes}\n` : ''}
🙏 شكراً لثقتكم بنا
⏰ تم الإنشاء: ${new Date().toLocaleString('ar-EG')}`
  }

  // توليد باركود مع تفاصيل الفاتورة
  const generateBarcode = () => {
    if (!pendingSummary || !patient) return ''

    const timestamp = Date.now().toString()
    const patientId = patient.id.toString().padStart(4, '0')
    const itemsCount = pendingSummary.items.length.toString().padStart(2, '0')
    const amount = Math.round(pendingSummary.final_total).toString().padStart(6, '0')

    // تنسيق: INV + رقم المريض + عدد العناصر + المبلغ + الطابع الزمني (آخر 4 أرقام)
    return `INV${patientId}${itemsCount}${amount}${timestamp.slice(-4)}`
  }

  // توليد QR Code كصورة
  const generateQRCodeImage = async () => {
    if (!printSettings.includeQR || !pendingSummary || !patient) {
      return
    }

    try {
      const qrData = generateQRData()
      console.log('QR Code Data:', qrData)

      if (!qrData) {
        console.error('QR Code: لا توجد بيانات للتوليد')
        return
      }

      const dataURL = await QRCode.toDataURL(qrData, {
        width: printSettings.printerType === 'a4' ? 120 : 80,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })

      setQrCodeDataURL(dataURL)
    } catch (error) {
      console.error('خطأ في توليد QR Code:', error)
    }
  }

  // توليد باركود كصورة
  const generateBarcodeImage = async () => {
    if (!printSettings.includeBarcode || !pendingSummary) {
      return
    }

    try {
      const canvas = document.createElement('canvas')
      const barcodeData = generateBarcode()

      console.log('Barcode Data:', barcodeData)

      if (!barcodeData) {
        console.error('Barcode: لا توجد بيانات للتوليد')
        return
      }

      JsBarcode(canvas, barcodeData, {
        format: 'CODE128',
        width: printSettings.printerType === 'a4' ? 2 : 1,
        height: printSettings.printerType === 'a4' ? 50 : 30,
        displayValue: true,
        fontSize: printSettings.printerType === 'a4' ? 12 : 8,
        margin: 5
      })

      const dataURL = canvas.toDataURL()
      setBarcodeDataURL(dataURL)
    } catch (error) {
      console.error('خطأ في توليد الباركود:', error)
    }
  }

  // تحميل البيانات عند فتح الحوار
  useEffect(() => {
    if (open && patient) {
      // تحميل العلاجات للمريض المحدد أولاً ثم المدفوعات الآجلة
      Promise.all([
        loadToothTreatments(),
        loadToothTreatmentsByPatient(patient.id)
      ]).then(() => {
        loadPendingPayments()
      }).catch((error) => {
        console.error('خطأ في تحميل البيانات:', error)
        loadPendingPayments() // تحميل المدفوعات حتى لو فشل تحميل العلاجات
      })
    }
  }, [open, patient, filter])

  // توليد QR Code والباركود عند تغيير الإعدادات أو البيانات
  useEffect(() => {
    if (pendingSummary && patient) {
      generateQRCodeImage()
      generateBarcodeImage()
    }
  }, [pendingSummary, printSettings.includeQR, printSettings.includeBarcode, printSettings.printerType])

  // تحديث الملخص عند تغيير الإعدادات
  useEffect(() => {
    if (pendingSummary && patient) {
      updateSummaryWithSettings()
    }
  }, [invoiceSettings])

  const loadPendingPayments = async () => {
    if (!patient) return

    setIsLoading(true)
    try {
      // التحقق من وجود البيانات المطلوبة
      const dataStatus = {
        payments: !!payments && payments.length > 0,
        appointments: !!appointments && appointments.length > 0,
        toothTreatments: !!toothTreatments && toothTreatments.length > 0
      }


      if (!payments || !appointments || !toothTreatments) {
        console.warn('بعض البيانات المطلوبة غير متوفرة:', {
          payments: !!payments,
          appointments: !!appointments,
          toothTreatments: !!toothTreatments
        })
      }

      const pendingItems = await PendingPaymentsService.getPatientPendingPayments(
        patient.id,
        filter,
        payments || [],
        appointments || [],
        toothTreatments || []
      )

      const dateRange = PendingPaymentsService.calculateDateRange(filter)
      const summary = PendingPaymentsService.calculatePendingPaymentsSummary(
        patient.id,
        patient.full_name,
        pendingItems,
        invoiceSettings,
        dateRange
      )

      // التحقق من صحة البيانات المالية
      if (!PendingPaymentsService.validateFinancialData(summary)) {
        throw new Error('خطأ في حساب البيانات المالية')
      }

      setPendingSummary(summary)

      // إنشاء بيانات الفاتورة
      const invoice = PendingPaymentsService.createComprehensiveInvoiceData(
        patient,
        summary,
        invoiceSettings,
        settings
      )
      setInvoiceData(invoice)

    } catch (error) {
      console.error('خطأ في تحميل المدفوعات الآجلة:', error)
      toast({
        title: 'خطأ',
        description: 'فشل في تحميل المدفوعات الآجلة',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const updateSummaryWithSettings = () => {
    if (!pendingSummary || !patient) return

    const dateRange = PendingPaymentsService.calculateDateRange(filter)
    const updatedSummary = PendingPaymentsService.calculatePendingPaymentsSummary(
      patient.id,
      patient.full_name,
      pendingSummary.items,
      invoiceSettings,
      dateRange
    )

    setPendingSummary(updatedSummary)

    if (invoiceData) {
      setInvoiceData({
        ...invoiceData,
        summary: updatedSummary,
        settings: invoiceSettings
      })
    }
  }

  const handleFilterChange = (field: keyof PendingPaymentsFilter, value: any) => {
    setFilter(prev => ({ ...prev, [field]: value }))
    // إعادة تحميل البيانات عند تغيير الفلتر
    setTimeout(() => {
      loadPendingPayments()
    }, 100)
  }

  const handleSettingsChange = (field: keyof ComprehensiveInvoiceSettings, value: any) => {
    setInvoiceSettings(prev => ({ ...prev, [field]: value }))
  }

  const handleMarkAllAsCompleted = async () => {
    if (!pendingSummary || !patient) return

    try {
      setIsLoading(true)

      // تحديث جميع المدفوعات الآجلة إلى مكتملة مع تحديث المبالغ المالية
      const updatePromises = pendingSummary.items
        .filter(item => !item.id.startsWith('unpaid-')) // فقط المدفوعات الموجودة فعلياً
        .map(async item => {
          // الحصول على بيانات الدفعة الأصلية لمعرفة المبلغ المطلوب
          const originalPayment = payments.find(p => p.id === item.id)
          if (!originalPayment) return

          // حساب المبلغ المطلوب دفعه حسب نوع الدفعة
          let amountToPay = 0
          let updateData: any = {
            status: 'completed' as const,
            payment_date: new Date().toISOString().split('T')[0],
            notes: `تم التأكيد عبر الفاتورة الشاملة - ${new Date().toLocaleDateString('ar-SA')}`
          }

          if (originalPayment.tooth_treatment_id) {
            // دفعة مرتبطة بعلاج
            amountToPay = originalPayment.treatment_total_cost || item.amount || 0
            updateData = {
              ...updateData,
              amount: amountToPay,
              treatment_total_paid: amountToPay,
              treatment_remaining_balance: 0
            }
          } else if (originalPayment.appointment_id) {
            // دفعة مرتبطة بموعد
            amountToPay = originalPayment.appointment_total_cost || originalPayment.total_amount_due || item.amount || 0
            updateData = {
              ...updateData,
              amount: amountToPay,
              appointment_total_paid: amountToPay,
              appointment_remaining_balance: 0,
              amount_paid: amountToPay,
              remaining_balance: 0
            }
          } else {
            // دفعة عامة
            amountToPay = originalPayment.total_amount_due || originalPayment.remaining_balance || item.amount || 0
            updateData = {
              ...updateData,
              amount: amountToPay,
              amount_paid: amountToPay,
              remaining_balance: 0
            }
          }

          // تحديث الدفعة لتصبح مكتملة مع المبالغ الصحيحة
          return updatePayment(item.id, updateData)
        })

      await Promise.all(updatePromises)

      toast({
        title: 'تم بنجاح',
        description: `تم تأكيد ${updatePromises.length} دفعة كمكتملة وتحديث المبالغ المالية`,
        variant: 'default'
      })

      // إعادة تحميل البيانات
      await loadPendingPayments()

      // تحديث الواجهة لإظهار عدم وجود مدفوعات آجلة
      setPendingSummary(null)
      setInvoiceData(null)

      // تصدير PDF تلقائياً بعد تأكيد الدفع
      setTimeout(async () => {
        try {
          await handleExportPDF()
        } catch (error) {
          console.error('خطأ في التصدير التلقائي للـ PDF:', error)
        }
      }, 1000) // انتظار ثانية واحدة للتأكد من تحديث البيانات

    } catch (error) {
      console.error('خطأ في تحديث المدفوعات:', error)
      toast({
        title: 'خطأ',
        description: 'فشل في تحديث المدفوعات',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handlePrint = () => {
    if (invoiceRef.current) {
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>فاتورة شاملة - ${patient?.full_name}</title>
              <style>
                body { font-family: Arial, sans-serif; direction: rtl; margin: 20px; }
                .invoice { max-width: 800px; margin: 0 auto; }
                .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
                .patient-info { margin: 20px 0; }
                .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                .items-table th, .items-table td { border: 1px solid #ddd; padding: 8px; text-align: center; }
                .items-table th { background-color: #f5f5f5; }
                .totals { margin-top: 20px; text-align: right; }
                .total-row { margin: 5px 0; }
                .final-total { font-weight: bold; font-size: 1.2em; border-top: 2px solid #333; padding-top: 10px; }
                @media print { body { margin: 0; } }
              </style>
            </head>
            <body>
              ${invoiceRef.current.innerHTML}
            </body>
          </html>
        `)
        printWindow.document.close()
        printWindow.print()
      }
    }
  }

  const handleExportPDF = async () => {
    if (!invoiceData) {
      toast({
        title: 'خطأ',
        description: 'لا توجد بيانات فاتورة للتصدير',
        variant: 'destructive'
      })
      return
    }

    try {
      setIsLoading(true)
      await PdfService.exportComprehensivePendingInvoice(invoiceData)

      toast({
        title: 'تم بنجاح',
        description: 'تم تصدير الفاتورة كملف PDF',
        variant: 'default'
      })
    } catch (error) {
      console.error('خطأ في تصدير PDF:', error)
      toast({
        title: 'خطأ',
        description: 'فشل في تصدير الفاتورة كـ PDF',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  // طباعة حرارية بنفس تنسيق إيصالات الدفعات
  const handleThermalPrint = async () => {
    if (!pendingSummary || !patient) return

    // توليد QR Code والباركود قبل الطباعة

    let currentQRCode = qrCodeDataURL
    let currentBarcode = barcodeDataURL

    // توليد QR Code والباركود بشكل متزامن
    if (printSettings.includeQR) {
      try {
        const qrData = generateQRData()

        if (qrData) {
          currentQRCode = await QRCode.toDataURL(qrData, {
            width: printSettings.printerType === 'a4' ? 120 : 80,
            margin: 1,
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            }
          })
        }
      } catch (error) {
        console.error('خطأ في توليد QR Code للطباعة:', error)
      }
    }

    if (printSettings.includeBarcode) {
      try {
        const canvas = document.createElement('canvas')
        const barcodeData = generateBarcode()

        if (barcodeData) {
          JsBarcode(canvas, barcodeData, {
            format: 'CODE128',
            width: printSettings.printerType === 'a4' ? 2 : 1,
            height: printSettings.printerType === 'a4' ? 50 : 30,
            displayValue: true,
            fontSize: printSettings.printerType === 'a4' ? 12 : 8,
            margin: 5
          })

          currentBarcode = canvas.toDataURL()
        }
      } catch (error) {
        console.error('خطأ في توليد الباركود للطباعة:', error)
      }
    }


    const printWindow = window.open('', '_blank')
    if (printWindow) {
      const receiptNumber = `INV-${Date.now().toString().slice(-6)}`
      const formattedDate = formatDate(new Date().toISOString().split('T')[0])

      // استخدام إعدادات الطباعة
      const printerWidth = printSettings.printerType === 'a4' ? '210mm' :
                          printSettings.printerType === '58mm' ? '58mm' : '80mm'
      const bodyWidth = printSettings.printerType === 'a4' ? '200mm' :
                       printSettings.printerType === '58mm' ? '54mm' : '76mm'

      // إنشاء محتوى HTML مع الصور المضمنة
      const htmlContent = `
        <html>
          <head>
            <title>فاتورة المدفوعات الآجلة - ${receiptNumber}</title>
            <meta charset="UTF-8">
            <style>
              @page {
                size: ${printerWidth} auto;
                margin: 0;
              }
              body {
                font-family: 'Courier New', monospace;
                direction: rtl;
                margin: 0;
                padding: 2mm;
                font-size: ${printSettings.printerType === 'a4' ? '12px' : '10px'};
                line-height: 1.2;
                color: #000;
                background: white;
                width: ${bodyWidth};
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
              .contact-info {
                font-size: 8px;
                margin: 1px 0;
              }
              .receipt-info {
                margin: 3px 0;
                font-size: 9px;
              }
              .patient-info {
                margin: 3px 0;
                padding: 2px 0;
                border-top: 1px dashed #000;
                border-bottom: 1px dashed #000;
              }
              .items {
                margin: 3px 0;
              }
              .item {
                margin: 2px 0;
                padding: 1px 0;
                border-bottom: 1px dotted #ccc;
              }
              .item-header {
                font-weight: bold;
                font-size: 9px;
              }
              .item-details {
                font-size: 8px;
                color: #666;
                margin: 1px 0;
              }
              .item-amount {
                text-align: left;
                font-weight: bold;
              }
              .totals {
                margin: 3px 0;
                border-top: 1px solid #000;
                padding-top: 2px;
              }
              .total-line {
                display: flex;
                justify-content: space-between;
                margin: 1px 0;
              }
              .final-total {
                font-weight: bold;
                font-size: 11px;
                border-top: 1px solid #000;
                padding-top: 2px;
                margin-top: 2px;
              }
              .footer {
                text-align: center;
                margin-top: 4px;
                padding-top: 2px;
                border-top: 1px dashed #000;
                font-size: 8px;
              }
              .dashed-line {
                border-top: 1px dashed #000;
                margin: 2px 0;
              }
            </style>
          </head>
          <body>
            <div class="receipt">
              <div class="header">
                ${printSettings.includeLogo && settings?.clinic_logo ? `
                  <div style="text-align: center; margin-bottom: 5px;">
                    <img src="${settings.clinic_logo}" alt="شعار العيادة" style="width: ${printSettings.printerType === 'a4' ? '60px' : '40px'}; height: ${printSettings.printerType === 'a4' ? '60px' : '40px'}; border-radius: 50%; border: 1px solid #000;" />
                  </div>
                ` : ''}
                <div class="clinic-name">${settings?.clinic_name || 'عيادة الأسنان'}</div>
                <div class="doctor-name">د. ${settings?.doctor_name || 'اسم الطبيب'}</div>
                <div class="contact-info">${settings?.clinic_phone || 'رقم الهاتف'}</div>
                <div class="contact-info">${settings?.clinic_address || 'العنوان'}</div>
              </div>

              <div class="receipt-info">
                <div><strong>فاتورة المدفوعات الآجلة</strong></div>
                <div>رقم الفاتورة: ${receiptNumber}</div>
                <div>التاريخ: ${formattedDate}</div>
              </div>

              <div class="patient-info">
                <div><strong>بيانات المريض:</strong></div>
                <div>الاسم: ${patient.full_name}</div>
                <div>الهاتف: ${patient.phone || 'غير محدد'}</div>
              </div>

              <div class="items">
                <div><strong>تفاصيل المدفوعات الآجلة:</strong></div>
                ${pendingSummary.items.map((item, index) => `
                  <div class="item">
                    <div class="item-header">
                      ${index + 1}. ${item.appointment_title || item.treatment_type || item.description}
                    </div>
                    <div class="item-details">
                      ${item.payment_date ? `📅 تاريخ الدفعة: ${formatDate(item.payment_date)}` : ''}
                      ${item.appointment_date ? `<br>📅 تاريخ الموعد: ${formatDate(item.appointment_date)}` : ''}
                      ${item.treatment_type ? `<br>🔧 نوع العلاج: ${item.treatment_type}` : ''}
                      ${item.tooth_name ? `<br>🦷 ${item.tooth_name} (${item.tooth_number})` : ''}
                      ${item.doctor_name ? `<br>👨‍⚕️ الطبيب: ${item.doctor_name}` : ''}
                      ${item.notes ? `<br>📝 ملاحظات: ${item.notes}` : ''}
                      ${item.payment_method ? `<br>💳 طريقة الدفع: ${item.payment_method}` : ''}
                      ${item.discount_amount && item.discount_amount > 0 ? `<br><span style="color: #dc2626;">💰 خصم: ${formatCurrency(item.discount_amount)}</span>` : ''}
                    </div>
                    <div class="item-amount">${formatCurrency(item.amount)}</div>
                  </div>
                `).join('')}
              </div>

              <!-- تفاصيل إضافية للفاتورة -->
              <div class="invoice-details" style="margin: 10px 0; padding: 5px 0; border-top: 1px dashed #000;">
                <div style="font-size: 9px; color: #666;">
                  <div>📊 إجمالي العناصر: ${pendingSummary.items.length}</div>
                  <div>📅 فترة الفاتورة: ${formatDate(pendingSummary.date_range.from)} - ${formatDate(pendingSummary.date_range.to)}</div>
                  ${invoiceSettings.discount_reason ? `<div>💸 سبب الخصم: ${invoiceSettings.discount_reason}</div>` : ''}
                  ${invoiceSettings.notes ? `<div>📝 ملاحظات: ${invoiceSettings.notes}</div>` : ''}
                </div>
              </div>

              <div class="totals">
                <div class="total-line">
                  <span>المجموع الفرعي:</span>
                  <span>${formatCurrency(pendingSummary.subtotal)}</span>
                </div>
                ${pendingSummary.total_discount > 0 ? `
                  <div class="total-line">
                    <span>الخصم:</span>
                    <span>-${formatCurrency(pendingSummary.total_discount)}</span>
                  </div>
                ` : ''}
                ${pendingSummary.total_tax > 0 ? `
                  <div class="total-line">
                    <span>الضريبة:</span>
                    <span>+${formatCurrency(pendingSummary.total_tax)}</span>
                  </div>
                ` : ''}
                <div class="total-line final-total">
                  <span>المجموع النهائي:</span>
                  <span>${formatCurrency(pendingSummary.final_total)}</span>
                </div>
              </div>

              ${printSettings.includeQR ? `
                <div style="text-align: center; margin: 10px 0; border-top: 1px dashed #000; padding-top: 5px;">
                  ${currentQRCode ? `
                    <img src="${currentQRCode}" alt="QR Code" style="width: ${printSettings.printerType === 'a4' ? '80px' : '60px'}; height: ${printSettings.printerType === 'a4' ? '80px' : '60px'}; margin: 0 auto;" />
                    <div style="font-size: 8px; color: #666; margin-top: 2px;">امسح للتحقق من الفاتورة الكاملة</div>
                    <div style="font-size: 7px; color: #999; margin-top: 1px;">
                      يحتوي على: تفاصيل العيادة | بيانات المريض | ${pendingSummary.items.length} عنصر | المبلغ الإجمالي
                    </div>
                    <div style="font-size: 7px; color: #999; margin-top: 1px;">
                      رقم الفاتورة: ${generateBarcode()}
                    </div>
                  ` : `
                    <div style="border: 1px solid #000; width: ${printSettings.printerType === 'a4' ? '80px' : '60px'}; height: ${printSettings.printerType === 'a4' ? '80px' : '60px'}; margin: 0 auto; display: flex; align-items: center; justify-content: center;">
                      <div style="font-size: 8px; text-align: center;">QR Code<br/>غير متوفر</div>
                    </div>
                  `}
                </div>
              ` : ''}

              ${printSettings.includeBarcode ? `
                <div style="text-align: center; margin: 5px 0;">
                  ${currentBarcode ? `
                    <img src="${currentBarcode}" alt="باركود الفاتورة" style="width: ${printSettings.printerType === 'a4' ? '120px' : '100px'}; height: ${printSettings.printerType === 'a4' ? '30px' : '20px'}; margin: 0 auto;" />
                    <div style="font-size: 8px; color: #666; margin-top: 2px;">${generateBarcode()}</div>
                    <div style="font-size: 7px; color: #999; margin-top: 1px;">
                      المريض: ${patient.id.toString().padStart(4, '0')} | العناصر: ${pendingSummary.items.length.toString().padStart(2, '0')} | المبلغ: ${Math.round(pendingSummary.final_total).toString().padStart(6, '0')}
                    </div>
                  ` : `
                    <div style="border: 1px solid #000; width: ${printSettings.printerType === 'a4' ? '120px' : '100px'}; height: ${printSettings.printerType === 'a4' ? '30px' : '20px'}; margin: 0 auto; display: flex; align-items: center; justify-content: center;">
                      <div style="font-size: 8px;">باركود غير متوفر</div>
                    </div>
                  `}
                </div>
              ` : ''}

              <div class="footer">
                <div>شكراً لثقتكم بنا</div>
                <div class="dashed-line"></div>
                <div>تم الطباعة: ${new Date().toLocaleString('ar-EG')}</div>
              </div>
            </div>
          </body>
        </html>
      `

      printWindow.document.write(htmlContent)
      printWindow.document.close()

      // انتظار تحميل الصور قبل الطباعة
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print()
        }, 1000)
      }

      // في حالة عدم تشغيل onload
      setTimeout(() => {
        printWindow.print()
      }, 2000)
    }
  }

  const handleShareWhatsApp = async () => {
    if (!pendingSummary || !patient) return

    // تنظيف رقم الهاتف
    let phoneNumber = patient.phone || ''
    phoneNumber = phoneNumber.replace(/\D/g, '') // إزالة كل شيء عدا الأرقام

    if (!phoneNumber) {
      toast({
        title: 'خطأ',
        description: 'رقم هاتف المريض غير متوفر',
        variant: 'destructive'
      })
      return
    }

    // إضافة رمز الدولة إذا لم يكن موجوداً
    if (!phoneNumber.startsWith('963')) {
      phoneNumber = '963' + phoneNumber
    }

    // إنشاء رسالة الواتساب
    const clinicName = settings?.clinic_name || 'عيادة الأسنان'
    const doctorName = settings?.doctor_name || 'الطبيب'
    const receiptNumber = `INV-${Date.now().toString().slice(-6)}`
    const formattedDate = formatDate(new Date().toISOString().split('T')[0])

    let message = `🏥 *${clinicName}*\n`
    message += `👨‍⚕️ د. ${doctorName}\n\n`
    message += `📋 *فاتورة المدفوعات الآجلة*\n`
    message += `🔢 رقم الفاتورة: ${receiptNumber}\n`
    message += `📅 التاريخ: ${formattedDate}\n\n`
    message += `👤 *بيانات المريض:*\n`
    message += `الاسم: ${patient.full_name}\n\n`
    message += `💰 *تفاصيل المدفوعات الآجلة:*\n`

    pendingSummary.items.forEach((item, index) => {
      message += `\n${index + 1}. ${item.appointment_title || item.treatment_type || item.description}\n`
      if (item.payment_date) {
        message += `   📅 تاريخ الدفعة: ${formatDate(item.payment_date)}\n`
      }
      if (item.appointment_date) {
        message += `   📅 تاريخ الموعد: ${formatDate(item.appointment_date)}\n`
      }
      if (item.treatment_type) {
        message += `   🔧 ${item.treatment_type}\n`
      }
      if (item.tooth_name) {
        message += `   🦷 ${item.tooth_name} (${item.tooth_number})\n`
      }
      message += `   💵 ${formatCurrency(item.amount)}\n`
    })

    message += `\n📊 *ملخص المبالغ:*\n`
    message += `المجموع الفرعي: ${formatCurrency(pendingSummary.subtotal)}\n`

    if (pendingSummary.total_discount > 0) {
      message += `الخصم: -${formatCurrency(pendingSummary.total_discount)}\n`
    }

    if (pendingSummary.total_tax > 0) {
      message += `الضريبة: +${formatCurrency(pendingSummary.total_tax)}\n`
    }

    message += `*المجموع النهائي: ${formatCurrency(pendingSummary.final_total)}*\n\n`
    message += `🙏 شكراً لثقتكم بنا`

    // إنشاء رابط الواتساب
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`

    // استخدام نفس طريقة فتح الروابط الخارجية المستخدمة في التطبيق
    try {
      // Method 1: Try electronAPI system.openExternal
      if (window.electronAPI && window.electronAPI.system && window.electronAPI.system.openExternal) {
        await window.electronAPI.system.openExternal(whatsappUrl)
        toast({
          title: 'تم بنجاح',
          description: 'تم فتح الواتساب خارجياً لإرسال الفاتورة',
          variant: 'default'
        })
        return
      }
    } catch (error) {
    }

    try {
      // Method 2: Try direct shell.openExternal via ipcRenderer
      if (window.electronAPI) {
        // @ts-ignore
        await window.electronAPI.shell?.openExternal?.(whatsappUrl)
        toast({
          title: 'تم بنجاح',
          description: 'تم فتح الواتساب خارجياً لإرسال الفاتورة',
          variant: 'default'
        })
        return
      }
    } catch (error) {
    }

    // Method 3: Fallback to window.open
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer')

    toast({
      title: 'تم بنجاح',
      description: 'تم فتح الواتساب في المتصفح لإرسال الفاتورة',
      variant: 'default'
    })
  }

  if (!patient) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              فاتورة المدفوعات الآجلة الشاملة
            </span>
            <Badge variant="outline" className="text-sm">
              {patient.full_name}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-12 gap-4 p-4 h-[calc(95vh-100px)]">
          {/* الشريط الجانبي للإعدادات - مضغوط */}
          <div className="col-span-3 space-y-3">
            {/* فلتر التاريخ - مضغوط */}
            <Card className="p-3">
              <div className="space-y-2">
                <Label className="text-xs font-medium flex items-center gap-1">
                  <Filter className="w-3 h-3" />
                  فلتر التاريخ
                </Label>
                <Select
                  value={filter.date_range}
                  onValueChange={(value: any) => handleFilterChange('date_range', value)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="last_month">آخر شهر</SelectItem>
                    <SelectItem value="last_3_months">آخر 3 أشهر</SelectItem>
                    <SelectItem value="last_6_months">آخر 6 أشهر</SelectItem>
                    <SelectItem value="last_year">آخر سنة</SelectItem>
                    <SelectItem value="custom">تاريخ مخصص</SelectItem>
                  </SelectContent>
                </Select>

                {filter.date_range === 'custom' && (
                  <div className="grid grid-cols-2 gap-1">
                    <div>
                      <Label className="text-xs">من</Label>
                      <Input
                        type="date"
                        className="h-8 text-xs"
                        value={filter.custom_start_date || ''}
                        onChange={(e) => handleFilterChange('custom_start_date', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">إلى</Label>
                      <Input
                        type="date"
                        className="h-8 text-xs"
                        value={filter.custom_end_date || ''}
                        onChange={(e) => handleFilterChange('custom_end_date', e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* إعدادات الخصم والضريبة - مضغوط */}
            <Card className="p-3">
              <div className="space-y-2">
                <Label className="text-xs font-medium flex items-center gap-1">
                  <Calculator className="w-3 h-3" />
                  الخصومات والضرائب
                </Label>
                <div className="flex items-center justify-between">
                  <Label className="text-xs">تطبيق خصم</Label>
                  <Switch
                    checked={invoiceSettings.apply_discount}
                    onCheckedChange={(checked) =>
                      handleSettingsChange('apply_discount', checked)
                    }
                  />
                </div>

                {invoiceSettings.apply_discount && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-1">
                      <div>
                        <Label className="text-xs">نوع الخصم</Label>
                        <Select
                          value={invoiceSettings.discount_type}
                          onValueChange={(value: any) => handleSettingsChange('discount_type', value)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">نسبة مئوية</SelectItem>
                            <SelectItem value="fixed">مبلغ ثابت</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">
                          قيمة الخصم {invoiceSettings.discount_type === 'percentage' ? '(%)' : '(مبلغ)'}
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.1"
                          className="h-8 text-xs"
                          value={invoiceSettings.discount_value}
                          onChange={(e) => {
                            const value = e.target.value
                            handleSettingsChange('discount_value', value === '' ? 0 : parseFloat(value) || 0)
                          }}
                          onBlur={(e) => {
                            const value = parseFloat(e.target.value) || 0
                            handleSettingsChange('discount_value', value)
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">سبب الخصم</Label>
                      <Input
                        className="h-8 text-xs"
                        value={invoiceSettings.discount_reason || ''}
                        onChange={(e) => handleSettingsChange('discount_reason', e.target.value)}
                        placeholder="اختياري"
                      />
                    </div>
                  </div>
                )}

                <Separator />

                <div className="flex items-center justify-between">
                  <Label className="text-xs">تضمين ضريبة</Label>
                  <Switch
                    checked={invoiceSettings.include_tax}
                    onCheckedChange={(checked) =>
                      handleSettingsChange('include_tax', checked)
                    }
                  />
                </div>

                {invoiceSettings.include_tax && (
                  <div>
                    <Label className="text-xs">معدل الضريبة (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      className="h-8 text-xs"
                      value={invoiceSettings.tax_rate}
                      onChange={(e) => {
                        const value = e.target.value
                        handleSettingsChange('tax_rate', value === '' ? 0 : parseFloat(value) || 0)
                      }}
                      onBlur={(e) => {
                        const value = parseFloat(e.target.value) || 0
                        handleSettingsChange('tax_rate', value)
                      }}
                    />
                  </div>
                )}
              </div>
            </Card>

            {/* إعدادات الطباعة الحرارية - مضغوط */}
            <Card className="p-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium flex items-center gap-1">
                    <Settings className="w-3 h-3" />
                    إعدادات الطباعة
                  </Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPreview(!showPreview)}
                    className="text-xs h-6 px-2"
                  >
                    <Eye className="w-3 h-3 ml-1" />
                    {showPreview ? 'إخفاء' : 'معاينة'}
                  </Button>
                </div>
                  <div className="grid grid-cols-2 gap-3">
                    {/* نوع الطابعة */}
                    <div className="space-y-1">
                      <Label className="text-xs">نوع الطابعة</Label>
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

                    {/* نمط الألوان */}
                    <div className="space-y-1">
                      <Label className="text-xs">نمط الألوان</Label>
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
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {/* تضمين الشعار */}
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <input
                        type="checkbox"
                        id="includeLogo"
                        checked={printSettings.includeLogo}
                        onChange={(e) => setPrintSettings(prev => ({ ...prev, includeLogo: e.target.checked }))}
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor="includeLogo" className="text-xs">
                        تضمين الشعار
                      </Label>
                    </div>

                    {/* تضمين QR Code */}
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <input
                        type="checkbox"
                        id="includeQR"
                        checked={printSettings.includeQR}
                        onChange={(e) => setPrintSettings(prev => ({ ...prev, includeQR: e.target.checked }))}
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor="includeQR" className="text-xs">
                        QR Code
                      </Label>
                    </div>

                    {/* تضمين الباركود */}
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <input
                        type="checkbox"
                        id="includeBarcode"
                        checked={printSettings.includeBarcode}
                        onChange={(e) => setPrintSettings(prev => ({ ...prev, includeBarcode: e.target.checked }))}
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor="includeBarcode" className="text-xs">
                        تضمين الباركود
                      </Label>
                    </div>
                </div>

                {/* معاينة QR Code والباركود */}
                {showPreview && (printSettings.includeQR || printSettings.includeBarcode) && (
                  <div className="mt-3 p-2 border rounded bg-muted/20">
                    <Label className="text-xs font-medium">معاينة:</Label>
                    <div className="flex justify-center gap-4 mt-2">
                      {printSettings.includeQR && (
                        <div className="text-center">
                          {qrCodeDataURL ? (
                            <img
                              src={qrCodeDataURL}
                              alt="QR Code"
                              className="w-16 h-16 mx-auto border"
                            />
                          ) : (
                            <div className="w-16 h-16 mx-auto border flex items-center justify-center bg-gray-100">
                              <span className="text-xs">QR</span>
                            </div>
                          )}
                          <p className="text-xs mt-1">QR Code</p>
                        </div>
                      )}
                      {printSettings.includeBarcode && (
                        <div className="text-center">
                          {barcodeDataURL ? (
                            <img
                              src={barcodeDataURL}
                              alt="Barcode"
                              className="h-8 mx-auto border"
                              style={{ width: 'auto' }}
                            />
                          ) : (
                            <div className="w-20 h-8 mx-auto border flex items-center justify-center bg-gray-100">
                              <span className="text-xs">|||</span>
                            </div>
                          )}
                          <p className="text-xs mt-1">باركود</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* أزرار الإجراءات - مضغوط */}
            <div className="space-y-2">
              <Button
                onClick={handleMarkAllAsCompleted}
                disabled={isLoading || !pendingSummary || pendingSummary.items.length === 0}
                className="w-full h-8 text-xs"
                variant="default"
              >
                <CheckCircle className="w-3 h-3 mr-1" />
                تأكيد دفع الكل
              </Button>

              <div className="grid grid-cols-2 gap-1">
                <Button
                  onClick={handleThermalPrint}
                  disabled={!pendingSummary}
                  variant="outline"
                  className="h-8 text-xs"
                >
                  <Printer className="w-3 h-3 mr-1" />
                  طباعة حرارية
                </Button>

                <Button
                  onClick={handleShareWhatsApp}
                  disabled={!pendingSummary}
                  variant="outline"
                  className="h-8 text-xs"
                >
                  <MessageCircle className="w-3 h-3 mr-1" />
                  واتساب
                </Button>
              </div>

            </div>
          </div>

          {/* منطقة عرض الفاتورة - أوسع */}
          <div className="col-span-9 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center h-40">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">جاري تحميل المدفوعات الآجلة...</p>
                    <p className="text-xs text-muted-foreground mt-1">يرجى الانتظار</p>
                  </div>
                </div>
            ) : pendingSummary ? (
              <div ref={invoiceRef} className="space-y-4 p-4">
                {/* رأس الفاتورة - مضغوط */}
                <div className="text-center border-b pb-3">
                  <h2 className="text-xl font-bold">فاتورة المدفوعات الآجلة الشاملة</h2>
                  <div className="flex justify-center gap-4 text-sm text-muted-foreground mt-1">
                    <span>رقم الفاتورة: {invoiceData?.invoice_number}</span>
                    <span>تاريخ الإصدار: {formatDate(invoiceData?.invoice_date || '')}</span>
                  </div>
                </div>

                {/* معلومات المريض والعيادة - مضغوط */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 border rounded-lg">
                    <h3 className="text-sm font-medium mb-2">معلومات المريض</h3>
                    <div className="text-xs space-y-1">
                      <p><strong>الاسم:</strong> {patient.full_name}</p>
                      <p><strong>الهاتف:</strong> {patient.phone}</p>
                      {patient.email && <p><strong>الإيميل:</strong> {patient.email}</p>}
                    </div>
                  </div>

                  <div className="p-3 border rounded-lg">
                    <h3 className="text-sm font-medium mb-2">معلومات العيادة</h3>
                    <div className="text-xs space-y-1">
                      <p><strong>اسم العيادة:</strong> {settings.clinic_name}</p>
                      {settings.clinic_phone && <p><strong>الهاتف:</strong> {settings.clinic_phone}</p>}
                      {settings.clinic_address && <p><strong>العنوان:</strong> {settings.clinic_address}</p>}
                    </div>
                  </div>
                </div>

                {/* تفاصيل المدفوعات الآجلة الشاملة - مضغوط */}
                <div className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium">تفاصيل المدفوعات الآجلة الشاملة</h3>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {pendingSummary.total_items} عنصر
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(pendingSummary.date_range.from)} - {formatDate(pendingSummary.date_range.to)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {pendingSummary.items.map((item, index) => {
                      // تحديد نوع العنصر والتفاصيل
                      let itemType = 'عام'
                      let itemIcon = '💰'
                      let itemTitle = 'دفعة آجلة'

                      // تنظيف الوصف من معرفات العلاج
                      let cleanDescription = item.description
                      if (cleanDescription) {
                        cleanDescription = cleanDescription.replace(/\[علاج:[^\]]+\]/g, '').trim()
                        cleanDescription = cleanDescription.replace(/^\s*-\s*/, '').trim()
                      }

                      if (item.tooth_treatment_id) {
                        itemType = 'علاج'
                        itemIcon = '🦷'
                        // أولوية لاسم العلاج بالعربية، ثم الوصف المنظف
                        itemTitle = item.treatment_type || cleanDescription || 'علاج سن'

                      } else if (item.appointment_id) {
                        itemType = 'موعد'
                        itemIcon = '📅'
                        itemTitle = item.appointment_title || cleanDescription || 'موعد طبي'
                      } else {
                        itemTitle = cleanDescription || 'دفعة آجلة'
                      }

                      return (
                        <div key={item.id} className="flex items-center justify-between p-2 border rounded text-xs">
                          <div className="flex-1">
                            <div className="flex items-start gap-2">
                              <span className="font-medium text-xs">{index + 1}.</span>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge
                                    variant={
                                      itemType === 'علاج' ? 'default' :
                                      itemType === 'موعد' ? 'secondary' : 'outline'
                                    }
                                    className="text-xs px-1 py-0"
                                  >
                                    {itemIcon} {itemType}
                                  </Badge>
                                  <p className="font-medium text-sm">
                                    {itemTitle}
                                  </p>
                                </div>
                                <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                                  {item.payment_date && (
                                    <p>📅 تاريخ الدفعة: {formatDate(item.payment_date)}</p>
                                  )}
                                  {item.appointment_date && (
                                    <p>📅 تاريخ الموعد: {formatDate(item.appointment_date)}</p>
                                  )}
                                  {item.tooth_name && (
                                    <p>🦷 {item.tooth_name} (سن #{item.tooth_number})</p>
                                  )}
                                  {item.treatment_type && itemType === 'علاج' && (
                                    <p>🔧 نوع العلاج: {item.treatment_type}</p>
                                  )}
                                  {item.doctor_name && (
                                    <p>👨‍⚕️ الطبيب: {item.doctor_name}</p>
                                  )}
                                  {item.notes && (
                                    <p>📝 ملاحظات: {item.notes}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="text-left ml-2">
                            <p className="font-bold text-sm">{formatCurrency(item.amount)}</p>
                            {item.discount_amount && item.discount_amount > 0 && (
                              <p className="text-xs text-red-600">
                                خصم: {formatCurrency(item.discount_amount)}
                              </p>
                            )}
                            {/* عرض المبلغ المتبقي للعلاجات */}
                            {itemType === 'علاج' && item.treatment_remaining_balance && item.treatment_remaining_balance > 0 && (
                              <p className="text-xs text-orange-600">
                                متبقي: {formatCurrency(item.treatment_remaining_balance)}
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* ملخص المبالغ - مضغوط */}
                <div className="border rounded-lg p-3">
                  <h3 className="text-sm font-medium mb-3 flex items-center gap-1">
                    <DollarSign className="w-4 h-4" />
                    ملخص المبالغ
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>المجموع الفرعي:</span>
                      <span className="font-medium">{formatCurrency(pendingSummary.subtotal)}</span>
                    </div>

                    {pendingSummary.total_discount > 0 && (
                      <div className="flex justify-between text-red-600">
                        <span>
                          الخصم ({invoiceSettings.discount_type === 'percentage'
                            ? `${invoiceSettings.discount_value}%`
                            : 'مبلغ ثابت'}):
                        </span>
                        <span className="font-medium">-{formatCurrency(pendingSummary.total_discount)}</span>
                      </div>
                    )}

                    {pendingSummary.total_tax > 0 && (
                      <div className="flex justify-between text-blue-600">
                        <span>الضريبة ({invoiceSettings.tax_rate}%):</span>
                        <span className="font-medium">+{formatCurrency(pendingSummary.total_tax)}</span>
                      </div>
                    )}

                    <Separator />

                    <div className="flex justify-between text-lg font-bold">
                      <span>المجموع النهائي:</span>
                      <span className="text-primary">{formatCurrency(pendingSummary.final_total)}</span>
                    </div>
                  </div>
                </div>

                {/* ملاحظات إضافية - مضغوط */}
                {invoiceSettings.footer_notes && (
                  <div className="border rounded-lg p-3">
                    <p className="text-center text-sm text-muted-foreground">
                      {invoiceSettings.footer_notes}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-40">
                <div className="text-center">
                  <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground mb-2">لا توجد مدفوعات آجلة للمريض</p>
                  <p className="text-xs text-muted-foreground mb-2">
                    جرب تغيير فلتر التاريخ أو تفعيل خيارات إضافية
                  </p>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>• تأكد من وجود مدفوعات بحالة "آجل" للمريض</p>
                    <p>• جرب توسيع نطاق التاريخ</p>
                    <p>• فعل خيار "المواعيد غير المدفوعة" أو "العلاجات غير المدفوعة"</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default memo(ComprehensivePendingInvoiceDialog)
