import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import ExcelJS from 'exceljs'
import type { Patient, Appointment, Payment, Lab, LabOrder, ClinicExpense, ClinicNeed, InventoryItem, ReportExportOptions, PatientReportData, AppointmentReportData, FinancialReportData, InventoryReportData, LabReportData, ExpenseReportData } from '../types'
import { formatCurrency, formatDate, getDefaultCurrency } from '../lib/utils'
import { getTreatmentNameInArabic, getCategoryNameInArabic } from '../data/teethData'

export class ExportService {
  // Generate descriptive filename with date and time in DD-MM-YYYY format
  static generateFileName(type: string, format: string, options?: { includeTime?: boolean, customSuffix?: string }): string {
    const now = new Date()
    // Format date as DD-MM-YYYY for filename (Gregorian calendar)
    const day = now.getDate().toString().padStart(2, '0')
    const month = (now.getMonth() + 1).toString().padStart(2, '0')
    const year = now.getFullYear()
    const dateStr = `${day}-${month}-${year}`
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-') // HH-MM-SS

    // Arabic report names mapping
    const reportNames: { [key: string]: string } = {
      'patients': 'تقرير_المرضى',
      'appointments': 'تقرير_المواعيد',
      'financial': 'التقرير_المالي',
      'inventory': 'تقرير_المخزون',
      'analytics': 'تقرير_التحليلات',
      'overview': 'التقرير_الشامل',
      'comprehensive': 'التقرير_الشامل_المفصل',
      'treatments': 'تقرير_العلاجات'
    }

    const reportName = reportNames[type] || `تقرير_${type}`
    let fileName = `${reportName}_${dateStr}`

    if (options?.includeTime) {
      fileName += `_${timeStr}`
    }

    if (options?.customSuffix) {
      fileName += `_${options.customSuffix}`
    }

    return `${fileName}.${format}`
  }

  // Advanced Report Export Functions
  static async exportReport(
    type: 'patients' | 'appointments' | 'financial' | 'inventory' | 'analytics' | 'overview',
    data: any,
    options: ReportExportOptions
  ): Promise<string> {
    try {
      switch (options.format) {
        case 'pdf':
          return await this.exportToPDF(type, data, options)
        case 'excel':
          return await this.exportToExcel(type, data, options)
        case 'csv':
          return await this.exportToCSV(type, data, options)
        default:
          throw new Error('Unsupported export format')
      }
    } catch (error) {
      console.error('Export error:', error)
      throw error
    }
  }

  // PDF Export Functions using HTML to Canvas conversion
  static async exportToPDF(type: string, data: any, options: ReportExportOptions): Promise<string> {
    try {
      // Create HTML content for the report
      const htmlContent = this.createReportHTML(type, data, options)

      // Generate filename
      const fileName = this.generateFileName(type, 'pdf', { includeTime: true })

      // Convert HTML to PDF using html2canvas + jsPDF
      await this.convertHTMLToPDF(htmlContent, fileName)

      return fileName
    } catch (error) {
      console.error('Error exporting to PDF:', error)
      throw new Error('فشل في تصدير التقرير إلى PDF')
    }
  }

