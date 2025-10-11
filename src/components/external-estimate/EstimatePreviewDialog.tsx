import React, { useState, useRef } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useSettingsStore } from '@/store/settingsStore'
import { useStableClinicName, useStableDoctorName, useStableContactInfo, useStableClinicLogo } from '@/hooks/useStableSettings'
import { useCurrency } from '@/contexts/CurrencyContext'
import { useTheme } from '@/contexts/ThemeContext'
import { formatDate } from '@/lib/utils'
import { notify } from '@/services/notificationService'
import { Printer, Download, FileText, Building2, Phone, MapPin, Calendar, User } from 'lucide-react'

interface EstimateItem {
  id: string
  treatmentType: string
  treatmentName: string
  quantity: number
  unitPrice: number
  totalPrice: number
  notes?: string
}

interface EstimateData {
  patientName: string
  patientPhone: string
  items: EstimateItem[]
  subtotal: number
  discount: number
  discountType: 'percentage' | 'fixed'
  tax: number
  taxRate: number
  total: number
  notes: string
  validUntil: string
}

interface EstimatePreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  estimateData: EstimateData
}

export default function EstimatePreviewDialog({ open, onOpenChange, estimateData }: EstimatePreviewDialogProps) {
  const { settings } = useSettingsStore()
  const { formatAmount } = useCurrency()
  const { isDarkMode } = useTheme()
  const clinicName = useStableClinicName()
  const doctorName = useStableDoctorName()
  const clinicLogo = useStableClinicLogo()
  const { phone, email, address } = useStableContactInfo()
  const previewRef = useRef<HTMLDivElement>(null)

  const [isExporting, setIsExporting] = useState(false)

  // Generate estimate number
  const estimateNumber = `EST-${Date.now().toString().slice(-6)}`
  const currentDate = new Date().toISOString().split('T')[0]

  // Calculate discount amount
  const discountAmount = estimateData.discountType === 'percentage' 
    ? (estimateData.subtotal * estimateData.discount) / 100 
    : estimateData.discount

  // Handle print
  const handlePrint = () => {
    if (!previewRef.current) return

    const printWindow = window.open('', '_blank')
    if (printWindow) {
      const printContent = previewRef.current.innerHTML
      
      printWindow.document.write(`
        <!DOCTYPE html>
        <html dir="rtl">
        <head>
          <meta charset="utf-8">
          <title>فاتورة تقديرية - ${estimateNumber}</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              direction: rtl;
              margin: 0;
              padding: 20px;
              background: white;
              color: black;
              font-size: 14px;
              line-height: 1.6;
            }
            .estimate-container {
              max-width: 800px;
              margin: 0 auto;
              background: white;
              border: 1px solid #ddd;
              border-radius: 8px;
              overflow: hidden;
            }
            .estimate-header {
              background: linear-gradient(135deg, #3b82f6, #1d4ed8);
              color: white;
              padding: 30px;
              text-align: center;
            }
            .estimate-title {
              font-size: 28px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            .estimate-number {
              font-size: 16px;
              opacity: 0.9;
            }
            .clinic-info {
              background: #f8fafc;
              padding: 20px;
              border-bottom: 1px solid #e2e8f0;
            }
            .clinic-logo {
              width: 60px;
              height: 60px;
              border-radius: 8px;
              object-fit: cover;
              border: 2px solid #e2e8f0;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
              margin-left: 15px;
              float: right;
            }
            .clinic-name {
              font-size: 20px;
              font-weight: bold;
              color: #1e293b;
              margin-bottom: 5px;
            }
            .doctor-name {
              font-size: 16px;
              color: #64748b;
              margin-bottom: 10px;
            }
            .contact-info {
              display: flex;
              gap: 20px;
              flex-wrap: wrap;
              font-size: 14px;
              color: #64748b;
            }
            .patient-info {
              padding: 20px;
              background: #fefefe;
              border-bottom: 1px solid #e2e8f0;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 8px;
            }
            .info-label {
              font-weight: 600;
              color: #374151;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
            }
            .items-table th,
            .items-table td {
              padding: 12px;
              text-align: right;
              border-bottom: 1px solid #e2e8f0;
            }
            .items-table th {
              background: #f1f5f9;
              font-weight: 600;
              color: #374151;
            }
            .items-table tbody tr:hover {
              background: #f8fafc;
            }
            .summary-section {
              padding: 20px;
              background: #f8fafc;
            }
            .summary-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 8px;
              padding: 4px 0;
            }
            .summary-total {
              font-size: 18px;
              font-weight: bold;
              color: #1e293b;
              border-top: 2px solid #3b82f6;
              padding-top: 12px;
              margin-top: 12px;
            }
            .notes-section {
              padding: 20px;
              background: #fffbeb;
              border-top: 1px solid #e2e8f0;
            }
            .footer {
              padding: 20px;
              text-align: center;
              background: #1e293b;
              color: white;
              font-size: 12px;
            }
            .stamp-area {
              margin-top: 30px;
              padding: 20px;
              border: 2px dashed #cbd5e1;
              text-align: center;
              color: #64748b;
            }
            .stamp-logo {
              width: 80px;
              height: 80px;
              border-radius: 50%;
              object-fit: cover;
              border: 2px solid #9ca3af;
              box-shadow: 0 4px 12px rgba(0,0,0,0.15);
              opacity: 0.6;
              margin: 0 auto 10px;
            }
            @media print {
              body { margin: 0; padding: 0; }
              .estimate-container { border: none; border-radius: 0; }
            }
          </style>
        </head>
        <body>
          ${printContent}
        </body>
        </html>
      `)
      
      printWindow.document.close()
      printWindow.focus()
      
      setTimeout(() => {
        printWindow.print()
        printWindow.close()
      }, 250)
    }
  }

  // Handle PDF export
  const handleExportPDF = async () => {
    setIsExporting(true)
    try {
      // Import html2canvas and jsPDF dynamically
      const html2canvas = (await import('html2canvas')).default
      const jsPDF = (await import('jspdf')).default

      if (!previewRef.current) return

      // Create canvas from the preview content
      const canvas = await html2canvas(previewRef.current, {
        scale: 1.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: previewRef.current.scrollWidth,
        height: previewRef.current.scrollHeight
      })

      // Create PDF
      const imgData = canvas.toDataURL('image/jpeg', 0.95)
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      // Calculate dimensions
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      const imgWidth = pdfWidth - 20 // 10mm margin on each side
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      let heightLeft = imgHeight
      let position = 10 // 10mm top margin

      // Add first page
      pdf.addImage(imgData, 'JPEG', 10, position, imgWidth, imgHeight)
      heightLeft -= (pdfHeight - 20)

      // Add additional pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight + 10
        pdf.addPage()
        pdf.addImage(imgData, 'JPEG', 10, position, imgWidth, imgHeight)
        heightLeft -= (pdfHeight - 20)
      }

      // Save the PDF
      const fileName = `فاتورة_تقديرية_${estimateData.patientName || 'مريض'}_${new Date().toLocaleDateString('en-GB').replace(/\//g, '-')}.pdf`
      pdf.save(fileName)

      notify.success('تم تصدير الفاتورة بنجاح')
    } catch (error) {
      console.error('Error exporting PDF:', error)
      notify.error('فشل في تصدير الفاتورة')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center text-xl font-semibold">
            <FileText className="w-5 h-5 ml-2" />
            معاينة الفاتورة التقديرية
          </DialogTitle>
          <DialogDescription>
            معاينة الفاتورة قبل الطباعة أو التصدير
          </DialogDescription>
        </DialogHeader>

        {/* Preview Content */}
        <div ref={previewRef} className="estimate-container bg-white text-black" style={{ fontFamily: 'Arial, sans-serif' }}>
          {/* Header */}
          <div className="estimate-header bg-gradient-to-br from-blue-500 to-blue-700 text-white p-8 text-center">
            <div className="estimate-title text-3xl font-bold mb-2">فاتورة تقديرية</div>
            <div className="estimate-number text-lg opacity-90">رقم التقدير: {estimateNumber}</div>
          </div>

          {/* Clinic Information */}
          <div className="clinic-info bg-gray-50 p-6 border-b border-gray-200">
            <div className="flex items-center gap-4 mb-3">
              {/* Clinic Logo */}
              {clinicLogo && clinicLogo.trim() !== '' && (
                <div className="flex-shrink-0">
                  <img
                    src={clinicLogo}
                    alt="شعار العيادة"
                    className="w-16 h-16 rounded-lg object-cover border-2 border-gray-300 shadow-sm"
                    onError={(e) => {
                      console.log('Estimate logo failed to load:', clinicLogo)
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                </div>
              )}
              {/* Clinic Name and Doctor */}
              <div className="flex-1">
                <div className="clinic-name text-xl font-bold text-gray-800 mb-1">{clinicName}</div>
                {doctorName && <div className="doctor-name text-lg text-gray-600">د. {doctorName}</div>}
              </div>
            </div>
            <div className="contact-info flex gap-6 flex-wrap text-sm text-gray-600">
              {phone && (
                <div className="flex items-center gap-1">
                  <Phone className="w-4 h-4" />
                  <span>{phone}</span>
                </div>
              )}
              {email && (
                <div className="flex items-center gap-1">
                  <span>📧</span>
                  <span>{email}</span>
                </div>
              )}
              {address && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  <span>{address}</span>
                </div>
              )}
            </div>
          </div>

          {/* Patient and Date Information */}
          <div className="patient-info p-6 bg-gray-50 border-b border-gray-200">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="info-row flex justify-between mb-2">
                  <span className="info-label font-semibold text-gray-700">اسم المريض:</span>
                  <span>{estimateData.patientName || 'غير محدد'}</span>
                </div>
                {estimateData.patientPhone && (
                  <div className="info-row flex justify-between mb-2">
                    <span className="info-label font-semibold text-gray-700">رقم الهاتف:</span>
                    <span>{estimateData.patientPhone}</span>
                  </div>
                )}
              </div>
              <div>
                <div className="info-row flex justify-between mb-2">
                  <span className="info-label font-semibold text-gray-700">تاريخ التقدير:</span>
                  <span>{formatDate(currentDate)}</span>
                </div>
                <div className="info-row flex justify-between mb-2">
                  <span className="info-label font-semibold text-gray-700">صالح حتى:</span>
                  <span>{formatDate(estimateData.validUntil)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Treatment Items */}
          <div className="p-6">
            <table className="items-table w-full border-collapse">
              <thead>
                <tr>
                  <th className="p-3 text-right bg-gray-100 font-semibold text-gray-700 border-b border-gray-200">#</th>
                  <th className="p-3 text-right bg-gray-100 font-semibold text-gray-700 border-b border-gray-200">العلاج</th>
                  <th className="p-3 text-right bg-gray-100 font-semibold text-gray-700 border-b border-gray-200">الكمية</th>
                  <th className="p-3 text-right bg-gray-100 font-semibold text-gray-700 border-b border-gray-200">السعر</th>
                  <th className="p-3 text-right bg-gray-100 font-semibold text-gray-700 border-b border-gray-200">المجموع</th>
                </tr>
              </thead>
              <tbody>
                {estimateData.items.map((item, index) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="p-3 border-b border-gray-200">{index + 1}</td>
                    <td className="p-3 border-b border-gray-200">
                      <div>
                        <div className="font-medium">{item.treatmentName}</div>
                        {item.notes && (
                          <div className="text-sm text-gray-600 mt-1">{item.notes}</div>
                        )}
                      </div>
                    </td>
                    <td className="p-3 border-b border-gray-200">{item.quantity}</td>
                    <td className="p-3 border-b border-gray-200">{formatAmount(item.unitPrice)}</td>
                    <td className="p-3 border-b border-gray-200 font-medium">{formatAmount(item.totalPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="summary-section p-6 bg-gray-50">
            <div className="max-w-md mr-auto">
              <div className="summary-row flex justify-between mb-2">
                <span>المجموع الفرعي:</span>
                <span>{formatAmount(estimateData.subtotal)}</span>
              </div>
              {estimateData.discount > 0 && (
                <div className="summary-row flex justify-between mb-2 text-green-600">
                  <span>الخصم:</span>
                  <span>-{formatAmount(discountAmount)}</span>
                </div>
              )}
              {estimateData.tax > 0 && (
                <div className="summary-row flex justify-between mb-2">
                  <span>الضريبة ({estimateData.taxRate}%):</span>
                  <span>{formatAmount(estimateData.tax)}</span>
                </div>
              )}
              <div className="summary-total flex justify-between text-lg font-bold text-gray-800 border-t-2 border-blue-500 pt-3 mt-3">
                <span>المجموع الكلي:</span>
                <span>{formatAmount(estimateData.total)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {estimateData.notes && (
            <div className="notes-section p-6 bg-yellow-50 border-t border-gray-200">
              <h4 className="font-semibold text-gray-800 mb-2">ملاحظات:</h4>
              <p className="text-gray-700 whitespace-pre-wrap">{estimateData.notes}</p>
            </div>
          )}

          {/* Stamp Area */}
          <div className="stamp-area m-6 p-6 border-2 border-dashed border-gray-300 text-center text-gray-500">
            {settings?.estimate_show_clinic_stamp && clinicLogo && clinicLogo.trim() !== '' ? (
              <div className="flex flex-col items-center gap-3">
                <img
                  src={clinicLogo}
                  alt="ختم العيادة"
                  className="w-20 h-20 rounded-full object-cover border-2 border-gray-400 shadow-md opacity-60"
                  onError={(e) => {
                    console.log('Stamp logo failed to load:', clinicLogo)
                    e.currentTarget.style.display = 'none'
                  }}
                />
                <div className="text-sm">ختم العيادة</div>
              </div>
            ) : (
              <>
                <div className="text-lg font-medium mb-2">مكان ختم العيادة</div>
                <div className="text-sm">هذا التقدير صالح لمدة محددة ويخضع للتغيير حسب الحالة الفعلية</div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="footer p-6 text-center bg-gray-800 text-white text-sm">
            <div>شكراً لثقتكم بنا</div>
            <div className="mt-1">تم إنشاء هذا التقدير في {formatDate(currentDate)}</div>
          </div>
        </div>

        <DialogFooter className="flex justify-end space-x-2 space-x-reverse">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إغلاق
          </Button>
          <Button 
            variant="outline" 
            onClick={handleExportPDF}
            disabled={isExporting}
          >
            <Download className="w-4 h-4 ml-2" />
            {isExporting ? 'جاري التصدير...' : 'تصدير PDF'}
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="w-4 h-4 ml-2" />
            طباعة
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
