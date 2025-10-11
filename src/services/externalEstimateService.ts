import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { formatDate } from '@/lib/utils'

// Types for external estimate
export interface EstimateItem {
  id: string
  treatmentType: string
  treatmentName: string
  quantity: number
  unitPrice: number
  totalPrice: number
  notes?: string
}

export interface EstimateData {
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

export interface ClinicInfo {
  name: string
  doctorName?: string
  phone?: string
  email?: string
  address?: string
  logo?: string
}

export class ExternalEstimateService {
  /**
   * Generate estimate number
   */
  static generateEstimateNumber(): string {
    return `EST-${Date.now().toString().slice(-6)}`
  }

  /**
   * Create HTML content for estimate
   */
  static createEstimateHTML(estimateData: EstimateData, clinicInfo: ClinicInfo): string {
    const estimateNumber = this.generateEstimateNumber()
    const currentDate = new Date().toISOString().split('T')[0]
    const discountAmount = estimateData.discountType === 'percentage' 
      ? (estimateData.subtotal * estimateData.discount) / 100 
      : estimateData.discount

    return `
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
          .clinic-header {
            display: flex;
            align-items: center;
            gap: 15px;
            margin-bottom: 15px;
          }
          .clinic-logo {
            width: 60px;
            height: 60px;
            border-radius: 8px;
            object-fit: cover;
            border: 2px solid #e2e8f0;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            flex-shrink: 0;
          }
          .clinic-details {
            flex: 1;
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
          @media print {
            body { margin: 0; padding: 0; }
            .estimate-container { border: none; border-radius: 0; }
          }
        </style>
      </head>
      <body>
        <div class="estimate-container">
          <!-- Header -->
          <div class="estimate-header">
            <div class="estimate-title">فاتورة تقديرية</div>
            <div class="estimate-number">رقم التقدير: ${estimateNumber}</div>
          </div>

          <!-- Clinic Information -->
          <div class="clinic-info">
            <div class="clinic-header">
              ${clinicInfo.logo && clinicInfo.logo.trim() !== '' ? `
                <img src="${clinicInfo.logo}" alt="شعار العيادة" class="clinic-logo" onerror="this.style.display='none'">
              ` : ''}
              <div class="clinic-details">
                <div class="clinic-name">${clinicInfo.name}</div>
                ${clinicInfo.doctorName ? `<div class="doctor-name">د. ${clinicInfo.doctorName}</div>` : ''}
              </div>
            </div>
            <div class="contact-info">
              ${clinicInfo.phone ? `<div>📞 ${clinicInfo.phone}</div>` : ''}
              ${clinicInfo.email ? `<div>📧 ${clinicInfo.email}</div>` : ''}
              ${clinicInfo.address ? `<div>📍 ${clinicInfo.address}</div>` : ''}
            </div>
          </div>

          <!-- Patient and Date Information -->
          <div class="patient-info">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
              <div>
                <div class="info-row">
                  <span class="info-label">اسم المريض:</span>
                  <span>${estimateData.patientName || 'غير محدد'}</span>
                </div>
                ${estimateData.patientPhone ? `
                <div class="info-row">
                  <span class="info-label">رقم الهاتف:</span>
                  <span>${estimateData.patientPhone}</span>
                </div>
                ` : ''}
              </div>
              <div>
                <div class="info-row">
                  <span class="info-label">تاريخ التقدير:</span>
                  <span>${formatDate(currentDate)}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">صالح حتى:</span>
                  <span>${formatDate(estimateData.validUntil)}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Treatment Items -->
          <div style="padding: 24px;">
            <table class="items-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>العلاج</th>
                  <th>الكمية</th>
                  <th>السعر</th>
                  <th>المجموع</th>
                </tr>
              </thead>
              <tbody>
                ${estimateData.items.map((item, index) => `
                  <tr>
                    <td>${index + 1}</td>
                    <td>
                      <div>
                        <div style="font-weight: 500;">${item.treatmentName}</div>
                        ${item.notes ? `<div style="font-size: 12px; color: #64748b; margin-top: 4px;">${item.notes}</div>` : ''}
                      </div>
                    </td>
                    <td>${item.quantity}</td>
                    <td>${item.unitPrice.toLocaleString('en-US')} ج.م</td>
                    <td style="font-weight: 500;">${item.totalPrice.toLocaleString('en-US')} ج.م</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <!-- Summary -->
          <div class="summary-section">
            <div style="max-width: 300px; margin-right: auto;">
              <div class="summary-row">
                <span>المجموع الفرعي:</span>
                <span>${estimateData.subtotal.toLocaleString('en-US')} ج.م</span>
              </div>
              ${estimateData.discount > 0 ? `
              <div class="summary-row" style="color: #059669;">
                <span>الخصم:</span>
                <span>-${discountAmount.toLocaleString('en-US')} ج.م</span>
              </div>
              ` : ''}
              ${estimateData.tax > 0 ? `
              <div class="summary-row">
                <span>الضريبة (${estimateData.taxRate}%):</span>
                <span>${estimateData.tax.toLocaleString('en-US')} ج.م</span>
              </div>
              ` : ''}
              <div class="summary-total summary-row">
                <span>المجموع الكلي:</span>
                <span>${estimateData.total.toLocaleString('en-US')} ج.م</span>
              </div>
            </div>
          </div>

          <!-- Notes -->
          ${estimateData.notes ? `
          <div class="notes-section">
            <h4 style="font-weight: 600; color: #374151; margin-bottom: 8px;">ملاحظات:</h4>
            <p style="color: #4b5563; white-space: pre-wrap;">${estimateData.notes}</p>
          </div>
          ` : ''}

          <!-- Stamp Area -->
          <div class="stamp-area">
            <div style="font-size: 16px; font-weight: 500; margin-bottom: 8px;">مكان ختم العيادة</div>
            <div style="font-size: 12px;">هذا التقدير صالح لمدة محددة ويخضع للتغيير حسب الحالة الفعلية</div>
          </div>

          <!-- Footer -->
          <div class="footer">
            <div>شكراً لثقتكم بنا</div>
            <div style="margin-top: 4px;">تم إنشاء هذا التقدير في ${formatDate(currentDate)}</div>
          </div>
        </div>
      </body>
      </html>
    `
  }

  /**
   * Print estimate
   */
  static printEstimate(estimateData: EstimateData, clinicInfo: ClinicInfo): void {
    const htmlContent = this.createEstimateHTML(estimateData, clinicInfo)
    
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(htmlContent)
      printWindow.document.close()
      printWindow.focus()
      
      setTimeout(() => {
        printWindow.print()
        printWindow.close()
      }, 250)
    }
  }

  /**
   * Export estimate as PDF
   */
  static async exportEstimatePDF(estimateData: EstimateData, clinicInfo: ClinicInfo): Promise<void> {
    try {
      const htmlContent = this.createEstimateHTML(estimateData, clinicInfo)
      
      // Create a temporary div to render HTML
      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = htmlContent
      tempDiv.style.position = 'absolute'
      tempDiv.style.left = '-9999px'
      tempDiv.style.top = '-9999px'
      tempDiv.style.width = '800px'
      tempDiv.style.fontFamily = 'Arial, sans-serif'
      tempDiv.style.direction = 'rtl'
      tempDiv.style.fontSize = '14px'
      tempDiv.style.lineHeight = '1.6'
      tempDiv.style.color = '#000'
      tempDiv.style.background = '#fff'

      document.body.appendChild(tempDiv)

      // Wait a bit for fonts to load
      await new Promise(resolve => setTimeout(resolve, 100))

      // Convert HTML to canvas
      const canvas = await html2canvas(tempDiv, {
        scale: 1.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: 800,
        height: tempDiv.scrollHeight
      })

      // Remove temporary div
      document.body.removeChild(tempDiv)

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

    } catch (error) {
      console.error('Error exporting estimate PDF:', error)
      throw new Error('فشل في تصدير الفاتورة التقديرية')
    }
  }
}