  // Convert HTML to PDF using html2canvas + jsPDF
  private static async convertHTMLToPDF(htmlContent: string, filename: string): Promise<void> {
    try {
      // Create a temporary div to render HTML
      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = htmlContent
      tempDiv.style.position = 'absolute'
      tempDiv.style.left = '-9999px'
      tempDiv.style.top = '-9999px'
      tempDiv.style.width = '800px' // Fixed width for consistent rendering
      tempDiv.style.fontFamily = 'Arial, sans-serif'
      tempDiv.style.direction = 'rtl'
      tempDiv.style.fontSize = '14px'
      tempDiv.style.lineHeight = '1.6'
      tempDiv.style.color = '#000'
      tempDiv.style.background = '#fff'
      tempDiv.style.padding = '20px'

      document.body.appendChild(tempDiv)

      // Wait a bit for fonts to load
      await new Promise(resolve => setTimeout(resolve, 100))

      // Convert HTML to canvas
      const canvas = await html2canvas(tempDiv, {
        scale: 2, // Higher quality
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: 800,
        height: tempDiv.scrollHeight,
        scrollX: 0,
        scrollY: 0
      })

      // Remove temporary div
      document.body.removeChild(tempDiv)

      // Create PDF
      const imgData = canvas.toDataURL('image/png')
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
      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight)
      heightLeft -= (pdfHeight - 20) // Subtract page height minus margins

      // Add additional pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight + 10
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight)
        heightLeft -= (pdfHeight - 20)
      }

      // Save the PDF
      pdf.save(filename)

    } catch (error) {
      console.error('Error converting HTML to PDF:', error)
      throw new Error('فشل في تحويل التقرير إلى PDF')
    }
  }

  // Create HTML content for reports
  private static createReportHTML(type: string, data: any, options: ReportExportOptions): string {
    // Try to read clinic name from stored settings on window (preloaded via settings store) if available
    const globalAny: any = (typeof window !== 'undefined') ? (window as any) : undefined
    const settingsFromWindow = globalAny?.__CLINIC_SETTINGS__ || globalAny?.clinicSettings || undefined
    const settingsClinicName = settingsFromWindow?.clinic_name && String(settingsFromWindow.clinic_name).trim() !== ''
      ? String(settingsFromWindow.clinic_name)
      : undefined
    const clinicTitle = `عيادة الأسنان${settingsClinicName ? ' - ' + settingsClinicName : ''}`
    const reportTitles = {
      patients: 'تقرير المرضى',
      appointments: 'تقرير المواعيد',
      financial: 'التقرير المالي',
      inventory: 'تقرير المخزون',
      analytics: 'تقرير التحليلات',
      overview: 'التقرير الشامل'
    }

    const title = reportTitles[type as keyof typeof reportTitles] || 'تقرير'

    return `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>${title}</title>
        <style>
          body {
            font-family: 'Arial', sans-serif;
            direction: rtl;
            margin: 0;
            padding: 20px;
            background: #fff;
            color: #000;
            line-height: 1.6;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #0ea5e9;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .clinic-name {
            font-size: 24px;
            font-weight: bold;
            color: #0ea5e9;
            margin-bottom: 10px;
          }
          .report-title {
            font-size: 20px;
            font-weight: bold;
            color: #1e293b;
            margin-bottom: 5px;
          }
          .report-date {
            font-size: 14px;
            color: #64748b;
          }
          .summary-cards {
            display: flex;
            justify-content: space-around;
            margin: 30px 0;
            flex-wrap: wrap;
          }
          .summary-card {
            background: #f8fafc;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            min-width: 150px;
            margin: 5px;
            border: 1px solid #e2e8f0;
          }
          .summary-card h3 {
            margin: 0 0 10px 0;
            font-size: 16px;
            color: #1e293b;
          }
          .summary-card .number {
            font-size: 24px;
            font-weight: bold;
            color: #0ea5e9;
          }
          .section {
            margin: 30px 0;
          }
          .section-title {
            font-size: 18px;
            font-weight: bold;
            color: #0ea5e9;
            margin-bottom: 15px;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 5px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          th, td {
            padding: 12px;
            text-align: center;
            border: 1px solid #e2e8f0;
          }
          th {
            background: #f8fafc;
            font-weight: bold;
            color: #1e293b;
          }
          .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 12px;
            color: #64748b;
            border-top: 1px solid #e2e8f0;
            padding-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="clinic-name">${clinicTitle}</div>
          <div class="report-title">${title}</div>
          <div class="report-date">${(() => {
            // Format date as DD/MM/YYYY (Gregorian calendar)
            const date = new Date()
            const day = date.getDate().toString().padStart(2, '0')
            const month = (date.getMonth() + 1).toString().padStart(2, '0')
            const year = date.getFullYear()
            return `${day}/${month}/${year}`
          })()}</div>
        </div>

        ${this.generateReportContent(type, data, options)}

        <div class="footer">
          تم إنشاء هذا التقرير بواسطة نظام إدارة العيادة - ${(() => {
            const date = new Date()
            const day = date.getDate().toString().padStart(2, '0')
            const month = (date.getMonth() + 1).toString().padStart(2, '0')
            const year = date.getFullYear()
            return `${day}/${month}/${year}`
          })()}
        </div>
      </body>
      </html>
    `
  }

  // Generate specific content for each report type
  private static generateReportContent(type: string, data: any, options: ReportExportOptions): string {
    switch (type) {
      case 'patients':
        return this.generatePatientReportContent(data, options)
      case 'appointments':
        return this.generateAppointmentReportContent(data, options)
      case 'financial':
        return this.generateFinancialReportContent(data, options)
      case 'inventory':
        return this.generateInventoryReportContent(data, options)
      case 'labs':
        return this.generateLabReportContent(data, options)
      case 'clinic-expenses':
        return this.generateClinicExpensesReportContent(data, options)
      case 'overview':
        return this.generateOverviewReportContent(data, options)
      default:
        return '<div class="section">لا توجد بيانات متاحة</div>'
    }
  }

  // Generate Patient Report HTML Content
  private static generatePatientReportContent(data: PatientReportData, options: ReportExportOptions): string {
    return `
      <div class="summary-cards">
        <div class="summary-card">
          <h3>إجمالي المرضى</h3>
          <div class="number">${data.totalPatients || 0}</div>
        </div>
        <div class="summary-card">
          <h3>المرضى الجدد</h3>
          <div class="number">${data.newPatientsThisMonth || 0}</div>
        </div>
        <div class="summary-card">
          <h3>المرضى النشطون</h3>
          <div class="number">${data.activePatients || 0}</div>
        </div>
        <div class="summary-card">
          <h3>متوسط العمر</h3>
          <div class="number">${data.averageAge || 0} سنة</div>
        </div>
      </div>

      ${data.ageDistribution && data.ageDistribution.length > 0 ? `
      <div class="section">
        <div class="section-title">توزيع الأعمار</div>
        <table>
          <thead>
            <tr>
              <th>الفئة العمرية</th>
              <th>العدد</th>
              <th>النسبة المئوية</th>
            </tr>
          </thead>
          <tbody>
            ${data.ageDistribution.map(item => `
              <tr>
                <td>${item.ageGroup || item.range}</td>
                <td>${item.count}</td>
                <td>${((item.count / data.totalPatients) * 100).toFixed(1)}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}

      ${data.genderDistribution && data.genderDistribution.length > 0 ? `
      <div class="section">
        <div class="section-title">توزيع الجنس</div>
        <table>
          <thead>
            <tr>
              <th>الجنس</th>
              <th>العدد</th>
              <th>النسبة المئوية</th>
            </tr>
          </thead>
          <tbody>
            ${data.genderDistribution.map(item => `
              <tr>
                <td>${item.gender === 'male' ? 'ذكر' : 'أنثى'}</td>
                <td>${item.count}</td>
                <td>${((item.count / data.totalPatients) * 100).toFixed(1)}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}

      ${options.includeDetails && data.patients && data.patients.length > 0 ? `
      <div class="section">
        <div class="section-title">تفاصيل المرضى</div>
        <table>
          <thead>
            <tr>
              <th>الاسم الكامل</th>
              <th>الهاتف</th>
              <th>العمر</th>
              <th>الجنس</th>
              <th>#</th>
            </tr>
          </thead>
          <tbody>
            ${data.patients.slice(0, 50).map(patient => `
              <tr>
                <td>${patient.full_name || 'غير محدد'}</td>
                <td>${patient.phone || 'غير محدد'}</td>
                <td>${patient.age || 'غير محدد'}</td>
                <td>${patient.gender === 'male' ? 'ذكر' : 'أنثى'}</td>
                <td>${patient.serial_number || 'غير محدد'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}
    `
  }

  // Generate Appointment Report HTML Content
  private static generateAppointmentReportContent(data: AppointmentReportData, options: ReportExportOptions): string {
    return `
      <div class="summary-cards">
        <div class="summary-card">
          <h3>إجمالي المواعيد</h3>
          <div class="number">${data.totalAppointments || 0}</div>
        </div>
        <div class="summary-card">
          <h3>المكتملة</h3>
          <div class="number">${data.completedAppointments || 0}</div>
        </div>
        <div class="summary-card">
          <h3>الملغية</h3>
          <div class="number">${data.cancelledAppointments || 0}</div>
        </div>
        <div class="summary-card">
          <h3>معدل الحضور</h3>
          <div class="number">${data.attendanceRate?.toFixed(1) || 0}%</div>
        </div>
      </div>

      ${data.appointmentsByStatus && data.appointmentsByStatus.length > 0 ? `
      <div class="section">
        <div class="section-title">توزيع المواعيد حسب الحالة</div>
        <table>
          <thead>
            <tr>
              <th>الحالة</th>
              <th>العدد</th>
              <th>النسبة المئوية</th>
            </tr>
          </thead>
          <tbody>
            ${data.appointmentsByStatus.map(item => `
              <tr>
                <td>${this.translateStatus(item.status)}</td>
                <td>${item.count}</td>
                <td>${item.percentage?.toFixed(1) || 0}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}
    `
  }

  // Generate Financial Report HTML Content
  private static generateFinancialReportContent(data: FinancialReportData, options: ReportExportOptions): string {
    return `
      <div class="summary-cards">
        <div class="summary-card">
          <h3>إجمالي الإيرادات</h3>
          <div class="number">${formatCurrency(data.totalRevenue || 0)}</div>
        </div>
        <div class="summary-card">
          <h3>المدفوعات المكتملة</h3>
          <div class="number">${formatCurrency(data.completedPayments || 0)}</div>
        </div>
        <div class="summary-card">
          <h3>المدفوعات الآجلة</h3>
          <div class="number">${formatCurrency(data.pendingPayments || 0)}</div>
        </div>
        <div class="summary-card">
          <h3>المدفوعات المتأخرة</h3>
          <div class="number">${formatCurrency(data.overduePayments || 0)}</div>
        </div>
      </div>

      ${data.paymentMethodStats && data.paymentMethodStats.length > 0 ? `
      <div class="section">
        <div class="section-title">إحصائيات طرق الدفع</div>
        <table>
          <thead>
            <tr>
              <th>طريقة الدفع</th>
              <th>المبلغ</th>
              <th>عدد المعاملات</th>
            </tr>
          </thead>
          <tbody>
            ${data.paymentMethodStats.map(item => `
              <tr>
                <td>${this.translatePaymentMethod(item.method)}</td>
                <td>${formatCurrency(item.amount)}</td>
                <td>${item.count}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}
    `
  }

  // Generate Inventory Report HTML Content
  private static generateInventoryReportContent(data: InventoryReportData, options: ReportExportOptions): string {
    return `
      <div class="summary-cards">
        <div class="summary-card">
          <h3>إجمالي الأصناف</h3>
          <div class="number">${data.totalItems || 0}</div>
        </div>
        <div class="summary-card">
          <h3>القيمة الإجمالية</h3>
          <div class="number">${formatCurrency(data.totalValue || 0)}</div>
        </div>
        <div class="summary-card">
          <h3>أصناف منخفضة المخزون</h3>
          <div class="number" style="color: #f59e0b;">${data.lowStockItems || 0}</div>
        </div>
        <div class="summary-card">
          <h3>أصناف منتهية الصلاحية</h3>
          <div class="number" style="color: #ef4444;">${data.expiredItems || 0}</div>
        </div>
      </div>

      ${data.itemsByCategory && data.itemsByCategory.length > 0 ? `
      <div class="section">
        <div class="section-title">توزيع الأصناف حسب الفئة</div>
        <table>
          <thead>
            <tr>
              <th>الفئة</th>
              <th>عدد الأصناف</th>
              <th>القيمة</th>
            </tr>
          </thead>
          <tbody>
            ${data.itemsByCategory.map(item => `
              <tr>
                <td>${item.category}</td>
                <td>${item.count}</td>
                <td>${formatCurrency(item.value)} $</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}
    `
  }

  // Generate Lab Report HTML Content
  private static generateLabReportContent(data: LabReportData, options: ReportExportOptions): string {
    return `
      <div class="summary-cards">
        <div class="summary-card">
          <h3>إجمالي المختبرات</h3>
          <div class="number">${data.totalLabs || 0}</div>
        </div>
        <div class="summary-card">
          <h3>إجمالي الطلبات</h3>
          <div class="number">${data.totalOrders || 0}</div>
        </div>
        <div class="summary-card">
          <h3>إجمالي التكلفة</h3>
          <div class="number">${formatCurrency(data.totalCost || 0)}</div>
        </div>
        <div class="summary-card">
          <h3>إجمالي المدفوع</h3>
          <div class="number">${formatCurrency(data.totalPaid || 0)}</div>
        </div>
        <div class="summary-card">
          <h3>إجمالي المتبقي</h3>
          <div class="number">${formatCurrency(data.totalRemaining || 0)}</div>
        </div>
      </div>

      <div class="summary-cards">
        <div class="summary-card">
          <h3>الطلبات الآجلة</h3>
          <div class="number" style="color: #f59e0b;">${data.pendingOrders || 0}</div>
        </div>
        <div class="summary-card">
          <h3>الطلبات المكتملة</h3>
          <div class="number" style="color: #10b981;">${data.completedOrders || 0}</div>
        </div>
        <div class="summary-card">
          <h3>الطلبات الملغية</h3>
          <div class="number" style="color: #ef4444;">${data.cancelledOrders || 0}</div>
        </div>
        <div class="summary-card">
          <h3>متوسط التكلفة</h3>
          <div class="number">${formatCurrency((data.totalOrders || 0) > 0 ? (data.totalCost || 0) / (data.totalOrders || 1) : 0)}</div>
        </div>
      </div>

      ${data.labsList && data.labsList.length > 0 ? `
      <div class="section">
        <div class="section-title">قائمة المختبرات</div>
        <table>
          <thead>
            <tr>
              <th>اسم المختبر</th>
              <th>معلومات الاتصال</th>
              <th>العنوان</th>
              <th>عدد الطلبات</th>
            </tr>
          </thead>
          <tbody>
            ${data.labsList.slice(0, 20).map(lab => {
              const ordersCount = data.labOrdersList ? data.labOrdersList.filter(order => order.lab_id === lab.id).length : 0
              return `
                <tr>
                  <td>${lab.name || 'غير محدد'}</td>
                  <td>${lab.contact_info || 'غير محدد'}</td>
                  <td>${lab.address || 'غير محدد'}</td>
                  <td>${ordersCount}</td>
                </tr>
              `
            }).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}

      ${options.includeDetails && data.labOrdersList && data.labOrdersList.length > 0 ? `
      <div class="section">
        <div class="section-title">تفاصيل طلبات المختبرات</div>
        <table>
          <thead>
            <tr>
              <th>اسم المختبر</th>
              <th>اسم المريض</th>
              <th>نوع الخدمة</th>
              <th>التكلفة</th>
              <th>المدفوع</th>
              <th>المتبقي</th>
              <th>الحالة</th>
              <th>تاريخ الطلب</th>
            </tr>
          </thead>
          <tbody>
            ${data.labOrdersList.slice(0, 30).map(order => {
              const labName = order.lab?.name || 'غير محدد'
              const patientName = order.patient?.full_name || 'غير محدد'
              const serviceName = order.service_name || 'غير محدد'
              const cost = formatCurrency(order.cost || 0)
              const paid = formatCurrency(order.paid_amount || 0)
              const remaining = formatCurrency(order.remaining_balance || 0)
              const status = order.status === 'مكتمل' ? 'مكتمل' : order.status === 'آجل' ? 'آجل' : 'ملغي'
              const orderDate = order.order_date ? new Date(order.order_date).toLocaleDateString('ar-SA') : 'غير محدد'

              return `
                <tr>
                  <td>${labName}</td>
                  <td>${patientName}</td>
                  <td>${serviceName}</td>
                  <td>${cost}</td>
                  <td>${paid}</td>
                  <td>${remaining}</td>
                  <td>${status}</td>
                  <td>${orderDate}</td>
                </tr>
              `
            }).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}
    `
  }

  // Generate Clinic Expenses Report HTML Content
  private static generateClinicExpensesReportContent(data: ExpenseReportData, options: ReportExportOptions): string {
    return `
      <div class="summary-cards">
        <div class="summary-card">
          <h3>إجمالي المصروفات</h3>
          <div class="number">${formatCurrency(data.totalExpenses || 0)}</div>
        </div>
        <div class="summary-card">
          <h3>المصروفات المدفوعة</h3>
          <div class="number" style="color: #10b981;">${formatCurrency(data.paidExpenses || 0)}</div>
        </div>
        <div class="summary-card">
          <h3>المصروفات الآجلة</h3>
          <div class="number" style="color: #f59e0b;">${formatCurrency(data.pendingExpenses || 0)}</div>
        </div>
        <div class="summary-card">
          <h3>المصروفات المتأخرة</h3>
          <div class="number" style="color: #ef4444;">${formatCurrency(data.overdueExpenses || 0)}</div>
        </div>
        <div class="summary-card">
          <h3>المصروفات الملغية</h3>
          <div class="number">${formatCurrency(data.cancelledExpenses || 0)}</div>
        </div>
      </div>

      ${data.expensesByType && data.expensesByType.length > 0 ? `
      <div class="section">
        <div class="section-title">توزيع المصروفات حسب النوع</div>
        <table>
          <thead>
            <tr>
              <th>نوع المصروف</th>
              <th>المبلغ</th>
              <th>عدد المعاملات</th>
              <th>النسبة المئوية</th>
            </tr>
          </thead>
          <tbody>
            ${data.expensesByType.map(item => {
              const typeLabels: { [key: string]: string } = {
                'salary': 'رواتب',
                'utilities': 'مرافق',
                'rent': 'إيجار',
                'maintenance': 'صيانة',
                'supplies': 'مستلزمات',
                'insurance': 'تأمين',
                'other': 'أخرى'
              }
              const typeLabel = typeLabels[item.type] || item.type
              return `
                <tr>
                  <td>${typeLabel}</td>
                  <td>${formatCurrency(item.amount)}</td>
                  <td>${item.count}</td>
                  <td>${item.percentage?.toFixed(1) || 0}%</td>
                </tr>
              `
            }).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}

      ${data.expensesByPaymentMethod && data.expensesByPaymentMethod.length > 0 ? `
      <div class="section">
        <div class="section-title">توزيع المصروفات حسب طريقة الدفع</div>
        <table>
          <thead>
            <tr>
              <th>طريقة الدفع</th>
              <th>المبلغ</th>
              <th>عدد المعاملات</th>
              <th>النسبة المئوية</th>
            </tr>
          </thead>
          <tbody>
            ${data.expensesByPaymentMethod.map(item => {
              const methodLabels: { [key: string]: string } = {
                'cash': 'نقدي',
                'bank_transfer': 'تحويل بنكي',
                'check': 'شيك',
                'credit_card': 'بطاقة ائتمان'
              }
              const methodLabel = methodLabels[item.method] || item.method
              return `
                <tr>
                  <td>${methodLabel}</td>
                  <td>${formatCurrency(item.amount)}</td>
                  <td>${item.count}</td>
                  <td>${item.percentage?.toFixed(1) || 0}%</td>
                </tr>
              `
            }).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}

      ${options.includeDetails && data.expensesList && data.expensesList.length > 0 ? `
      <div class="section">
        <div class="section-title">تفاصيل المصروفات</div>
        <table>
          <thead>
            <tr>
              <th>اسم المصروف</th>
              <th>نوع المصروف</th>
              <th>المبلغ</th>
              <th>طريقة الدفع</th>
              <th>تاريخ الدفع</th>
              <th>المورد</th>
              <th>الحالة</th>
            </tr>
          </thead>
          <tbody>
            ${data.expensesList.slice(0, 30).map(expense => {
              const typeLabels: { [key: string]: string } = {
                'salary': 'راتب',
                'utilities': 'مرافق',
                'rent': 'إيجار',
                'maintenance': 'صيانة',
                'supplies': 'مستلزمات',
                'insurance': 'تأمين',
                'other': 'أخرى'
              }
              const methodLabels: { [key: string]: string } = {
                'cash': 'نقدي',
                'bank_transfer': 'تحويل بنكي',
                'check': 'شيك',
                'credit_card': 'بطاقة ائتمان'
              }
              const statusLabels: { [key: string]: string } = {
                'paid': 'مدفوع',
                'pending': 'آجل',
                'overdue': 'متأخر',
                'cancelled': 'ملغي'
              }

              const typeLabel = typeLabels[expense.expense_type] || expense.expense_type
              const methodLabel = methodLabels[expense.payment_method] || expense.payment_method
              const statusLabel = statusLabels[expense.status] || expense.status
              const paymentDate = expense.payment_date ? new Date(expense.payment_date).toLocaleDateString('ar-SA') : 'غير محدد'
              const vendor = expense.vendor || 'غير محدد'
              const expenseName = expense.expense_name || 'غير محدد'

              return `
                <tr>
                  <td>${expenseName}</td>
                  <td>${typeLabel}</td>
                  <td>${formatCurrency(expense.amount || 0)}</td>
                  <td>${methodLabel}</td>
                  <td>${paymentDate}</td>
                  <td>${vendor}</td>
                  <td>${statusLabel}</td>
                </tr>
              `
            }).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}
    `
  }

  // Generate Overview Report HTML Content
  private static generateOverviewReportContent(data: any, options: ReportExportOptions): string {
    return `
      <div class="section">
        <div class="section-title">ملخص شامل للعيادة</div>
        <div class="summary-cards">
          ${data.patients ? `
          <div class="summary-card">
            <h3>المرضى</h3>
            <div class="number">${data.patients.totalPatients || 0}</div>
          </div>
          ` : ''}
          ${data.appointments ? `
          <div class="summary-card">
            <h3>المواعيد</h3>
            <div class="number">${data.appointments.totalAppointments || 0}</div>
          </div>
          ` : ''}
          ${data.financial ? `
          <div class="summary-card">
            <h3>الإيرادات</h3>
            <div class="number">${formatCurrency(data.financial.totalRevenue || 0)}</div>
          </div>
          ` : ''}
          ${data.inventory ? `
          <div class="summary-card">
            <h3>المخزون</h3>
            <div class="number">${data.inventory.totalItems || 0}</div>
          </div>
          ` : ''}
        </div>
      </div>

      ${data.patients ? this.generatePatientReportContent(data.patients, options) : ''}
      ${data.appointments ? this.generateAppointmentReportContent(data.appointments, options) : ''}
      ${data.financial ? this.generateFinancialReportContent(data.financial, options) : ''}
      ${data.inventory ? this.generateInventoryReportContent(data.inventory, options) : ''}
    `
  }

  // Helper methods for translations
  private static translateStatus(status: string): string {
    const statusMap: { [key: string]: string } = {
      'scheduled': 'مجدول',
      'completed': 'مكتمل',
      'cancelled': 'ملغي',
      'no-show': 'عدم حضور',
      'in-progress': 'قيد التنفيذ'
    }
    return statusMap[status] || status
  }

  private static translatePaymentMethod(method: string): string {
    const methodMap: { [key: string]: string } = {
      'cash': 'نقدي',
      'card': 'بطاقة ائتمان',
      'bank_transfer': 'تحويل بنكي',
      'insurance': 'تأمين',
      'installment': 'تقسيط'
    }
    return methodMap[method] || method
  }

  private static getPaymentStatusInArabic(status: string): string {
    const statusMap: { [key: string]: string } = {
      'completed': 'مكتمل',
      'partial': 'جزئي',
      'pending': 'آجل',
      'overdue': 'متأخر',
      'cancelled': 'ملغي'
    }
    return statusMap[status] || status
  }

  static addPDFHeader(doc: jsPDF, type: string, options: ReportExportOptions): void {
    const pageWidth = doc.internal.pageSize.getWidth()

    // Clinic name
    doc.setFontSize(24)
    doc.setFont('helvetica', 'bold')
    doc.text('عيادة الأسنان الحديثة', pageWidth / 2, 20, { align: 'center' })

    // Report title
    doc.setFontSize(18)
    doc.setFont('helvetica', 'normal')
    const titles = {
      patients: 'تقرير المرضى',
      appointments: 'تقرير المواعيد',
      financial: 'التقرير المالي',
      inventory: 'تقرير المخزون',
      analytics: 'تقرير التحليلات',
      overview: 'التقرير الشامل'
    }
    doc.text(titles[type as keyof typeof titles] || 'تقرير', pageWidth / 2, 35, { align: 'center' })

    // Date and time
    doc.setFontSize(12)
    const currentDate = new Date()
    const day = currentDate.getDate().toString().padStart(2, '0')
    const month = (currentDate.getMonth() + 1).toString().padStart(2, '0')
    const year = currentDate.getFullYear()
    const formattedDate = `${day}/${month}/${year}`
    doc.text(`تاريخ التقرير: ${formattedDate}`, pageWidth - 20, 45, { align: 'right' })

    // Line separator
    doc.setLineWidth(0.5)
    doc.line(20, 48, pageWidth - 20, 48)
  }

  static addPDFFooter(doc: jsPDF, options: ReportExportOptions): void {
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('تم إنشاء هذا التقرير بواسطة نظام إدارة العيادة', pageWidth / 2, pageHeight - 10, { align: 'center' })
  }

  // Patient Report PDF
  static async addPatientReportToPDF(doc: jsPDF, data: PatientReportData, yPosition: number, options: ReportExportOptions): Promise<number> {
    const pageWidth = doc.internal.pageSize.getWidth()

    // Summary statistics
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('ملخص إحصائيات المرضى', 20, yPosition)
    yPosition += 15

    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text(`إجمالي المرضى: ${data.totalPatients || 0}`, 20, yPosition)
    doc.text(`المرضى الجدد هذا الشهر: ${data.newPatientsThisMonth || 0}`, 150, yPosition)
    yPosition += 10
    doc.text(`المرضى النشطون: ${data.activePatients || 0}`, 20, yPosition)
    doc.text(`متوسط العمر: ${data.averageAge || 0} سنة`, 150, yPosition)
    yPosition += 20

    // Age distribution chart (if includeCharts is true)
    if (options.includeCharts && data.ageDistribution) {
      doc.setFont('helvetica', 'bold')
      doc.text('توزيع الأعمار', 20, yPosition)
      yPosition += 10

      data.ageDistribution.forEach((group: any) => {
        doc.setFont('helvetica', 'normal')
        doc.text(`${group.range}: ${group.count} مريض`, 30, yPosition)
        yPosition += 8
      })
      yPosition += 10
    }

    // Patient details table (if includeDetails is true)
    if (options.includeDetails && data.patients) {
      doc.setFont('helvetica', 'bold')
      doc.text('تفاصيل المرضى', 20, yPosition)
      yPosition += 15

      // Table headers
      doc.setFontSize(10)
      doc.text('الاسم الكامل', 20, yPosition)
      doc.text('الهاتف', 80, yPosition)
      doc.text('العمر', 130, yPosition)
      doc.text('الجنس', 170, yPosition)
      doc.text('#', 220, yPosition)

      doc.line(20, yPosition + 2, pageWidth - 20, yPosition + 2)
      yPosition += 10

      // Patient rows
      doc.setFont('helvetica', 'normal')
      data.patients.slice(0, 20).forEach((patient: any) => {
        if (yPosition > 250) {
          doc.addPage()
          yPosition = 30
        }

        doc.text(patient.full_name || 'غير محدد', 20, yPosition)
        doc.text(patient.phone || 'غير محدد', 80, yPosition)
        doc.text(patient.age?.toString() || 'غير محدد', 130, yPosition)
        doc.text(patient.gender === 'male' ? 'ذكر' : 'أنثى', 170, yPosition)
        doc.text(patient.serial_number || 'غير محدد', 220, yPosition)
        yPosition += 8
      })
    }

    return yPosition + 20
  }

  // Appointment Report PDF
  static async addAppointmentReportToPDF(doc: jsPDF, data: AppointmentReportData, yPosition: number, options: ReportExportOptions): Promise<number> {
    const pageWidth = doc.internal.pageSize.getWidth()

    // Summary statistics
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('ملخص إحصائيات المواعيد', 20, yPosition)
    yPosition += 15

    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text(`إجمالي المواعيد: ${data.totalAppointments || 0}`, 20, yPosition)
    doc.text(`المواعيد المكتملة: ${data.completedAppointments || 0}`, 150, yPosition)
    yPosition += 10
    doc.text(`المواعيد الملغية: ${data.cancelledAppointments || 0}`, 20, yPosition)
    doc.text(`معدل الحضور: ${data.attendanceRate || 0}%`, 150, yPosition)
    yPosition += 20

    // Status distribution
    if (options.includeCharts && data.appointmentsByStatus) {
      doc.setFont('helvetica', 'bold')
      doc.text('توزيع حالات المواعيد', 20, yPosition)
      yPosition += 10

      data.appointmentsByStatus.forEach((status: any) => {
        doc.setFont('helvetica', 'normal')
        doc.text(`${status.status}: ${status.count} موعد`, 30, yPosition)
        yPosition += 8
      })
      yPosition += 10
    }

    return yPosition + 20
  }

  // Financial Report PDF
  static async addFinancialReportToPDF(doc: jsPDF, data: FinancialReportData, yPosition: number, options: ReportExportOptions): Promise<number> {
    const pageWidth = doc.internal.pageSize.getWidth()

    // Summary statistics
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('ملخص الإحصائيات المالية', 20, yPosition)
    yPosition += 15

    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text(`إجمالي الإيرادات: ${formatCurrency(data.totalRevenue || 0)}`, 20, yPosition)
    doc.text(`المدفوعات المكتملة: ${formatCurrency(data.completedPayments || 0)}`, 150, yPosition)
    yPosition += 10
    doc.text(`المدفوعات الآجلة: ${formatCurrency(data.pendingPayments || 0)}`, 20, yPosition)
    doc.text(`المدفوعات المتأخرة: ${formatCurrency(data.overduePayments || 0)}`, 150, yPosition)
    yPosition += 20

    // Payment methods distribution
    if (options.includeCharts && data.paymentMethodStats) {
      doc.setFont('helvetica', 'bold')
      doc.text('توزيع طرق الدفع', 20, yPosition)
      yPosition += 10

      data.paymentMethodStats.forEach((method: any) => {
        doc.setFont('helvetica', 'normal')
        doc.text(`${method.method}: ${formatCurrency(method.amount)} (${method.count} معاملة)`, 30, yPosition)
        yPosition += 8
      })
      yPosition += 10
    }

    // Monthly revenue trend
    if (options.includeCharts && data.monthlyRevenue) {
      doc.setFont('helvetica', 'bold')
      doc.text('الإيرادات الشهرية', 20, yPosition)
      yPosition += 10

      data.monthlyRevenue.slice(-6).forEach((month: any) => {
        doc.setFont('helvetica', 'normal')
        doc.text(`${month.month}: ${formatCurrency(month.revenue)}`, 30, yPosition)
        yPosition += 8
      })
      yPosition += 10
    }

    return yPosition + 20
  }

  // Inventory Report PDF
  static async addInventoryReportToPDF(doc: jsPDF, data: InventoryReportData, yPosition: number, options: ReportExportOptions): Promise<number> {
    const pageWidth = doc.internal.pageSize.getWidth()

    // Summary statistics
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('ملخص إحصائيات المخزون', 20, yPosition)
    yPosition += 15

    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text(`إجمالي العناصر: ${data.totalItems || 0}`, 20, yPosition)
    doc.text(`القيمة الإجمالية: ${formatCurrency(data.totalValue || 0)}`, 150, yPosition)
    yPosition += 10
    doc.text(`عناصر منخفضة المخزون: ${data.lowStockItems || 0}`, 20, yPosition)
    doc.text(`عناصر منتهية الصلاحية: ${data.expiredItems || 0}`, 150, yPosition)
    yPosition += 10
    doc.text(`عناصر نفدت من المخزون: ${data.outOfStockItems || 0}`, 20, yPosition)
    doc.text(`معدل دوران المخزون: ${data.turnoverRate || 0}%`, 150, yPosition)
    yPosition += 20

    // Top categories
    if (options.includeCharts && data.topCategories) {
      doc.setFont('helvetica', 'bold')
      doc.text('أعلى الفئات استهلاكاً', 20, yPosition)
      yPosition += 10

      data.topCategories.slice(0, 5).forEach((category: any) => {
        doc.setFont('helvetica', 'normal')
        doc.text(`${category.name}: ${category.count} عنصر`, 30, yPosition)
        yPosition += 8
      })
      yPosition += 10
    }

    return yPosition + 20
  }

  // Overview Report PDF
  static async addOverviewReportToPDF(doc: jsPDF, data: any, yPosition: number, options: ReportExportOptions): Promise<number> {
    // Add each section
    if (data.patients) {
      yPosition = await this.addPatientReportToPDF(doc, data.patients, yPosition, options)
    }

    if (data.appointments) {
      if (yPosition > 200) {
        doc.addPage()
        yPosition = 30
      }
      yPosition = await this.addAppointmentReportToPDF(doc, data.appointments, yPosition, options)
    }

    if (data.financial) {
      if (yPosition > 200) {
        doc.addPage()
        yPosition = 30
      }
      yPosition = await this.addFinancialReportToPDF(doc, data.financial, yPosition, options)
    }

    if (data.inventory) {
      if (yPosition > 200) {
        doc.addPage()
        yPosition = 30
      }
      yPosition = await this.addInventoryReportToPDF(doc, data.inventory, yPosition, options)
    }

    return yPosition
  }

  // Excel Export Functions
  static async exportToExcel(type: string, data: any, options: ReportExportOptions): Promise<string> {
    const workbook = new ExcelJS.Workbook()

    // Set workbook properties
    workbook.creator = 'نظام إدارة العيادة'
    workbook.created = new Date()
    workbook.modified = new Date()

    switch (type) {
      case 'patients':
        await this.addPatientReportToExcel(workbook, data, options)
        break
      case 'appointments':
        await this.addAppointmentReportToExcel(workbook, data, options)
        break
      case 'financial':
        await this.addFinancialReportToExcel(workbook, data, options)
        break
      case 'inventory':
        await this.addInventoryReportToExcel(workbook, data, options)
        break
      case 'labs':
        await this.addLabReportToExcel(workbook, data, options)
        break
      case 'clinic-needs':
        await this.addClinicNeedsReportToExcel(workbook, data, options)
        break
      case 'clinic-expenses':
        await this.addClinicExpensesReportToExcel(workbook, data, options)
        break
      case 'profit-loss':
        await this.addProfitLossReportToExcel(workbook, data, options)
        break
      case 'overview':
        await this.addOverviewReportToExcel(workbook, data, options)
        break
    }

    const fileName = this.generateFileName(type, 'xlsx', { includeTime: true })

    // Use browser-compatible approach instead of writeFile
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })

    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `${fileName}.xlsx`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    return fileName
  }

  static async addPatientReportToExcel(workbook: ExcelJS.Workbook, data: PatientReportData, options: ReportExportOptions): Promise<void> {
    const worksheet = workbook.addWorksheet('تقرير المرضى')

    // Header
    worksheet.mergeCells('A1:F1')
    const headerCell = worksheet.getCell('A1')
    headerCell.value = 'تقرير المرضى - عيادة الأسنان الحديثة'
    headerCell.font = { size: 16, bold: true }
    headerCell.alignment = { horizontal: 'center' }

    // Summary statistics
    worksheet.getCell('A3').value = 'ملخص الإحصائيات'
    worksheet.getCell('A3').font = { bold: true }

    worksheet.getCell('A4').value = 'إجمالي المرضى:'
    worksheet.getCell('B4').value = data.totalPatients || 0
    worksheet.getCell('A5').value = 'المرضى الجدد هذا الشهر:'
    worksheet.getCell('B5').value = data.newPatientsThisMonth || 0
    worksheet.getCell('A6').value = 'المرضى النشطون:'
    worksheet.getCell('B6').value = data.activePatients || 0
    worksheet.getCell('A7').value = 'متوسط العمر:'
    worksheet.getCell('B7').value = `${data.averageAge || 0} سنة`

    // Patient details
    if (options.includeDetails && data.patients) {
      let row = 10
      worksheet.getCell(`A${row}`).value = 'تفاصيل المرضى'
      worksheet.getCell(`A${row}`).font = { bold: true }
      row += 2

      // Headers
      const headers = ['#', 'الاسم الكامل', 'الجنس', 'العمر', 'الهاتف', 'البريد الإلكتروني', 'تاريخ التسجيل']
      headers.forEach((header, index) => {
        const cell = worksheet.getCell(row, index + 1)
        cell.value = header
        cell.font = { bold: true }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } }
      })
      row++

      // Data rows
      data.patients.forEach((patient: any) => {
        const genderLabel = patient.gender === 'male' ? 'ذكر' : 'أنثى'
        // Use Gregorian date format instead of Arabic
        const registrationDate = patient.created_at ? new Date(patient.created_at).toLocaleDateString('en-GB') : ''

        worksheet.getCell(row, 1).value = patient.serial_number || ''
        worksheet.getCell(row, 2).value = patient.full_name || ''
        worksheet.getCell(row, 3).value = genderLabel
        worksheet.getCell(row, 4).value = patient.age || ''
        worksheet.getCell(row, 5).value = patient.phone || ''
        worksheet.getCell(row, 6).value = patient.email || ''
        worksheet.getCell(row, 7).value = registrationDate
        row++
      })
    }

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      column.width = 15
    })
  }

  static async addFinancialReportToExcel(workbook: ExcelJS.Workbook, data: FinancialReportData, options: ReportExportOptions): Promise<void> {
    const worksheet = workbook.addWorksheet('التقرير المالي')

    // Header
    worksheet.mergeCells('A1:H1')
    const headerCell = worksheet.getCell('A1')
    headerCell.value = 'التقرير المالي الشامل - عيادة الأسنان الحديثة'
    headerCell.font = { size: 16, bold: true }
    headerCell.alignment = { horizontal: 'center' }

    // Summary statistics
    worksheet.getCell('A3').value = 'ملخص الإحصائيات المالية'
    worksheet.getCell('A3').font = { bold: true }

    worksheet.getCell('A4').value = 'إجمالي الإيرادات:'
    worksheet.getCell('B4').value = `${formatCurrency(data.totalRevenue || 0)}`
    worksheet.getCell('A5').value = 'المدفوعات المكتملة:'
    worksheet.getCell('B5').value = `${formatCurrency(data.completedPayments || 0)}`
    worksheet.getCell('A6').value = 'المدفوعات الآجلة:'
    worksheet.getCell('B6').value = `${formatCurrency(data.pendingPayments || 0)}`
    worksheet.getCell('A7').value = 'المدفوعات المتأخرة:'
    worksheet.getCell('B7').value = `${formatCurrency(data.overduePayments || 0)}`

    // Expenses and Profit/Loss section
    worksheet.getCell('D4').value = 'إجمالي المصروفات:'
    worksheet.getCell('E4').value = `${formatCurrency(data.totalExpenses || 0)}`
    worksheet.getCell('D5').value = 'صافي الربح:'
    worksheet.getCell('E5').value = `${formatCurrency(data.netProfit || 0)}`
    worksheet.getCell('D6').value = 'هامش الربح:'
    worksheet.getCell('E6').value = `${(data.profitMargin || 0).toFixed(2)}%`
    worksheet.getCell('D7').value = 'حالة الربحية:'
    worksheet.getCell('E7').value = (data.netProfit || 0) >= 0 ? 'ربح' : 'خسارة'

    // Payment methods
    let currentRow = 10
    if (data.paymentMethodStats) {
      worksheet.getCell(`A${currentRow}`).value = 'توزيع طرق الدفع'
      worksheet.getCell(`A${currentRow}`).font = { bold: true }
      currentRow += 2

      worksheet.getCell(currentRow, 1).value = 'طريقة الدفع'
      worksheet.getCell(currentRow, 2).value = 'المبلغ'
      worksheet.getCell(currentRow, 3).value = 'عدد المعاملات'
      worksheet.getRow(currentRow).font = { bold: true }
      currentRow++

      data.paymentMethodStats.forEach((method: any) => {
        worksheet.getCell(currentRow, 1).value = method.method
        worksheet.getCell(currentRow, 2).value = `${formatCurrency(method.amount)}`
        worksheet.getCell(currentRow, 3).value = method.count
        currentRow++
      })
      currentRow += 2
    }

    // Expenses by type
    if (data.expensesByType && data.expensesByType.length > 0) {
      worksheet.getCell(`D${currentRow}`).value = 'توزيع المصروفات حسب النوع'
      worksheet.getCell(`D${currentRow}`).font = { bold: true }
      currentRow += 2

      worksheet.getCell(currentRow, 4).value = 'نوع المصروف'
      worksheet.getCell(currentRow, 5).value = 'المبلغ'
      worksheet.getCell(currentRow, 6).value = 'النسبة المئوية'
      worksheet.getRow(currentRow).font = { bold: true }
      currentRow++

      data.expensesByType.forEach((expense: any) => {
        worksheet.getCell(currentRow, 4).value = expense.type
        worksheet.getCell(currentRow, 5).value = `${formatCurrency(expense.amount)}`
        worksheet.getCell(currentRow, 6).value = `${expense.percentage.toFixed(2)}%`
        currentRow++
      })
      currentRow += 2
    }

    // Recent expenses details
    if (data.recentExpenses && data.recentExpenses.length > 0) {
      worksheet.getCell(`A${currentRow}`).value = 'المصروفات الحديثة (آخر 10 مصروفات)'
      worksheet.getCell(`A${currentRow}`).font = { bold: true }
      currentRow += 2

      // Headers for expenses table
      worksheet.getCell(currentRow, 1).value = 'اسم المصروف'
      worksheet.getCell(currentRow, 2).value = 'النوع'
      worksheet.getCell(currentRow, 3).value = 'المبلغ'
      worksheet.getCell(currentRow, 4).value = 'طريقة الدفع'
      worksheet.getCell(currentRow, 5).value = 'تاريخ الدفع'
      worksheet.getCell(currentRow, 6).value = 'المورد'
      worksheet.getRow(currentRow).font = { bold: true }
      currentRow++

      data.recentExpenses.slice(0, 10).forEach((expense: any) => {
        const typeMapping = {
          'salary': 'رواتب',
          'utilities': 'مرافق',
          'rent': 'إيجار',
          'maintenance': 'صيانة',
          'supplies': 'مستلزمات',
          'insurance': 'تأمين',
          'other': 'أخرى'
        }

        const methodMapping = {
          'cash': 'نقداً',
          'bank_transfer': 'تحويل بنكي',
          'check': 'شيك',
          'credit_card': 'بطاقة ائتمان'
        }

        worksheet.getCell(currentRow, 1).value = expense.expense_name || 'غير محدد'
        worksheet.getCell(currentRow, 2).value = typeMapping[expense.expense_type] || expense.expense_type || 'غير محدد'
        worksheet.getCell(currentRow, 3).value = `${formatCurrency(expense.amount || 0)}`
        worksheet.getCell(currentRow, 4).value = methodMapping[expense.payment_method] || expense.payment_method || 'غير محدد'
        // Use Gregorian date format instead of Arabic
        worksheet.getCell(currentRow, 5).value = expense.payment_date ? new Date(expense.payment_date).toLocaleDateString('en-GB') : 'غير محدد'
        worksheet.getCell(currentRow, 6).value = expense.vendor || 'غير محدد'
        currentRow++
      })
    }

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      column.width = 20
    })
  }

  /**
   * إضافة تقرير مصروفات العيادة إلى Excel
   */
  private static async addClinicExpensesReportToExcel(workbook: ExcelJS.Workbook, data: any, options: ReportExportOptions): Promise<void> {
    const worksheet = workbook.addWorksheet('مصروفات العيادة')

    // إعداد اتجاه الكتابة من اليمين لليسار
    worksheet.views = [{ rightToLeft: true }]

    let currentRow = 1

    // عنوان التقرير
    worksheet.mergeCells(currentRow, 1, currentRow, 7)
    const titleCell = worksheet.getCell(currentRow, 1)
    titleCell.value = 'تقرير مصروفات العيادة'
    titleCell.font = { name: 'Arial', size: 18, bold: true }
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } }
    titleCell.font.color = { argb: 'FFFFFFFF' }
    worksheet.getRow(currentRow).height = 30
    currentRow += 2

    // معلومات الملخص
    if (data.summary) {
      worksheet.mergeCells(currentRow, 1, currentRow, 7)
      const summaryTitleCell = worksheet.getCell(currentRow, 1)
      summaryTitleCell.value = 'ملخص المصروفات'
      summaryTitleCell.font = { name: 'Arial', size: 14, bold: true }
      summaryTitleCell.alignment = { horizontal: 'center' }
      summaryTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE7E6E6' } }
      currentRow++

      Object.entries(data.summary).forEach(([key, value]) => {
        worksheet.getCell(currentRow, 1).value = key
        worksheet.getCell(currentRow, 2).value = value
        worksheet.getCell(currentRow, 1).font = { name: 'Arial', size: 11, bold: true }
        worksheet.getCell(currentRow, 2).font = { name: 'Arial', size: 11 }
        currentRow++
      })
      currentRow++
    }

    // عناوين الأعمدة
    const headers = ['اسم المصروف', 'نوع المصروف', 'المبلغ', 'طريقة الدفع', 'تاريخ الدفع', 'المورد', 'الحالة']
    headers.forEach((header, index) => {
      const cell = worksheet.getCell(currentRow, index + 1)
      cell.value = header
      cell.font = { name: 'Arial', size: 12, bold: true }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } }
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      }
    })
    currentRow++

    // بيانات المصروفات
    if (data.expenses && data.expenses.length > 0) {
      const typeMapping: { [key: string]: string } = {
        'salary': 'راتب',
        'utilities': 'مرافق',
        'rent': 'إيجار',
        'maintenance': 'صيانة',
        'supplies': 'مستلزمات',
        'insurance': 'تأمين',
        'other': 'أخرى'
      }

      const methodMapping: { [key: string]: string } = {
        'cash': 'نقدي',
        'card': 'بطاقة',
        'bank_transfer': 'تحويل بنكي',
        'check': 'شيك'
      }

      const statusMapping: { [key: string]: string } = {
        'paid': 'مدفوع',
        'pending': 'آجل',
        'overdue': 'متأخر'
      }

      data.expenses.forEach((expense: any) => {
        worksheet.getCell(currentRow, 1).value = expense.expense_name || 'غير محدد'
        worksheet.getCell(currentRow, 2).value = typeMapping[expense.expense_type] || expense.expense_type || 'غير محدد'
        worksheet.getCell(currentRow, 3).value = `${formatCurrency(expense.amount || 0)}`
        worksheet.getCell(currentRow, 4).value = methodMapping[expense.payment_method] || expense.payment_method || 'غير محدد'
        worksheet.getCell(currentRow, 5).value = expense.payment_date ? new Date(expense.payment_date).toLocaleDateString('en-GB') : 'غير محدد'
        worksheet.getCell(currentRow, 6).value = expense.vendor || 'غير محدد'
        worksheet.getCell(currentRow, 7).value = statusMapping[expense.status] || expense.status || 'غير محدد'

        // تنسيق الخلايا
        for (let col = 1; col <= 7; col++) {
          const cell = worksheet.getCell(currentRow, col)
          cell.font = { name: 'Arial', size: 10 }
          cell.alignment = { horizontal: 'center', vertical: 'middle' }
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          }
        }
        currentRow++
      })
    }

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      column.width = 20
    })
  }

  static async addAppointmentReportToExcel(workbook: ExcelJS.Workbook, data: AppointmentReportData, options: ReportExportOptions): Promise<void> {
    const worksheet = workbook.addWorksheet('تقرير المواعيد')

    // Header and summary similar to other reports
    worksheet.mergeCells('A1:F1')
    const headerCell = worksheet.getCell('A1')
    headerCell.value = 'تقرير المواعيد - عيادة الأسنان الحديثة'
    headerCell.font = { size: 16, bold: true }
    headerCell.alignment = { horizontal: 'center' }

    // Summary statistics
    worksheet.getCell('A3').value = 'ملخص إحصائيات المواعيد'
    worksheet.getCell('A3').font = { bold: true }

    worksheet.getCell('A4').value = 'إجمالي المواعيد:'
    worksheet.getCell('B4').value = data.totalAppointments || 0
    worksheet.getCell('A5').value = 'المواعيد المكتملة:'
    worksheet.getCell('B5').value = data.completedAppointments || 0
    worksheet.getCell('A6').value = 'المواعيد الملغية:'
    worksheet.getCell('B6').value = data.cancelledAppointments || 0
    worksheet.getCell('A7').value = 'معدل الحضور:'
    worksheet.getCell('B7').value = `${data.attendanceRate || 0}%`

    worksheet.columns.forEach(column => {
      column.width = 20
    })
  }

  static async addInventoryReportToExcel(workbook: ExcelJS.Workbook, data: any, options: ReportExportOptions): Promise<void> {
    const worksheet = workbook.addWorksheet('تقرير المخزون')

    // Header and summary
    worksheet.mergeCells('A1:F1')
    const headerCell = worksheet.getCell('A1')
    headerCell.value = 'تقرير المخزون - عيادة الأسنان الحديثة'
    headerCell.font = { size: 16, bold: true }
    headerCell.alignment = { horizontal: 'center' }

    // Summary statistics
    worksheet.getCell('A3').value = 'ملخص إحصائيات المخزون'
    worksheet.getCell('A3').font = { bold: true }

    // Handle both data structures (direct properties or summary object)
    const summary = data.summary || data

    worksheet.getCell('A4').value = 'إجمالي العناصر:'
    worksheet.getCell('B4').value = summary['إجمالي العناصر'] || data.totalItems || 0
    worksheet.getCell('A5').value = 'القيمة الإجمالية:'
    worksheet.getCell('B5').value = summary['القيمة الإجمالية'] || formatCurrency(data.totalValue || 0)
    worksheet.getCell('A6').value = 'عناصر منخفضة المخزون:'
    worksheet.getCell('B6').value = summary['عناصر منخفضة المخزون'] || data.lowStockItems || 0
    worksheet.getCell('A7').value = 'عناصر منتهية الصلاحية:'
    worksheet.getCell('B7').value = summary['عناصر منتهية الصلاحية'] || data.expiredItems || 0

    // Add additional fields if they exist
    if (summary['عناصر نفدت من المخزون'] !== undefined) {
      worksheet.getCell('A8').value = 'عناصر نفدت من المخزون:'
      worksheet.getCell('B8').value = summary['عناصر نفدت من المخزون']
    }

    if (summary['عناصر بدون أسعار'] !== undefined) {
      worksheet.getCell('A9').value = 'عناصر بدون أسعار:'
      worksheet.getCell('B9').value = summary['عناصر بدون أسعار']
    }

    if (summary['تاريخ التقرير']) {
      worksheet.getCell('A10').value = 'تاريخ التقرير:'
      worksheet.getCell('B10').value = summary['تاريخ التقرير']
    }

    worksheet.columns.forEach(column => {
      column.width = 20
    })
  }

  static async addLabReportToExcel(workbook: ExcelJS.Workbook, data: any, options: ReportExportOptions): Promise<void> {
    // Safety check for data parameter
    if (!data) {
      console.error('No data provided to addLabReportToExcel')
      return
    }

    const worksheet = workbook.addWorksheet('تقرير المختبرات')

    // Header
    worksheet.mergeCells('A1:F1')
    const headerCell = worksheet.getCell('A1')
    const globalAny2: any = (typeof window !== 'undefined') ? (window as any) : undefined
    const settingsFromWindow2 = globalAny2?.__CLINIC_SETTINGS__ || globalAny2?.clinicSettings || undefined
    const clinicNameForExcel1 = `عيادة الأسنان${settingsFromWindow2?.clinic_name && String(settingsFromWindow2.clinic_name).trim() !== '' ? ' - ' + String(settingsFromWindow2.clinic_name) : ''}`
    headerCell.value = `تقرير المختبرات - ${clinicNameForExcel1}`
    headerCell.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } }
    headerCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2E8B57' }
    }
    headerCell.alignment = { horizontal: 'center', vertical: 'middle' }
    headerCell.border = {
      top: { style: 'thick' },
      left: { style: 'thick' },
      bottom: { style: 'thick' },
      right: { style: 'thick' }
    }

    // Date and time
    worksheet.getCell('A2').value = `تاريخ التقرير: ${new Date().toLocaleDateString('ar-SA')}`
    worksheet.getCell('A2').font = { size: 12, italic: true }
    worksheet.getCell('A2').alignment = { horizontal: 'right' }

    let currentRow = 4

    // Summary statistics if available
    if (data && data.summary && typeof data.summary === 'object') {
      worksheet.getCell(`A${currentRow}`).value = 'ملخص الإحصائيات'
      worksheet.getCell(`A${currentRow}`).font = { size: 14, bold: true, color: { argb: 'FF2E8B57' } }
      currentRow += 2

      try {
        const summaryEntries = Object.entries(data.summary)
        for (const [key, value] of summaryEntries) {
          // Set cell values
          worksheet.getCell(`A${currentRow}`).value = key
          worksheet.getCell(`B${currentRow}`).value = value
          worksheet.getCell(`A${currentRow}`).font = { bold: true }
          worksheet.getCell(`B${currentRow}`).font = { size: 11 }

          // Add borders and background for column A
          const cellA = worksheet.getCell(`A${currentRow}`)
          cellA.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          }
          cellA.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF8F9FA' }
          }
          cellA.alignment = { horizontal: 'right', vertical: 'middle' }

          // Add borders and background for column B
          const cellB = worksheet.getCell(`B${currentRow}`)
          cellB.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          }
          cellB.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF8F9FA' }
          }
          cellB.alignment = { horizontal: 'right', vertical: 'middle' }

          currentRow++
        }
      } catch (error) {
        console.error('Error processing summary data:', error)
      }
      currentRow += 2
    }

    // Labs data table
    if (data.labs && data.labs.length > 0) {
      worksheet.getCell(`A${currentRow}`).value = 'بيانات المختبرات'
      worksheet.getCell(`A${currentRow}`).font = { size: 14, bold: true, color: { argb: 'FF2E8B57' } }
      currentRow += 2

      // Table headers
      const headers = ['اسم المختبر', 'معلومات الاتصال', 'العنوان', 'عدد الطلبات', 'تاريخ الإضافة']
      headers.forEach((header, index) => {
        const cell = worksheet.getCell(currentRow, index + 1)
        cell.value = header
        cell.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } }
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF4472C4' }
        }
        cell.border = {
          top: { style: 'medium' },
          left: { style: 'medium' },
          bottom: { style: 'medium' },
          right: { style: 'medium' }
        }
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
      })
      currentRow++

      // Table data
      try {
        data.labs.forEach((lab: any, index: number) => {
        const rowData = [
          lab.name,
          lab.contact_info || '',
          lab.address || '',
          lab.ordersCount || 0,
          new Date(lab.created_at).toLocaleDateString('ar-SA')
        ]

        rowData.forEach((value, colIndex) => {
          const cell = worksheet.getCell(currentRow, colIndex + 1)
          cell.value = value
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          }
          cell.alignment = { horizontal: 'right', vertical: 'middle' }

          // Alternating row colors
          if (index % 2 === 0) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF8F9FA' }
            }
          }
        })
        currentRow++
      })
      } catch (error) {
        console.error('Error processing labs data:', error)
      }
    }

    // Lab orders data table
    if (data.labOrders && data.labOrders.length > 0) {
      currentRow += 2
      worksheet.getCell(`A${currentRow}`).value = 'بيانات طلبات المختبرات'
      worksheet.getCell(`A${currentRow}`).font = { size: 14, bold: true, color: { argb: 'FF2E8B57' } }
      currentRow += 2

      // Table headers
      const orderHeaders = ['رقم الطلب', 'اسم المختبر', 'اسم الخدمة', 'اسم المريض', 'التكلفة', 'المبلغ المدفوع', 'المبلغ المتبقي', 'تاريخ الطلب', 'الحالة', 'الملاحظات']
      orderHeaders.forEach((header, index) => {
        const cell = worksheet.getCell(currentRow, index + 1)
        cell.value = header
        cell.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } }
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF4472C4' }
        }
        cell.border = {
          top: { style: 'medium' },
          left: { style: 'medium' },
          bottom: { style: 'medium' },
          right: { style: 'medium' }
        }
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
      })
      currentRow++

      // Table data
      try {
        data.labOrders.forEach((order: any, index: number) => {
        const rowData = [
          index + 1,
          order.lab?.name || 'غير محدد',
          order.service_name,
          order.patient?.full_name || 'غير محدد',
          `$${order.cost}`,
          `$${order.paid_amount || 0}`,
          `$${order.remaining_balance || 0}`,
          // Use Gregorian date format instead of Arabic
          new Date(order.order_date).toLocaleDateString('en-GB'),
          order.status,
          order.notes || ''
        ]

        rowData.forEach((value, colIndex) => {
          const cell = worksheet.getCell(currentRow, colIndex + 1)
          cell.value = value
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          }
          cell.alignment = { horizontal: 'right', vertical: 'middle' }

          // Alternating row colors
          if (index % 2 === 0) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF8F9FA' }
            }
          }

          // Highlight financial columns
          if (colIndex >= 4 && colIndex <= 6) {
            cell.font = { bold: true }
            if (!cell.fill) {
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFFF2CC' }
              }
            }
          }
        })
        currentRow++
      })
      } catch (error) {
        console.error('Error processing lab orders data:', error)
      }
    }

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      column.width = 15
    })

    // Set specific column widths
    worksheet.getColumn(1).width = 20 // Lab name
    worksheet.getColumn(2).width = 25 // Contact info
    worksheet.getColumn(3).width = 30 // Address
    worksheet.getColumn(4).width = 15 // Orders count
    worksheet.getColumn(5).width = 20 // Date
  }

  static async addClinicNeedsReportToExcel(workbook: ExcelJS.Workbook, data: any, options: ReportExportOptions): Promise<void> {
    const worksheet = workbook.addWorksheet('تقرير احتياجات العيادة')

    // Header
    worksheet.mergeCells('A1:H1')
    const headerCell = worksheet.getCell('A1')
    const globalAny3: any = (typeof window !== 'undefined') ? (window as any) : undefined
    const settingsFromWindow3 = globalAny3?.__CLINIC_SETTINGS__ || globalAny3?.clinicSettings || undefined
    const clinicNameForExcel2 = `عيادة الأسنان${settingsFromWindow3?.clinic_name && String(settingsFromWindow3.clinic_name).trim() !== '' ? ' - ' + String(settingsFromWindow3.clinic_name) : ''}`
    headerCell.value = `تقرير احتياجات العيادة - ${clinicNameForExcel2}`
    headerCell.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } }
    headerCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2E8B57' }
    }
    headerCell.alignment = { horizontal: 'center', vertical: 'middle' }
    headerCell.border = {
      top: { style: 'thick' },
      left: { style: 'thick' },
      bottom: { style: 'thick' },
      right: { style: 'thick' }
    }

    // Date and time - Use Gregorian date format
    worksheet.getCell('A2').value = `تاريخ التقرير: ${new Date().toLocaleDateString('en-GB')}`
    worksheet.getCell('A2').font = { size: 12, italic: true }
    worksheet.getCell('A2').alignment = { horizontal: 'right' }

    let currentRow = 4

    // Summary statistics if available
    if (data.summary) {
      worksheet.getCell(`A${currentRow}`).value = 'ملخص الإحصائيات'
      worksheet.getCell(`A${currentRow}`).font = { size: 14, bold: true, color: { argb: 'FF2E8B57' } }
      currentRow += 2

      Object.entries(data.summary).forEach(([key, value]) => {
        worksheet.getCell(`A${currentRow}`).value = key
        worksheet.getCell(`B${currentRow}`).value = value
        worksheet.getCell(`A${currentRow}`).font = { bold: true }
        worksheet.getCell(`B${currentRow}`).font = { size: 11 }

        // Add borders and background
        ['A', 'B'].forEach(col => {
          const cell = worksheet.getCell(`${col}${currentRow}`)
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          }
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF8F9FA' }
          }
          cell.alignment = { horizontal: 'right', vertical: 'middle' }
        })
        currentRow++
      })
      currentRow += 2
    }

    // Clinic needs data table
    if (data.needs && data.needs.length > 0) {
      worksheet.getCell(`A${currentRow}`).value = 'بيانات احتياجات العيادة'
      worksheet.getCell(`A${currentRow}`).font = { size: 14, bold: true, color: { argb: 'FF2E8B57' } }
      currentRow += 2

      // Table headers
      const headers = ['#', 'اسم العنصر', 'الكمية المطلوبة', 'الأولوية', 'الحالة', 'تاريخ الطلب', 'تاريخ الاستلام', 'الملاحظات']
      headers.forEach((header, index) => {
        const cell = worksheet.getCell(currentRow, index + 1)
        cell.value = header
        cell.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } }
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF4472C4' }
        }
        cell.border = {
          top: { style: 'medium' },
          left: { style: 'medium' },
          bottom: { style: 'medium' },
          right: { style: 'medium' }
        }
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
      })
      currentRow++

      // Table data
      data.needs.forEach((need: any, index: number) => {
        const priorityLabels = {
          urgent: 'عاجل',
          high: 'عالي',
          medium: 'متوسط',
          low: 'منخفض'
        }

        const statusLabels = {
          pending: 'آجل',
          ordered: 'تم الطلب',
          received: 'تم الاستلام'
        }

        const rowData = [
          index + 1,
          need.item_name,
          need.quantity_needed,
          priorityLabels[need.priority] || need.priority,
          statusLabels[need.status] || need.status,
          // Use Gregorian date format instead of Arabic
          new Date(need.date_needed).toLocaleDateString('en-GB'),
          need.date_received ? new Date(need.date_received).toLocaleDateString('en-GB') : '',
          need.notes || ''
        ]

        rowData.forEach((value, colIndex) => {
          const cell = worksheet.getCell(currentRow, colIndex + 1)
          cell.value = value
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          }
          cell.alignment = { horizontal: 'right', vertical: 'middle' }

          // Alternating row colors
          if (index % 2 === 0) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF8F9FA' }
            }
          }

          // Priority color coding
          if (colIndex === 3) { // Priority column
            let priorityColor = 'FFF8F9FA'
            switch (need.priority) {
              case 'urgent':
                priorityColor = 'FFFFE6E6'
                break
              case 'high':
                priorityColor = 'FFFFF2CC'
                break
              case 'medium':
                priorityColor = 'FFFFFFE6'
                break
              case 'low':
                priorityColor = 'FFE6F7FF'
                break
            }
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: priorityColor }
            }
          }

          // Status color coding
          if (colIndex === 4) { // Status column
            let statusColor = 'FFF8F9FA'
            switch (need.status) {
              case 'pending':
                statusColor = 'FFFFE6E6'
                break
              case 'ordered':
                statusColor = 'FFFFF2CC'
                break
              case 'received':
                statusColor = 'FFE6F7E6'
                break
            }
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: statusColor }
            }
          }
        })
        currentRow++
      })
    }

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      column.width = 15
    })

    // Set specific column widths
    worksheet.getColumn(1).width = 12 // Serial number
    worksheet.getColumn(2).width = 25 // Item name
    worksheet.getColumn(3).width = 15 // Quantity
    worksheet.getColumn(4).width = 12 // Priority
    worksheet.getColumn(5).width = 15 // Status
    worksheet.getColumn(6).width = 18 // Date needed
    worksheet.getColumn(7).width = 18 // Date received
    worksheet.getColumn(8).width = 30 // Notes
  }

  static async addOverviewReportToExcel(workbook: ExcelJS.Workbook, data: any, options: ReportExportOptions): Promise<void> {
    if (data.patients) {
      await this.addPatientReportToExcel(workbook, data.patients, options)
    }
    if (data.appointments) {
      await this.addAppointmentReportToExcel(workbook, data.appointments, options)
    }
    if (data.financial) {
      await this.addFinancialReportToExcel(workbook, data.financial, options)
    }
    if (data.inventory) {
      await this.addInventoryReportToExcel(workbook, data.inventory, options)
    }
    if (data.labs) {
      await this.addLabReportToExcel(workbook, data.labs, options)
    }
    if (data.clinicNeeds) {
      await this.addClinicNeedsReportToExcel(workbook, data.clinicNeeds, options)
    }
  }

  /**
   * إضافة تقرير الأرباح والخسائر الشامل إلى Excel
   */
  static async addProfitLossReportToExcel(workbook: ExcelJS.Workbook, data: any, options: ReportExportOptions): Promise<void> {
    const worksheet = workbook.addWorksheet('تقرير الأرباح والخسائر')

    // Header
    worksheet.mergeCells('A1:H1')
    const headerCell = worksheet.getCell('A1')
    headerCell.value = 'التقرير الشامل للأرباح والخسائر - عيادة الأسنان'
    headerCell.font = { size: 16, bold: true }
    headerCell.alignment = { horizontal: 'center' }

    // Summary section
    worksheet.getCell('A3').value = 'ملخص الأرباح والخسائر'
    worksheet.getCell('A3').font = { bold: true, size: 14 }

    let currentRow = 5

    // Financial summary
    if (data.summary) {
      Object.entries(data.summary).forEach(([key, value]) => {
        worksheet.getCell(currentRow, 1).value = key
        worksheet.getCell(currentRow, 2).value = value
        worksheet.getCell(currentRow, 1).font = { bold: true }
        currentRow++
      })
      currentRow += 2
    }

    // Revenue breakdown
    if (data.revenue) {
      worksheet.getCell(currentRow, 1).value = 'تفاصيل الإيرادات'
      worksheet.getCell(currentRow, 1).font = { bold: true, size: 12, color: { argb: 'FF059669' } }
      worksheet.getCell(currentRow, 1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE6F7E6' }
      }
      currentRow += 2

      worksheet.getCell(currentRow, 1).value = 'المدفوعات المكتملة:'
      worksheet.getCell(currentRow, 2).value = formatCurrency(data.revenue.completedPayments || 0)
      worksheet.getCell(currentRow, 1).font = { bold: true }
      currentRow++

      worksheet.getCell(currentRow, 1).value = 'المدفوعات الجزئية:'
      worksheet.getCell(currentRow, 2).value = formatCurrency(data.revenue.partialPayments || 0)
      worksheet.getCell(currentRow, 1).font = { bold: true }
      currentRow++

      worksheet.getCell(currentRow, 1).value = 'المبالغ الآجلة:'
      worksheet.getCell(currentRow, 2).value = formatCurrency(data.revenue.pendingPayments || 0)
      worksheet.getCell(currentRow, 1).font = { bold: true }
      currentRow++

      worksheet.getCell(currentRow, 1).value = 'المبالغ المتبقية من الجزئية:'
      worksheet.getCell(currentRow, 2).value = formatCurrency(data.revenue.remainingBalances || 0)
      worksheet.getCell(currentRow, 1).font = { bold: true }
      currentRow++

      worksheet.getCell(currentRow, 1).value = 'إجمالي الإيرادات:'
      worksheet.getCell(currentRow, 2).value = formatCurrency(data.revenue.totalRevenue || 0)
      worksheet.getCell(currentRow, 1).font = { bold: true, color: { argb: 'FF059669' } }
      worksheet.getCell(currentRow, 2).font = { bold: true, color: { argb: 'FF059669' } }
      worksheet.getCell(currentRow, 1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFF2CC' }
      }
      worksheet.getCell(currentRow, 2).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFF2CC' }
      }
      currentRow += 3
    }

    // Expenses breakdown
    if (data.expenses) {
      worksheet.getCell(currentRow, 1).value = 'تفاصيل المصروفات'
      worksheet.getCell(currentRow, 1).font = { bold: true, size: 12 }
      currentRow += 2

      worksheet.getCell(currentRow, 1).value = 'مدفوعات المخابر:'
      worksheet.getCell(currentRow, 2).value = formatCurrency(data.expenses.labOrdersTotal || 0)
      currentRow++

      worksheet.getCell(currentRow, 1).value = 'متبقي المخابر:'
      worksheet.getCell(currentRow, 2).value = formatCurrency(data.expenses.labOrdersRemaining || 0)
      currentRow++

      worksheet.getCell(currentRow, 1).value = 'احتياجات العيادة:'
      worksheet.getCell(currentRow, 2).value = formatCurrency(data.expenses.clinicNeedsTotal || 0)
      currentRow++

      worksheet.getCell(currentRow, 1).value = 'متبقي الاحتياجات:'
      worksheet.getCell(currentRow, 2).value = formatCurrency(data.expenses.clinicNeedsRemaining || 0)
      currentRow++

      worksheet.getCell(currentRow, 1).value = 'قيمة المخزون:'
      worksheet.getCell(currentRow, 2).value = formatCurrency(data.expenses.inventoryExpenses || 0)
      currentRow++

      worksheet.getCell(currentRow, 1).value = 'مصروفات العيادة المباشرة:'
      worksheet.getCell(currentRow, 2).value = formatCurrency(data.expenses.clinicExpensesTotal || 0)
      currentRow++

      const totalExpenses = (data.expenses.labOrdersTotal || 0) +
                           (data.expenses.labOrdersRemaining || 0) +
                           (data.expenses.clinicNeedsTotal || 0) +
                           (data.expenses.clinicNeedsRemaining || 0) +
                           (data.expenses.inventoryExpenses || 0) +
                           (data.expenses.clinicExpensesTotal || 0)

      worksheet.getCell(currentRow, 1).value = 'إجمالي المصروفات:'
      worksheet.getCell(currentRow, 2).value = formatCurrency(totalExpenses)
      worksheet.getCell(currentRow, 1).font = { bold: true }
      worksheet.getCell(currentRow, 2).font = { bold: true }
      currentRow += 3
    }

    // Detailed data sheets
    if (data.payments && data.payments.length > 0) {
      this.addPaymentsDetailSheet(workbook, data.payments)
    }

    if (data.labOrders && data.labOrders.length > 0) {
      this.addLabOrdersDetailSheet(workbook, data.labOrders)
    }

    if (data.clinicNeeds && data.clinicNeeds.length > 0) {
      this.addClinicNeedsDetailSheet(workbook, data.clinicNeeds)
    }

    if (data.inventoryItems && data.inventoryItems.length > 0) {
      this.addInventoryDetailSheet(workbook, data.inventoryItems)
    }

    if (data.clinicExpenses && data.clinicExpenses.length > 0) {
      this.addClinicExpensesDetailSheet(workbook, data.clinicExpenses)
    }

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      column.width = 25
    })
  }

  // Helper methods for detailed sheets
  private static addPaymentsDetailSheet(workbook: ExcelJS.Workbook, payments: any[]): void {
    const worksheet = workbook.addWorksheet('تفاصيل المدفوعات')

    // Calculate pending payments using total_amount and partial payment remaining amounts
    const pendingPayments = payments.filter(p => p.status === 'pending')
    const partialPayments = payments.filter(p => p.status === 'partial')

    // Calculate total pending amount using treatment total cost, not payment amount
    const totalPendingAmount = pendingPayments.reduce((sum, p) => {
      const treatmentTotalCost = p.treatment_total_cost || p.total_amount_due || 0
      return sum + treatmentTotalCost
    }, 0)

    // Calculate remaining amounts from partial payments
    const totalRemainingFromPartial = partialPayments.reduce((sum, p) => {
      const treatmentTotalCost = p.total_amount_due || p.treatment_total_cost || 0

      // إذا كان هناك مبلغ إجمالي للعلاج، احسب المتبقي
      if (treatmentTotalCost > 0) {
        // استخدم إجمالي المدفوع للعلاج وليس مبلغ هذه الدفعة فقط
        const totalPaidForTreatment = p.amount_paid || p.treatment_total_paid || p.amount || 0
        return sum + Math.max(0, treatmentTotalCost - totalPaidForTreatment)
      }

      // إذا لم يكن هناك مبلغ إجمالي، استخدم الرصيد المتبقي المحفوظ
      const remainingBalance = p.treatment_remaining_balance || p.remaining_balance || 0
      return sum + remainingBalance
    }, 0)

    // Headers - removed patient ID, kept only patient name
    const headers = ['اسم المريض', 'المبلغ المدفوع', 'المبلغ الإجمالي', 'المبلغ المتبقي', 'الحالة', 'طريقة الدفع', 'تاريخ الدفع', 'ملاحظات']
    headers.forEach((header, index) => {
      const cell = worksheet.getCell(1, index + 1)
      cell.value = header
      cell.font = { bold: true }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } }
    })

    // Data
    payments.forEach((payment, index) => {
      const row = index + 2

      // المبلغ المدفوع في هذه الدفعة
      const paidAmount = payment.amount || 0

      // المبلغ الإجمالي للعلاج أو الموعد
      let treatmentTotalCost = 0
      let remainingAmount = 0

      if (payment.status === 'partial') {
        // للدفعات الجزئية: استخدم المبلغ الإجمالي المطلوب
        treatmentTotalCost = payment.total_amount_due || payment.treatment_total_cost || 0

        // إذا كان هناك مبلغ إجمالي، احسب المتبقي
        if (treatmentTotalCost > 0) {
          // للدفعات الجزئية، المبلغ المتبقي = المبلغ الإجمالي - إجمالي المدفوع (وليس مبلغ هذه الدفعة فقط)
          const totalPaidForTreatment = payment.amount_paid || payment.treatment_total_paid || paidAmount
          remainingAmount = Math.max(0, treatmentTotalCost - totalPaidForTreatment)
        } else {
          // استخدم الرصيد المتبقي المحفوظ
          remainingAmount = payment.remaining_balance || payment.treatment_remaining_balance || 0
        }
      } else if (payment.status === 'pending') {
        // للدفعات الآجلة: المبلغ الإجمالي هو المبلغ المطلوب والمتبقي هو نفس المبلغ
        treatmentTotalCost = payment.total_amount_due || payment.treatment_total_cost || paidAmount
        remainingAmount = treatmentTotalCost
      } else {
        // للدفعات المكتملة: المبلغ الإجمالي = المبلغ المدفوع والمتبقي = 0
        treatmentTotalCost = paidAmount
        remainingAmount = 0
      }

      worksheet.getCell(row, 1).value = payment.patient_name || ''
      worksheet.getCell(row, 2).value = formatCurrency(paidAmount)
      worksheet.getCell(row, 3).value = formatCurrency(treatmentTotalCost)
      worksheet.getCell(row, 4).value = formatCurrency(remainingAmount)
      worksheet.getCell(row, 5).value = payment.status === 'completed' ? 'مكتمل' :
                                       payment.status === 'partial' ? 'جزئي' : 'آجل'
      worksheet.getCell(row, 6).value = payment.payment_method || ''
      // Use Gregorian date format instead of Arabic
      worksheet.getCell(row, 7).value = payment.payment_date ? new Date(payment.payment_date).toLocaleDateString('en-GB') : ''
      worksheet.getCell(row, 8).value = payment.notes || ''
    })

    // Add summary rows for pending and remaining balances
    const summaryStartRow = payments.length + 4
    worksheet.getCell(summaryStartRow, 1).value = 'ملخص المدفوعات الآجلة والمتبقية'
    worksheet.getCell(summaryStartRow, 1).font = { bold: true, size: 14 }
    worksheet.mergeCells(summaryStartRow, 1, summaryStartRow, 8)

    worksheet.getCell(summaryStartRow + 2, 1).value = 'إجمالي المدفوعات الآجلة:'
    worksheet.getCell(summaryStartRow + 2, 2).value = formatCurrency(totalPendingAmount)
    worksheet.getCell(summaryStartRow + 2, 1).font = { bold: true }
    worksheet.getCell(summaryStartRow + 2, 2).font = { bold: true }

    worksheet.getCell(summaryStartRow + 3, 1).value = 'إجمالي المبالغ المتبقية من الدفعات الجزئية:'
    worksheet.getCell(summaryStartRow + 3, 2).value = formatCurrency(totalRemainingFromPartial)
    worksheet.getCell(summaryStartRow + 3, 1).font = { bold: true }
    worksheet.getCell(summaryStartRow + 3, 2).font = { bold: true }

    // Add total outstanding balance
    const totalOutstanding = totalPendingAmount + totalRemainingFromPartial
    worksheet.getCell(summaryStartRow + 4, 1).value = 'إجمالي المبالغ غير المدفوعة:'
    worksheet.getCell(summaryStartRow + 4, 2).value = formatCurrency(totalOutstanding)
    worksheet.getCell(summaryStartRow + 4, 1).font = { bold: true, color: { argb: 'FFDC2626' } }
    worksheet.getCell(summaryStartRow + 4, 2).font = { bold: true, color: { argb: 'FFDC2626' } }

    // Add styling to summary section
    for (let row = summaryStartRow; row <= summaryStartRow + 4; row++) {
      for (let col = 1; col <= 2; col++) {
        const cell = worksheet.getCell(row, col)
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        }
        if (row === summaryStartRow) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4472C4' }
          }
          cell.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } }
        } else if (row > summaryStartRow + 1) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF8F9FA' }
          }
        }
      }
    }

    worksheet.columns.forEach(column => {
      column.width = 15
    })
  }

  private static addLabOrdersDetailSheet(workbook: ExcelJS.Workbook, labOrders: any[]): void {
    const worksheet = workbook.addWorksheet('تفاصيل طلبات المخابر')

    // Headers
    const headers = ['رقم الطلب', 'اسم المختبر', 'اسم المريض', 'التكلفة', 'المدفوع', 'المتبقي', 'الحالة', 'تاريخ الطلب']
    headers.forEach((header, index) => {
      const cell = worksheet.getCell(1, index + 1)
      cell.value = header
      cell.font = { bold: true }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } }
    })

    // Data
    labOrders.forEach((order, index) => {
      const row = index + 2
      worksheet.getCell(row, 1).value = order.id || ''
      worksheet.getCell(row, 2).value = order.lab?.name || ''
      worksheet.getCell(row, 3).value = order.patient?.full_name || ''
      worksheet.getCell(row, 4).value = formatCurrency(order.cost || 0)
      worksheet.getCell(row, 5).value = formatCurrency(order.paid_amount || 0)
      worksheet.getCell(row, 6).value = formatCurrency((order.cost || 0) - (order.paid_amount || 0))
      worksheet.getCell(row, 7).value = order.status === 'completed' ? 'مكتمل' :
                                       order.status === 'pending' ? 'آجل' : 'ملغي'
      // Use Gregorian date format instead of Arabic
      worksheet.getCell(row, 8).value = order.order_date ? new Date(order.order_date).toLocaleDateString('en-GB') : ''
    })

    worksheet.columns.forEach(column => {
      column.width = 15
    })
  }

  private static addClinicNeedsDetailSheet(workbook: ExcelJS.Workbook, clinicNeeds: any[]): void {
    const worksheet = workbook.addWorksheet('تفاصيل احتياجات العيادة')

    // Headers - added cost/price field
    const headers = ['اسم العنصر', 'الكمية', 'سعر الوحدة', 'التكلفة الإجمالية', 'الأولوية', 'الحالة', 'التاريخ المطلوب', 'التاريخ المستلم', 'ملاحظات']
    headers.forEach((header, index) => {
      const cell = worksheet.getCell(1, index + 1)
      cell.value = header
      cell.font = { bold: true }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } }
    })

    // Data
    clinicNeeds.forEach((need, index) => {
      const row = index + 2
      const quantity = need.quantity || 0
      const unitPrice = need.price || 0
      const totalCost = quantity * unitPrice

      worksheet.getCell(row, 1).value = need.need_name || need.item_name || ''
      worksheet.getCell(row, 2).value = quantity
      worksheet.getCell(row, 3).value = formatCurrency(unitPrice)
      worksheet.getCell(row, 4).value = formatCurrency(totalCost)
      worksheet.getCell(row, 5).value = need.priority === 'urgent' ? 'عاجل' :
                                       need.priority === 'high' ? 'عالي' :
                                       need.priority === 'medium' ? 'متوسط' : 'منخفض'
      worksheet.getCell(row, 6).value = need.status === 'received' ? 'مستلم' :
                                       need.status === 'ordered' ? 'مطلوب' : 'آجل'
      // Use Gregorian date format instead of Arabic
      worksheet.getCell(row, 7).value = need.date_needed ? new Date(need.date_needed).toLocaleDateString('en-GB') : ''
      worksheet.getCell(row, 8).value = need.date_received ? new Date(need.date_received).toLocaleDateString('en-GB') : ''
      worksheet.getCell(row, 9).value = need.notes || ''
    })

    // Add total cost summary
    const totalCost = clinicNeeds.reduce((sum, need) => {
      const quantity = need.quantity || 0
      const unitPrice = need.price || 0
      return sum + (quantity * unitPrice)
    }, 0)

    const summaryRow = clinicNeeds.length + 3
    worksheet.getCell(summaryRow, 1).value = 'إجمالي تكلفة احتياجات العيادة:'
    worksheet.getCell(summaryRow, 4).value = formatCurrency(totalCost)
    worksheet.getCell(summaryRow, 1).font = { bold: true }
    worksheet.getCell(summaryRow, 4).font = { bold: true }

    worksheet.columns.forEach(column => {
      column.width = 15
    })
  }

  private static addInventoryDetailSheet(workbook: ExcelJS.Workbook, inventoryItems: any[]): void {
    const worksheet = workbook.addWorksheet('تفاصيل المخزون')

    // Headers
    const headers = ['اسم العنصر', 'الكمية', 'سعر الوحدة', 'القيمة الإجمالية', 'الحد الأدنى', 'تاريخ الانتهاء', 'الفئة']
    headers.forEach((header, index) => {
      const cell = worksheet.getCell(1, index + 1)
      cell.value = header
      cell.font = { bold: true }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } }
    })

    // Data
    inventoryItems.forEach((item, index) => {
      const row = index + 2
      const costPerUnit = parseFloat(String(item.cost_per_unit || 0)) || 0
      const unitPrice = parseFloat(String(item.unit_price || 0)) || 0
      const cost = costPerUnit || unitPrice
      const quantity = parseFloat(String(item.quantity || 0)) || 0
      const totalValue = quantity * cost

      worksheet.getCell(row, 1).value = item.name || ''
      worksheet.getCell(row, 2).value = quantity
      worksheet.getCell(row, 3).value = formatCurrency(cost)
      worksheet.getCell(row, 4).value = formatCurrency(totalValue)
      worksheet.getCell(row, 5).value = item.minimum_stock || 0
      // Use Gregorian date format instead of Arabic
      worksheet.getCell(row, 6).value = item.expiry_date ? new Date(item.expiry_date).toLocaleDateString('en-GB') : ''
      worksheet.getCell(row, 7).value = item.category || ''
    })

    worksheet.columns.forEach(column => {
      column.width = 15
    })
  }

  private static addClinicExpensesDetailSheet(workbook: ExcelJS.Workbook, clinicExpenses: any[]): void {
    const worksheet = workbook.addWorksheet('تفاصيل مصروفات العيادة')

    // Headers
    const headers = ['اسم المصروف', 'النوع', 'المبلغ', 'طريقة الدفع', 'تاريخ الدفع', 'المورد', 'ملاحظات']
    headers.forEach((header, index) => {
      const cell = worksheet.getCell(1, index + 1)
      cell.value = header
      cell.font = { bold: true }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } }
    })

    // Data
    clinicExpenses.forEach((expense, index) => {
      const row = index + 2
      worksheet.getCell(row, 1).value = expense.expense_name || ''
      worksheet.getCell(row, 2).value = expense.expense_type || ''
      worksheet.getCell(row, 3).value = formatCurrency(expense.amount || 0)
      worksheet.getCell(row, 4).value = expense.payment_method || ''
      // Use Gregorian date format instead of Arabic
      worksheet.getCell(row, 5).value = expense.payment_date ? new Date(expense.payment_date).toLocaleDateString('en-GB') : ''
      worksheet.getCell(row, 6).value = expense.vendor || ''
      worksheet.getCell(row, 7).value = expense.notes || ''
    })

    worksheet.columns.forEach(column => {
      column.width = 15
    })
  }

  // CSV Export Functions
  static async exportToCSV(type: string, data: any, options: ReportExportOptions): Promise<string> {
    let csvContent = '\uFEFF' // BOM for Arabic support

    switch (type) {
      case 'patients':
        csvContent += this.generatePatientCSV(data, options)
        break
      case 'appointments':
        csvContent += this.generateAppointmentCSV(data, options)
        break
      case 'financial':
        csvContent += this.generateFinancialCSV(data, options)
        break
      case 'inventory':
        csvContent += this.generateInventoryCSV(data, options)
        break
      case 'profit-loss':
        csvContent += this.generateProfitLossCSV(data, options)
        break
      case 'overview':
        csvContent += this.generateOverviewCSV(data, options)
        break
    }

    // تصدير Excel مباشرة بدلاً من CSV
    await this.convertCSVToExcel(csvContent, type, options)

    const fileName = this.generateFileName(type, 'xlsx', { includeTime: true })
    return fileName
  }

  // دوال مساعدة للتنسيق
  private static isTableHeader(line: string, currentRow: number): boolean {
    return line.includes('اسم المريض') ||
           line.includes('نوع الموعد') ||
           line.includes('نوع الدفع') ||
           line.includes('تاريخ الدفع') ||
           line.includes('اسم الصنف') ||
           line.includes('التاريخ,الوقت') ||
           line.includes('رقم الإيصال') ||
           line.includes('#') ||
           line.includes('اسم العلاج') ||
           line.includes('اسم المنتج') ||
           (currentRow === 1 && line.includes(','))
  }

  private static isFinancialData(line: string): boolean {
    return line.includes('إجمالي') ||
           line.includes('صافي') ||
           line.includes('الربح') ||
           line.includes('الخسارة') ||
           line.includes('المدفوعات') ||
           line.includes('الإيرادات') ||
           line.includes('المصروفات') ||
           line.includes('القيمة الإجمالية') ||
           line.includes('المبلغ الإجمالي')
  }

  // وظيفة تحويل CSV إلى Excel
  static async convertCSVToExcel(csvContent: string, type: string, options: ReportExportOptions): Promise<void> {
    try {
      // إنشاء workbook جديد
      const workbook = new ExcelJS.Workbook()
      workbook.creator = 'نظام إدارة العيادة'
      workbook.created = new Date()
      workbook.modified = new Date()

      // إنشاء worksheet
      const worksheet = workbook.addWorksheet('التقرير')

      // تحليل محتوى CSV
      const lines = csvContent.replace('\uFEFF', '').split('\n').filter(line => line.trim())

      let currentRow = 1

      for (const line of lines) {
        if (line.includes(',')) {
          // هذا سطر بيانات جدول
          const values = this.parseCSVLine(line)
          values.forEach((value, colIndex) => {
            const cell = worksheet.getCell(currentRow, colIndex + 1)
            cell.value = value

            // تنسيق الخلايا حسب نوع التقرير
            if (this.isTableHeader(line, currentRow)) {
              // هذا عنوان جدول
              cell.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } }
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: type === 'comprehensive' ? 'FF2E8B57' : 'FF4472C4' } // أخضر للشامل، أزرق للباقي
              }
              cell.border = {
                top: { style: 'medium' },
                left: { style: 'medium' },
                bottom: { style: 'medium' },
                right: { style: 'medium' }
              }
            } else if (this.isFinancialData(line)) {
              // بيانات مالية مهمة
              cell.font = { bold: true, size: 11 }
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFFF2CC' } // أصفر فاتح
              }
              cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
              }
            } else {
              // بيانات عادية
              cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
              }
              // تلوين الصفوف بالتناوب
              if (currentRow % 2 === 0) {
                cell.fill = {
                  type: 'pattern',
                  pattern: 'solid',
                  fgColor: { argb: 'FFF8F9FA' } // رمادي فاتح جداً
                }
              }
            }

            // محاذاة النص للعربية
            cell.alignment = { horizontal: 'right', vertical: 'middle' }
          })
        } else {
          // هذا عنوان رئيسي أو فرعي
          const cell = worksheet.getCell(currentRow, 1)
          cell.value = line.trim()

          if (line.includes('عيادة الأسنان') || line.includes('التقرير الشامل') || line.includes('التقرير المالي')) {
            // عنوان رئيسي
            cell.font = { bold: true, size: 18, color: { argb: 'FF1F4E79' } }
            cell.alignment = { horizontal: 'center', vertical: 'middle' }
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFE7F3FF' }
            }
            worksheet.mergeCells(currentRow, 1, currentRow, 12)
          } else if (line.includes('===') || line.includes('تحليل') || line.includes('ملخص')) {
            // عنوان قسم
            cell.font = { bold: true, size: 14, color: { argb: 'FF2E8B57' } }
            cell.alignment = { horizontal: 'right', vertical: 'middle' }
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF0FFF0' }
            }
            worksheet.mergeCells(currentRow, 1, currentRow, 8)
          } else {
            // عنوان فرعي
            cell.font = { bold: true, size: 12 }
            cell.alignment = { horizontal: 'right', vertical: 'middle' }
          }
        }
        currentRow++
      }

      // تعديل عرض الأعمدة وتحسين التنسيق
      worksheet.columns.forEach((column, index) => {
        if (index === 0) {
          column.width = 25 // العمود الأول أوسع للأسماء
        } else {
          column.width = 18
        }
      })

      // إضافة تجميد للصف الأول إذا كان يحتوي على عناوين
      if (lines.length > 0 && lines[0].includes(',')) {
        worksheet.views = [{ state: 'frozen', ySplit: 1 }]
      }

      // تحسين ارتفاع الصفوف
      worksheet.eachRow((row, rowNumber) => {
        row.height = 25
        if (rowNumber === 1) {
          row.height = 30 // الصف الأول أطول
        }
      })

      // حفظ ملف Excel
      const excelFileName = this.generateFileName(type, 'xlsx', { includeTime: true })

      // إنشاء blob وتنزيل الملف
      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })

      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `${excelFileName}.xlsx`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      console.log(`✅ تم تحويل CSV إلى Excel: ${excelFileName}.xlsx`)
    } catch (error) {
      console.error('خطأ في تحويل CSV إلى Excel:', error)
      // لا نرمي خطأ هنا لأن CSV تم تصديره بنجاح
    }
  }

  // وظيفة مساعدة لتحليل سطر CSV
  static parseCSVLine(line: string): string[] {
    const result = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]

      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }

    result.push(current.trim())
    return result.map(item => item.replace(/^"|"$/g, '')) // إزالة علامات الاقتباس
  }

  static generatePatientCSV(data: PatientReportData, options: ReportExportOptions): string {
    let csv = 'تقرير المرضى - عيادة الأسنان الحديثة\n\n'
    csv += 'ملخص الإحصائيات\n'
    csv += `إجمالي المرضى,${data.totalPatients || 0}\n`
    csv += `المرضى الجدد هذا الشهر,${data.newPatientsThisMonth || 0}\n`
    csv += `المرضى النشطون,${data.activePatients || 0}\n`
    csv += `متوسط العمر,${data.averageAge || 0} سنة\n\n`

    // Add age distribution to CSV
    if (data.ageDistribution && data.ageDistribution.length > 0) {
      csv += 'توزيع الأعمار\n'
      csv += 'الفئة العمرية,العدد,النسبة المئوية\n'

      data.ageDistribution.forEach((group: any) => {
        const percentage = data.totalPatients > 0 ? ((group.count / data.totalPatients) * 100).toFixed(1) : '0.0'
        csv += `"${group.ageGroup}",${group.count},${percentage}%\n`
      })
      csv += '\n'
    }

    // Add gender distribution to CSV
    if (data.genderDistribution && data.genderDistribution.length > 0) {
      csv += 'توزيع الجنس\n'
      csv += 'الجنس,العدد,النسبة المئوية\n'

      data.genderDistribution.forEach((group: any) => {
        const percentage = data.totalPatients > 0 ? ((group.count / data.totalPatients) * 100).toFixed(1) : '0.0'
        const genderLabel = group.gender === 'male' || group.gender === 'ذكور' ? 'ذكر' : 'أنثى'
        csv += `"${genderLabel}",${group.count},${percentage}%\n`
      })
      csv += '\n'
    }

    if (options.includeDetails && data.patients) {
      csv += 'تفاصيل المرضى\n'
      csv += '#,الاسم الكامل,الجنس,العمر,الهاتف,البريد الإلكتروني,تاريخ التسجيل\n'

      data.patients.forEach((patient: any) => {
        const genderLabel = patient.gender === 'male' ? 'ذكر' : 'أنثى'
        const registrationDate = patient.created_at ? new Date(patient.created_at).toLocaleDateString('ar-SA') : ''
        csv += `"${patient.serial_number || ''}","${patient.full_name || ''}","${genderLabel}","${patient.age || ''}","${patient.phone || ''}","${patient.email || ''}","${registrationDate}"\n`
      })
    }

    return csv
  }

  static generateFinancialCSV(data: FinancialReportData, options: ReportExportOptions): string {
    let csv = 'التقرير المالي الشامل - عيادة الأسنان الحديثة\n\n'

    // Add current date and time
    const currentDate = new Date()
    const day = currentDate.getDate().toString().padStart(2, '0')
    const month = (currentDate.getMonth() + 1).toString().padStart(2, '0')
    const year = currentDate.getFullYear()
    const formattedDate = `${day}/${month}/${year}`
    const formattedTime = currentDate.toLocaleTimeString('ar-SA')

    csv += `تاريخ التقرير,${formattedDate}\n`
    csv += `وقت الإنشاء,${formattedTime}\n\n`

    // Add filter information if available
    if (data.filterInfo) {
      csv += 'معلومات الفلترة المطبقة\n'
      csv += `نطاق البيانات,"${data.filterInfo}"\n`
      csv += `عدد المعاملات المصدرة,${data.dataCount || 0}\n\n`
    }

    csv += 'ملخص الإحصائيات المالية\n'
    csv += `إجمالي الإيرادات,${formatCurrency(data.totalRevenue || 0)}\n`
    csv += `المدفوعات المكتملة,${formatCurrency(data.completedPayments || 0)}\n`
    csv += `المدفوعات الآجلة,${formatCurrency(data.pendingPayments || 0)}\n`
    csv += `المدفوعات المتأخرة,${formatCurrency(data.overduePayments || 0)}\n`
    csv += `إجمالي المصروفات,${formatCurrency(data.totalExpenses || 0)}\n`
    csv += `صافي الربح,${formatCurrency(data.netProfit || 0)}\n`
    csv += `هامش الربح,${(data.profitMargin || 0).toFixed(2)}%\n`
    csv += `حالة الربحية,${(data.netProfit || 0) >= 0 ? 'ربح' : 'خسارة'}\n`

    // إضافة المبالغ المتبقية من الدفعات الجزئية إذا كانت متوفرة
    if ((data as any).payments && Array.isArray((data as any).payments)) {
      const partialPaymentsRemaining = (data as any).payments
        .filter((p: any) => p.status === 'partial')
        .reduce((sum: number, p: any) => {
          const remaining = p.remaining_balance !== undefined
            ? Number(p.remaining_balance)
            : (Number(p.total_amount_due || p.amount) - Number(p.amount_paid || p.amount))
          return sum + Math.max(0, remaining)
        }, 0)

      if (partialPaymentsRemaining > 0) {
        csv += `المبالغ المتبقية من الدفعات الجزئية,${formatCurrency(partialPaymentsRemaining)}\n`
      }
    }

    csv += `الرصيد المستحق الإجمالي,${formatCurrency(data.outstandingBalance || 0)}\n\n`

    if (data.paymentMethodStats && data.paymentMethodStats.length > 0) {
      csv += 'توزيع طرق الدفع\n'
      csv += 'طريقة الدفع,المبلغ,عدد المعاملات,النسبة المئوية\n'

      const totalAmount = data.paymentMethodStats.reduce((sum, method) => sum + method.amount, 0)

      data.paymentMethodStats.forEach((method: any) => {
        const percentage = totalAmount > 0 ? ((method.amount / totalAmount) * 100).toFixed(1) : '0.0'
        csv += `"${method.method}","${formatCurrency(method.amount)}","${method.count}","${percentage}%"\n`
      })
      csv += '\n'
    }

    // Add detailed payment transactions if available and details are requested
    if (options.includeDetails && (data as any).payments && Array.isArray((data as any).payments)) {
      const payments = (data as any).payments
      csv += 'تفاصيل المعاملات المالية\n'
      csv += 'رقم الإيصال,تاريخ الدفع,اسم المريض,وصف العلاج,المبلغ الإجمالي,المبلغ المدفوع,الرصيد المتبقي,طريقة الدفع,الحالة,ملاحظات\n'

      payments.forEach((payment: any) => {
        const receiptNumber = payment.receipt_number || `#${payment.id?.slice(-6) || ''}`
        const paymentDate = payment.payment_date ? formatDate(payment.payment_date) : ''
        const patientName = payment.patient_name || `${payment.patient?.first_name || ''} ${payment.patient?.last_name || ''}`.trim() || 'غير محدد'
        const description = payment.description || payment.treatment_type || 'غير محدد'
        // حساب المبالغ بناءً على نوع الدفعة
        let totalAmount, amountPaid, remainingBalance

        if (payment.status === 'partial') {
          // للدفعات الجزئية: استخدم المبالغ المحسوبة من النظام
          totalAmount = formatCurrency(Number(payment.total_amount_due || payment.amount) || 0)
          amountPaid = formatCurrency(Number(payment.amount_paid || payment.amount) || 0)
          remainingBalance = formatCurrency(Number(payment.remaining_balance || 0))
        } else if (payment.appointment_id && payment.appointment_total_cost) {
          // للمدفوعات المرتبطة بمواعيد: استخدم بيانات الموعد
          totalAmount = formatCurrency(Number(payment.appointment_total_cost) || 0)
          amountPaid = formatCurrency(Number(payment.appointment_total_paid || payment.amount) || 0)
          remainingBalance = formatCurrency(Number(payment.appointment_remaining_balance || 0))
        } else {
          // للمدفوعات العادية
          totalAmount = formatCurrency(Number(payment.amount) || 0)
          amountPaid = formatCurrency(Number(payment.amount) || 0)
          remainingBalance = formatCurrency(0)
        }
        const paymentMethod = this.translatePaymentMethod(payment.payment_method || 'غير محدد')
        const status = this.getPaymentStatusInArabic(payment.status)
        const notes = payment.notes || ''

        csv += `"${receiptNumber}","${paymentDate}","${patientName}","${description}","${totalAmount}","${amountPaid}","${remainingBalance}","${paymentMethod}","${status}","${notes}"\n`
      })
      csv += '\n'
    }

    // Add expenses by type
    if (data.expensesByType && data.expensesByType.length > 0) {
      csv += 'توزيع المصروفات حسب النوع\n'
      csv += 'نوع المصروف,المبلغ,النسبة المئوية\n'

      data.expensesByType.forEach((expense: any) => {
        csv += `"${expense.type}","${formatCurrency(expense.amount)}","${expense.percentage.toFixed(2)}%"\n`
      })
      csv += '\n'
    }

    // Add recent expenses details
    if (data.recentExpenses && data.recentExpenses.length > 0) {
      csv += 'المصروفات الحديثة (آخر 10 مصروفات)\n'
      csv += 'اسم المصروف,النوع,المبلغ,طريقة الدفع,تاريخ الدفع,المورد,رقم الإيصال,ملاحظات\n'

      const typeMapping = {
        'salary': 'رواتب',
        'utilities': 'مرافق',
        'rent': 'إيجار',
        'maintenance': 'صيانة',
        'supplies': 'مستلزمات',
        'insurance': 'تأمين',
        'other': 'أخرى'
      }

      const methodMapping = {
        'cash': 'نقداً',
        'bank_transfer': 'تحويل بنكي',
        'check': 'شيك',
        'credit_card': 'بطاقة ائتمان'
      }

      data.recentExpenses.slice(0, 10).forEach((expense: any) => {
        const expenseName = expense.expense_name || 'غير محدد'
        const expenseType = typeMapping[expense.expense_type] || expense.expense_type || 'غير محدد'
        const amount = formatCurrency(expense.amount || 0)
        const paymentMethod = methodMapping[expense.payment_method] || expense.payment_method || 'غير محدد'
        const paymentDate = expense.payment_date ? formatDate(expense.payment_date) : 'غير محدد'
        const vendor = expense.vendor || 'غير محدد'
        const receiptNumber = expense.receipt_number || 'غير محدد'
        const notes = expense.notes || ''

        csv += `"${expenseName}","${expenseType}","${amount}","${paymentMethod}","${paymentDate}","${vendor}","${receiptNumber}","${notes}"\n`
      })
      csv += '\n'
    }

    return csv
  }

  static generateAppointmentCSV(data: AppointmentReportData, options: ReportExportOptions): string {
    let csv = 'تقرير المواعيد - عيادة الأسنان الحديثة\n\n'
    csv += 'ملخص إحصائيات المواعيد\n'
    csv += `إجمالي المواعيد,${data.totalAppointments || 0}\n`
    csv += `المواعيد المكتملة,${data.completedAppointments || 0}\n`
    csv += `المواعيد الملغية,${data.cancelledAppointments || 0}\n`
    csv += `المواعيد المجدولة,${data.scheduledAppointments || 0}\n`
    csv += `عدم الحضور,${data.noShowAppointments || 0}\n`
    csv += `معدل الحضور,${data.attendanceRate?.toFixed(1) || '0.0'}%\n`
    csv += `معدل الإلغاء,${data.cancellationRate?.toFixed(1) || '0.0'}%\n\n`

    // Add appointment status distribution
    if (data.appointmentsByStatus && data.appointmentsByStatus.length > 0) {
      csv += 'توزيع حالات المواعيد\n'
      csv += 'الحالة,العدد,النسبة المئوية\n'

      data.appointmentsByStatus.forEach((status: any) => {
        const percentage = status.percentage?.toFixed(1) || '0.0'
        csv += `"${status.status}",${status.count},${percentage}%\n`
      })
      csv += '\n'
    }

    // Add appointment by treatment distribution
    if (data.appointmentsByTreatment && data.appointmentsByTreatment.length > 0) {
      csv += 'توزيع المواعيد حسب نوع العلاج\n'
      csv += 'نوع العلاج,عدد المواعيد\n'

      data.appointmentsByTreatment.forEach((treatment: any) => {
        csv += `"${treatment.treatment}",${treatment.count}\n`
      })
      csv += '\n'
    }

    // Add filter information if available
    if (data.filterInfo) {
      csv += 'معلومات الفلترة\n'
      csv += `نطاق البيانات,"${data.filterInfo}"\n`
      csv += `عدد المواعيد المصدرة,${data.dataCount || data.totalAppointments || 0}\n`
    }

    return csv
  }

  static generateInventoryCSV(data: InventoryReportData, options: ReportExportOptions): string {
    let csv = 'تقرير المخزون - عيادة الأسنان الحديثة\n\n'
    csv += 'ملخص إحصائيات المخزون\n'
    csv += `إجمالي العناصر,${data.totalItems || 0}\n`
    csv += `القيمة الإجمالية,${formatCurrency(data.totalValue || 0)}\n`
    csv += `عناصر منخفضة المخزون,${data.lowStockItems || 0}\n`
    csv += `عناصر منتهية الصلاحية,${data.expiredItems || 0}\n`

    return csv
  }

  static generateOverviewCSV(data: any, options: ReportExportOptions): string {
    let csv = 'التقرير الشامل - عيادة الأسنان الحديثة\n\n'

    if (data.patients) {
      csv += this.generatePatientCSV(data.patients, options) + '\n\n'
    }
    if (data.appointments) {
      csv += this.generateAppointmentCSV(data.appointments, options) + '\n\n'
    }
    if (data.financial) {
      csv += this.generateFinancialCSV(data.financial, options) + '\n\n'
    }
    if (data.inventory) {
      csv += this.generateInventoryCSV(data.inventory, options)
    }

    return csv
  }

  // Clinic Needs Export Functions
  static async exportClinicNeedsToCSV(clinicNeeds: any[], filename: string = 'clinic-needs-report'): Promise<void> {
    try {
      // CSV Headers in Arabic
      const headers = [
        '#',
        'اسم الاحتياج',
        'الكمية',
        'السعر',
        'الإجمالي',
        'الوصف',
        'الفئة',
        'الأولوية',
        'الحالة',
        'المورد',
        'الملاحظات',
        'تاريخ الإنشاء',
        'تاريخ التحديث'
      ]

      // Helper function for Gregorian date formatting
      const formatGregorianDate = (dateString: string) => {
        try {
          const date = new Date(dateString)
          if (isNaN(date.getTime())) {
            return '--'
          }

          // Format as DD/MM/YYYY (Gregorian format)
          const day = date.getDate().toString().padStart(2, '0')
          const month = (date.getMonth() + 1).toString().padStart(2, '0')
          const year = date.getFullYear()

          return `${day}/${month}/${year}`
        } catch (error) {
          return '--'
        }
      }

      // Convert data to CSV format
      const csvData = clinicNeeds.map(need => [
        need.serial_number || '',
        need.need_name || '',
        need.quantity?.toString() || '0',
        need.price?.toString() || '0',
        ((need.price || 0) * (need.quantity || 0)).toString(),
        need.description || '',
        need.category || '',
        this.getPriorityLabel(need.priority || ''),
        this.getStatusLabel(need.status || ''),
        need.supplier || '',
        need.notes || '',
        need.created_at ? formatGregorianDate(need.created_at) : '',
        need.updated_at ? formatGregorianDate(need.updated_at) : ''
      ])

      // Combine headers and data
      const csvContent = [headers, ...csvData]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n')

      // Add BOM for proper Arabic display in Excel
      const BOM = '\uFEFF'
      const fullCsvContent = BOM + csvContent

      console.log(`✅ Clinic needs exported to Excel: ${filename}.xlsx`)

      // تحويل إلى Excel مباشرة
      const options: ReportExportOptions = {
        format: 'csv',
        includeCharts: false,
        includeDetails: true,
        language: 'ar'
      }
      await this.convertCSVToExcel(fullCsvContent, 'clinic-needs', options)
    } catch (error) {
      console.error('Error exporting clinic needs to CSV:', error)
      throw new Error('فشل في تصدير احتياجات العيادة إلى CSV')
    }
  }

  private static getPriorityLabel(priority: string): string {
    const labels = {
      urgent: 'عاجل',
      high: 'عالي',
      medium: 'متوسط',
      low: 'منخفض'
    }
    return labels[priority] || priority
  }

  private static getStatusLabel(status: string): string {
    const labels = {
      pending: 'آجل',
      ordered: 'مطلوب',
      received: 'مستلم',
      cancelled: 'ملغي'
    }
    return labels[status] || status
  }

  // Legacy export functions for backward compatibility
  // NOTE: These functions now support filtered data - pass filtered arrays instead of full datasets
  static async exportPatientsToPDF(patients: Patient[], clinicName: string = 'عيادة الأسنان الحديثة'): Promise<void> {
    // Calculate statistics from the provided patients array (which should be filtered)
    const today = new Date()
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1)

    const newPatientsThisMonth = patients.filter(p =>
      new Date(p.created_at) >= thisMonth
    ).length

    // Calculate age distribution from actual data
    const ageGroups = { children: 0, teens: 0, adults: 0, seniors: 0 }
    const genderGroups = { male: 0, female: 0 }
    let totalAge = 0
    let patientsWithAge = 0

    patients.forEach(patient => {
      // Age calculation - use the age field directly from database
      if (patient.age && typeof patient.age === 'number' && patient.age > 0) {
        const age = patient.age
        totalAge += age
        patientsWithAge++

        if (age < 13) ageGroups.children++
        else if (age < 20) ageGroups.teens++
        else if (age < 60) ageGroups.adults++
        else ageGroups.seniors++
      }

      // Gender calculation
      if (patient.gender === 'male') genderGroups.male++
      else if (patient.gender === 'female') genderGroups.female++
    })

    const averageAge = patientsWithAge > 0 ? Math.round(totalAge / patientsWithAge) : 0

    const patientData: PatientReportData = {
      totalPatients: patients.length,
      newPatients: newPatientsThisMonth,
      activePatients: patients.length,
      inactivePatients: 0,
      ageDistribution: [
        { ageGroup: 'أطفال (0-12)', count: ageGroups.children },
        { ageGroup: 'مراهقون (13-19)', count: ageGroups.teens },
        { ageGroup: 'بالغون (20-59)', count: ageGroups.adults },
        { ageGroup: 'كبار السن (60+)', count: ageGroups.seniors }
      ],
      genderDistribution: [
        { gender: 'ذكور', count: genderGroups.male },
        { gender: 'إناث', count: genderGroups.female }
      ],
      registrationTrend: [],
      patientsList: patients
    }

    const options: ReportExportOptions = {
      format: 'pdf',
      includeCharts: false,
      includeDetails: true,
      language: 'ar',
      orientation: 'landscape',
      pageSize: 'A4'
    }

    await this.exportToPDF('patients', patientData, options)
  }

  static async exportAppointmentsToPDF(appointments: Appointment[], clinicName: string = 'عيادة الأسنان الحديثة'): Promise<void> {
    // Calculate statistics from the provided appointments array (which should be filtered)
    const totalAppointments = appointments.length
    const completedAppointments = appointments.filter(a => a.status === 'completed').length
    const cancelledAppointments = appointments.filter(a => a.status === 'cancelled').length
    const noShowAppointments = appointments.filter(a => a.status === 'no_show').length
    const scheduledAppointments = appointments.filter(a => a.status === 'scheduled').length

    // Calculate rates
    const attendanceRate = totalAppointments > 0 ? Math.round((completedAppointments / totalAppointments) * 100) : 0
    const cancellationRate = totalAppointments > 0 ? Math.round((cancelledAppointments / totalAppointments) * 100) : 0

    const appointmentData: AppointmentReportData = {
      totalAppointments: totalAppointments,
      completedAppointments: completedAppointments,
      cancelledAppointments: cancelledAppointments,
      noShowAppointments: noShowAppointments,
      scheduledAppointments: scheduledAppointments,
      attendanceRate: attendanceRate,
      cancellationRate: cancellationRate,
      appointmentsByStatus: [
        { status: 'مكتمل', count: completedAppointments, percentage: attendanceRate },
        { status: 'ملغي', count: cancelledAppointments, percentage: cancellationRate },
        { status: 'لم يحضر', count: noShowAppointments, percentage: totalAppointments > 0 ? Math.round((noShowAppointments / totalAppointments) * 100) : 0 },
        { status: 'مجدول', count: scheduledAppointments, percentage: totalAppointments > 0 ? Math.round((scheduledAppointments / totalAppointments) * 100) : 0 }
      ],
      appointmentsByTreatment: [],
      appointmentsByDay: [],
      appointmentsByHour: [],
      peakHours: [],
      appointmentTrend: [],
      filterInfo: `البيانات المصدرة: ${totalAppointments} موعد`,
      dataCount: totalAppointments
    }

    const options: ReportExportOptions = {
      format: 'pdf',
      includeCharts: false,
      includeDetails: true,
      language: 'ar',
      orientation: 'landscape',
      pageSize: 'A4'
    }

    await this.exportToPDF('appointments', appointmentData, options)
  }

  static async exportPaymentsToPDF(payments: Payment[], clinicName: string = 'عيادة الأسنان الحديثة'): Promise<void> {
    // Calculate statistics from the provided payments array (which should be filtered)
    // استخدام amount (مبلغ الدفعة الحالية) وليس amount_paid (إجمالي المدفوع للموعد)
    const totalRevenue = payments.reduce((sum, p) => {
      return sum + Number(p.amount)
    }, 0)

    const completedPayments = payments.filter(p => p.status === 'completed').reduce((sum, p) => sum + Number(p.amount), 0)
    const partialPayments = payments.filter(p => p.status === 'partial').reduce((sum, p) => {
      // استخدام amount (مبلغ الدفعة الحالية) وليس amount_paid (إجمالي المدفوع للموعد)
      return sum + Number(p.amount)
    }, 0)
    const pendingPayments = payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + Number(p.amount), 0)
    const overduePayments = payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + Number(p.amount), 0)

    // Calculate payment method statistics
    const paymentMethods = payments
      .filter(p => p.status === 'completed' || p.status === 'partial')
      .reduce((acc, payment) => {
        const method = payment.payment_method || 'غير محدد'
        if (!acc[method]) {
          acc[method] = { count: 0, amount: 0 }
        }
        acc[method].count++
        // استخدام amount (مبلغ الدفعة الحالية) وليس amount_paid (إجمالي المدفوع للموعد)
        const amount = Number(payment.amount)
        acc[method].amount += amount
        return acc
      }, {} as Record<string, { count: number; amount: number }>)

    const paymentMethodStats = Object.entries(paymentMethods).map(([method, stats]) => ({
      method,
      count: stats.count,
      amount: stats.amount
    }))

    const financialData: FinancialReportData = {
      totalRevenue: totalRevenue,
      totalPaid: completedPayments + partialPayments, // Include partial payments in completed
      totalPending: pendingPayments,
      totalOverdue: overduePayments,
      totalExpenses: 0,
      netProfit: totalRevenue - 0,
      profitMargin: 0,
      revenueByPaymentMethod: paymentMethodStats.map(stat => ({
        method: stat.method,
        amount: stat.amount,
        percentage: totalRevenue > 0 ? (stat.amount / totalRevenue) * 100 : 0
      })),
      revenueByTreatment: [],
      expensesByType: [],
      revenueTrend: [],
      expenseTrend: [],
      cashFlow: [],
      outstandingPayments: [],
      recentTransactions: [],
      recentExpenses: [],
      outstandingBalance: pendingPayments + overduePayments
    }

    const options: ReportExportOptions = {
      format: 'pdf',
      includeCharts: false,
      includeDetails: true,
      language: 'ar',
      orientation: 'landscape',
      pageSize: 'A4'
    }

    await this.exportToPDF('financial', financialData, options)
  }

  // Legacy Excel export functions
  // NOTE: These functions now support filtered data - pass filtered arrays instead of full datasets
  static async exportPatientsToExcel(patients: Patient[]): Promise<void> {
    // Calculate statistics from the provided patients array (which should be filtered)
    const today = new Date()
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1)

    const newPatientsThisMonth = patients.filter(p =>
      new Date(p.created_at) >= thisMonth
    ).length

    // Calculate age distribution from actual data
    const ageGroups = { children: 0, teens: 0, adults: 0, seniors: 0 }
    const genderGroups = { male: 0, female: 0 }
    let totalAge = 0
    let patientsWithAge = 0

    patients.forEach(patient => {
      // Age calculation - use the age field directly from database
      if (patient.age && typeof patient.age === 'number' && patient.age > 0) {
        const age = patient.age
        totalAge += age
        patientsWithAge++

        if (age < 13) ageGroups.children++
        else if (age < 20) ageGroups.teens++
        else if (age < 60) ageGroups.adults++
        else ageGroups.seniors++
      }

      // Gender calculation
      if (patient.gender === 'male') genderGroups.male++
      else if (patient.gender === 'female') genderGroups.female++
    })

    const averageAge = patientsWithAge > 0 ? Math.round(totalAge / patientsWithAge) : 0

    const patientData: PatientReportData = {
      totalPatients: patients.length,
      newPatients: newPatientsThisMonth,
      activePatients: patients.length,
      patients: patients,
      ageDistribution: [
        { ageGroup: 'أطفال (0-12)', count: ageGroups.children },
        { ageGroup: 'مراهقون (13-19)', count: ageGroups.teens },
        { ageGroup: 'بالغون (20-59)', count: ageGroups.adults },
        { ageGroup: 'كبار السن (60+)', count: ageGroups.seniors }
      ],
      genderDistribution: [
        { gender: 'ذكور', count: genderGroups.male },
        { gender: 'إناث', count: genderGroups.female }
      ],
      registrationTrend: []
    }

    const options: ReportExportOptions = {
      format: 'excel',
      includeCharts: false,
      includeDetails: true,
      language: 'ar'
    }

    await this.exportToExcel('patients', patientData, options)
  }

  static async exportAppointmentsToExcel(appointments: Appointment[]): Promise<void> {
    // Calculate statistics from the provided appointments array (which should be filtered)
    const totalAppointments = appointments.length
    const completedAppointments = appointments.filter(a => a.status === 'completed').length
    const cancelledAppointments = appointments.filter(a => a.status === 'cancelled').length
    const noShowAppointments = appointments.filter(a => a.status === 'no_show').length
    const scheduledAppointments = appointments.filter(a => a.status === 'scheduled').length

    // Calculate rates
    const attendanceRate = totalAppointments > 0 ? Math.round((completedAppointments / totalAppointments) * 100) : 0
    const cancellationRate = totalAppointments > 0 ? Math.round((cancelledAppointments / totalAppointments) * 100) : 0

    const appointmentData: AppointmentReportData = {
      totalAppointments: totalAppointments,
      completedAppointments: completedAppointments,
      cancelledAppointments: cancelledAppointments,
      noShowAppointments: noShowAppointments,
      scheduledAppointments: scheduledAppointments,
      attendanceRate: attendanceRate,
      cancellationRate: cancellationRate,
      appointmentsByStatus: [
        { status: 'مكتمل', count: completedAppointments, percentage: attendanceRate },
        { status: 'ملغي', count: cancelledAppointments, percentage: cancellationRate },
        { status: 'لم يحضر', count: noShowAppointments, percentage: totalAppointments > 0 ? Math.round((noShowAppointments / totalAppointments) * 100) : 0 },
        { status: 'مجدول', count: scheduledAppointments, percentage: totalAppointments > 0 ? Math.round((scheduledAppointments / totalAppointments) * 100) : 0 }
      ],
      appointmentsByTreatment: [],
      appointmentsByDay: [],
      appointmentsByHour: [],
      peakHours: [],
      appointmentTrend: [],
      filterInfo: `البيانات المصدرة: ${totalAppointments} موعد`,
      dataCount: totalAppointments
    }

    const options: ReportExportOptions = {
      format: 'excel',
      includeCharts: false,
      includeDetails: true,
      language: 'ar'
    }

    await this.exportToExcel('appointments', appointmentData, options)
  }

  static async exportTreatmentsToCSV(treatments: any[]): Promise<void> {
    const csvData = []

    // Add header
    csvData.push([
      'نوع العلاج',
      'فئة العلاج',
      'حالة العلاج',
      'التكلفة',
      'تاريخ البداية',
      'تاريخ الإنجاز',
      'اسم المريض',
      'رقم السن',
      'تاريخ الإنشاء'
    ])

    // Add treatment data
    treatments.forEach(treatment => {
      const getStatusLabel = (status: string): string => {
        const statusLabels: { [key: string]: string } = {
          'planned': 'مخطط',
          'in_progress': 'قيد التنفيذ',
          'completed': 'مكتمل',
          'cancelled': 'ملغي'
        }
        return statusLabels[status] || status
      }

      csvData.push([
        getTreatmentNameInArabic(treatment.treatment_type || ''),
        getCategoryNameInArabic(treatment.treatment_category || ''),
        getStatusLabel(treatment.treatment_status || 'planned'),
        treatment.cost || 0,
        treatment.start_date || '',
        treatment.completion_date || '',
        treatment.patient_name || `مريض ${treatment.patient_id}`,
        treatment.tooth_number || '',
        treatment.created_at || ''
      ])
    })

    // Add summary statistics
    const totalTreatments = treatments.length
    const completedTreatments = treatments.filter(t => t.treatment_status === 'completed').length
    const plannedTreatments = treatments.filter(t => t.treatment_status === 'planned').length
    const inProgressTreatments = treatments.filter(t => t.treatment_status === 'in_progress').length
    const cancelledTreatments = treatments.filter(t => t.treatment_status === 'cancelled').length

    const validateAmount = (amount: any): number => {
      const num = Number(amount)
      return isNaN(num) || !isFinite(num) ? 0 : Math.round(num * 100) / 100
    }

    const totalRevenue = treatments
      .filter(t => t.treatment_status === 'completed')
      .reduce((sum, t) => sum + validateAmount(t.cost), 0)

    const completionRate = totalTreatments > 0
      ? Math.round((completedTreatments / totalTreatments) * 100)
      : 0

    csvData.push([]) // Empty row
    csvData.push(['ملخص الإحصائيات'])
    csvData.push(['إجمالي العلاجات', totalTreatments])
    csvData.push(['العلاجات المكتملة', completedTreatments])
    csvData.push(['العلاجات المخططة', plannedTreatments])
    csvData.push(['العلاجات قيد التنفيذ', inProgressTreatments])
    csvData.push(['العلاجات الملغية', cancelledTreatments])
    csvData.push(['إجمالي الإيرادات', totalRevenue])
    csvData.push(['معدل الإنجاز (%)', completionRate])

    // Convert to CSV string
    const csvContent = csvData.map(row =>
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n')

    // Add BOM for Arabic support
    const csvWithBOM = '\uFEFF' + csvContent

    // تحويل إلى Excel مباشرة
    const options: ReportExportOptions = {
      format: 'csv',
      includeCharts: false,
      includeDetails: true,
      language: 'ar'
    }
    await this.convertCSVToExcel(csvWithBOM, 'treatments', options)
  }

  static async exportPaymentsToExcel(payments: Payment[]): Promise<void> {
    // Calculate statistics from the provided payments array (which should be filtered)
    // استخدام amount (مبلغ الدفعة الحالية) وليس amount_paid (إجمالي المدفوع للموعد)
    const totalRevenue = payments.reduce((sum, p) => {
      return sum + Number(p.amount)
    }, 0)

    const completedPayments = payments.filter(p => p.status === 'completed').reduce((sum, p) => sum + Number(p.amount), 0)
    const partialPayments = payments.filter(p => p.status === 'partial').reduce((sum, p) => {
      // استخدام amount (مبلغ الدفعة الحالية) وليس amount_paid (إجمالي المدفوع للموعد)
      return sum + Number(p.amount)
    }, 0)

    // Calculate pending and overdue payments using the same logic as useTimeFilteredStats
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const pendingPayments = payments
      .filter(p => p.status === 'pending')
      .filter(p => {
        const paymentDate = new Date(p.payment_date || p.created_at)
        return paymentDate >= thirtyDaysAgo
      })
      .reduce((sum, p) => {
        const amount = Number(p.amount) || 0
        const totalAmountDue = Number(p.total_amount_due) || 0

        // إذا كان المبلغ المدفوع 0 والمبلغ الإجمالي المطلوب أكبر من 0، استخدم المبلغ الإجمالي
        const pendingAmount = (amount === 0 && totalAmountDue > 0) ? totalAmountDue : amount

        return sum + pendingAmount
      }, 0)

    const overduePayments = payments
      .filter(p => p.status === 'pending')
      .filter(p => {
        const paymentDate = new Date(p.payment_date || p.created_at)
        return paymentDate < thirtyDaysAgo
      })
      .reduce((sum, p) => {
        const amount = Number(p.amount) || 0
        const totalAmountDue = Number(p.total_amount_due) || 0

        // إذا كان المبلغ المدفوع 0 والمبلغ الإجمالي المطلوب أكبر من 0، استخدم المبلغ الإجمالي
        const overdueAmount = (amount === 0 && totalAmountDue > 0) ? totalAmountDue : amount

        return sum + overdueAmount
      }, 0)

    // Calculate payment method statistics
    const paymentMethods = payments
      .filter(p => p.status === 'completed' || p.status === 'partial')
      .reduce((acc, payment) => {
        const method = payment.payment_method || 'غير محدد'
        if (!acc[method]) {
          acc[method] = { count: 0, amount: 0 }
        }
        acc[method].count++
        // استخدام amount (مبلغ الدفعة الحالية) وليس amount_paid (إجمالي المدفوع للموعد)
        const amount = Number(payment.amount)
        acc[method].amount += amount
        return acc
      }, {} as Record<string, { count: number; amount: number }>)

    const paymentMethodStats = Object.entries(paymentMethods).map(([method, stats]) => ({
      method,
      count: stats.count,
      amount: stats.amount
    }))

    // حساب إجمالي المبالغ المتبقية من الدفعات الجزئية بشكل صحيح
    // تجميع المدفوعات حسب الموعد أولاً للمدفوعات المرتبطة بمواعيد
    const appointmentGroups = new Map<string, { totalDue: number, totalPaid: number }>()
    let generalRemainingBalance = 0

    payments.forEach(payment => {
      if (payment.status === 'partial') {
        if (payment.appointment_id) {
          // مدفوعات مرتبطة بمواعيد
          const appointmentId = payment.appointment_id
          const totalDue = Number(payment.total_amount_due || payment.treatment_total_cost || 0)
          const paidAmount = Number(payment.amount || 0)

          if (!appointmentGroups.has(appointmentId)) {
            appointmentGroups.set(appointmentId, { totalDue, totalPaid: 0 })
          }

          const group = appointmentGroups.get(appointmentId)!
          group.totalPaid += paidAmount
        } else {
          // مدفوعات عامة غير مرتبطة بمواعيد
          const totalDue = Number(payment.total_amount_due || payment.amount || 0)
          const paid = Number(payment.amount_paid || payment.amount || 0)
          generalRemainingBalance += Math.max(0, totalDue - paid)
        }
      }
    })

    // حساب إجمالي المبالغ المتبقية من المواعيد
    const appointmentRemainingBalance = Array.from(appointmentGroups.values()).reduce((sum, group) => {
      return sum + Math.max(0, group.totalDue - group.totalPaid)
    }, 0)

    // إجمالي المبالغ المتبقية
    const totalRemainingFromPartialPayments = appointmentRemainingBalance + generalRemainingBalance

    const financialData: FinancialReportData = {
      totalRevenue: totalRevenue,
      totalPaid: completedPayments + partialPayments, // Include partial payments in completed
      totalPending: pendingPayments,
      totalOverdue: overduePayments,
      revenueByPaymentMethod: paymentMethodStats.map(stat => ({
        method: stat.method,
        amount: stat.amount,
        percentage: totalRevenue > 0 ? (stat.amount / totalRevenue) * 100 : 0
      })),
      revenueTrend: [],
      topTreatments: [],
      outstandingBalance: pendingPayments + overduePayments + totalRemainingFromPartialPayments,
      filterInfo: `البيانات المصدرة: ${payments.length} دفعة (مكتملة: ${payments.filter(p => p.status === 'completed').length}, جزئية: ${payments.filter(p => p.status === 'partial').length}, آجلة: ${payments.filter(p => p.status === 'pending').length}, متأخرة: ${overduePayments > 0 ? payments.filter(p => p.status === 'pending' && new Date(p.payment_date || p.created_at) < thirtyDaysAgo).length : 0}, مبلغ متبقي من الجزئية: ${formatCurrency(totalRemainingFromPartialPayments)})`,
      dataCount: payments.length
    }

    const options: ReportExportOptions = {
      format: 'excel',
      includeCharts: false,
      includeDetails: true,
      language: 'ar'
    }

    await this.exportToExcel('financial', financialData, options)
  }

  static async exportPaymentsToCSV(payments: Payment[]): Promise<void> {
    // Calculate statistics from the provided payments array (which should be filtered)
    // استخدام amount (مبلغ الدفعة الحالية) وليس amount_paid (إجمالي المدفوع للموعد)
    const totalRevenue = payments.reduce((sum, p) => {
      return sum + Number(p.amount)
    }, 0)

    const completedPayments = payments.filter(p => p.status === 'completed').reduce((sum, p) => sum + Number(p.amount), 0)
    const partialPayments = payments.filter(p => p.status === 'partial').reduce((sum, p) => {
      // استخدام amount (مبلغ الدفعة الحالية) وليس amount_paid (إجمالي المدفوع للموعد)
      return sum + Number(p.amount)
    }, 0)

    // Calculate pending and overdue payments using the same logic as useTimeFilteredStats
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const pendingPayments = payments
      .filter(p => p.status === 'pending')
      .filter(p => {
        const paymentDate = new Date(p.payment_date || p.created_at)
        return paymentDate >= thirtyDaysAgo
      })
      .reduce((sum, p) => {
        const amount = Number(p.amount) || 0
        const totalAmountDue = Number(p.total_amount_due) || 0

        // إذا كان المبلغ المدفوع 0 والمبلغ الإجمالي المطلوب أكبر من 0، استخدم المبلغ الإجمالي
        const pendingAmount = (amount === 0 && totalAmountDue > 0) ? totalAmountDue : amount

        return sum + pendingAmount
      }, 0)

    const overduePayments = payments
      .filter(p => p.status === 'pending')
      .filter(p => {
        const paymentDate = new Date(p.payment_date || p.created_at)
        return paymentDate < thirtyDaysAgo
      })
      .reduce((sum, p) => {
        const amount = Number(p.amount) || 0
        const totalAmountDue = Number(p.total_amount_due) || 0

        // إذا كان المبلغ المدفوع 0 والمبلغ الإجمالي المطلوب أكبر من 0، استخدم المبلغ الإجمالي
        const overdueAmount = (amount === 0 && totalAmountDue > 0) ? totalAmountDue : amount

        return sum + overdueAmount
      }, 0)

    // Calculate payment method statistics
    const paymentMethods = payments
      .filter(p => p.status === 'completed' || p.status === 'partial')
      .reduce((acc, payment) => {
        const method = payment.payment_method || 'غير محدد'
        if (!acc[method]) {
          acc[method] = { count: 0, amount: 0 }
        }
        acc[method].count++
        // استخدام amount (مبلغ الدفعة الحالية) وليس amount_paid (إجمالي المدفوع للموعد)
        const amount = Number(payment.amount)
        acc[method].amount += amount
        return acc
      }, {} as Record<string, { count: number; amount: number }>)

    const paymentMethodStats = Object.entries(paymentMethods).map(([method, stats]) => ({
      method,
      count: stats.count,
      amount: stats.amount
    }))

    // حساب إجمالي المبالغ المتبقية من الدفعات الجزئية بشكل صحيح
    // تجميع المدفوعات حسب الموعد أولاً للمدفوعات المرتبطة بمواعيد
    const appointmentGroups2 = new Map<string, { totalDue: number, totalPaid: number }>()
    let generalRemainingBalance2 = 0

    payments.forEach(payment => {
      if (payment.status === 'partial') {
        if (payment.appointment_id) {
          // مدفوعات مرتبطة بمواعيد
          const appointmentId = payment.appointment_id
          const totalDue = Number(payment.total_amount_due || payment.treatment_total_cost || 0)
          const paidAmount = Number(payment.amount || 0)

          if (!appointmentGroups2.has(appointmentId)) {
            appointmentGroups2.set(appointmentId, { totalDue, totalPaid: 0 })
          }

          const group = appointmentGroups2.get(appointmentId)!
          group.totalPaid += paidAmount
        } else {
          // مدفوعات عامة غير مرتبطة بمواعيد
          const totalDue = Number(payment.total_amount_due || payment.amount || 0)
          const paid = Number(payment.amount_paid || payment.amount || 0)
          generalRemainingBalance2 += Math.max(0, totalDue - paid)
        }
      }
    })

    // حساب إجمالي المبالغ المتبقية من المواعيد
    const appointmentRemainingBalance2 = Array.from(appointmentGroups2.values()).reduce((sum, group) => {
      return sum + Math.max(0, group.totalDue - group.totalPaid)
    }, 0)

    // إجمالي المبالغ المتبقية
    const totalRemainingFromPartialPayments = appointmentRemainingBalance2 + generalRemainingBalance2

    // Enhanced financial data with detailed payment information
    const financialData: FinancialReportData = {
      totalRevenue: totalRevenue,
      totalPaid: completedPayments + partialPayments, // Include partial payments in completed
      totalPending: pendingPayments,
      totalOverdue: overduePayments,
      paymentMethodStats: paymentMethodStats,
      monthlyRevenue: [],
      revenueTrend: [],
      topTreatments: [],
      outstandingBalance: pendingPayments + overduePayments + totalRemainingFromPartialPayments,
      filterInfo: `البيانات المصدرة: ${payments.length} دفعة (مكتملة: ${payments.filter(p => p.status === 'completed').length}, جزئية: ${payments.filter(p => p.status === 'partial').length}, آجلة: ${payments.filter(p => p.status === 'pending').length}, متأخرة: ${overduePayments > 0 ? payments.filter(p => p.status === 'pending' && new Date(p.payment_date || p.created_at) < thirtyDaysAgo).length : 0}, مبلغ متبقي من الجزئية: ${formatCurrency(totalRemainingFromPartialPayments)})`,
      dataCount: payments.length,
      // Add the actual payments data for detailed export
      payments: payments
    }

    const options: ReportExportOptions = {
      format: 'csv',
      includeCharts: false,
      includeDetails: true,
      language: 'ar'
    }

    await this.exportToCSV('financial', financialData, options)
  }

 static async exportLabsToExcel(labs: Lab[], labOrders: LabOrder[]): Promise<void> {
   // Calculate statistics from the provided data
   const totalLabs = labs.length
   const totalOrders = labOrders.length
   const totalCost = labOrders.reduce((sum, order) => sum + Number(order.cost), 0)
   const totalPaid = labOrders.reduce((sum, order) => sum + Number(order.paid_amount || 0), 0)
   const totalRemaining = labOrders.reduce((sum, order) => sum + Number(order.remaining_balance || 0), 0)

   const labData = {
     summary: {
       'إجمالي المختبرات': totalLabs,
       'إجمالي الطلبات': totalOrders,
       'إجمالي التكلفة': formatCurrency(totalCost),
       'إجمالي المدفوع': formatCurrency(totalPaid),
       'إجمالي المتبقي': formatCurrency(totalRemaining),
       'تاريخ التقرير': formatDate(new Date())
     },
     labs: labs.map(lab => ({
       ...lab,
       ordersCount: labOrders.filter(order => order.lab_id === lab.id).length
     })),
     labOrders: labOrders,
     filterInfo: `البيانات المصدرة: ${labs.length} مختبر، ${labOrders.length} طلب`,
     dataCount: labs.length + labOrders.length
   }

   const options: ReportExportOptions = {
     format: 'excel',
     includeCharts: false,
     includeDetails: true,
     language: 'ar'
   }

   await this.exportToExcel('labs', labData, options)
 }

 // Clinic Expenses PDF Export
 static async exportClinicExpensesToPDF(expenses: ClinicExpense[], clinicName: string = 'عيادة الأسنان الحديثة'): Promise<void> {
   // Calculate statistics from the provided data
   const totalExpenses = expenses.length
   const totalAmount = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0)
   const paidExpenses = expenses.filter(expense => expense.status === 'paid').reduce((sum, expense) => sum + Number(expense.amount), 0)
   const pendingExpenses = expenses.filter(expense => expense.status === 'pending').reduce((sum, expense) => sum + Number(expense.amount), 0)
   const overdueExpenses = expenses.filter(expense => expense.status === 'overdue').reduce((sum, expense) => sum + Number(expense.amount), 0)
   const cancelledExpenses = expenses.filter(expense => expense.status === 'cancelled').reduce((sum, expense) => sum + Number(expense.amount), 0)

   // Calculate expenses by type
   const expensesByType = expenses.reduce((acc, expense) => {
     const type = expense.expense_type
     if (!acc[type]) {
       acc[type] = { amount: 0, count: 0 }
     }
     acc[type].amount += Number(expense.amount)
     acc[type].count++
     return acc
   }, {} as Record<string, { amount: number; count: number }>)

   const expensesByTypeArray = Object.entries(expensesByType).map(([type, stats]) => ({
     type,
     amount: stats.amount,
     count: stats.count,
     percentage: totalAmount > 0 ? (stats.amount / totalAmount) * 100 : 0
   }))

   // Calculate expenses by payment method
   const expensesByPaymentMethod = expenses.reduce((acc, expense) => {
     const method = expense.payment_method
     if (!acc[method]) {
       acc[method] = { amount: 0, count: 0 }
     }
     acc[method].amount += Number(expense.amount)
     acc[method].count++
     return acc
   }, {} as Record<string, { amount: number; count: number }>)

   const expensesByPaymentMethodArray = Object.entries(expensesByPaymentMethod).map(([method, stats]) => ({
     method,
     amount: stats.amount,
     count: stats.count,
     percentage: totalAmount > 0 ? (stats.amount / totalAmount) * 100 : 0
   }))

   const expensesData: ExpenseReportData = {
     totalExpenses: totalAmount,
     paidExpenses: paidExpenses,
     pendingExpenses: pendingExpenses,
     overdueExpenses: overdueExpenses,
     cancelledExpenses: cancelledExpenses,
     expensesByType: expensesByTypeArray,
     expensesByPaymentMethod: expensesByPaymentMethodArray,
     expensesList: expenses,
     filterInfo: `البيانات المصدرة: ${expenses.length} مصروف`,
     dataCount: expenses.length
   }

   const options: ReportExportOptions = {
     format: 'pdf',
     includeCharts: false,
     includeDetails: true,
     language: 'ar',
     orientation: 'landscape',
     pageSize: 'A4'
   }

   await this.exportToPDF('clinic-expenses', expensesData, options)
 }

 // Test function to verify PDF generation
 static async testLabReportGeneration(labs: Lab[], labOrders: LabOrder[]): Promise<boolean> {
   try {
     console.log('🧪 Testing lab report PDF generation...')

     if (!labs || labs.length === 0) {
       console.warn('⚠️ No labs data provided for testing')
       return false
     }

     if (!labOrders || labOrders.length === 0) {
       console.warn('⚠️ No lab orders data provided for testing')
       return false
     }

     await this.exportLabsToPDF(labs, labOrders, 'عيادة الأسنان للاختبار')
     console.log('✅ Lab report PDF generation test completed successfully')
     return true
   } catch (error) {
     console.error('❌ Lab report PDF generation test failed:', error)
     return false
   }
 }

 // Test function to verify clinic expenses PDF generation
 static async testClinicExpensesReportGeneration(expenses: ClinicExpense[]): Promise<boolean> {
   try {
     console.log('🧪 Testing clinic expenses report PDF generation...')

     if (!expenses || expenses.length === 0) {
       console.warn('⚠️ No expenses data provided for testing')
       return false
     }

     await this.exportClinicExpensesToPDF(expenses, 'عيادة الأسنان للاختبار')
     console.log('✅ Clinic expenses report PDF generation test completed successfully')
     return true
   } catch (error) {
     console.error('❌ Clinic expenses report PDF generation test failed:', error)
     return false
   }
 }

 // Lab Report PDF Export
 static async exportLabsToPDF(labs: Lab[], labOrders: LabOrder[], clinicName: string = 'عيادة الأسنان الحديثة'): Promise<void> {
   // Calculate statistics from the provided data
   const totalLabs = labs.length
   const totalOrders = labOrders.length
   const totalCost = labOrders.reduce((sum, order) => sum + Number(order.cost), 0)
   const totalPaid = labOrders.reduce((sum, order) => sum + Number(order.paid_amount || 0), 0)
   const totalRemaining = labOrders.reduce((sum, order) => sum + Number(order.remaining_balance || 0), 0)

   // Calculate order status distribution
   const pendingOrders = labOrders.filter(order => order.status === 'آجل').length
   const completedOrders = labOrders.filter(order => order.status === 'مكتمل').length
   const cancelledOrders = labOrders.filter(order => order.status === 'ملغي').length

   // Calculate average order cost
   const averageOrderCost = totalOrders > 0 ? totalCost / totalOrders : 0

   const labData: LabReportData = {
     totalLabs: totalLabs,
     totalOrders: totalOrders,
     totalCost: totalCost,
     totalPaid: totalPaid,
     totalRemaining: totalRemaining,
     pendingOrders: pendingOrders,
     completedOrders: completedOrders,
     cancelledOrders: cancelledOrders,
     labsList: labs,
     labOrdersList: labOrders,
     filterInfo: `البيانات المصدرة: ${labs.length} مختبر، ${labOrders.length} طلب`,
     dataCount: labs.length + labOrders.length
   }

   const options: ReportExportOptions = {
     format: 'pdf',
     includeCharts: false,
     includeDetails: true,
     language: 'ar',
     orientation: 'landscape',
     pageSize: 'A4'
   }

   await this.exportToPDF('labs', labData, options)
 }

  static async exportClinicNeedsToExcel(needs: ClinicNeed[]): Promise<void> {
    // Calculate statistics from the provided data
    const totalNeeds = needs.length
    const pendingNeeds = needs.filter(need => need.status === 'pending').length
    const orderedNeeds = needs.filter(need => need.status === 'ordered').length
    const receivedNeeds = needs.filter(need => need.status === 'received').length
    const urgentNeeds = needs.filter(need => need.priority === 'urgent').length
    const highPriorityNeeds = needs.filter(need => need.priority === 'high').length

    const needsData = {
      summary: {
        'إجمالي الاحتياجات': totalNeeds,
        'احتياجات آجلة': pendingNeeds,
        'احتياجات مطلوبة': orderedNeeds,
        'احتياجات مستلمة': receivedNeeds,
        'احتياجات عاجلة': urgentNeeds,
        'احتياجات عالية الأولوية': highPriorityNeeds,
        'تاريخ التقرير': formatDate(new Date())
      },
      needs: needs,
      filterInfo: `البيانات المصدرة: ${needs.length} احتياج`,
      dataCount: needs.length
    }

    const options: ReportExportOptions = {
      format: 'excel',
      includeCharts: false,
      includeDetails: true,
      language: 'ar'
    }

    await this.exportToExcel('clinic-needs', needsData, options)
  }

  static async exportInventoryToExcel(items: InventoryItem[]): Promise<void> {
    // Calculate statistics from the provided data
    const totalItems = items.length

    // Check for items without cost data (using more precise parsing)
    const itemsWithoutCost = items.filter(item => {
      const costPerUnit = parseFloat(String(item.cost_per_unit || 0)) || 0
      const unitPrice = parseFloat(String(item.unit_price || 0)) || 0
      return costPerUnit === 0 && unitPrice === 0
    })

    if (itemsWithoutCost.length > 0) {
      console.warn(`⚠️ ${itemsWithoutCost.length} عنصر لا يحتوي على سعر:`,
        itemsWithoutCost.map(item => item.name))
    }

    const totalValue = items.reduce((sum, item) => {
      // تحويل أكثر دقة للأرقام
      const quantity = parseFloat(String(item.quantity || 0)) || 0
      const costPerUnit = parseFloat(String(item.cost_per_unit || 0)) || 0
      const unitPrice = parseFloat(String(item.unit_price || 0)) || 0
      const cost = costPerUnit || unitPrice
      const itemValue = quantity * cost

      return sum + itemValue
    }, 0)

    const lowStockItems = items.filter(item => Number(item.quantity) <= Number(item.minimum_stock || 0)).length
    const outOfStockItems = items.filter(item => Number(item.quantity) === 0).length
    const expiredItems = items.filter(item =>
      item.expiry_date && new Date(item.expiry_date) < new Date()
    ).length

    const inventoryData = {
      summary: {
        'إجمالي العناصر': totalItems,
        'القيمة الإجمالية': formatCurrency(totalValue),
        'عناصر منخفضة المخزون': lowStockItems,
        'عناصر نفدت من المخزون': outOfStockItems,
        'عناصر منتهية الصلاحية': expiredItems,
        'عناصر بدون أسعار': itemsWithoutCost.length,
        'تاريخ التقرير': formatDate(new Date())
      },
      items: items,
      filterInfo: `البيانات المصدرة: ${items.length} عنصر${itemsWithoutCost.length > 0 ? ` (${itemsWithoutCost.length} بدون أسعار)` : ''}`,
      dataCount: items.length
    }

    const options: ReportExportOptions = {
      format: 'excel',
      includeCharts: false,
      includeDetails: true,
      language: 'ar'
    }

    await this.exportToExcel('inventory', inventoryData, options)
  }

  /**
   * تصدير مصروفات العيادة إلى Excel
   */
  static async exportClinicExpensesToExcel(expenses: any[]): Promise<void> {
    if (!expenses || expenses.length === 0) {
      throw new Error('لا توجد بيانات مصروفات للتصدير')
    }

    const totalAmount = expenses.reduce((sum, expense) => sum + (parseFloat(String(expense.amount || 0)) || 0), 0)
    const paidAmount = expenses.filter(expense => expense.status === 'paid').reduce((sum, expense) => sum + (parseFloat(String(expense.amount || 0)) || 0), 0)
    const pendingAmount = expenses.filter(expense => expense.status === 'pending').reduce((sum, expense) => sum + (parseFloat(String(expense.amount || 0)) || 0), 0)
    const overdueAmount = expenses.filter(expense => expense.status === 'overdue').reduce((sum, expense) => sum + (parseFloat(String(expense.amount || 0)) || 0), 0)

    const expensesData = {
      summary: {
        'إجمالي المصروفات': expenses.length,
        'إجمالي المبلغ': formatCurrency(totalAmount),
        'المبلغ المدفوع': formatCurrency(paidAmount),
        'المبلغ الآجل': formatCurrency(pendingAmount),
        'المبلغ المتأخر': formatCurrency(overdueAmount),
        'تاريخ التقرير': formatDate(new Date())
      },
      expenses: expenses,
      filterInfo: `البيانات المصدرة: ${expenses.length} مصروف`,
      dataCount: expenses.length
    }

    const options: ReportExportOptions = {
      format: 'excel',
      includeCharts: false,
      includeDetails: true,
      language: 'ar'
    }

    await this.exportToExcel('clinic-expenses', expensesData, options)
  }

  /**
   * فلترة البيانات حسب التاريخ
   */
  private static filterDataByDateRange<T extends { created_at?: string; payment_date?: string; order_date?: string }>(
    data: T[],
    filter: any,
    dateField: keyof T
  ): T[] {
    if (!filter || !filter.start || !filter.end) {
      return data
    }

    // إنشاء تواريخ البداية والنهاية مع ضبط المنطقة الزمنية المحلية
    const start = new Date(filter.start)
    const startLocal = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0, 0)

    const end = new Date(filter.end)
    const endLocal = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999)

    return data.filter(item => {
      const itemDateStr = item[dateField] as string
      if (!itemDateStr) return false

      const itemDate = new Date(itemDateStr)

      // للتواريخ التي تحتوي على وقت، نحتاج لمقارنة التاريخ فقط
      let itemDateForComparison: Date
      if (itemDateStr.includes('T') || itemDateStr.includes(' ')) {
        // التاريخ يحتوي على وقت، استخدمه كما هو
        itemDateForComparison = itemDate
      } else {
        // التاريخ بدون وقت، اعتبره في بداية اليوم
        itemDateForComparison = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate(), 0, 0, 0, 0)
      }

      return itemDateForComparison >= startLocal && itemDateForComparison <= endLocal
    })
  }

  /**
   * تصدير تقرير الأرباح والخسائر الشامل إلى Excel
   */
  static async exportProfitLossToExcel(data: {
    reportData: any
    payments: any[]
    labOrders: any[]
    clinicNeeds: any[]
    inventoryItems: any[]
    clinicExpenses: any[]
    patients: any[]
    appointments: any[]
    filter: any
    currency: string
  }): Promise<void> {
    const { reportData, payments, labOrders, clinicNeeds, inventoryItems, clinicExpenses, patients, appointments, filter, currency } = data

    // فلترة البيانات حسب التاريخ إذا كان الفلتر موجود
    const filteredPayments = this.filterDataByDateRange(payments, filter, 'payment_date')
    const filteredLabOrders = this.filterDataByDateRange(labOrders, filter, 'order_date')
    const filteredClinicNeeds = this.filterDataByDateRange(clinicNeeds, filter, 'created_at')
    const filteredAppointments = this.filterDataByDateRange(appointments, filter, 'created_at')
    // فلترة المخزون حسب تاريخ الإنشاء مثل باقي البيانات
    const filteredInventoryItems = this.filterDataByDateRange(inventoryItems, filter, 'created_at')
    const filteredClinicExpenses = clinicExpenses ? this.filterDataByDateRange(clinicExpenses, filter, 'payment_date') : []

    // إنشاء بيانات التقرير الشامل
    const profitLossData = {
      summary: {
        'إجمالي الإيرادات': formatCurrency(reportData.revenue.totalRevenue),
        'إجمالي المصروفات': formatCurrency(reportData.calculations.totalExpenses),
        'صافي الربح/الخسارة': formatCurrency(reportData.calculations.isProfit ? reportData.calculations.netProfit : -reportData.calculations.lossAmount),
        'نسبة الربح': `${reportData.calculations.profitMargin.toFixed(2)}%`,
        'حالة المالية': reportData.calculations.isProfit ? 'ربح' : 'خسارة',
        'إجمالي المرضى': reportData.details.totalPatients,
        'إجمالي المواعيد': reportData.details.totalAppointments,
        'متوسط الإيرادات لكل مريض': formatCurrency(reportData.details.averageRevenuePerPatient),
        'متوسط الإيرادات لكل موعد': formatCurrency(reportData.details.averageRevenuePerAppointment),
        'الفترة الزمنية': reportData.filterInfo.dateRange,
        'تاريخ التقرير': formatDate(new Date())
      },
      // تفاصيل الإيرادات
      revenue: {
        completedPayments: reportData.revenue.completedPayments,
        partialPayments: reportData.revenue.partialPayments,
        remainingBalances: reportData.revenue.remainingBalances,
        pendingPayments: reportData.revenue.pendingAmount || 0,
        totalRevenue: reportData.revenue.totalRevenue
      },
      // تفاصيل المصروفات
      expenses: {
        labOrdersTotal: reportData.expenses.labOrdersTotal,
        labOrdersRemaining: reportData.expenses.labOrdersRemaining,
        clinicNeedsTotal: reportData.expenses.clinicNeedsTotal,
        clinicNeedsRemaining: reportData.expenses.clinicNeedsRemaining,
        inventoryExpenses: reportData.expenses.inventoryExpenses,
        clinicExpensesTotal: reportData.expenses.clinicExpensesTotal || 0
      },
      // البيانات التفصيلية المفلترة
      payments: filteredPayments,
      labOrders: filteredLabOrders,
      clinicNeeds: filteredClinicNeeds,
      inventoryItems: filteredInventoryItems,
      clinicExpenses: filteredClinicExpenses,
      patients: patients,
      appointments: filteredAppointments,
      filterInfo: `تقرير الأرباح والخسائر - ${reportData.filterInfo.dateRange} - ${filteredPayments.length} دفعة، ${filteredLabOrders.length} طلب مختبر، ${filteredClinicNeeds.length} احتياج، ${filteredInventoryItems.length} عنصر مخزون، ${filteredClinicExpenses.length} مصروف`,
      dataCount: filteredPayments.length + filteredLabOrders.length + filteredClinicNeeds.length + filteredInventoryItems.length + filteredClinicExpenses.length
    }

    const options: ReportExportOptions = {
      format: 'excel',
      includeCharts: false,
      includeDetails: true,
      language: 'ar'
    }

    await this.exportToExcel('profit-loss', profitLossData, options)
  }

  /**
   * توليد CSV لتقرير الأرباح والخسائر
   */
  static generateProfitLossCSV(data: any, options: ReportExportOptions): string {
    let csv = ''

    // عنوان التقرير
    csv += 'التقرير الشامل للأرباح والخسائر\n'
    csv += `تاريخ التقرير,${formatDate(new Date())}\n`
    csv += `وقت التقرير,${new Date().toLocaleTimeString('ar-SA')}\n\n`

    // ملخص الأرباح والخسائر
    if (data.summary) {
      csv += 'ملخص الأرباح والخسائر\n'
      Object.entries(data.summary).forEach(([key, value]) => {
        csv += `${key},${value}\n`
      })
      csv += '\n'
    }

    // تفاصيل الإيرادات
    if (data.revenue) {
      csv += 'تفاصيل الإيرادات\n'
      csv += `المدفوعات المكتملة,${formatCurrency(data.revenue.completedPayments || 0)}\n`
      csv += `المدفوعات الجزئية,${formatCurrency(data.revenue.partialPayments || 0)}\n`
      csv += `المبالغ المتبقية,${formatCurrency(data.revenue.remainingBalances || 0)}\n`
      csv += `إجمالي الإيرادات,${formatCurrency(data.revenue.totalRevenue || 0)}\n\n`
    }

    // تفاصيل المصروفات
    if (data.expenses) {
      csv += 'تفاصيل المصروفات\n'
      csv += `مدفوعات المخابر,${formatCurrency(data.expenses.labOrdersTotal || 0)}\n`
      csv += `متبقي المخابر,${formatCurrency(data.expenses.labOrdersRemaining || 0)}\n`
      csv += `احتياجات العيادة,${formatCurrency(data.expenses.clinicNeedsTotal || 0)}\n`
      csv += `متبقي الاحتياجات,${formatCurrency(data.expenses.clinicNeedsRemaining || 0)}\n`
      csv += `قيمة المخزون,${formatCurrency(data.expenses.inventoryExpenses || 0)}\n`
      csv += `مصروفات العيادة المباشرة,${formatCurrency(data.expenses.clinicExpensesTotal || 0)}\n\n`
    }

    // تفاصيل المدفوعات
    if (data.payments && data.payments.length > 0) {
      csv += 'تفاصيل المدفوعات\n'
      csv += 'رقم المريض,اسم المريض,المبلغ,الحالة,طريقة الدفع,تاريخ الدفع,ملاحظات\n'
      data.payments.forEach((payment: any) => {
        const status = payment.status === 'completed' ? 'مكتمل' :
                      payment.status === 'partial' ? 'جزئي' : 'آجل'
        const paymentDate = payment.payment_date ? formatDate(payment.payment_date) : ''
        csv += `${payment.patient_id || ''},${payment.patient_name || ''},${formatCurrency(payment.amount || 0)},${status},${payment.payment_method || ''},${paymentDate},"${payment.notes || ''}"\n`
      })
      csv += '\n'
    }

    // تفاصيل طلبات المخابر
    if (data.labOrders && data.labOrders.length > 0) {
      csv += 'تفاصيل طلبات المخابر\n'
      csv += 'رقم الطلب,اسم المختبر,اسم المريض,التكلفة,المدفوع,المتبقي,الحالة,تاريخ الطلب\n'
      data.labOrders.forEach((order: any) => {
        const status = order.status === 'completed' ? 'مكتمل' :
                      order.status === 'pending' ? 'آجل' : 'ملغي'
        const orderDate = order.order_date ? formatDate(order.order_date) : ''
        const remaining = (order.cost || 0) - (order.paid_amount || 0)
        csv += `${order.id || ''},${order.lab?.name || ''},${order.patient?.full_name || ''},${formatCurrency(order.cost || 0)},${formatCurrency(order.paid_amount || 0)},${formatCurrency(remaining)},${status},${orderDate}\n`
      })
      csv += '\n'
    }

    // تفاصيل احتياجات العيادة
    if (data.clinicNeeds && data.clinicNeeds.length > 0) {
      csv += 'تفاصيل احتياجات العيادة\n'
      csv += 'اسم العنصر,الكمية,الأولوية,الحالة,التاريخ المطلوب,التاريخ المستلم,ملاحظات\n'
      data.clinicNeeds.forEach((need: any) => {
        const priority = need.priority === 'urgent' ? 'عاجل' :
                        need.priority === 'high' ? 'عالي' : 'عادي'
        const status = need.status === 'received' ? 'مستلم' :
                      need.status === 'ordered' ? 'مطلوب' : 'آجل'
        const dateNeeded = need.date_needed ? formatDate(need.date_needed) : ''
        const dateReceived = need.date_received ? formatDate(need.date_received) : ''
        csv += `${need.item_name || ''},${need.quantity || 0},${priority},${status},${dateNeeded},${dateReceived},"${need.notes || ''}"\n`
      })
      csv += '\n'
    }

    // تفاصيل المخزون
    if (data.inventoryItems && data.inventoryItems.length > 0) {
      csv += 'تفاصيل المخزون\n'
      csv += 'اسم العنصر,الكمية,سعر الوحدة,القيمة الإجمالية,الحد الأدنى,تاريخ الانتهاء,الفئة\n'
      data.inventoryItems.forEach((item: any) => {
        const costPerUnit = parseFloat(String(item.cost_per_unit || 0)) || 0
        const unitPrice = parseFloat(String(item.unit_price || 0)) || 0
        const cost = costPerUnit || unitPrice
        const quantity = parseFloat(String(item.quantity || 0)) || 0
        const totalValue = quantity * cost
        const expiryDate = item.expiry_date ? formatDate(item.expiry_date) : ''
        csv += `${item.name || ''},${quantity},${formatCurrency(cost)},${formatCurrency(totalValue)},${item.minimum_stock || 0},${expiryDate},${item.category || ''}\n`
      })
      csv += '\n'
    }

    // تفاصيل مصروفات العيادة
    if (data.clinicExpenses && data.clinicExpenses.length > 0) {
      csv += 'تفاصيل مصروفات العيادة\n'
      csv += 'اسم المصروف,النوع,المبلغ,طريقة الدفع,تاريخ الدفع,المورد,ملاحظات\n'
      data.clinicExpenses.forEach((expense: any) => {
        const paymentDate = expense.payment_date ? formatDate(expense.payment_date) : ''
        csv += `${expense.expense_name || ''},${expense.expense_type || ''},${formatCurrency(expense.amount || 0)},${expense.payment_method || ''},${paymentDate},${expense.vendor || ''},"${expense.notes || ''}"\n`
      })
      csv += '\n'
    }

    // معلومات التقرير
    csv += 'معلومات التقرير\n'
    csv += `${data.filterInfo || ''}\n`
    csv += `إجمالي السجلات,${data.dataCount || 0}\n`

    return csv
  }
}
