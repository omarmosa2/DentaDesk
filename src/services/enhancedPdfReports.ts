import {
  AppointmentReportData,
  InventoryReportData,
  TreatmentReportData,
  LabReportData,
  ClinicNeedsReportData,
  ExpenseReportData,
  ClinicSettings,
  ClinicNeed,
  Lab
} from '../types'
import { PdfService } from './pdfService'
import { getTreatmentNameInArabic } from '../data/teethData'
import {
  formatCurrency,
  convertCurrency,
} from '../lib/utils'

export class EnhancedPdfReports {
  // Create enhanced HTML report for appointments
  static createEnhancedAppointmentReportHTML(data: AppointmentReportData, settings?: ClinicSettings | null): string {
    const header = PdfService.getEnhancedHeader('تقرير المواعيد', settings, 'تقرير شامل عن إحصائيات المواعيد والحضور')
    const styles = PdfService.getEnhancedStyles()

    return `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>تقرير المواعيد - ${settings?.clinic_name || 'عيادة الأسنان'}</title>
        ${styles}
      </head>
      <body>
        ${header}

        <!-- Summary Cards with Enhanced Design -->
        <div class="summary-cards">
          <div class="summary-card primary">
            <div class="card-icon">📅</div>
            <div class="card-content">
              <h3>إجمالي المواعيد</h3>
              <div class="number">${data.totalAppointments.toLocaleString()}</div>
            </div>
          </div>
          <div class="summary-card success">
            <div class="card-icon">✅</div>
            <div class="card-content">
              <h3>المواعيد المكتملة</h3>
              <div class="number">${data.completedAppointments.toLocaleString()}</div>
            </div>
          </div>
          <div class="summary-card warning">
            <div class="card-icon">❌</div>
            <div class="card-content">
              <h3>المواعيد الملغية</h3>
              <div class="number warning">${data.cancelledAppointments.toLocaleString()}</div>
            </div>
          </div>
          <div class="summary-card danger">
            <div class="card-icon">⚠️</div>
            <div class="card-content">
              <h3>عدم الحضور</h3>
              <div class="number danger">${data.noShowAppointments?.toLocaleString() || '0'}</div>
            </div>
          </div>
          <div class="summary-card info">
            <div class="card-icon">📊</div>
            <div class="card-content">
              <h3>معدل الحضور</h3>
              <div class="number">${data.attendanceRate?.toFixed(1) || '0'}%</div>
            </div>
          </div>
          <div class="summary-card warning">
            <div class="card-icon">📉</div>
            <div class="card-content">
              <h3>معدل الإلغاء</h3>
              <div class="number warning">${data.cancellationRate?.toFixed(1) || '0'}%</div>
            </div>
          </div>
        </div>

        <!-- Appointments List Section -->
        ${data.appointmentsList && data.appointmentsList.length > 0 ? `
        <div class="section">
          <div class="section-title">
            <span class="section-icon">📋</span>
            قائمة المواعيد
          </div>
          <div class="section-content">
            <div class="appointments-grid">
              ${data.appointmentsList.slice(0, 50).map((appointment, _index) => {
                // Format appointment date and time
                const appointmentDate = appointment.start_time ? (() => {
                  try {
                    const date = new Date(appointment.start_time)
                    if (isNaN(date.getTime())) return 'غير محدد'
                    const day = date.getDate().toString().padStart(2, '0')
                    const month = (date.getMonth() + 1).toString().padStart(2, '0')
                    const year = date.getFullYear()
                    const time = date.toLocaleTimeString('ar-SA', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false
                    })
                    return `${day}/${month}/${year} - ${time}`
                  } catch (error) {
                    return 'غير محدد'
                  }
                })() : 'غير محدد'

                // Get status display text and color
                const getStatusInfo = (status: string) => {
                  switch (status) {
                    case 'completed': return { text: 'مكتمل', class: 'status-completed' }
                    case 'cancelled': return { text: 'ملغي', class: 'status-cancelled' }
                    case 'no_show': return { text: 'لم يحضر', class: 'status-no-show' }
                    case 'scheduled': return { text: 'مجدول', class: 'status-scheduled' }
                    default: return { text: 'غير محدد', class: 'status-unknown' }
                  }
                }

                const statusInfo = getStatusInfo(appointment.status)

                return `
                  <div class="appointment-card">
                    <div class="appointment-header">
                      <div class="appointment-avatar">
                        ${(appointment.patient_name || 'م').charAt(0)}
                      </div>
                      <div class="appointment-info">
                        <h4 class="appointment-patient">${appointment.patient_name || 'غير محدد'}</h4>
                        <span class="appointment-serial">#${appointment.id || (_index + 1).toString().padStart(3, '0')}</span>
                      </div>
                    </div>
                    <div class="appointment-details">
                      <div class="detail-item">
                        <span class="detail-label">التاريخ والوقت:</span>
                        <span class="detail-value">${appointmentDate}</span>
                      </div>
                      <div class="detail-item">
                        <span class="detail-label">نوع العلاج:</span>
                        <span class="detail-value">${appointment.treatment_name ? getTreatmentNameInArabic(appointment.treatment_name) : 'غير محدد'}</span>
                      </div>
                      <div class="detail-item">
                        <span class="detail-label">المدة:</span>
                        <span class="detail-value">${appointment.duration || 30} دقيقة</span>
                      </div>
                      <div class="detail-item">
                        <span class="detail-label">الحالة:</span>
                        <span class="detail-value ${statusInfo.class}">${statusInfo.text}</span>
                      </div>
                      ${appointment.notes ? `
                      <div class="detail-item">
                        <span class="detail-label">ملاحظات:</span>
                        <span class="detail-value">${appointment.notes}</span>
                      </div>
                      ` : ''}
                    </div>
                  </div>
                `
              }).join('')}
            </div>
            ${data.appointmentsList.length > 50 ? `
            <div class="pagination-info">
              <p>عرض أول 50 موعد من إجمالي ${data.appointmentsList.length.toLocaleString()} موعد</p>
            </div>
            ` : ''}
          </div>
        </div>
        ` : ''}

        <div class="section">
          <div class="section-title">
            <span class="section-icon">📊</span>
            توزيع المواعيد حسب الحالة
          </div>
          <div class="section-content">
            <div class="chart-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>الحالة</th>
                    <th>العدد</th>
                    <th>النسبة المئوية</th>
                    <th>المؤشر البصري</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.appointmentsByStatus?.map(item => {
                    const percentage = parseFloat(item.percentage?.toFixed(1) || '0')
                    const barWidth = Math.max(5, percentage)
                    return `
                      <tr>
                        <td class="category-cell">${item.status}</td>
                        <td class="number-cell">${item.count.toLocaleString()}</td>
                        <td class="percentage-cell">${percentage}%</td>
                        <td class="chart-cell">
                          <div class="progress-bar">
                            <div class="progress-fill" style="width: ${barWidth}%"></div>
                          </div>
                        </td>
                      </tr>
                    `
                  }).join('') || '<tr><td colspan="4" class="no-data">لا توجد بيانات</td></tr>'}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        ${data.appointmentsByTreatment && data.appointmentsByTreatment.length > 0 ? `
        <div class="section">
          <div class="section-title">
            <span class="section-icon">🦷</span>
            توزيع المواعيد حسب نوع العلاج
          </div>
          <div class="section-content">
            <div class="chart-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>نوع العلاج</th>
                    <th>عدد المواعيد</th>
                    <th>المؤشر البصري</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.appointmentsByTreatment.slice(0, 10).map(item => {
                    const maxCount = Math.max(...data.appointmentsByTreatment.map((t: any) => t.count))
                    const percentage = maxCount > 0 ? (item.count / maxCount) * 100 : 0
                    const barWidth = Math.max(5, percentage)
                    return `
                      <tr>
                        <td class="category-cell">${getTreatmentNameInArabic(item.treatment)}</td>
                        <td class="number-cell">${item.count.toLocaleString()}</td>
                        <td class="chart-cell">
                          <div class="progress-bar">
                            <div class="progress-fill" style="width: ${barWidth}%"></div>
                          </div>
                        </td>
                      </tr>
                    `
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        ` : ''}

        ${data.appointmentsByDay && data.appointmentsByDay.length > 0 ? `
        <div class="section">
          <div class="section-title">
            <span class="section-icon">📅</span>
            توزيع المواعيد حسب أيام الأسبوع
          </div>
          <div class="section-content">
            <div class="chart-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>اليوم</th>
                    <th>عدد المواعيد</th>
                    <th>المؤشر البصري</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.appointmentsByDay.map(item => {
                    const maxCount = Math.max(...data.appointmentsByDay.map((d: any) => d.count))
                    const percentage = maxCount > 0 ? (item.count / maxCount) * 100 : 0
                    const barWidth = Math.max(5, percentage)
                    return `
                      <tr>
                        <td class="category-cell">${item.day}</td>
                        <td class="number-cell">${item.count.toLocaleString()}</td>
                        <td class="chart-cell">
                          <div class="progress-bar">
                            <div class="progress-fill" style="width: ${barWidth}%"></div>
                          </div>
                        </td>
                      </tr>
                    `
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        ` : ''}

        ${data.peakHours && data.peakHours.length > 0 ? `
        <div class="section">
          <div class="section-title">
            <span class="section-icon">⏰</span>
            أوقات الذروة
          </div>
          <div class="section-content">
            <div class="chart-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>الوقت</th>
                    <th>عدد المواعيد</th>
                    <th>المؤشر البصري</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.peakHours.map(item => {
                    const maxCount = Math.max(...data.peakHours.map((h: any) => h.count))
                    const percentage = maxCount > 0 ? (item.count / maxCount) * 100 : 0
                    const barWidth = Math.max(5, percentage)
                    return `
                      <tr>
                        <td class="category-cell">${item.hour}</td>
                        <td class="number-cell">${item.count.toLocaleString()}</td>
                        <td class="chart-cell">
                          <div class="progress-bar">
                            <div class="progress-fill" style="width: ${barWidth}%"></div>
                          </div>
                        </td>
                      </tr>
                    `
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        ` : ''}

        <div class="report-footer">
          <p>تم إنشاء هذا التقرير بواسطة نظام إدارة العيادة</p>
          <p class="generated-info">تاريخ الإنشاء: ${(() => {
            // Format date as DD/MM/YYYY (Gregorian calendar)
            const date = new Date()
            const day = date.getDate().toString().padStart(2, '0')
            const month = (date.getMonth() + 1).toString().padStart(2, '0')
            const year = date.getFullYear()
            const time = date.toLocaleTimeString('ar-SA', {
              hour: '2-digit',
              minute: '2-digit'
            })
            return `${day}/${month}/${year} - ${time}`
          })()} | ${settings?.clinic_name || 'عيادة الأسنان'}</p>
        </div>
      </body>
      </html>
    `
  }

  // Create enhanced HTML report for financial data
  static createEnhancedFinancialReportHTML(data: any, settings?: ClinicSettings | null): string {
    const header = PdfService.getEnhancedHeader('التقرير المالي', settings, 'تقرير شامل عن الإيرادات والمدفوعات')
    const styles = PdfService.getEnhancedStyles()

    return `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>التقرير المالي - ${settings?.clinic_name || 'عيادة الأسنان'}</title>
        ${styles}
      </head>
      <body>
        ${header}

        <!-- Summary Cards with Enhanced Design -->
        <div class="summary-cards">
          <div class="summary-card primary">
            <div class="card-icon">💰</div>
            <div class="card-content">
              <h3>إجمالي الإيرادات</h3>
              <div class="number">${(() => {
                const convertedAmount = convertCurrency(data.totalRevenue || 0, 'USD', settings?.currency || 'USD')
                return formatCurrency(convertedAmount, settings?.currency || 'USD', false)
              })()}</div>
            </div>
          </div>
          <div class="summary-card success">
            <div class="card-icon">✅</div>
            <div class="card-content">
              <h3>المدفوعات المكتملة</h3>
              <div class="number">${data.completedPayments?.toLocaleString() || '0'}</div>
            </div>
          </div>
          <div class="summary-card info">
            <div class="card-icon">🔄</div>
            <div class="card-content">
              <h3>المدفوعات الجزئية</h3>
              <div class="number">${data.partialPayments?.toLocaleString() || '0'}</div>
            </div>
          </div>
          <div class="summary-card warning">
            <div class="card-icon">⏳</div>
            <div class="card-content">
              <h3>المدفوعات الآجلة</h3>
              <div class="number">${data.pendingPayments?.toLocaleString() || '0'}</div>
            </div>
          </div>
          <div class="summary-card danger">
            <div class="card-icon">⚠️</div>
            <div class="card-content">
              <h3>المدفوعات المتأخرة</h3>
              <div class="number">${data.overduePayments?.toLocaleString() || '0'}</div>
            </div>
          </div>
        </div>

        <!-- Payment Methods Analysis -->
        ${data.revenueByPaymentMethod && data.revenueByPaymentMethod.length > 0 ? `
        <div class="section">
          <div class="section-title">
            <span class="section-icon">💳</span>
            الإيرادات حسب طريقة الدفع
          </div>
          <div class="section-content">
            <div class="chart-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>طريقة الدفع</th>
                    <th>المبلغ</th>
                    <th>النسبة المئوية</th>
                    <th>المؤشر البصري</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.revenueByPaymentMethod.map((item: any) => {
                    const percentage = item.percentage || 0
                    const barWidth = Math.max(5, percentage)
                    const methodIcon = item.method === 'نقدي' ? '💵' : item.method === 'بطاقة' ? '💳' : item.method === 'تحويل بنكي' ? '🏦' : '💰'
                    return `
                      <tr>
                        <td class="category-cell">${methodIcon} ${item.method}</td>
                        <td class="number-cell">${(() => {
                          const convertedAmount = convertCurrency(item.amount || 0, 'USD', settings?.currency || 'USD')
                          return formatCurrency(convertedAmount, settings?.currency || 'USD', false)
                        })()}</td>
                        <td class="percentage-cell">${percentage.toFixed(1)}%</td>
                        <td class="chart-cell">
                          <div class="progress-bar">
                            <div class="progress-fill" style="width: ${barWidth}%"></div>
                          </div>
                        </td>
                      </tr>
                    `
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        ` : ''}



        ${data.revenueByTreatment && data.revenueByTreatment.length > 0 ? `
        <div class="section">
          <div class="section-title">
            <span class="section-icon">🦷</span>
            الإيرادات حسب نوع العلاج
          </div>
          <div class="section-content">
            <div class="chart-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>نوع العلاج</th>
                    <th>إجمالي الإيرادات</th>
                    <th>عدد المعاملات</th>
                    <th>متوسط المبلغ</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.revenueByTreatment.slice(0, 10).map((item: any) => `
                    <tr>
                      <td class="category-cell">${getTreatmentNameInArabic(item.treatment)}</td>
                      <td class="number-cell">${(() => {
                        const convertedAmount = convertCurrency(item.amount || 0, 'USD', settings?.currency || 'USD')
                        return formatCurrency(convertedAmount, settings?.currency || 'USD', false)
                      })()}</td>
                      <td class="number-cell">${item.count?.toLocaleString() || '0'}</td>
                      <td class="number-cell">${(() => {
                        const convertedAvg = convertCurrency(item.avgAmount || 0, 'USD', settings?.currency || 'USD')
                        return formatCurrency(convertedAvg, settings?.currency || 'USD', false)
                      })()}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        ` : ''}

        <!-- Payment Status Analysis -->
        <div class="section">
          <div class="section-title">
            <span class="section-icon">📈</span>
            تحليل حالات المدفوعات
          </div>
          <div class="section-content">
            <div class="chart-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>حالة الدفع</th>
                    <th>العدد</th>
                    <th>النسبة المئوية</th>
                    <th>المؤشر البصري</th>
                  </tr>
                </thead>
                <tbody>
                  ${(() => {
                    const totalPayments = data.dataCount || 0
                    const statusData = [
                      { status: 'مكتمل', count: data.completedPayments || 0, icon: '✅', color: 'success' },
                      { status: 'جزئي', count: data.partialPayments || 0, icon: '🔄', color: 'info' },
                      { status: 'آجل', count: data.pendingPayments || 0, icon: '⏳', color: 'warning' },
                      { status: 'متأخر', count: data.overduePayments || 0, icon: '⚠️', color: 'danger' },
                      { status: 'فاشل', count: data.failedPayments || 0, icon: '❌', color: 'danger' }
                    ]

                    return statusData.map(item => {
                      const percentage = totalPayments > 0 ? ((item.count / totalPayments) * 100) : 0
                      const barWidth = Math.max(5, percentage)
                      return `
                        <tr>
                          <td class="category-cell">${item.icon} ${item.status}</td>
                          <td class="number-cell">${item.count.toLocaleString()}</td>
                          <td class="percentage-cell">${percentage.toFixed(1)}%</td>
                          <td class="chart-cell">
                            <div class="progress-bar">
                              <div class="progress-fill ${item.color}" style="width: ${barWidth}%"></div>
                            </div>
                          </td>
                        </tr>
                      `
                    }).join('')
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Payment Status Analysis Summary -->
        <div class="section">
          <div class="section-title">
            <span class="section-icon">📊</span>
            تحليل إحصائي لحالات المدفوعات
          </div>
          <div class="section-content">
            <div class="analysis-cards">
              ${(() => {
                const totalPayments = data.dataCount || 0
                const statusData = [
                  { status: 'مكتمل', count: data.completedPayments || 0, icon: '✅', color: '#065f46', bgColor: '#d1fae5' },
                  { status: 'جزئي', count: data.partialPayments || 0, icon: '🔄', color: '#1e40af', bgColor: '#dbeafe' },
                  { status: 'آجل', count: data.pendingPayments || 0, icon: '⏳', color: '#92400e', bgColor: '#fef3c7' },
                  { status: 'متأخر', count: data.overduePayments || 0, icon: '⚠️', color: '#991b1b', bgColor: '#fee2e2' }
                ]

                return statusData.map(item => {
                  const percentage = totalPayments > 0 ? ((item.count / totalPayments) * 100) : 0
                  return `
                    <div class="analysis-card" style="border-left-color: ${item.color}; border-left-width: 6px;">
                      <div class="analysis-icon" style="background: ${item.bgColor}; color: ${item.color}; border: 2px solid ${item.color};">
                        ${item.icon}
                      </div>
                      <div class="analysis-content">
                        <h3 style="color: ${item.color};">${item.status}</h3>
                        <div class="analysis-stats">
                          <div class="stat">
                            <span class="stat-label">العدد:</span>
                            <span class="stat-value" style="color: ${item.color};">${item.count.toLocaleString()}</span>
                          </div>
                          <div class="stat">
                            <span class="stat-label">النسبة:</span>
                            <span class="stat-value" style="color: ${item.color};">${percentage.toFixed(1)}%</span>
                          </div>
                          <div class="stat">
                            <span class="stat-label">من إجمالي:</span>
                            <span class="stat-value">${totalPayments.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  `
                }).join('')
              })()}
            </div>
          </div>
        </div>

        <div class="report-footer">
          <div class="footer-content">
            <div class="footer-left">
              <p class="footer-title">تم إنشاء هذا التقرير بواسطة نظام إدارة العيادة</p>
              <p class="generated-info">تاريخ الإنشاء: ${(() => {
                const date = new Date()
                const day = date.getDate().toString().padStart(2, '0')
                const month = (date.getMonth() + 1).toString().padStart(2, '0')
                const year = date.getFullYear()
                const time = date.toLocaleTimeString('ar-SA', {
                  hour: '2-digit',
                  minute: '2-digit'
                })
                return `${day}/${month}/${year} - ${time}`
              })()} | ${settings?.clinic_name || 'عيادة الأسنان'}</p>
              ${data.filterInfo ? `<p class="filter-info">📊 ${data.filterInfo}</p>` : ''}
            </div>
            <div class="footer-right">
              <div class="footer-stats">
                <span class="stat-item">💰 ${(() => {
                  try {
                    const { getCurrencyConfig, formatCurrencyWithConfig, getDefaultCurrency } = require('@/lib/utils')
                    const config = getCurrencyConfig(settings?.currency || getDefaultCurrency())
                    return formatCurrencyWithConfig(data.totalRevenue || 0, config)
                  } catch (error) {
                    return new Intl.NumberFormat('en-US', { style: 'currency', currency: settings?.currency || 'USD' }).format(data.totalRevenue || 0)
                  }
                })()} إجمالي</span>
                <span class="stat-item">✅ ${data.completedPayments?.toLocaleString() || '0'} مكتمل</span>
                <span class="stat-item">🔄 ${data.partialPayments?.toLocaleString() || '0'} جزئي</span>
                <span class="stat-item">📊 ${data.dataCount?.toLocaleString() || '0'} معاملة</span>
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  }

  // Create enhanced HTML report for inventory
  static createEnhancedInventoryReportHTML(data: InventoryReportData, settings?: ClinicSettings | null): string {
    const header = PdfService.getEnhancedHeader('تقرير المخزون', settings, 'تقرير شامل عن حالة المخزون والتنبيهات')
    const styles = PdfService.getEnhancedStyles()

    return `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>تقرير المخزون - ${settings?.clinic_name || 'عيادة الأسنان'}</title>
        ${styles}
      </head>
      <body>
        ${header}

        <!-- Summary Cards with Enhanced Design -->
        <div class="summary-cards">
          <div class="summary-card primary">
            <div class="card-icon">📦</div>
            <div class="card-content">
              <h3>إجمالي الأصناف</h3>
              <div class="number">${data.totalItems.toLocaleString()}</div>
            </div>
          </div>
          <div class="summary-card success">
            <div class="card-icon">💰</div>
            <div class="card-content">
              <h3>القيمة الإجمالية</h3>
              <div class="number">${(() => {
                const convertedAmount = convertCurrency(data.totalValue || 0, 'USD', settings?.currency || 'USD')
                return formatCurrency(convertedAmount, settings?.currency || 'USD', false)
              })()}</div>
            </div>
          </div>
          <div class="summary-card warning">
            <div class="card-icon">⚠️</div>
            <div class="card-content">
              <h3>أصناف منخفضة المخزون</h3>
              <div class="number">${data.lowStockItems || 0}</div>
            </div>
          </div>
          <div class="summary-card danger">
            <div class="card-icon">⏰</div>
            <div class="card-content">
              <h3>أصناف منتهية الصلاحية</h3>
              <div class="number">${data.expiredItems || 0}</div>
            </div>
          </div>
          <div class="summary-card info">
            <div class="card-icon">❌</div>
            <div class="card-content">
              <h3>أصناف نفد مخزونها</h3>
              <div class="number">${data.outOfStockItems || 0}</div>
            </div>
          </div>
        </div>

        <!-- Inventory Items List Section -->
        ${data.inventoryItems && data.inventoryItems.length > 0 ? `
        <div class="section">
          <div class="section-title">
            <span class="section-icon">📋</span>
            قائمة أصناف المخزون
          </div>
          <div class="section-content">
            <div class="inventory-grid">
              ${data.inventoryItems.slice(0, 50).map((item: any, _index: number) => `
                <div class="inventory-card">
                  <div class="inventory-header">
                    <div class="inventory-avatar">
                      ${(item.name || 'ص').charAt(0)}
                    </div>
                    <div class="inventory-info">
                      <h4 class="inventory-name">${item.name || 'غير محدد'}</h4>
                      <span class="inventory-category">${item.category || 'غير مصنف'}</span>
                    </div>
                  </div>
                  <div class="inventory-details">
                    <div class="detail-item">
                      <span class="detail-label">الكمية:</span>
                      <span class="detail-value ${item.quantity <= item.minimum_stock ? 'status-warning' : 'status-success'}">${item.quantity.toLocaleString()}</span>
                    </div>
                    <div class="detail-item">
                      <span class="detail-label">سعر الوحدة:</span>
                      <span class="detail-value">${(() => {
                        const unitPrice = item.unit_price || item.cost_per_unit || 0
                        const convertedPrice = convertCurrency(unitPrice, 'USD', settings?.currency || 'USD')
                        return formatCurrency(convertedPrice, settings?.currency || 'USD', false)
                      })()}</span>
                    </div>
                    <div class="detail-item">
                      <span class="detail-label">القيمة الإجمالية:</span>
                      <span class="detail-value">${(() => {
                        const unitPrice = item.unit_price || item.cost_per_unit || 0
                        const totalValue = unitPrice * item.quantity
                        const convertedValue = convertCurrency(totalValue, 'USD', settings?.currency || 'USD')
                        return formatCurrency(convertedValue, settings?.currency || 'USD', false)
                      })()}</span>
                    </div>
                    <div class="detail-item">
                      <span class="detail-label">الحد الأدنى:</span>
                      <span class="detail-value">${item.minimum_stock || 0}</span>
                    </div>
                    ${item.expiry_date ? `
                    <div class="detail-item">
                      <span class="detail-label">تاريخ الانتهاء:</span>
                      <span class="detail-value ${new Date(item.expiry_date) < new Date() ? 'status-danger' : 'status-info'}">${new Date(item.expiry_date).toLocaleDateString('ar-SA')}</span>
                    </div>
                    ` : ''}
                    <div class="detail-item">
                      <span class="detail-label">الحالة:</span>
                      <span class="detail-value ${
                        item.quantity === 0 ? 'status-danger' :
                        item.quantity <= item.minimum_stock ? 'status-warning' :
                        'status-success'
                      }">
                        ${item.quantity === 0 ? 'نفد المخزون' :
                          item.quantity <= item.minimum_stock ? 'مخزون منخفض' :
                          'متوفر'}
                      </span>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
            ${data.inventoryItems.length > 50 ? `
            <div class="pagination-info">
              <p>عرض أول 50 صنف من إجمالي ${data.inventoryItems.length.toLocaleString()} صنف</p>
            </div>
            ` : ''}
          </div>
        </div>
        ` : ''}

        <!-- Category Distribution -->
        ${data.itemsByCategory && data.itemsByCategory.length > 0 ? `
        <div class="section">
          <div class="section-title">
            <span class="section-icon">📊</span>
            توزيع الأصناف حسب الفئة
          </div>
          <div class="section-content">
            <div class="chart-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>الفئة</th>
                    <th>عدد الأصناف</th>
                    <th>القيمة الإجمالية</th>
                    <th>المؤشر البصري</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.itemsByCategory.map((item: any) => {
                    const percentage = data.totalItems > 0 ? Math.round((item.count / data.totalItems) * 100) : 0
                    return `
                    <tr>
                      <td class="category-name">${item.category}</td>
                      <td class="count-cell">${item.count.toLocaleString()}</td>
                      <td class="value-cell">${(() => {
                        const convertedValue = convertCurrency(item.value || 0, 'USD', settings?.currency || 'USD')
                        return formatCurrency(convertedValue, settings?.currency || 'USD', false)
                      })()}</td>
                      <td class="progress-cell">
                        <div class="progress-bar">
                          <div class="progress-fill" style="width: ${percentage}%"></div>
                        </div>
                        <span class="percentage">${percentage}%</span>
                      </td>
                    </tr>
                    `
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        ` : ''}

        <!-- Stock Alerts Section -->
        ${data.stockAlerts && data.stockAlerts.length > 0 ? `
        <div class="section">
          <div class="section-title">
            <span class="section-icon">⚠️</span>
            تنبيهات المخزون
          </div>
          <div class="section-content">
            <div class="chart-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>الصنف</th>
                    <th>الكمية الحالية</th>
                    <th>الحد الأدنى</th>
                    <th>الحالة</th>
                    <th>مستوى التنبيه</th>
                    <th>المؤشر البصري</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.stockAlerts.slice(0, 20).map(item => {
                    const alertLevel = item.quantity === 0 ? 'critical' : 'warning'
                    const percentage = item.minimum_stock > 0 ? Math.min(100, Math.round((item.quantity / item.minimum_stock) * 100)) : 0
                    return `
                    <tr>
                      <td class="item-name">${item.name}</td>
                      <td class="quantity-cell ${alertLevel}">${item.quantity.toLocaleString()}</td>
                      <td class="minimum-cell">${item.minimum_stock || 0}</td>
                      <td class="status-cell">
                        <span class="status-badge ${alertLevel}">
                          ${item.quantity === 0 ? 'نفد المخزون' : 'مخزون منخفض'}
                        </span>
                      </td>
                      <td class="alert-level">
                        ${item.quantity === 0 ? '🔴 عاجل' : '🟡 تحذير'}
                      </td>
                      <td class="progress-cell">
                        <div class="progress-bar">
                          <div class="progress-fill ${alertLevel}" style="width: ${percentage}%"></div>
                        </div>
                        <span class="percentage">${percentage}%</span>
                      </td>
                    </tr>
                    `
                  }).join('')}
                </tbody>
              </table>
            </div>
            ${data.stockAlerts.length > 20 ? `
            <div class="pagination-info">
              <p>عرض أول 20 تنبيه من إجمالي ${data.stockAlerts.length.toLocaleString()} تنبيه</p>
            </div>
            ` : ''}
          </div>
        </div>
        ` : ''}

        <!-- Expiry Alerts Section -->
        ${data.expiryAlerts && data.expiryAlerts.length > 0 ? `
        <div class="section">
          <div class="section-title">
            <span class="section-icon">⏰</span>
            تنبيهات انتهاء الصلاحية
          </div>
          <div class="section-content">
            <div class="chart-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>الصنف</th>
                    <th>تاريخ الانتهاء</th>
                    <th>الأيام المتبقية</th>
                    <th>الكمية</th>
                    <th>الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.expiryAlerts.slice(0, 15).map(item => {
                    const expiryDate = new Date(item.expiry_date)
                    const today = new Date()
                    const daysRemaining = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                    const isExpired = daysRemaining < 0
                    const isExpiringSoon = daysRemaining <= 30 && daysRemaining >= 0

                    return `
                    <tr>
                      <td class="item-name">${item.name}</td>
                      <td class="date-cell">${expiryDate.toLocaleDateString('ar-SA')}</td>
                      <td class="days-cell ${isExpired ? 'expired' : isExpiringSoon ? 'expiring' : 'safe'}">
                        ${isExpired ? 'منتهي الصلاحية' : `${daysRemaining} يوم`}
                      </td>
                      <td class="quantity-cell">${item.quantity.toLocaleString()}</td>
                      <td class="status-cell">
                        <span class="status-badge ${isExpired ? 'critical' : isExpiringSoon ? 'warning' : 'safe'}">
                          ${isExpired ? 'منتهي' : isExpiringSoon ? 'ينتهي قريباً' : 'آمن'}
                        </span>
                      </td>
                    </tr>
                    `
                  }).join('')}
                </tbody>
              </table>
            </div>
            ${data.expiryAlerts.length > 15 ? `
            <div class="pagination-info">
              <p>عرض أول 15 تنبيه من إجمالي ${data.expiryAlerts.length.toLocaleString()} تنبيه</p>
            </div>
            ` : ''}
          </div>
        </div>
        ` : ''}

        <!-- Enhanced Footer -->
        <div class="report-footer">
          <div class="footer-content">
            <div class="footer-left">
              <p class="footer-title">تم إنشاء هذا التقرير بواسطة نظام إدارة العيادة</p>
              <p class="generated-info">تاريخ الإنشاء: ${(() => {
                // Format date as DD/MM/YYYY (Gregorian calendar)
                const date = new Date()
                const day = date.getDate().toString().padStart(2, '0')
                const month = (date.getMonth() + 1).toString().padStart(2, '0')
                const year = date.getFullYear()
                const time = date.toLocaleTimeString('ar-SA', {
                  hour: '2-digit',
                  minute: '2-digit'
                })
                return `${day}/${month}/${year} - ${time}`
              })()} | ${settings?.clinic_name || 'عيادة الأسنان'}</p>
              ${data.filterInfo ? `<p class="filter-info">📊 ${data.filterInfo}</p>` : ''}
            </div>
            <div class="footer-right">
              <div class="footer-stats">
                <span class="stat-item">📦 ${data.totalItems?.toLocaleString() || '0'} صنف</span>
                <span class="stat-item">💰 ${(() => {
                  const convertedValue = convertCurrency(data.totalValue || 0, 'USD', settings?.currency || 'USD')
                  return formatCurrency(convertedValue, settings?.currency || 'USD', false)
                })()} قيمة</span>
                <span class="stat-item">⚠️ ${data.lowStockItems?.toLocaleString() || '0'} منخفض</span>
                <span class="stat-item">📊 ${data.dataCount?.toLocaleString() || '0'} مفلتر</span>
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  }

  // Create enhanced HTML report for treatments
  static createEnhancedTreatmentReportHTML(data: TreatmentReportData, settings?: ClinicSettings | null): string {
    const header = PdfService.getEnhancedHeader('تقرير العلاجات السنية', settings, 'تقرير شامل عن إحصائيات العلاجات والإيرادات')
    const styles = PdfService.getEnhancedStyles()

    return `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>تقرير العلاجات - ${settings?.clinic_name || 'عيادة الأسنان'}</title>
        ${styles}
      </head>
      <body>
        ${header}

        <!-- Summary Statistics -->
        <div class="section">
          <div class="section-title">
            <span class="section-icon">📊</span>
            ملخص الإحصائيات
          </div>
          <div class="section-content">
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-value">${data.totalTreatments?.toLocaleString() || '0'}</div>
                <div class="stat-label">إجمالي العلاجات</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${data.completedTreatments?.toLocaleString() || '0'}</div>
                <div class="stat-label">العلاجات المكتملة</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${data.plannedTreatments?.toLocaleString() || '0'}</div>
                <div class="stat-label">العلاجات المخططة</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${data.inProgressTreatments?.toLocaleString() || '0'}</div>
                <div class="stat-label">قيد التنفيذ</div>
              </div>
            </div>
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-value">${(() => {
                  const convertedAmount = convertCurrency(data.totalRevenue || 0, 'USD', settings?.currency || 'USD')
                  return formatCurrency(convertedAmount, settings?.currency || 'USD', false)
                })()}</div>
                <div class="stat-label">إجمالي الإيرادات</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${(() => {
                  const convertedAmount = convertCurrency(data.averageTreatmentCost || 0, 'USD', settings?.currency || 'USD')
                  return formatCurrency(convertedAmount, settings?.currency || 'USD', false)
                })()}</div>
                <div class="stat-label">متوسط تكلفة العلاج</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${data.completionRate || '0'}%</div>
                <div class="stat-label">معدل الإنجاز</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${data.cancelledTreatments?.toLocaleString() || '0'}</div>
                <div class="stat-label">العلاجات الملغية</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Treatment Status Distribution -->
        ${data.treatmentsByStatus && data.treatmentsByStatus.length > 0 ? `
        <div class="section">
          <div class="section-title">
            <span class="section-icon">📈</span>
            توزيع العلاجات حسب الحالة
          </div>
          <div class="section-content">
            <div class="chart-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>الحالة</th>
                    <th>العدد</th>
                    <th>النسبة المئوية</th>
                    <th>المؤشر البصري</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.treatmentsByStatus.map(item => {
                    const barWidth = Math.max(5, item.percentage || 0)
                    return `
                      <tr>
                        <td class="category-cell">${item.status}</td>
                        <td class="number-cell">${item.count?.toLocaleString() || '0'}</td>
                        <td class="percentage-cell">${item.percentage?.toFixed(1) || '0'}%</td>
                        <td class="progress-cell">
                          <div class="progress-bar">
                            <div class="progress-fill" style="width: ${barWidth}%"></div>
                          </div>
                        </td>
                      </tr>
                    `
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        ` : ''}

        <!-- Treatment Types Distribution -->
        ${data.treatmentsByType && data.treatmentsByType.length > 0 ? `
        <div class="section">
          <div class="section-title">
            <span class="section-icon">🦷</span>
            توزيع العلاجات حسب النوع
          </div>
          <div class="section-content">
            <div class="chart-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>نوع العلاج</th>
                    <th>العدد</th>
                    <th>النسبة المئوية</th>
                    <th>المؤشر البصري</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.treatmentsByType.slice(0, 15).map(item => {
                    const barWidth = Math.max(5, item.percentage || 0)
                    return `
                      <tr>
                        <td class="category-cell">${item.type}</td>
                        <td class="number-cell">${item.count?.toLocaleString() || '0'}</td>
                        <td class="percentage-cell">${item.percentage?.toFixed(1) || '0'}%</td>
                        <td class="progress-cell">
                          <div class="progress-bar">
                            <div class="progress-fill" style="width: ${barWidth}%"></div>
                          </div>
                        </td>
                      </tr>
                    `
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        ` : ''}

        <!-- Revenue by Category -->
        ${data.revenueByCategory && data.revenueByCategory.length > 0 ? `
        <div class="section">
          <div class="section-title">
            <span class="section-icon">💰</span>
            الإيرادات حسب فئة العلاج
          </div>
          <div class="section-content">
            <div class="chart-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>فئة العلاج</th>
                    <th>إجمالي الإيرادات</th>
                    <th>عدد العلاجات</th>
                    <th>متوسط التكلفة</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.revenueByCategory.slice(0, 10).map(item => {
                    const avgCost = item.count > 0 ? (item.revenue / item.count) : 0
                    return `
                      <tr>
                        <td class="category-cell">${item.category}</td>
                        <td class="number-cell">${(() => {
                          const convertedRevenue = convertCurrency(item.revenue || 0, 'USD', settings?.currency || 'USD')
                          return formatCurrency(convertedRevenue, settings?.currency || 'USD', false)
                        })()}</td>
                        <td class="number-cell">${item.count?.toLocaleString() || '0'}</td>
                        <td class="number-cell">${(() => {
                          const convertedAvg = convertCurrency(avgCost, 'USD', settings?.currency || 'USD')
                          return formatCurrency(convertedAvg, settings?.currency || 'USD', false)
                        })()}</td>
                      </tr>
                    `
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        ` : ''}

        <!-- Pending Treatments -->
        ${data.pendingTreatments && data.pendingTreatments.length > 0 ? `
        <div class="section">
          <div class="section-title">
            <span class="section-icon">⏳</span>
            العلاجات الآجلة (${data.pendingTreatments.length})
          </div>
          <div class="section-content">
            <div class="chart-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>نوع العلاج</th>
                    <th>اسم المريض</th>
                    <th>الحالة</th>
                    <th>التاريخ</th>
                    <th>التكلفة</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.pendingTreatments.slice(0, 20).map(treatment => `
                    <tr>
                      <td class="category-cell">${getTreatmentNameInArabic(treatment.treatment_type || 'غير محدد')}</td>
                      <td class="patient-cell">${treatment.patient?.full_name || 'غير محدد'}</td>
                      <td class="status-cell">
                        <span class="status-badge warning">${treatment.treatment_status || 'آجل'}</span>
                      </td>
                      <td class="date-cell">${treatment.created_at ? (() => {
                        const date = new Date(treatment.created_at)
                        const day = date.getDate().toString().padStart(2, '0')
                        const month = (date.getMonth() + 1).toString().padStart(2, '0')
                        const year = date.getFullYear()
                        return `${day}/${month}/${year}`
                      })() : 'غير محدد'}</td>
                      <td class="number-cell">${(() => {
                        const convertedCost = convertCurrency(treatment.cost || 0, 'USD', settings?.currency || 'USD')
                        return formatCurrency(convertedCost, settings?.currency || 'USD', false)
                      })()}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            ${data.pendingTreatments.length > 20 ? `
            <div class="pagination-info">
              <p>عرض أول 20 علاج من إجمالي ${data.pendingTreatments.length.toLocaleString()} علاج آجل</p>
            </div>
            ` : ''}
          </div>
        </div>
        ` : ''}

        <!-- Enhanced Footer -->
        <div class="report-footer">
          <div class="footer-content">
            <div class="footer-left">
              <p class="footer-title">تم إنشاء هذا التقرير بواسطة نظام إدارة العيادة</p>
              <p class="generated-info">تاريخ الإنشاء: ${(() => {
                const date = new Date()
                const day = date.getDate().toString().padStart(2, '0')
                const month = (date.getMonth() + 1).toString().padStart(2, '0')
                const year = date.getFullYear()
                const time = date.toLocaleTimeString('ar-SA', {
                  hour: '2-digit',
                  minute: '2-digit'
                })
                return `${day}/${month}/${year} - ${time}`
              })()}</p>
            </div>
            <div class="footer-right">
              <p class="clinic-name">${settings?.clinic_name || 'عيادة الأسنان'}</p>
              ${settings?.clinic_address ? `<p class="clinic-address">${settings.clinic_address}</p>` : ''}
              ${settings?.clinic_phone ? `<p class="clinic-phone">📞 ${settings.clinic_phone}</p>` : ''}
            </div>
          </div>
        </div>

      </body>
      </html>
    `
  }

  /**
   * إنشاء تقرير PDF محسن للأرباح والخسائر
   */
  static createEnhancedProfitLossReportHTML(data: {
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
  }, settings?: ClinicSettings | null): string {
    const { reportData, payments, labOrders, clinicNeeds, inventoryItems, clinicExpenses, patients, appointments, filter, currency } = data
    const header = PdfService.getEnhancedHeader('التقرير الشامل للأرباح والخسائر', settings, 'تحليل مالي شامل يربط جميع جوانب العيادة')
    const styles = PdfService.getEnhancedStyles()

    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('ar-SA', {
        style: 'currency',
        currency: currency || 'SAR',
        minimumFractionDigits: 2
      }).format(amount || 0)
    }

    const formatDate = (dateString: string) => {
      try {
        const date = new Date(dateString)
        if (isNaN(date.getTime())) return 'غير محدد'
        // Use Gregorian date format instead of Arabic
        return date.toLocaleDateString('en-GB')
      } catch {
        return 'غير محدد'
      }
    }

    return `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>تقرير الأرباح والخسائر - ${settings?.clinic_name || 'عيادة الأسنان'}</title>
        ${styles}
        <style>
          .profit-loss-summary {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin: 20px 0;
          }
          .profit-card {
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
          }
          .loss-card {
            background: linear-gradient(135deg, #ef4444, #dc2626);
            color: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
          }
          .financial-breakdown {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin: 30px 0;
          }
          .revenue-section, .expenses-section {
            background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
            padding: 20px;
            border-radius: 10px;
            border: 2px solid #1a365d;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          }
          .revenue-section h3 {
            color: #059669;
            border-bottom: 2px solid #10b981;
            padding-bottom: 10px;
          }
          .expenses-section h3 {
            color: #dc2626;
            border-bottom: 2px solid #ef4444;
            padding-bottom: 10px;
          }
          .breakdown-item {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #e2e8f0;
          }
          .breakdown-item:last-child {
            border-bottom: none;
            font-weight: bold;
            background: linear-gradient(135deg, #1a365d 0%, #2c5282 100%);
            color: white;
            padding: 12px;
            margin-top: 10px;
            border-radius: 5px;
            text-shadow: 0 1px 2px rgba(0,0,0,0.2);
          }
          .details-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            font-size: 12px;
          }
          .details-table th,
          .details-table td {
            border: 1px solid #e2e8f0;
            padding: 8px;
            text-align: right;
          }
          .details-table th {
            background: linear-gradient(135deg, #1a365d 0%, #2c5282 100%);
            color: white;
            font-weight: bold;
            text-shadow: 0 1px 2px rgba(0,0,0,0.2);
          }
          .details-table tr:nth-child(even) {
            background: #f8fafc;
          }
          .statistics-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
            margin: 20px 0;
          }
          .stat-card {
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            border: 2px solid #1a365d;
            border-radius: 8px;
            padding: 15px;
            text-align: center;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          }
          .stat-number {
            font-size: 24px;
            font-weight: bold;
            color: #1e40af;
          }
          .stat-label {
            font-size: 12px;
            color: #64748b;
            margin-top: 5px;
          }
        </style>
      </head>
      <body>
        ${header}

        <!-- النتيجة النهائية -->
        <div class="profit-loss-summary">
          <div class="${reportData.calculations.isProfit ? 'profit-card' : 'loss-card'}">
            <h2>${reportData.calculations.isProfit ? '🎉 ربح' : '⚠️ خسارة'}</h2>
            <div class="number" style="font-size: 28px; margin: 10px 0;">
              ${formatCurrency(reportData.calculations.isProfit ? reportData.calculations.netProfit : reportData.calculations.lossAmount)}
            </div>
            <p>نسبة الربح: ${reportData.calculations.profitMargin.toFixed(2)}%</p>
          </div>
          <div class="summary-card info">
            <h3>معلومات التقرير</h3>
            <p><strong>الفترة الزمنية:</strong> ${reportData.filterInfo.dateRange}</p>
            <p><strong>إجمالي السجلات:</strong> ${reportData.filterInfo.totalRecords}</p>
            <p><strong>السجلات المفلترة:</strong> ${reportData.filterInfo.filteredRecords}</p>
            <p><strong>تاريخ التقرير:</strong> ${formatDate(new Date().toISOString())}</p>
          </div>
        </div>

        <!-- تفصيل الإيرادات والمصروفات -->
        <div class="financial-breakdown">
          <div class="revenue-section">
            <h3>📈 تفاصيل الإيرادات</h3>
            <div class="breakdown-item">
              <span>المدفوعات المكتملة:</span>
              <span>${formatCurrency(reportData.revenue.completedPayments)}</span>
            </div>
            <div class="breakdown-item">
              <span>المدفوعات الجزئية:</span>
              <span>${formatCurrency(reportData.revenue.partialPayments)}</span>
            </div>
            <div class="breakdown-item">
              <span>المبالغ الآجلة (غير مدفوعة):</span>
              <span>${formatCurrency(reportData.revenue.pendingAmount || 0)}</span>
            </div>
            <div class="breakdown-item">
              <span>المبالغ المتبقية:</span>
              <span>${formatCurrency(reportData.revenue.remainingBalances)}</span>
            </div>
            <div class="breakdown-item">
              <span>إجمالي الإيرادات:</span>
              <span>${formatCurrency(reportData.revenue.totalRevenue)}</span>
            </div>
          </div>

          <div class="expenses-section">
            <h3>📉 تفاصيل المصروفات</h3>
            <div class="breakdown-item">
              <span>مدفوعات المخابر:</span>
              <span>${formatCurrency(reportData.expenses.labOrdersTotal)}</span>
            </div>
            <div class="breakdown-item">
              <span>متبقي المخابر:</span>
              <span>${formatCurrency(reportData.expenses.labOrdersRemaining)}</span>
            </div>
            <div class="breakdown-item">
              <span>احتياجات العيادة:</span>
              <span>${formatCurrency(reportData.expenses.clinicNeedsTotal)}</span>
            </div>
            <div class="breakdown-item">
              <span>متبقي الاحتياجات:</span>
              <span>${formatCurrency(reportData.expenses.clinicNeedsRemaining)}</span>
            </div>
            <div class="breakdown-item">
              <span>قيمة المخزون:</span>
              <span>${formatCurrency(reportData.expenses.inventoryExpenses)}</span>
            </div>
            <div class="breakdown-item">
              <span>مصروفات العيادة المباشرة:</span>
              <span>${formatCurrency(reportData.expenses.clinicExpensesTotal || 0)}</span>
            </div>
            <div class="breakdown-item">
              <span>إجمالي المصروفات:</span>
              <span>${formatCurrency(reportData.calculations.totalExpenses)}</span>
            </div>
          </div>
        </div>

        <!-- إحصائيات إضافية -->
        <div class="statistics-grid">
          <div class="stat-card">
            <div class="stat-number">${reportData.details.totalPatients}</div>
            <div class="stat-label">إجمالي المرضى</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">${reportData.details.totalAppointments}</div>
            <div class="stat-label">إجمالي المواعيد</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">${reportData.details.totalLabOrders}</div>
            <div class="stat-label">طلبات المخابر</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">${reportData.details.totalClinicNeeds}</div>
            <div class="stat-label">احتياجات العيادة</div>
          </div>
        </div>

        <!-- متوسطات الإيرادات -->
        <div class="section">
          <h3>📊 متوسطات الإيرادات</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div class="summary-card">
              <h4>متوسط الإيرادات لكل مريض</h4>
              <div class="number">${formatCurrency(reportData.details.averageRevenuePerPatient)}</div>
            </div>
            <div class="summary-card">
              <h4>متوسط الإيرادات لكل موعد</h4>
              <div class="number">${formatCurrency(reportData.details.averageRevenuePerAppointment)}</div>
            </div>
          </div>
        </div>

        ${payments && payments.length > 0 ? `
        <!-- تفاصيل المدفوعات -->
        <div class="section">
          <h3>💰 تفاصيل المدفوعات (أحدث 20 دفعة)</h3>
          <table class="details-table">
            <thead>
              <tr>
                <th>اسم المريض</th>
                <th>المبلغ المدفوع</th>
                <th>المبلغ الإجمالي</th>
                <th>المبلغ المتبقي</th>
                <th>الحالة</th>
                <th>طريقة الدفع</th>
                <th>تاريخ الدفع</th>
              </tr>
            </thead>
            <tbody>
              ${payments.slice(0, 20).map(payment => {
                const paidAmount = payment.amount || 0

                // حساب المبلغ الإجمالي والمتبقي بناءً على حالة الدفعة
                let totalAmount = 0
                let remainingAmount = 0

                if (payment.status === 'partial') {
                  totalAmount = payment.total_amount_due || payment.treatment_total_cost || 0
                  const totalPaidForTreatment = payment.amount_paid || payment.treatment_total_paid || paidAmount
                  remainingAmount = Math.max(0, totalAmount - totalPaidForTreatment)
                } else if (payment.status === 'pending') {
                  totalAmount = payment.total_amount_due || payment.treatment_total_cost || paidAmount
                  remainingAmount = totalAmount
                } else {
                  totalAmount = paidAmount
                  remainingAmount = 0
                }
                return `
                <tr>
                  <td>${payment.patient_name || ''}</td>
                  <td>${formatCurrency(paidAmount)}</td>
                  <td>${formatCurrency(totalAmount)}</td>
                  <td>${formatCurrency(remainingAmount)}</td>
                  <td>${payment.status === 'completed' ? 'مكتمل' : payment.status === 'partial' ? 'جزئي' : 'آجل'}</td>
                  <td>${payment.payment_method || ''}</td>
                  <td>${payment.payment_date ? formatDate(payment.payment_date) : ''}</td>
                </tr>
                `
              }).join('')}
            </tbody>
          </table>

          <!-- ملخص المدفوعات الآجلة والمتبقية -->
          <div style="margin-top: 20px; padding: 15px; background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%); border: 2px solid #1a365d; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <h4>📊 ملخص المدفوعات الآجلة والمتبقية</h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 10px;">
              <div>
                <strong>إجمالي المدفوعات الآجلة:</strong><br>
                ${formatCurrency(payments.filter(p => p.status === 'pending').reduce((sum, p) => {
                  // للمدفوعات الآجلة، استخدم المبلغ الإجمالي المطلوب
                  const totalAmountDue = p.total_amount_due || p.treatment_total_cost || 0
                  return sum + totalAmountDue
                }, 0))}
              </div>
              <div>
                <strong>إجمالي المبالغ المتبقية من الدفعات الجزئية:</strong><br>
                ${formatCurrency(payments.filter(p => p.status === 'partial').reduce((sum, p) => {
                  const totalAmountDue = p.total_amount_due || p.treatment_total_cost || 0
                  // استخدم إجمالي المدفوع للعلاج وليس مبلغ هذه الدفعة فقط
                  const totalPaidForTreatment = p.amount_paid || p.treatment_total_paid || p.amount || 0
                  return sum + Math.max(0, totalAmountDue - totalPaidForTreatment)
                }, 0))}
              </div>
            </div>
          </div>
        </div>
        ` : ''}

        ${labOrders && labOrders.length > 0 ? `
        <!-- تفاصيل طلبات المخابر -->
        <div class="section">
          <h3>🔬 تفاصيل طلبات المخابر (أحدث 15 طلب)</h3>
          <table class="details-table">
            <thead>
              <tr>
                <th>رقم الطلب</th>
                <th>اسم المختبر</th>
                <th>اسم المريض</th>
                <th>تاريخ الطلب</th>
                <th>تاريخ الاستلام</th>
                <th>التكلفة</th>
                <th>المدفوع</th>
                <th>المتبقي</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              ${labOrders.slice(0, 15).map((order: any, _index: number) => {
                const statusClass = order.status === 'completed' ? 'status-success' : order.status === 'pending' ? 'status-warning' : 'status-danger'
                const statusText = order.status === 'completed' ? 'مكتمل' : order.status === 'pending' ? 'قيد الانتظار' : 'ملغي'
                return `
                  <tr>
                    <td>#${order.id || (_index + 1).toString().padStart(3, '0')}</td>
                    <td>${order.lab?.name || 'غير محدد'}</td>
                    <td>${order.patient?.full_name || 'غير محدد'}</td>
                    <td>${formatDate(order.order_date)}</td>
                    <td>${order.delivery_date ? formatDate(order.delivery_date) : 'غير محدد'}</td>
                    <td>${formatCurrency(order.cost || 0)}</td>
                    <td>${formatCurrency(order.paid_amount || 0)}</td>
                    <td>${formatCurrency((order.cost || 0) - (order.paid_amount || 0))}</td>
                    <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                  </tr>
                `
              }).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        ${clinicNeeds && clinicNeeds.length > 0 ? `
        <!-- تفاصيل احتياجات العيادة -->
        <div class="section">
          <h3>🏥 تفاصيل احتياجات العيادة (أحدث 15 احتياج)</h3>
          <table class="details-table">
            <thead>
              <tr>
                <th>اسم الحاجة</th>
                <th>الكمية</th>
                <th>سعر الوحدة</th>
                <th>التكلفة الإجمالية</th>
                <th>الأولوية</th>
                <th>الحالة</th>
                <th>تاريخ الطلب</th>
              </tr>
            </thead>
            <tbody>
              ${clinicNeeds.slice(0, 15).map((need: any, _index: number) => {
                const statusClass = need.status === 'received' ? 'status-success' : need.status === 'ordered' ? 'status-info' : 'status-warning'
                const statusText = need.status === 'received' ? 'مستلمة' : need.status === 'ordered' ? 'مطلوبة' : 'آجلة'
                const priorityText = need.priority === 'urgent' ? 'عاجل' : need.priority === 'high' ? 'عالي' : need.priority === 'medium' ? 'متوسط' : 'منخفض'
                return `
                  <tr>
                    <td>${need.need_name || 'غير محدد'}</td>
                    <td>${need.quantity.toLocaleString()}</td>
                    <td>${formatCurrency(need.price || 0)}</td>
                    <td>${formatCurrency((need.quantity || 0) * (need.price || 0))}</td>
                    <td>${priorityText}</td>
                    <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                    <td>${formatDate(need.created_at)}</td>
                  </tr>
                `
              }).join('')}
            </tbody>
          </table>

          <!-- إجمالي تكلفة احتياجات العيادة -->
          <div style="margin-top: 15px; padding: 10px; background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%); border-radius: 5px;">
            <strong>إجمالي تكلفة احتياجات العيادة: ${formatCurrency(clinicNeeds.reduce((sum, need) => {
              const quantity = need.quantity || 0
              const unitPrice = need.price || 0
              return sum + (quantity * unitPrice)
            }, 0))}</strong>
          </div>
        </div>
        ` : ''}

        ${clinicExpenses && clinicExpenses.length > 0 ? `
        <!-- تفاصيل مصروفات العيادة -->
        <div class="section">
          <h3>💸 تفاصيل مصروفات العيادة (أحدث 15 مصروف)</h3>
          <table class="details-table">
            <thead>
              <tr>
                <th>اسم المصروف</th>
                <th>النوع</th>
                <th>المبلغ</th>
                <th>تاريخ الدفع</th>
                <th>طريقة الدفع</th>
                <th>المورد</th>
              </tr>
            </thead>
            <tbody>
              ${clinicExpenses.slice(0, 15).map(expense => `
                <tr>
                  <td>${expense.expense_name || ''}</td>
                  <td>${expense.expense_type || ''}</td>
                  <td>${formatCurrency(expense.amount || 0)}</td>
                  <td>${formatDate(expense.payment_date)}</td>
                  <td>${expense.payment_method || ''}</td>
                  <td>${expense.vendor || ''}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        <!-- Footer -->
        <div class="footer">
          <div class="footer-content">
            <div class="footer-left">
              <p class="report-date">تاريخ التقرير: ${formatDate(new Date().toISOString())}</p>
              <p class="report-time">وقت التقرير: ${new Date().toLocaleTimeString('ar-SA')}</p>
            </div>
            <div class="footer-right">
              <p class="clinic-name">${settings?.clinic_name || 'عيادة الأسنان'}</p>
              ${settings?.clinic_address ? `<p class="clinic-address">${settings.clinic_address}</p>` : ''}
              ${settings?.clinic_phone ? `<p class="clinic-phone">📞 ${settings.clinic_phone}</p>` : ''}
            </div>
          </div>
        </div>

      </body>
      </html>
    `
  }

  // Create enhanced HTML report for lab orders
  static createEnhancedLabReportHTML(data: LabReportData, settings?: ClinicSettings | null): string {
    const header = PdfService.getEnhancedHeader('تقرير طلبات المختبرات', settings, 'تقرير شامل عن طلبات المختبرات وحالتها')
    const styles = PdfService.getEnhancedStyles()

    const formatCurrencySafe = (amount: number) => {
      const convertedAmount = convertCurrency(amount || 0, 'USD', settings?.currency || 'USD')
      return formatCurrency(convertedAmount, settings?.currency || 'USD', false)
    }

    const formatDateSafe = (dateString: string) => {
      try {
        const date = new Date(dateString)
        if (isNaN(date.getTime())) return 'غير محدد'
        return date.toLocaleDateString('ar-SA')
      } catch (error) {
        return 'غير محدد'
      }
    }

    return `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>تقرير المختبرات - ${settings?.clinic_name || 'عيادة الأسنان'}</title>
        ${styles}
      </head>
      <body>
        ${header}

        <!-- Summary Cards with Enhanced Design -->
        <div class="summary-cards">
          <div class="summary-card primary">
            <div class="card-icon">🔬</div>
            <div class="card-content">
              <h3>إجمالي طلبات المختبرات</h3>
              <div class="number">${data.totalOrders.toLocaleString()}</div>
            </div>
          </div>
          <div class="summary-card success">
            <div class="card-icon">✅</div>
            <div class="card-content">
              <h3>طلبات مكتملة</h3>
              <div class="number">${data.completedOrders.toLocaleString()}</div>
            </div>
          </div>
          <div class="summary-card warning">
            <div class="card-icon">⏳</div>
            <div class="card-content">
              <h3>طلبات قيد الانتظار</h3>
              <div class="number warning">${data.pendingOrders.toLocaleString()}</div>
            </div>
          </div>
          <div class="summary-card danger">
            <div class="card-icon">❌</div>
            <div class="card-content">
              <h3>طلبات ملغية</h3>
              <div class="number danger">${data.cancelledOrders.toLocaleString()}</div>
            </div>
          </div>
          <div class="summary-card info">
            <div class="card-icon">💰</div>
            <div class="card-content">
              <h3>التكلفة الإجمالية</h3>
              <div class="number">${formatCurrencySafe(data.totalCost)}</div>
            </div>
          </div>
          <div class="summary-card info">
            <div class="card-icon">💸</div>
            <div class="card-content">
              <h3>المبلغ المتبقي</h3>
              <div class="number">${formatCurrencySafe(data.totalRemaining)}</div>
            </div>
          </div>
        </div>

        <!-- Lab Orders List Section -->
        ${data.labOrdersList && data.labOrdersList.length > 0 ? `
        <div class="section">
          <div class="section-title">
            <span class="section-icon">📋</span>
            قائمة طلبات المختبرات
          </div>
          <div class="section-content">
            <div class="data-table-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>رقم الطلب</th>
                    <th>اسم المختبر</th>
                    <th>اسم المريض</th>
                    <th>تاريخ الطلب</th>
                    <th>تاريخ الاستلام</th>
                    <th>التكلفة</th>
                    <th>المدفوع</th>
                    <th>المتبقي</th>
                    <th>الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.labOrdersList.slice(0, 50).map((order: any, _index: number) => {
                    const statusClass = order.status === 'completed' ? 'status-success' : order.status === 'pending' ? 'status-warning' : 'status-danger'
                    const statusText = order.status === 'completed' ? 'مكتمل' : order.status === 'pending' ? 'قيد الانتظار' : 'ملغي'
                    return `
                      <tr>
                        <td>#${order.id || (_index + 1).toString().padStart(3, '0')}</td>
                        <td>${order.lab?.name || 'غير محدد'}</td>
                        <td>${order.patient?.full_name || 'غير محدد'}</td>
                        <td>${formatDateSafe(order.order_date)}</td>
                        <td>${order.expected_delivery_date ? formatDateSafe(order.expected_delivery_date) : 'غير محدد'}</td>
                        <td>${formatCurrencySafe(order.cost || 0)}</td>
                        <td>${formatCurrencySafe(order.paid_amount || 0)}</td>
                        <td>${formatCurrencySafe((order.cost || 0) - (order.paid_amount || 0))}</td>
                        <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                      </tr>
                    `
                  }).join('')}
                </tbody>
              </table>
            </div>
            ${data.labOrdersList.length > 50 ? `
            <div class="pagination-info">
              <p>عرض أول 50 طلب من إجمالي ${data.labOrdersList.length.toLocaleString()} طلب</p>
            </div>
            ` : ''}
          </div>
        </div>
        ` : ''}

        <div class="report-footer">
          <div class="footer-content">
            <div class="footer-left">
              <p class="footer-title">تم إنشاء هذا التقرير بواسطة نظام إدارة العيادة</p>
              <p class="generated-info">تاريخ الإنشاء: ${(() => {
                // Format date as DD/MM/YYYY (Gregorian calendar)
                const date = new Date()
                const day = date.getDate().toString().padStart(2, '0')
                const month = (date.getMonth() + 1).toString().padStart(2, '0')
                const year = date.getFullYear()
                const time = date.toLocaleTimeString('ar-SA', {
                  hour: '2-digit',
                  minute: '2-digit'
                })
                return `${day}/${month}/${year} - ${time}`
              })()} | ${settings?.clinic_name || 'عيادة الأسنان'}</p>
              ${data.filterInfo ? `<p class="filter-info">📊 ${data.filterInfo}</p>` : ''}
            </div>
            <div class="footer-right">
              <div class="footer-stats">
                <span class="stat-item">🔬 ${data.totalOrders?.toLocaleString() || '0'} طلب</span>
                <span class="stat-item">✅ ${data.completedOrders?.toLocaleString() || '0'} مكتمل</span>
                <span class="stat-item">⏳ ${data.pendingOrders?.toLocaleString() || '0'} بانتظار</span>
                <span class="stat-item">💰 ${formatCurrencySafe(data.totalCost)} إجمالي</span>
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  }

  // Create enhanced HTML report for clinic needs
  static createEnhancedClinicNeedsReportHTML(data: ClinicNeedsReportData, settings?: ClinicSettings | null): string {
    const header = PdfService.getEnhancedHeader('تقرير احتياجات العيادة', settings, 'تقرير شامل عن احتياجات العيادة وحالتها')
    const styles = PdfService.getEnhancedStyles()

    const formatCurrencySafe = (amount: number) => {
      const convertedAmount = convertCurrency(amount || 0, 'USD', settings?.currency || 'USD')
      return formatCurrency(convertedAmount, settings?.currency || 'USD', false)
    }

    const formatDateSafe = (dateString: string) => {
      try {
        const date = new Date(dateString)
        if (isNaN(date.getTime())) return 'غير محدد'
        return date.toLocaleDateString('ar-SA')
      } catch (error) {
        return 'غير محدد'
      }
    }

    return `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>تقرير احتياجات العيادة - ${settings?.clinic_name || 'عيادة الأسنان'}</title>
        ${styles}
      </head>
      <body>
        ${header}

        <!-- Summary Cards with Enhanced Design -->
        <div class="summary-cards">
          <div class="summary-card primary">
            <div class="card-icon">🏥</div>
            <div class="card-content">
              <h3>إجمالي الاحتياجات</h3>
              <div class="number">${data.totalNeeds.toLocaleString()}</div>
            </div>
          </div>
          <div class="summary-card success">
            <div class="card-icon">✅</div>
            <div class="card-content">
              <h3>احتياجات مستلمة</h3>
              <div class="number">${data.receivedCount.toLocaleString()}</div>
            </div>
          </div>
          <div class="summary-card warning">
            <div class="card-icon">📦</div>
            <div class="card-content">
              <h3>احتياجات مطلوبة</h3>
              <div class="number warning">${data.orderedCount.toLocaleString()}</div>
            </div>
          </div>
          <div class="summary-card danger">
            <div class="card-icon">⏳</div>
            <div class="card-content">
              <h3>احتياجات آجلة</h3>
              <div class="number danger">${data.pendingCount.toLocaleString()}</div>
            </div>
          </div>
          <div class="summary-card info">
            <div class="card-icon">💰</div>
            <div class="card-content">
              <h3>التكلفة الإجمالية</h3>
              <div class="number">${formatCurrencySafe(data.totalCost)}</div>
            </div>
          </div>
          <div class="summary-card info">
            <div class="card-icon">💸</div>
            <div class="card-content">
              <h3>المبلغ المتبقي</h3>
              <div class="number">${formatCurrencySafe(data.totalRemaining)}</div>
            </div>
          </div>
        </div>

        <!-- Clinic Needs List Section -->
        ${data.clinicNeedsList && data.clinicNeedsList.length > 0 ? `
        <div class="section">
          <div class="section-title">
            <span class="section-icon">📋</span>
            قائمة احتياجات العيادة
          </div>
          <div class="section-content">
            <div class="data-table-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>اسم الحاجة</th>
                    <th>الكمية</th>
                    <th>سعر الوحدة</th>
                    <th>التكلفة الإجمالية</th>
                    <th>الأولوية</th>
                    <th>الحالة</th>
                    <th>تاريخ الطلب</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.clinicNeedsList.slice(0, 50).map((need: ClinicNeed, _index: number) => {
                    const statusClass = need.status === 'received' ? 'status-success' : need.status === 'ordered' ? 'status-info' : 'status-warning'
                    const statusText = need.status === 'received' ? 'مستلمة' : need.status === 'ordered' ? 'مطلوبة' : 'آجلة'
                    const priorityText = need.priority === 'urgent' ? 'عاجل' : need.priority === 'high' ? 'عالي' : need.priority === 'medium' ? 'متوسط' : 'منخفض'
                    return `
                      <tr>
                        <td>${need.need_name || 'غير محدد'}</td>
                        <td>${need.quantity.toLocaleString()}</td>
                        <td>${formatCurrencySafe(need.price || 0)}</td>
                        <td>${formatCurrencySafe((need.quantity || 0) * (need.price || 0))}</td>
                        <td>${priorityText}</td>
                        <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                        <td>${formatDateSafe(need.created_at)}</td>
                      </tr>
                    `
                  }).join('')}
                </tbody>
              </table>
            </div>
            ${data.clinicNeedsList.length > 50 ? `
            <div class="pagination-info">
              <p>عرض أول 50 حاجة من إجمالي ${data.clinicNeedsList.length.toLocaleString()} حاجة</p>
            </div>
            ` : ''}
          </div>
        </div>
        ` : ''}

        <div class="report-footer">
          <div class="footer-content">
            <div class="footer-left">
              <p class="footer-title">تم إنشاء هذا التقرير بواسطة نظام إدارة العيادة</p>
              <p class="generated-info">تاريخ الإنشاء: ${(() => {
                // Format date as DD/MM/YYYY (Gregorian calendar)
                const date = new Date()
                const day = date.getDate().toString().padStart(2, '0')
                const month = (date.getMonth() + 1).toString().padStart(2, '0')
                const year = date.getFullYear()
                const time = date.toLocaleTimeString('ar-SA', {
                  hour: '2-digit',
                  minute: '2-digit'
                })
                return `${day}/${month}/${year} - ${time}`
              })()} | ${settings?.clinic_name || 'عيادة الأسنان'}</p>
              ${data.filterInfo ? `<p class="filter-info">📊 ${data.filterInfo}</p>` : ''}
            </div>
            <div class="footer-right">
              <div class="footer-stats">
                <span class="stat-item">🏥 ${data.totalNeeds?.toLocaleString() || '0'} حاجة</span>
                <span class="stat-item">✅ ${data.receivedCount?.toLocaleString() || '0'} مستلمة</span>
                <span class="stat-item">⏳ ${data.pendingCount?.toLocaleString() || '0'} آجلة</span>
                <span class="stat-item">💰 ${formatCurrencySafe(data.totalCost)} إجمالي</span>
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  }

  // Create enhanced HTML report for clinic expenses
  static createEnhancedExpenseReportHTML(data: ExpenseReportData, settings?: ClinicSettings | null): string {
    const header = PdfService.getEnhancedHeader('تقرير المصروفات', settings, 'تقرير شامل عن مصروفات العيادة')
    const styles = PdfService.getEnhancedStyles()

    const formatCurrencySafe = (amount: number) => {
      const convertedAmount = convertCurrency(amount || 0, 'USD', settings?.currency || 'USD')
      return formatCurrency(convertedAmount, settings?.currency || 'USD', false)
    }

    const formatDateSafe = (dateString: string) => {
      try {
        const date = new Date(dateString)
        if (isNaN(date.getTime())) return 'غير محدد'
        return date.toLocaleDateString('ar-SA')
      } catch (error) {
        return 'غير محدد'
      }
    }

    return `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>تقرير المصروفات - ${settings?.clinic_name || 'عيادة الأسنان'}</title>
        ${styles}
      </head>
      <body>
        ${header}

        <!-- Summary Cards with Enhanced Design -->
        <div class="summary-cards">
          <div class="summary-card primary">
            <div class="card-icon">💸</div>
            <div class="card-content">
              <h3>إجمالي المصروفات</h3>
              <div class="number">${formatCurrencySafe(data.totalExpenses)}</div>
            </div>
          </div>
          <div class="summary-card success">
            <div class="card-icon">✅</div>
            <div class="card-content">
              <h3>مصروفات مدفوعة</h3>
              <div class="number">${data.paidExpenses.toLocaleString()}</div>
            </div>
          </div>
          <div class="summary-card warning">
            <div class="card-icon">⏳</div>
            <div class="card-content">
              <h3>مصروفات آجلة</h3>
              <div class="number warning">${data.pendingExpenses.toLocaleString()}</div>
            </div>
          </div>
          <div class="summary-card info">
            <div class="card-icon">📊</div>
            <div class="card-content">
              <h3>عدد المصروفات</h3>
              <div class="number">${data.dataCount.toLocaleString()}</div>
            </div>
          </div>
        </div>

        <!-- Expense List Section -->
        ${data.expensesList && data.expensesList.length > 0 ? `
        <div class="section">
          <div class="section-title">
            <span class="section-icon">📋</span>
            قائمة المصروفات
          </div>
          <div class="section-content">
            <div class="data-table-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>اسم المصروف</th>
                    <th>النوع</th>
                    <th>المبلغ</th>
                    <th>تاريخ الدفع</th>
                    <th>طريقة الدفع</th>
                    <th>المورد</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.expensesList.slice(0, 50).map((expense: any, _index: number) => `
                    <tr>
                      <td>${expense.expense_name || 'غير محدد'}</td>
                      <td>${expense.expense_type || 'غير محدد'}</td>
                      <td>${formatCurrencySafe(expense.amount || 0)}</td>
                      <td>${formatDateSafe(expense.payment_date)}</td>
                      <td>${expense.payment_method || 'غير محدد'}</td>
                      <td>${expense.vendor || 'غير محدد'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            ${data.expensesList.length > 50 ? `
            <div class="pagination-info">
              <p>عرض أول 50 مصروف من إجمالي ${data.expensesList.length.toLocaleString()} مصروف</p>
            </div>
            ` : ''}
          </div>
        </div>
        ` : ''}

        <div class="report-footer">
          <div class="footer-content">
            <div class="footer-left">
              <p class="footer-title">تم إنشاء هذا التقرير بواسطة نظام إدارة العيادة</p>
              <p class="generated-info">تاريخ الإنشاء: ${(() => {
                // Format date as DD/MM/YYYY (Gregorian calendar)
                const date = new Date()
                const day = date.getDate().toString().padStart(2, '0')
                const month = (date.getMonth() + 1).toString().padStart(2, '0')
                const year = date.getFullYear()
                const time = date.toLocaleTimeString('ar-SA', {
                  hour: '2-digit',
                  minute: '2-digit'
                })
                return `${day}/${month}/${year} - ${time}`
              })()} | ${settings?.clinic_name || 'عيادة الأسنان'}</p>
              ${data.filterInfo ? `<p class="filter-info">📊 ${data.filterInfo}</p>` : ''}
            </div>
            <div class="footer-right">
              <div class="footer-stats">
                <span class="stat-item">💸 ${formatCurrencySafe(data.totalExpenses)} إجمالي</span>
                <span class="stat-item">✅ ${data.paidExpenses?.toLocaleString() || '0'} مدفوع</span>
                <span class="stat-item">⏳ ${data.pendingExpenses?.toLocaleString() || '0'} آجل</span>
                <span class="stat-item">📊 ${data.dataCount?.toLocaleString() || '0'} مصروف</span>
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  }

  // Export clinic needs report to PDF
  static async exportClinicNeedsReport(data: ClinicNeedsReportData, settings: ClinicSettings | null, options?: { fileName?: string }): Promise<void> {
    if (!data || data.totalNeeds === 0) {
      window.api.sendNotification('لا توجد بيانات لتصديرها.', 'error')
      return
    }
    const htmlContent = this.createEnhancedClinicNeedsReportHTML(data, settings)
    const defaultFileName = `ClinicNeedsReport-${new Date().toLocaleDateString('en-CA')}.pdf`
    const fileName = options?.fileName || defaultFileName

    try {
      await window.api.exportPdf({ html: htmlContent, fileName: fileName })
      window.api.sendNotification('تم تصدير تقرير احتياجات العيادة بنجاح', 'success')
    } catch (error) {
      console.error('Failed to export clinic needs report:', error)
      window.api.sendNotification('فشل تصدير تقرير احتياجات العيادة.', 'error')
    }
  }
}
