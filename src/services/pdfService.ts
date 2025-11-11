import {
  PatientReportData,
  AppointmentReportData,
  FinancialReportData,
  InventoryReportData,
  ClinicSettings,
  LabReportData,
  ClinicNeedsReportData,
  ExpenseReportData
} from '../types'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { EnhancedPdfReports } from './enhancedPdfReports'
import { getTreatmentNameInArabic, getCategoryNameInArabic, getStatusLabelInArabic, getPaymentStatusInArabic, getPriorityLabelInArabic, getClinicNeedStatusInArabic } from '@/utils/arabicTranslations'
import { getPDFWorker, PDFProcessingWorker } from './pdfWorker'
import {
  formatCurrency,
  formatCurrencyWithConfig,
  convertCurrency,
  getCurrencyConfig,
  getDefaultCurrency,
  setDefaultCurrency
} from '../lib/utils'

export class PdfService {
  // Enhanced color scheme optimized for print clarity with modern design
  private static readonly COLORS = {
    primary: '#1e40af',      // Professional blue for better print contrast
    secondary: '#3b82f6',    // Vibrant blue for accents
    accent: '#f59e0b',       // Warm amber for highlights
    success: '#059669',      // Professional green for positive elements
    warning: '#d97706',      // Warm orange for warnings
    danger: '#dc2626',       // Clear red for alerts
    info: '#0891b2',         // Professional cyan for information
    muted: '#6b7280',        // Improved gray for readability
    light: '#f8fafc',        // Clean light background
    white: '#ffffff',
    border: '#e5e7eb',       // Subtle borders for clean look
    surface: '#f1f5f9',      // Surface background for cards
    shadow: 'rgba(0,0,0,0.08)', // Soft shadows for depth
    text: {
      primary: '#0f172a',    // Rich black for maximum readability
      secondary: '#475569',  // Professional dark gray
      muted: '#64748b',      // Soft gray for secondary text
      accent: '#1e40af'      // Professional blue for emphasis
    },
    gradients: {
      primary: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
      success: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
      accent: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
      card: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
      header: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)'
    }
  }

  // Enhanced typography settings with improved readability
  private static readonly TYPOGRAPHY = {
    fonts: {
      primary: "'Tajawal', 'Cairo', 'Amiri', 'Noto Sans Arabic', 'Arial', sans-serif",
      secondary: "'Tajawal', 'Cairo', 'Amiri', 'Noto Sans Arabic', 'Arial', sans-serif",
      heading: "'Tajawal', 'Cairo', 'Amiri', 'Noto Sans Arabic', 'Arial', sans-serif",
      monospace: "'Courier New', monospace"
    },
    sizes: {
      h1: '32px',
      h2: '26px',
      h3: '22px',
      h4: '20px',
      h5: '18px',
      h6: '16px',
      body: '15px',
      small: '13px',
      tiny: '11px',
      micro: '9px'
    },
    weights: {
      light: '300',
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800'
    },
    lineHeights: {
      tight: '1.25',
      normal: '1.5',
      relaxed: '1.75',
      loose: '2'
    },
    letterSpacing: {
      tight: '-0.025em',
      normal: '0',
      wide: '0.025em'
    }
  }

  // Enhanced layout settings with improved spacing and visual hierarchy
  private static readonly LAYOUT = {
    margins: {
      top: '50px',
      bottom: '50px',
      left: '35px',
      right: '35px'
    },
    spacing: {
      section: '40px',
      subsection: '25px',
      card: '24px',
      element: '18px',
      small: '12px',
      tiny: '8px'
    },
    borderRadius: {
      small: '6px',
      medium: '10px',
      large: '16px',
      xl: '20px'
    },
    shadows: {
      card: '0 6px 24px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.04)',
      header: '0 4px 16px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.06)',
      elevation: '0 12px 32px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.06)',
      inset: 'inset 0 2px 4px rgba(0,0,0,0.06)'
    },
    borderWidth: {
      thin: '1px',
      medium: '2px',
      thick: '3px'
    }
  }

  // Public methods to access private functions from external files
  static getEnhancedHeader(title: string, settings?: ClinicSettings | null, subtitle?: string): string {
    return this.createEnhancedHeader(title, settings, subtitle)
  }

  static getEnhancedStyles(): string {
    return this.createEnhancedStyles()
  }

  // Create enhanced header with clinic information
  private static createEnhancedHeader(
    title: string,
    settings?: ClinicSettings | null,
    subtitle?: string
  ): string {
    const clinicName = `عيادة الأسنان${settings?.clinic_name && settings.clinic_name.trim() !== '' ? ' - ' + settings.clinic_name : ''}`
    const doctorName = settings?.doctor_name || 'د. محمد أحمد'
    const clinicAddress = settings?.clinic_address || ''
    const clinicPhone = settings?.clinic_phone || ''
    const clinicLogo = settings?.clinic_logo || ''



    // Format date as DD/MM/YYYY (Gregorian calendar)
    const currentDate = (() => {
      const date = new Date()
      const day = date.getDate().toString().padStart(2, '0')
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      const year = date.getFullYear()
      return `${day}/${month}/${year}`
    })()

    return `
      <div class="enhanced-header">
        <div class="header-content">
          <div class="clinic-info">
            ${clinicLogo && clinicLogo.trim() !== '' ? `
              <div class="clinic-logo">
                <img src="${clinicLogo}" alt="شعار العيادة" />
              </div>
            ` : ''}
            <div class="clinic-details">
              <h1 class="clinic-name">${clinicName}</h1>
              ${doctorName ? `<h2 class="doctor-name">${doctorName}</h2>` : ''}
              ${clinicAddress ? `<p class="clinic-address">${clinicAddress}</p>` : ''}
              ${clinicPhone ? `<p class="clinic-phone">📞 ${clinicPhone}</p>` : ''}
            </div>
          </div>

          <div class="report-info">
            <h3 class="report-title">${title}</h3>
            ${subtitle ? `<p class="report-subtitle">${subtitle}</p>` : ''}
            <p class="report-date">📅 ${this.formatGregorianDate(new Date())}</p>
            <p class="report-time">🕐 ${new Date().toLocaleTimeString('ar-SA', {
              hour: '2-digit',
              minute: '2-digit'
            })}</p>
          </div>
        </div>

        <div class="header-decoration"></div>
      </div>
    `
  }

  // Create enhanced CSS styles for professional reports
  private static createEnhancedStyles(): string {
    return `
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&family=Cairo:wght@400;600;700&family=Amiri:wght@400;700&family=Noto+Sans+Arabic:wght@400;500;700&display=swap" rel="stylesheet">
      <style>
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        body {
           font-family: ${this.TYPOGRAPHY.fonts.primary};
           direction: rtl;
           line-height: ${this.TYPOGRAPHY.lineHeights.normal};
           color: ${this.COLORS.text.primary};
           background: linear-gradient(135deg, ${this.COLORS.light} 0%, ${this.COLORS.white} 100%);
           margin: ${this.LAYOUT.margins.top} ${this.LAYOUT.margins.right} ${this.LAYOUT.margins.bottom} ${this.LAYOUT.margins.left};
           font-size: ${this.TYPOGRAPHY.sizes.body};
           font-weight: ${this.TYPOGRAPHY.weights.normal};
           letter-spacing: ${this.TYPOGRAPHY.letterSpacing.normal};
           -webkit-font-smoothing: antialiased;
           -moz-osx-font-smoothing: grayscale;
           text-rendering: optimizeLegibility;
        }

        /* Enhanced Header Styles */
        .enhanced-header {
           background: ${this.COLORS.gradients.header};
           color: ${this.COLORS.white};
           padding: ${this.LAYOUT.spacing.card} ${this.LAYOUT.spacing.element};
           border-radius: ${this.LAYOUT.borderRadius.large};
           margin-bottom: ${this.LAYOUT.spacing.section};
           box-shadow: ${this.LAYOUT.shadows.header};
           position: relative;
           overflow: hidden;
           border: ${this.LAYOUT.borderWidth.thin} solid rgba(255,255,255,0.1);
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          position: relative;
          z-index: 2;
        }

        .clinic-info {
          display: flex;
          align-items: center;
          gap: ${this.LAYOUT.spacing.element};
        }

        .clinic-logo {
          width: 70px;
          height: 70px;
          border-radius: 50%;
          overflow: hidden;
          background: ${this.COLORS.white};
          padding: 4px;
          box-shadow: 0 3px 10px rgba(0,0,0,0.15);
          border: 2px solid rgba(255,255,255,0.8);
          flex-shrink: 0;
        }

        .clinic-logo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 50%;
          max-width: 70px;
          max-height: 70px;
        }

        .clinic-details h1.clinic-name {
          font-size: ${this.TYPOGRAPHY.sizes.h2};
          font-weight: ${this.TYPOGRAPHY.weights.bold};
          margin-bottom: 5px;
          text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }

        .clinic-details h2.doctor-name {
          font-size: ${this.TYPOGRAPHY.sizes.h4};
          font-weight: ${this.TYPOGRAPHY.weights.medium};
          margin-bottom: 8px;
          opacity: 0.95;
        }

        .clinic-details p {
          font-size: ${this.TYPOGRAPHY.sizes.small};
          margin-bottom: 3px;
          opacity: 0.9;
        }

        .report-info {
          text-align: left;
          direction: ltr;
        }

        .report-info h3.report-title {
          font-size: ${this.TYPOGRAPHY.sizes.h3};
          font-weight: ${this.TYPOGRAPHY.weights.bold};
          margin-bottom: 8px;
          text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }

        .report-info p {
          font-size: ${this.TYPOGRAPHY.sizes.small};
          margin-bottom: 3px;
          opacity: 0.9;
        }

        .header-decoration {
          position: absolute;
          top: -50%;
          right: -10%;
          width: 200px;
          height: 200px;
          background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
          border-radius: 50%;
        }

        /* Enhanced Card Styles */
        .summary-cards {
           display: grid;
           grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
           gap: ${this.LAYOUT.spacing.element};
           margin: ${this.LAYOUT.spacing.section} 0;
        }

        .summary-card {
           background: ${this.COLORS.gradients.card};
           border: ${this.LAYOUT.borderWidth.medium} solid ${this.COLORS.border};
           border-radius: ${this.LAYOUT.borderRadius.medium};
           padding: ${this.LAYOUT.spacing.card};
           box-shadow: ${this.LAYOUT.shadows.card};
           transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
           position: relative;
           overflow: hidden;
           display: flex;
           align-items: center;
           gap: ${this.LAYOUT.spacing.element};
           backdrop-filter: blur(10px);
           border-bottom: ${this.LAYOUT.borderWidth.medium} solid ${this.COLORS.primary};
        }

        .summary-card.primary::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          bottom: 0;
          width: 6px;
          background: ${this.COLORS.primary};
        }

        .summary-card.success::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          bottom: 0;
          width: 6px;
          background: ${this.COLORS.success};
        }

        .summary-card.info::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          bottom: 0;
          width: 6px;
          background: #1e40af;
        }

        .summary-card.warning::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          bottom: 0;
          width: 6px;
          background: ${this.COLORS.warning};
        }

        .card-icon {
           font-size: 36px;
           min-width: 60px;
           height: 60px;
           display: flex;
           align-items: center;
           justify-content: center;
           background: linear-gradient(135deg, ${this.COLORS.white} 0%, ${this.COLORS.surface} 100%);
           border-radius: ${this.LAYOUT.borderRadius.large};
           flex-shrink: 0;
           box-shadow: ${this.LAYOUT.shadows.inset};
           border: ${this.LAYOUT.borderWidth.medium} solid ${this.COLORS.border};
           position: relative;
           overflow: hidden;
        }

        .card-icon::before {
           content: '';
           position: absolute;
           top: -50%;
           left: -50%;
           width: 200%;
           height: 200%;
           background: radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%);
           animation: pulse 3s ease-in-out infinite;
        }

        @keyframes pulse {
           0%, 100% { transform: scale(1); opacity: 0.7; }
           50% { transform: scale(1.1); opacity: 1; }
        }

        .card-content {
          flex: 1;
          text-align: right;
        }

        .summary-card h3 {
          font-size: ${this.TYPOGRAPHY.sizes.h5};
          font-weight: ${this.TYPOGRAPHY.weights.semibold};
          color: ${this.COLORS.text.secondary};
          margin-bottom: ${this.LAYOUT.spacing.small};
        }

        .summary-card .number {
           font-size: ${this.TYPOGRAPHY.sizes.h1};
           font-weight: ${this.TYPOGRAPHY.weights.extrabold};
           color: ${this.COLORS.primary};
           margin-bottom: ${this.LAYOUT.spacing.tiny};
           text-shadow: 0 2px 4px rgba(0,0,0,0.1);
           font-family: ${this.TYPOGRAPHY.fonts.monospace};
           letter-spacing: ${this.TYPOGRAPHY.letterSpacing.tight};
           position: relative;
        }

        .summary-card .number::after {
           content: '';
           position: absolute;
           bottom: -2px;
           left: 0;
           right: 0;
           height: 3px;
           background: linear-gradient(90deg, ${this.COLORS.primary}, ${this.COLORS.secondary});
           border-radius: ${this.LAYOUT.borderRadius.small};
        }

        .summary-card .currency {
          color: ${this.COLORS.success};
        }

        .summary-card .warning {
          color: ${this.COLORS.warning};
        }

        .summary-card .danger {
          color: ${this.COLORS.danger};
        }

        /* Enhanced Section Styles */
        .section {
           margin: ${this.LAYOUT.spacing.section} 0;
           background: ${this.COLORS.white};
           border-radius: ${this.LAYOUT.borderRadius.large};
           overflow: hidden;
           box-shadow: ${this.LAYOUT.shadows.elevation};
           border: ${this.LAYOUT.borderWidth.thin} solid ${this.COLORS.border};
           page-break-inside: avoid !important;
           break-inside: avoid !important;
           position: relative;
        }

        .section-title {
           font-size: ${this.TYPOGRAPHY.sizes.h4};
           font-weight: ${this.TYPOGRAPHY.weights.bold};
           color: ${this.COLORS.text.primary};
           margin-bottom: ${this.LAYOUT.spacing.element};
           padding: ${this.LAYOUT.spacing.element} ${this.LAYOUT.spacing.card};
           background: ${this.COLORS.gradients.primary};
           color: ${this.COLORS.white};
           border-bottom: ${this.LAYOUT.borderWidth.medium} solid rgba(255,255,255,0.2);
           position: relative;
           display: flex;
           align-items: center;
           gap: ${this.LAYOUT.spacing.small};
           page-break-after: avoid !important;
           break-after: avoid !important;
           page-break-inside: avoid !important;
           break-inside: avoid !important;
           text-shadow: 0 1px 2px rgba(0,0,0,0.2);
           letter-spacing: ${this.TYPOGRAPHY.letterSpacing.wide};
        }

        .section-title::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 4px;
          background: ${this.COLORS.primary};
        }

        .section-icon {
          font-size: 20px;
        }

        .section-content {
          padding: ${this.LAYOUT.spacing.card};
        }

        /* Patient Cards Grid */
        .patients-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
          margin: 20px 0;
        }

        .patient-card {
          background: ${this.COLORS.white};
          border: 2px solid ${this.COLORS.border};
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          transition: all 0.3s ease;
        }

        .patient-card:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 6px rgba(0,0,0,0.15);
          border-color: ${this.COLORS.primary};
        }

        .patient-header {
          display: flex;
          align-items: center;
          gap: 15px;
          margin-bottom: 15px;
          padding-bottom: 15px;
          border-bottom: 1px solid ${this.COLORS.border};
        }

        .patient-avatar {
          width: 50px;
          height: 50px;
          background: ${this.COLORS.primary};
          color: ${this.COLORS.white};
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          font-weight: bold;
          flex-shrink: 0;
        }

        .patient-info {
          flex: 1;
        }

        .patient-name {
          font-size: 16px;
          font-weight: bold;
          color: ${this.COLORS.text.primary};
          margin: 0 0 5px 0;
        }

        .patient-serial {
          font-size: 12px;
          color: ${this.COLORS.text.muted};
          background: ${this.COLORS.light};
          padding: 2px 8px;
          border-radius: 12px;
          display: inline-block;
        }

        .patient-details {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .detail-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
        }

        .detail-label {
          font-size: 12px;
          color: ${this.COLORS.text.muted};
          font-weight: medium;
        }

        .detail-value {
          font-size: 12px;
          color: ${this.COLORS.text.primary};
          font-weight: bold;
        }

        .status-active {
          color: ${this.COLORS.success};
        }

        .pagination-info {
           text-align: center;
           padding: ${this.LAYOUT.spacing.card};
           background: linear-gradient(135deg, ${this.COLORS.light} 0%, ${this.COLORS.surface} 100%);
           border-radius: ${this.LAYOUT.borderRadius.large};
           margin-top: ${this.LAYOUT.spacing.element};
           border: ${this.LAYOUT.borderWidth.medium} solid ${this.COLORS.border};
           box-shadow: ${this.LAYOUT.shadows.card};
         }

         .pagination-info p {
           color: ${this.COLORS.text.secondary};
           font-size: ${this.TYPOGRAPHY.sizes.body};
           margin: 0;
           font-weight: ${this.TYPOGRAPHY.weights.medium};
         }

        /* Data Quality Indicators */
        .data-quality-indicator {
           display: inline-flex;
           align-items: center;
           gap: ${this.LAYOUT.spacing.tiny};
           padding: ${this.LAYOUT.spacing.tiny} ${this.LAYOUT.spacing.small};
           background: ${this.COLORS.surface};
           border-radius: ${this.LAYOUT.borderRadius.medium};
           border: ${this.LAYOUT.borderWidth.thin} solid ${this.COLORS.border};
           font-size: ${this.TYPOGRAPHY.sizes.micro};
           font-weight: ${this.TYPOGRAPHY.weights.bold};
           color: ${this.COLORS.text.secondary};
           margin: 0 ${this.LAYOUT.spacing.tiny};
        }

        .accuracy-badge {
           display: inline-flex;
           align-items: center;
           gap: ${this.LAYOUT.spacing.tiny};
           padding: ${this.LAYOUT.spacing.tiny} ${this.LAYOUT.spacing.small};
           border-radius: ${this.LAYOUT.borderRadius.small};
           font-size: ${this.TYPOGRAPHY.sizes.micro};
           font-weight: ${this.TYPOGRAPHY.weights.bold};
           text-transform: uppercase;
           letter-spacing: ${this.TYPOGRAPHY.letterSpacing.wide};
        }

        .accuracy-badge.verified {
           background: linear-gradient(135deg, ${this.COLORS.success}, rgba(16, 185, 129, 0.8));
           color: ${this.COLORS.white};
        }

        .accuracy-badge.pending {
           background: linear-gradient(135deg, ${this.COLORS.warning}, rgba(245, 158, 11, 0.8));
           color: ${this.COLORS.white};
        }

        /* KPI Cards */
        .kpi-card {
           background: linear-gradient(135deg, ${this.COLORS.white} 0%, ${this.COLORS.surface} 100%);
           border: ${this.LAYOUT.borderWidth.medium} solid ${this.COLORS.border};
           border-radius: ${this.LAYOUT.borderRadius.large};
           padding: ${this.LAYOUT.spacing.card};
           text-align: center;
           box-shadow: ${this.LAYOUT.shadows.card};
           transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
           position: relative;
           overflow: hidden;
        }

        .kpi-card::before {
           content: '';
           position: absolute;
           top: 0;
           left: 0;
           right: 0;
           height: 4px;
           background: ${this.COLORS.gradients.primary};
        }

        .kpi-value {
           font-size: ${this.TYPOGRAPHY.sizes.h2};
           font-weight: ${this.TYPOGRAPHY.weights.extrabold};
           color: ${this.COLORS.primary};
           margin-bottom: ${this.LAYOUT.spacing.tiny};
           font-family: ${this.TYPOGRAPHY.fonts.monospace};
        }

        .kpi-label {
           font-size: ${this.TYPOGRAPHY.sizes.small};
           color: ${this.COLORS.text.secondary};
           font-weight: ${this.TYPOGRAPHY.weights.medium};
           text-transform: uppercase;
           letter-spacing: ${this.TYPOGRAPHY.letterSpacing.wide};
        }

        .kpi-trend {
           display: inline-flex;
           align-items: center;
           gap: ${this.LAYOUT.spacing.tiny};
           font-size: ${this.TYPOGRAPHY.sizes.tiny};
           font-weight: ${this.TYPOGRAPHY.weights.bold};
           margin-top: ${this.LAYOUT.spacing.tiny};
        }

        .kpi-trend.positive {
           color: ${this.COLORS.success};
        }

        .kpi-trend.negative {
           color: ${this.COLORS.danger};
        }

        /* Appointment Cards Grid */
        .appointments-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
          margin: 20px 0;
        }

        .appointment-card {
          background: ${this.COLORS.white};
          border: 2px solid ${this.COLORS.border};
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          transition: all 0.3s ease;
        }

        .appointment-card:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 6px rgba(0,0,0,0.15);
          border-color: ${this.COLORS.accent};
        }

        .appointment-header {
          display: flex;
          align-items: center;
          gap: 15px;
          margin-bottom: 15px;
          padding-bottom: 15px;
          border-bottom: 1px solid ${this.COLORS.border};
        }

        .appointment-avatar {
          width: 50px;
          height: 50px;
          background: linear-gradient(135deg, ${this.COLORS.accent}, ${this.COLORS.warning});
          color: ${this.COLORS.white};
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          font-weight: bold;
          flex-shrink: 0;
        }

        .appointment-info {
          flex: 1;
        }

        .appointment-patient {
          font-size: 16px;
          font-weight: bold;
          color: ${this.COLORS.text.primary};
          margin: 0 0 5px 0;
        }

        .appointment-serial {
          font-size: 12px;
          color: ${this.COLORS.text.muted};
          background: ${this.COLORS.light};
          padding: 2px 8px;
          border-radius: 12px;
          display: inline-block;
        }

        .appointment-details {
          display: grid;
          grid-template-columns: 1fr;
          gap: 8px;
        }

        .status-completed {
          color: ${this.COLORS.success};
          background: rgba(6, 95, 70, 0.1);
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 11px;
          display: inline-block;
        }

        .status-cancelled {
          color: ${this.COLORS.warning};
          background: rgba(146, 64, 14, 0.1);
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 11px;
          display: inline-block;
        }

        .status-no-show {
          color: ${this.COLORS.danger};
          background: rgba(153, 27, 27, 0.1);
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 11px;
          display: inline-block;
        }

        .status-scheduled {
          color: ${this.COLORS.primary};
          background: rgba(26, 54, 93, 0.1);
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 11px;
          display: inline-block;
        }

        .status-unknown {
          color: ${this.COLORS.text.muted};
          background: rgba(75, 85, 99, 0.1);
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 11px;
          display: inline-block;
        }

        /* Enhanced Table Styles */
        table {
           width: 100%;
           border-collapse: separate;
           border-spacing: 0;
           margin: ${this.LAYOUT.spacing.element} 0;
           background: ${this.COLORS.white};
           border-radius: ${this.LAYOUT.borderRadius.medium};
           overflow: hidden;
           box-shadow: ${this.LAYOUT.shadows.card};
           border: ${this.LAYOUT.borderWidth.thin} solid ${this.COLORS.border};
        }

        th {
           background: ${this.COLORS.gradients.primary};
           color: ${this.COLORS.white};
           font-weight: ${this.TYPOGRAPHY.weights.bold};
           font-size: ${this.TYPOGRAPHY.sizes.small};
           padding: ${this.LAYOUT.spacing.element} ${this.LAYOUT.spacing.small};
           text-align: center;
           border: none;
           text-shadow: 0 1px 3px rgba(0,0,0,0.3);
           letter-spacing: ${this.TYPOGRAPHY.letterSpacing.normal};
           position: relative;
        }

        th::after {
           content: '';
           position: absolute;
           bottom: 0;
           left: 0;
           right: 0;
           height: 2px;
           background: rgba(255,255,255,0.3);
        }

        td {
           padding: ${this.LAYOUT.spacing.element} ${this.LAYOUT.spacing.small};
           text-align: center;
           border-bottom: ${this.LAYOUT.borderWidth.thin} solid ${this.COLORS.border};
           font-size: ${this.TYPOGRAPHY.sizes.body};
           color: ${this.COLORS.text.primary};
           font-weight: ${this.TYPOGRAPHY.weights.medium};
           line-height: ${this.TYPOGRAPHY.lineHeights.normal};
        }

        tr:nth-child(even) {
          background: ${this.COLORS.light};
        }

        tr:hover {
          background: rgba(14, 165, 233, 0.05);
        }

        /* Enhanced Footer */
        .report-footer {
          margin-top: ${this.LAYOUT.spacing.section};
          padding: ${this.LAYOUT.spacing.card};
          background: ${this.COLORS.light};
          border-radius: ${this.LAYOUT.borderRadius};
          text-align: center;
          border-top: 3px solid ${this.COLORS.primary};
        }

        .report-footer p {
          font-size: ${this.TYPOGRAPHY.sizes.small};
          color: ${this.COLORS.text.secondary};
          margin-bottom: 5px;
        }

        .report-footer .generated-info {
          font-size: ${this.TYPOGRAPHY.sizes.tiny};
          color: ${this.COLORS.text.muted};
          font-style: italic;
        }

        /* Enhanced Data Table Styles */
        .data-table {
          width: 100%;
          border-collapse: collapse;
          margin: ${this.LAYOUT.spacing.element} 0;
          background: ${this.COLORS.white};
          border-radius: ${this.LAYOUT.borderRadius};
          overflow: visible;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          page-break-before: auto;
          page-break-after: auto;
          display: table !important;
        }

        .data-table th {
          background: ${this.COLORS.primary};
          color: ${this.COLORS.white};
          font-weight: ${this.TYPOGRAPHY.weights.bold};
          padding: ${this.LAYOUT.spacing.element};
          text-align: center;
          font-size: ${this.TYPOGRAPHY.sizes.body};
          border: 2px solid ${this.COLORS.border};
          border-bottom: 3px solid ${this.COLORS.secondary};
        }

        .data-table td {
          padding: ${this.LAYOUT.spacing.element};
          text-align: center;
          border: 1px solid ${this.COLORS.border};
          font-size: ${this.TYPOGRAPHY.sizes.body};
          color: ${this.COLORS.text.primary};
          font-weight: ${this.TYPOGRAPHY.weights.medium};
          page-break-inside: avoid;
          break-inside: avoid;
        }

        .data-table tr {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          page-break-before: avoid !important;
          page-break-after: avoid !important;
          display: table-row !important;
        }

        .data-table thead {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          page-break-after: avoid !important;
          display: table-header-group !important;
        }

        .data-table tbody {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          display: table-row-group !important;
        }

        .data-table tr:nth-child(even) {
          background: ${this.COLORS.light};
        }

        .data-table tr:nth-child(odd) {
          background: ${this.COLORS.white};
        }

        .data-table tr:hover {
          background: #e2e8f0;
        }

        .category-cell {
           text-align: right !important;
           font-weight: ${this.TYPOGRAPHY.weights.semibold};
           color: ${this.COLORS.text.primary};
           background: ${this.COLORS.surface};
           border-left: ${this.LAYOUT.borderWidth.medium} solid ${this.COLORS.primary};
           padding-left: ${this.LAYOUT.spacing.small} !important;
        }

        .number-cell {
           font-weight: ${this.TYPOGRAPHY.weights.bold};
           color: ${this.COLORS.primary};
           font-size: ${this.TYPOGRAPHY.sizes.small};
           background: linear-gradient(135deg, rgba(30, 64, 175, 0.05) 0%, rgba(59, 130, 246, 0.05) 100%);
           border-radius: ${this.LAYOUT.borderRadius.small};
           margin: 0 ${this.LAYOUT.spacing.tiny};
        }

        .percentage-cell {
           font-weight: ${this.TYPOGRAPHY.weights.semibold};
           color: ${this.COLORS.info};
           background: linear-gradient(135deg, rgba(8, 145, 178, 0.1) 0%, rgba(8, 145, 178, 0.05) 100%);
           border-radius: ${this.LAYOUT.borderRadius.small};
           padding: ${this.LAYOUT.spacing.tiny} ${this.LAYOUT.spacing.small} !important;
           margin: 0 ${this.LAYOUT.spacing.tiny};
        }

        .currency-cell {
           font-weight: ${this.TYPOGRAPHY.weights.extrabold};
           color: ${this.COLORS.success};
           background: linear-gradient(135deg, rgba(5, 150, 105, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%);
           border-radius: ${this.LAYOUT.borderRadius.small};
           padding: ${this.LAYOUT.spacing.tiny} ${this.LAYOUT.spacing.small} !important;
           margin: 0 ${this.LAYOUT.spacing.tiny};
           font-family: ${this.TYPOGRAPHY.fonts.monospace};
           letter-spacing: ${this.TYPOGRAPHY.letterSpacing.tight};
        }

        .status-cell {
           padding: ${this.LAYOUT.spacing.tiny} !important;
        }

        .status-badge {
           display: inline-block;
           padding: ${this.LAYOUT.spacing.tiny} ${this.LAYOUT.spacing.small};
           border-radius: ${this.LAYOUT.borderRadius.small};
           font-size: ${this.TYPOGRAPHY.sizes.micro};
           font-weight: ${this.TYPOGRAPHY.weights.bold};
           text-transform: uppercase;
           letter-spacing: ${this.TYPOGRAPHY.letterSpacing.wide};
           border: ${this.LAYOUT.borderWidth.thin} solid transparent;
        }

        .status-badge.success {
           background: linear-gradient(135deg, ${this.COLORS.success}, rgba(16, 185, 129, 0.8));
           color: ${this.COLORS.white};
           border-color: rgba(16, 185, 129, 0.3);
        }

        .status-badge.warning {
           background: linear-gradient(135deg, ${this.COLORS.warning}, rgba(245, 158, 11, 0.8));
           color: ${this.COLORS.white};
           border-color: rgba(245, 158, 11, 0.3);
        }

        .status-badge.danger {
           background: linear-gradient(135deg, ${this.COLORS.danger}, rgba(239, 68, 68, 0.8));
           color: ${this.COLORS.white};
           border-color: rgba(239, 68, 68, 0.3);
        }

        .status-badge.info {
           background: linear-gradient(135deg, ${this.COLORS.info}, rgba(8, 145, 178, 0.8));
           color: ${this.COLORS.white};
           border-color: rgba(8, 145, 178, 0.3);
        }

        .chart-cell {
          width: 150px;
          padding: 8px !important;
        }

        .progress-bar {
           width: 100%;
           height: 24px;
           background: linear-gradient(135deg, ${this.COLORS.light} 0%, ${this.COLORS.surface} 100%);
           border: ${this.LAYOUT.borderWidth.medium} solid ${this.COLORS.border};
           border-radius: ${this.LAYOUT.borderRadius.medium};
           overflow: hidden;
           position: relative;
           box-shadow: ${this.LAYOUT.shadows.inset};
        }

        .progress-fill {
           height: 100%;
           background: ${this.COLORS.gradients.primary};
           border-radius: ${this.LAYOUT.borderRadius.small};
           transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
           position: relative;
           border: ${this.LAYOUT.borderWidth.thin} solid rgba(255,255,255,0.3);
           box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }

        .progress-fill::after {
           content: '';
           position: absolute;
           top: 0;
           left: 0;
           right: 0;
           bottom: 0;
           background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%);
           animation: shimmer 2s infinite;
        }

        @keyframes shimmer {
           0% { transform: translateX(-100%); }
           100% { transform: translateX(100%); }
        }

        .progress-fill.gender-male {
          background: #1e40af;
          border-color: #1e3a8a;
        }

        .progress-fill.gender-female {
          background: #be185d;
          border-color: #9d174d;
        }

        .progress-fill.trend {
          background: ${this.COLORS.success};
          border-color: #047857;
        }

        .no-data {
          text-align: center !important;
          color: ${this.COLORS.text.muted};
          font-style: italic;
          padding: 30px !important;
        }

        .chart-container {
          background: ${this.COLORS.white};
          border-radius: 8px;
          overflow: hidden;
        }

        /* Enhanced Footer Styles */
        .footer-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
        }

        .footer-left {
          flex: 1;
          text-align: right;
        }

        .footer-right {
          flex-shrink: 0;
        }

        .footer-title {
          margin: 0 0 5px 0;
          color: ${this.COLORS.text.primary};
          font-size: ${this.TYPOGRAPHY.sizes.body};
          font-weight: ${this.TYPOGRAPHY.weights.medium};
        }

        .footer-stats {
          display: flex;
          gap: 15px;
          align-items: center;
        }

        .stat-item {
          background: ${this.COLORS.white};
          padding: 8px 12px;
          border-radius: 20px;
          font-size: ${this.TYPOGRAPHY.sizes.small};
          font-weight: ${this.TYPOGRAPHY.weights.medium};
          color: ${this.COLORS.text.primary};
          border: 1px solid ${this.COLORS.border};
        }

        /* Page Break */
        .page-break {
          page-break-before: always;
          break-before: page;
          height: 0;
          margin: 0;
          padding: 0;
        }

        /* Page Header for New Pages */
        .page-header {
          text-align: center;
          margin: 40px 0 30px 0;
          padding: 30px 20px;
          background: linear-gradient(135deg, ${this.COLORS.light} 0%, ${this.COLORS.white} 100%);
          border-radius: ${this.LAYOUT.borderRadius};
          border: 2px solid ${this.COLORS.border};
          position: relative;
        }

        .page-header::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, ${this.COLORS.primary}, ${this.COLORS.secondary});
          border-radius: ${this.LAYOUT.borderRadius} ${this.LAYOUT.borderRadius} 0 0;
        }

        .page-title {
          font-size: ${this.TYPOGRAPHY.sizes.h2};
          font-weight: ${this.TYPOGRAPHY.weights.bold};
          color: ${this.COLORS.primary};
          margin: 0 0 10px 0;
          text-shadow: 0 1px 2px rgba(0,0,0,0.1);
        }

        .page-subtitle {
          font-size: ${this.TYPOGRAPHY.sizes.body};
          color: ${this.COLORS.text.secondary};
          margin: 0;
          font-style: italic;
        }

        /* Analysis Cards */
        .analysis-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
          margin: 20px 0;
        }

        .analysis-card {
          background: ${this.COLORS.white};
          border: 1px solid ${this.COLORS.border};
          border-left: 4px solid ${this.COLORS.primary};
          border-radius: ${this.LAYOUT.borderRadius};
          padding: 25px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          display: flex;
          align-items: center;
          gap: 20px;
          transition: all 0.3s ease;
        }

        .analysis-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(0,0,0,0.15);
        }

        .analysis-icon {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          flex-shrink: 0;
        }

        .analysis-content {
          flex: 1;
        }

        .analysis-content h3 {
          font-size: ${this.TYPOGRAPHY.sizes.h4};
          font-weight: ${this.TYPOGRAPHY.weights.bold};
          color: ${this.COLORS.text.primary};
          margin: 0 0 15px 0;
        }

        .analysis-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 10px;
        }

        .stat {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .stat-label {
          font-size: ${this.TYPOGRAPHY.sizes.small};
          color: ${this.COLORS.text.muted};
          font-weight: ${this.TYPOGRAPHY.weights.medium};
        }

        .stat-value {
          font-size: ${this.TYPOGRAPHY.sizes.h5};
          font-weight: ${this.TYPOGRAPHY.weights.bold};
          color: ${this.COLORS.primary};
        }

        /* Inventory Specific Styles */
        .inventory-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 20px;
          margin: 20px 0;
        }

        .inventory-card {
          background: ${this.COLORS.white};
          border: 1px solid ${this.COLORS.border};
          border-radius: ${this.LAYOUT.borderRadius};
          padding: 20px;
          box-shadow: ${this.LAYOUT.shadows.card};
          transition: all 0.3s ease;
          break-inside: avoid;
          page-break-inside: avoid;
        }

        .inventory-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 25px rgba(0,0,0,0.12);
        }

        .inventory-header {
          display: flex;
          align-items: center;
          gap: 15px;
          margin-bottom: 15px;
          padding-bottom: 15px;
          border-bottom: 1px solid ${this.COLORS.border};
        }

        .inventory-avatar {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          background: linear-gradient(135deg, ${this.COLORS.primary}, ${this.COLORS.secondary});
          color: ${this.COLORS.white};
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          font-weight: ${this.TYPOGRAPHY.weights.bold};
          text-transform: uppercase;
          flex-shrink: 0;
        }

        .inventory-info {
          flex: 1;
          min-width: 0;
        }

        .inventory-name {
          font-size: ${this.TYPOGRAPHY.sizes.h5};
          font-weight: ${this.TYPOGRAPHY.weights.bold};
          color: ${this.COLORS.text.primary};
          margin: 0 0 5px 0;
          line-height: 1.3;
          word-wrap: break-word;
        }

        .inventory-category {
          font-size: ${this.TYPOGRAPHY.sizes.small};
          color: ${this.COLORS.text.muted};
          background: ${this.COLORS.light};
          padding: 4px 8px;
          border-radius: 12px;
          display: inline-block;
        }

        .inventory-details {
          display: grid;
          gap: 10px;
        }

        .status-warning {
          color: #f59e0b !important;
          font-weight: ${this.TYPOGRAPHY.weights.bold};
        }

        .status-success {
          color: #10b981 !important;
          font-weight: ${this.TYPOGRAPHY.weights.bold};
        }

        .status-danger {
          color: #ef4444 !important;
          font-weight: ${this.TYPOGRAPHY.weights.bold};
        }

        .status-info {
          color: #3b82f6 !important;
          font-weight: ${this.TYPOGRAPHY.weights.bold};
        }

        /* Alert Level Styles */
        .alert-level {
          font-weight: ${this.TYPOGRAPHY.weights.bold};
          text-align: center;
        }

        .status-badge {
          padding: 4px 8px;
          border-radius: 12px;
          font-size: ${this.TYPOGRAPHY.sizes.small};
          font-weight: ${this.TYPOGRAPHY.weights.medium};
          text-align: center;
          display: inline-block;
        }

        .status-badge.critical {
          background: #fef2f2;
          color: #dc2626;
          border: 1px solid #fecaca;
        }

        .status-badge.warning {
          background: #fffbeb;
          color: #d97706;
          border: 1px solid #fed7aa;
        }

        .status-badge.safe {
          background: #f0fdf4;
          color: #16a34a;
          border: 1px solid #bbf7d0;
        }

        /* Expiry Status Styles */
        .days-cell.expired {
          color: #dc2626;
          font-weight: ${this.TYPOGRAPHY.weights.bold};
        }

        .days-cell.expiring {
          color: #d97706;
          font-weight: ${this.TYPOGRAPHY.weights.bold};
        }

        .days-cell.safe {
          color: #16a34a;
          font-weight: ${this.TYPOGRAPHY.weights.bold};
        }

        .quantity-cell.critical {
          color: #dc2626;
          font-weight: ${this.TYPOGRAPHY.weights.bold};
        }

        .quantity-cell.warning {
          color: #d97706;
          font-weight: ${this.TYPOGRAPHY.weights.bold};
        }

        .progress-fill.critical {
          background: linear-gradient(90deg, #dc2626, #ef4444);
        }

        .progress-fill.warning {
          background: linear-gradient(90deg, #d97706, #f59e0b);
        }

        /* Print Optimizations - حماية قوية جداً من انقطاع الجداول */
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          body {
            margin: 0;
            padding: 20px;
            background: white !important;
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
            orphans: 10 !important;
            widows: 10 !important;
          }

          .enhanced-header {
            background: ${this.COLORS.primary} !important;
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
          }

          .summary-card {
            break-inside: avoid;
            page-break-inside: avoid;
            border: 2px solid ${this.COLORS.border} !important;
            box-shadow: none !important;
          }

          .summary-card::before {
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
          }

          .section {
            break-inside: avoid;
            page-break-inside: avoid;
            border: 1px solid ${this.COLORS.border} !important;
            box-shadow: none !important;
          }

          .inventory-card {
            break-inside: avoid;
            page-break-inside: avoid;
            border: 1px solid ${this.COLORS.border} !important;
            box-shadow: none !important;
          }

          .data-table {
            border: 2px solid ${this.COLORS.border} !important;
            box-shadow: none !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            page-break-before: avoid !important;
            page-break-after: avoid !important;
            display: table !important;
            width: 100% !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
            orphans: 10 !important;
            widows: 10 !important;
            margin: 0 !important;
            position: relative !important;
          }

          .data-table thead {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            page-break-after: avoid !important;
            display: table-header-group !important;
          }

          .data-table tbody {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            display: table-row-group !important;
          }

          .data-table tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            page-break-before: avoid !important;
            page-break-after: avoid !important;
            display: table-row !important;
            orphans: 10 !important;
            widows: 10 !important;
          }

          /* حماية إضافية للجداول */
          .data-table td, .data-table th {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            page-break-before: avoid !important;
            page-break-after: avoid !important;
            orphans: 10 !important;
            widows: 10 !important;
          }

          /* حماية شاملة للأقسام */
          .section-title {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            page-break-after: avoid !important;
            orphans: 10 !important;
            widows: 10 !important;
          }

          /* منع الانقطاع للعناصر المحمية */
          .no-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-before: auto !important;
            page-break-after: auto !important;
            display: block !important;
            overflow: visible !important;
            orphans: 10 !important;
            widows: 10 !important;
            position: relative !important;
          }

          /* حماية إضافية للجداول الصغيرة */
          .data-table.small-table {
            min-height: 200px !important;
            max-height: 400px !important;
          }

          /* منع انقطاع الصفوف */
          .data-table tr.no-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-before: avoid !important;
            page-break-after: avoid !important;
            display: table-row !important;
            orphans: 10 !important;
            widows: 10 !important;
          }

          /* حماية خاصة للخلايا */
          .data-table td.no-break,
          .data-table th.no-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-before: avoid !important;
            page-break-after: avoid !important;
            orphans: 10 !important;
            widows: 10 !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
          }

          .data-table th {
            background: ${this.COLORS.primary} !important;
            color: white !important;
            border: 2px solid ${this.COLORS.border} !important;
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          .data-table td {
            border: 1px solid ${this.COLORS.border} !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          .progress-fill {
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
            border: 1px solid ${this.COLORS.text.primary} !important;
          }

          .patient-card {
            border: 2px solid ${this.COLORS.border} !important;
            box-shadow: none !important;
          }

          .appointment-card {
            border: 2px solid ${this.COLORS.border} !important;
            box-shadow: none !important;
          }

          .analysis-card {
            border: 2px solid ${this.COLORS.border} !important;
            box-shadow: none !important;
          }

          table {
            break-inside: auto;
          }

          tr {
            break-inside: avoid;
            break-after: auto;
          }

          .page-break {
            page-break-before: always !important;
            break-before: page !important;
          }
        }
      </style>
    `
  }

  // Generate descriptive filename with date and time for PDF reports in DD-MM-YYYY format
  private static generatePDFFileName(reportType: string): string {
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
      'treatments': 'تقرير_العلاجات',
      'comprehensive': 'التقرير_الشامل'
    }

    const reportName = reportNames[reportType] || `تقرير_${reportType}`
    return `${reportName}_${dateStr}_${timeStr}.pdf`
  }

  // Direct PDF export without opening print window
  static async exportPatientReport(data: PatientReportData, settings?: ClinicSettings | null): Promise<void> {
    try {
      const htmlContent = this.createEnhancedPatientReportHTML(data, settings)
      const fileName = this.generatePDFFileName('patients')
      await this.convertHTMLToPDF(htmlContent, fileName)
    } catch (error) {
      console.error('Error exporting patient report:', error)
      throw new Error('فشل في تصدير تقرير المرضى')
    }
  }

  static async exportAppointmentReport(data: AppointmentReportData, settings?: ClinicSettings | null): Promise<void> {
    try {
      const htmlContent = EnhancedPdfReports.createEnhancedAppointmentReportHTML(data, settings)
      const fileName = this.generatePDFFileName('appointments')
      await this.convertHTMLToPDF(htmlContent, fileName)
    } catch (error) {
      console.error('Error exporting appointment report:', error)
      throw new Error('فشل في تصدير تقرير المواعيد')
    }
  }

  static async exportFinancialReport(data: any, settings?: ClinicSettings | null): Promise<void> {
    try {
      const htmlContent = EnhancedPdfReports.createEnhancedFinancialReportHTML(data, settings)
      const fileName = this.generatePDFFileName('financial')
      await this.convertHTMLToPDF(htmlContent, fileName)
    } catch (error) {
      console.error('Error exporting financial report:', error)
      throw new Error('فشل في تصدير التقرير المالي')
    }
  }

  static async exportInventoryReport(data: InventoryReportData, settings?: ClinicSettings | null): Promise<void> {
    try {
      const htmlContent = EnhancedPdfReports.createEnhancedInventoryReportHTML(data, settings)
      const fileName = this.generatePDFFileName('inventory')
      await this.convertHTMLToPDF(htmlContent, fileName)
    } catch (error) {
      console.error('Error exporting inventory report:', error)
      throw new Error('فشل في تصدير تقرير المخزون')
    }
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
   * تصدير تقرير الأرباح والخسائر الشامل كـ PDF
   */
  static async exportProfitLossReport(data: {
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
  }, settings?: ClinicSettings | null): Promise<void> {
    try {
      const { reportData, payments, labOrders, clinicNeeds, inventoryItems, clinicExpenses, patients, appointments, filter, currency } = data

      // Optimized data filtering with caching to avoid redundant processing
      const filteredData = await this.optimizeAndFilterReportData({
        reportData,
        payments,
        labOrders,
        clinicNeeds,
        inventoryItems,
        clinicExpenses,
        patients,
        appointments,
        filter,
        currency
      })

      const htmlContent = EnhancedPdfReports.createEnhancedProfitLossReportHTML(filteredData, settings)
      const fileName = this.generatePDFFileName('profit-loss')
      await this.convertHTMLToPDF(htmlContent, fileName)
    } catch (error) {
      console.error('Error exporting profit/loss report:', error)
      throw new Error('فشل في تصدير تقرير الأرباح والخسائر')
    }
  }

  /**
   * Optimized data filtering and processing for comprehensive reports
   */
  private static async optimizeAndFilterReportData(data: {
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
  }) {
    const { reportData, payments, labOrders, clinicNeeds, inventoryItems, clinicExpenses, patients, appointments, filter, currency } = data

    // Create optimized filtering function that caches results
    const createOptimizedFilter = (dateField: keyof any) => {
      return (items: any[]) => {
        if (!filter || !filter.start || !filter.end) {
          return items
        }

        // Pre-calculate date range to avoid repeated calculations
        const start = new Date(filter.start)
        const startLocal = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0, 0)

        const end = new Date(filter.end)
        const endLocal = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999)

        return items.filter(item => {
          const itemDateStr = item[dateField] as string
          if (!itemDateStr) return false

          const itemDate = new Date(itemDateStr)

          // Optimized date comparison
          let itemDateForComparison: Date
          if (itemDateStr.includes('T') || itemDateStr.includes(' ')) {
            itemDateForComparison = itemDate
          } else {
            itemDateForComparison = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate(), 0, 0, 0, 0)
          }

          return itemDateForComparison >= startLocal && itemDateForComparison <= endLocal
        })
      }
    }

    // Create filter functions for each data type
    const paymentFilter = createOptimizedFilter('payment_date')
    const orderFilter = createOptimizedFilter('order_date')
    const creationFilter = createOptimizedFilter('created_at')

    // Use Promise.all for parallel processing to improve performance
    const [filteredPayments, filteredLabOrders, filteredClinicNeeds, filteredAppointments, filteredInventoryItems, filteredClinicExpenses] = await Promise.all([
      paymentFilter(payments),
      orderFilter(labOrders),
      creationFilter(clinicNeeds),
      creationFilter(appointments),
      creationFilter(inventoryItems),
      clinicExpenses ? paymentFilter(clinicExpenses) : Promise.resolve([])
    ])

    // Return optimized data structure
    return {
      reportData,
      payments: filteredPayments,
      labOrders: filteredLabOrders,
      clinicNeeds: filteredClinicNeeds,
      inventoryItems: filteredInventoryItems,
      clinicExpenses: filteredClinicExpenses,
      patients, // Patients don't need filtering as they're referenced by other data
      appointments: filteredAppointments,
      filter,
      currency
    }
  }

  /**
   * تصدير فاتورة المدفوعات الآجلة الشاملة كـ PDF
   */
  static async exportComprehensivePendingInvoice(invoiceData: any): Promise<void> {
    try {
      const htmlContent = this.createComprehensivePendingInvoiceHTML(invoiceData)
      const fileName = this.generatePDFFileName(`pending-invoice-${invoiceData.patient.full_name}`)
      await this.convertHTMLToPDF(htmlContent, fileName)
    } catch (error) {
      console.error('Error exporting comprehensive pending invoice:', error)
      throw new Error('فشل في تصدير فاتورة المدفوعات الآجلة')
    }
  }

  /**
   * إنشاء HTML لفاتورة المدفوعات الآجلة الشاملة
   */
  private static createComprehensivePendingInvoiceHTML(invoiceData: any): string {
    const { patient, summary, settings: invoiceSettings, clinic_info } = invoiceData

    // دوال مساعدة لتنسيق التاريخ والعملة
    const formatDate = (dateString: string) => {
      try {
        const date = new Date(dateString)
        if (isNaN(date.getTime())) {
          return 'غير محدد'
        }
        const day = date.getDate().toString().padStart(2, '0')
        const month = (date.getMonth() + 1).toString().padStart(2, '0')
        const year = date.getFullYear()
        return `${day}/${month}/${year}`
      } catch (error) {
        return 'غير محدد'
      }
    }

    const formatDateTime = (dateTimeString: string) => {
      try {
        const date = new Date(dateTimeString)
        if (isNaN(date.getTime())) {
          return 'غير محدد'
        }
        const day = date.getDate().toString().padStart(2, '0')
        const month = (date.getMonth() + 1).toString().padStart(2, '0')
        const year = date.getFullYear()
        const time = date.toLocaleTimeString('ar-SA', {
          hour: '2-digit',
          minute: '2-digit'
        })
        return `${day}/${month}/${year} - ${time}`
      } catch (error) {
        return 'غير محدد'
      }
    }

    const formatCurrency = (amount: number) => {
      try {
        // استخدام إعدادات العملة من العيادة إذا كانت متوفرة
        if (clinic_info?.currency) {
          const currencySymbols = {
            'USD': '$',
            'EUR': '€',
            'SYP': 'ل.س',
            'TRY': '₺',
            'SAR': 'ر.س'
          }
          const symbol = currencySymbols[clinic_info.currency as keyof typeof currencySymbols] || clinic_info.currency
          return `${amount.toLocaleString('en-US')} ${symbol}`
        }
        return `${amount.toLocaleString('en-US')} ل.س`
      } catch (error) {
        return `${amount} ل.س`
      }
    }

    return `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>فاتورة المدفوعات الآجلة - ${patient.full_name}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'Arial', 'Tahoma', sans-serif;
          direction: rtl;
          background: white;
          color: #333;
          line-height: 1.6;
          font-size: 14px;
        }

        .invoice-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          background: white;
        }

        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 3px solid #2563eb;
          padding-bottom: 20px;
        }

        .header h1 {
          color: #2563eb;
          font-size: 28px;
          margin-bottom: 10px;
          font-weight: bold;
        }

        .header .invoice-info {
          display: flex;
          justify-content: space-between;
          margin-top: 15px;
          font-size: 12px;
          color: #666;
        }

        .info-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 30px;
        }

        .info-card {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 15px;
          background: #f9fafb;
        }

        .info-card h3 {
          color: #2563eb;
          font-size: 16px;
          margin-bottom: 10px;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 5px;
        }

        .info-card p {
          margin: 5px 0;
          font-size: 13px;
        }

        .items-section {
          margin-bottom: 30px;
        }

        .items-header {
          background: #2563eb;
          color: white;
          padding: 15px;
          border-radius: 8px 8px 0 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .items-header h3 {
          font-size: 18px;
        }

        .items-badge {
          background: rgba(255, 255, 255, 0.2);
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
        }

        .items-list {
          border: 1px solid #e5e7eb;
          border-top: none;
          border-radius: 0 0 8px 8px;
        }

        .item-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px;
          border-bottom: 1px solid #e5e7eb;
          transition: background-color 0.2s;
        }

        .item-row:last-child {
          border-bottom: none;
        }

        .item-row:hover {
          background: #f9fafb;
        }

        .item-details {
          flex: 1;
        }

        .item-title {
          font-weight: bold;
          color: #1f2937;
          margin-bottom: 5px;
        }

        .item-meta {
          font-size: 11px;
          color: #6b7280;
          display: flex;
          gap: 15px;
          flex-wrap: wrap;
        }

        .item-amount {
          text-align: left;
          font-weight: bold;
          font-size: 16px;
          color: #059669;
        }

        .summary-section {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 30px;
        }

        .summary-title {
          color: #2563eb;
          font-size: 18px;
          margin-bottom: 15px;
          text-align: center;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 10px;
        }

        .summary-row {
          display: flex;
          justify-content: space-between;
          margin: 10px 0;
          padding: 5px 0;
        }

        .summary-row.discount {
          color: #dc2626;
        }

        .summary-row.tax {
          color: #2563eb;
        }

        .summary-row.total {
          border-top: 2px solid #2563eb;
          padding-top: 15px;
          margin-top: 15px;
          font-size: 20px;
          font-weight: bold;
          color: #2563eb;
        }

        .footer {
          text-align: center;
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          color: #6b7280;
          font-size: 12px;
        }

        .date-range {
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 6px;
          padding: 10px;
          margin-bottom: 20px;
          text-align: center;
          font-size: 12px;
          color: #1e40af;
        }

        @media print {
          body {
            margin: 0;
            padding: 0;
          }

          .invoice-container {
            max-width: none;
            margin: 0;
            padding: 15px;
          }

          .item-row:hover {
            background: transparent;
          }
        }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <!-- رأس الفاتورة -->
        <div class="header">
          <h1>فاتورة المدفوعات الآجلة الشاملة</h1>
          <div class="invoice-info">
            <div>رقم الفاتورة: ${invoiceData.invoice_number}</div>
            <div>تاريخ الإصدار: ${formatDate(invoiceData.invoice_date)}</div>
            <div>وقت الإنشاء: ${formatDateTime(invoiceData.generated_at)}</div>
          </div>
        </div>

        <!-- نطاق التاريخ -->
        <div class="date-range">
          <strong>فترة الفاتورة:</strong> من ${formatDate(summary.date_range.from)} إلى ${formatDate(summary.date_range.to)}
        </div>

        <!-- معلومات المريض والعيادة -->
        <div class="info-section">
          <div class="info-card">
            <h3>معلومات المريض</h3>
            <p><strong>الاسم الكامل:</strong> ${patient.full_name}</p>
            <p><strong>رقم الهاتف:</strong> ${patient.phone || 'غير محدد'}</p>
            ${patient.email ? `<p><strong>البريد الإلكتروني:</strong> ${patient.email}</p>` : ''}
            ${patient.address ? `<p><strong>العنوان:</strong> ${patient.address}</p>` : ''}
            <p><strong>تاريخ الميلاد:</strong> ${patient.date_of_birth ? formatDate(patient.date_of_birth) : 'غير محدد'}</p>
          </div>

          <div class="info-card">
            <h3>معلومات العيادة</h3>
            <p><strong>اسم العيادة:</strong> ${clinic_info.clinic_name || 'عيادة الأسنان'}</p>
            ${clinic_info.clinic_phone ? `<p><strong>هاتف العيادة:</strong> ${clinic_info.clinic_phone}</p>` : ''}
            ${clinic_info.clinic_address ? `<p><strong>عنوان العيادة:</strong> ${clinic_info.clinic_address}</p>` : ''}
            ${clinic_info.clinic_email ? `<p><strong>إيميل العيادة:</strong> ${clinic_info.clinic_email}</p>` : ''}
          </div>
        </div>

        <!-- تفاصيل المدفوعات الآجلة -->
        <div class="items-section">
          <div class="items-header">
            <h3>تفاصيل المدفوعات الآجلة</h3>
            <div class="items-badge">${summary.total_items} عنصر</div>
          </div>

          <div class="items-list">
            ${summary.items.map((item: any, index: number) => `
              <div class="item-row">
                <div class="item-details">
                  <div class="item-title">
                    ${index + 1}. ${item.appointment_title || item.treatment_type || item.description || 'عنصر غير محدد'}
                  </div>
                  <div class="item-meta">
                    ${item.appointment_date ? `<span>📅 ${formatDate(item.appointment_date)}</span>` : ''}
                    ${item.tooth_name ? `<span>🦷 ${item.tooth_name} (${item.tooth_number})</span>` : ''}
                    ${item.treatment_type ? `<span>🔧 ${item.treatment_type}</span>` : ''}
                    ${item.notes ? `<span>📝 ${item.notes}</span>` : ''}
                  </div>
                </div>
                <div class="item-amount">
                  ${formatCurrency(item.amount)}
                  ${item.discount_amount && item.discount_amount > 0 ?
                    `<div style="font-size: 11px; color: #dc2626;">خصم: ${formatCurrency(item.discount_amount)}</div>` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- ملخص المبالغ -->
        <div class="summary-section">
          <h3 class="summary-title">ملخص المبالغ</h3>

          <div class="summary-row">
            <span>المجموع الفرعي:</span>
            <span>${formatCurrency(summary.subtotal)}</span>
          </div>

          ${summary.total_discount > 0 ? `
            <div class="summary-row discount">
              <span>الخصم (${invoiceSettings.discount_type === 'percentage' ? `${invoiceSettings.discount_value}%` : 'مبلغ ثابت'}):</span>
              <span>-${formatCurrency(summary.total_discount)}</span>
            </div>
            ${invoiceSettings.discount_reason ? `
              <div style="font-size: 11px; color: #6b7280; text-align: center; margin: 5px 0;">
                سبب الخصم: ${invoiceSettings.discount_reason}
              </div>
            ` : ''}
          ` : ''}

          ${summary.total_tax > 0 ? `
            <div class="summary-row tax">
              <span>الضريبة (${invoiceSettings.tax_rate}%):</span>
              <span>+${formatCurrency(summary.total_tax)}</span>
            </div>
          ` : ''}

          <div class="summary-row total">
            <span>المجموع النهائي:</span>
            <span>${formatCurrency(summary.final_total)}</span>
          </div>
        </div>

        <!-- شروط الدفع -->
        ${invoiceSettings.include_payment_terms && invoiceSettings.payment_terms_text ? `
          <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 15px; margin-bottom: 20px;">
            <h4 style="color: #92400e; margin-bottom: 8px;">شروط الدفع:</h4>
            <p style="color: #92400e; font-size: 13px;">${invoiceSettings.payment_terms_text}</p>
          </div>
        ` : ''}

        <!-- الملاحظات -->
        ${invoiceSettings.footer_notes ? `
          <div class="footer">
            <p>${invoiceSettings.footer_notes}</p>
          </div>
        ` : ''}

        <!-- معلومات إضافية -->
        <div class="footer">
          <p>تم إنشاء هذه الفاتورة إلكترونياً في ${formatDateTime(invoiceData.generated_at)}</p>
          <p>للاستفسارات، يرجى التواصل مع العيادة</p>
        </div>
      </div>
    </body>
    </html>
    `
  }

  static async exportComprehensiveReport(
    patientData: PatientReportData,
    appointmentData: AppointmentReportData,
    financialData: FinancialReportData,
    inventoryData: InventoryReportData
  ): Promise<void> {
    try {
      const htmlContent = this.createComprehensiveReportHTML(patientData, appointmentData, financialData, inventoryData)
      const fileName = this.generatePDFFileName('comprehensive')
      await this.convertHTMLToPDF(htmlContent, fileName)
    } catch (error) {
      console.error('Error exporting comprehensive report:', error)
      throw new Error('فشل في تصدير التقرير الشامل')
    }
  }

  static async exportComprehensiveFinancialReport(data: any, settings?: ClinicSettings | null): Promise<void> {
    try {
      const htmlContent = this.createComprehensiveFinancialReportHTML(data, settings)
      const fileName = this.generatePDFFileName('comprehensive_financial')
      await this.convertHTMLToPDF(htmlContent, fileName)
    } catch (error) {
      console.error('Error exporting comprehensive financial report:', error)
      throw new Error('فشل في تصدير التقرير المالي الشامل')
    }
  }

  // Create enhanced HTML report for patients
  private static createEnhancedPatientReportHTML(data: PatientReportData, settings?: ClinicSettings | null): string {
    const header = this.createEnhancedHeader('تقرير المرضى', settings, 'تقرير شامل عن إحصائيات المرضى والتوزيعات')
    const styles = this.createEnhancedStyles()

    return `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>تقرير المرضى - ${settings?.clinic_name || 'عيادة الأسنان'}</title>
        ${styles}
      </head>
      <body>
        ${header}

        <!-- Summary Cards with Enhanced Design -->
        <div class="summary-cards">
          <div class="summary-card primary">
            <div class="card-icon">👥</div>
            <div class="card-content">
              <h3>إجمالي المرضى</h3>
              <div class="number">${data.totalPatients.toLocaleString('en-US')}</div>
            </div>
          </div>
          <div class="summary-card success">
            <div class="card-icon">✨</div>
            <div class="card-content">
              <h3>المرضى الجدد</h3>
              <div class="number">${(data.newPatients || 0).toLocaleString('en-US')}</div>
            </div>
          </div>
          <div class="summary-card info">
            <div class="card-icon">💚</div>
            <div class="card-content">
              <h3>المرضى النشطون</h3>
              <div class="number">${data.activePatients.toLocaleString('en-US')}</div>
            </div>
          </div>
          <div class="summary-card warning">
            <div class="card-icon">⏸️</div>
            <div class="card-content">
              <h3>المرضى غير النشطين</h3>
              <div class="number">${(data.totalPatients - data.activePatients).toLocaleString('en-US')}</div>
            </div>
          </div>
        </div>

        <!-- Patient List Section -->
        ${data.patientsList && data.patientsList.length > 0 ? `
        <div class="section">
          <div class="section-title">
            <span class="section-icon">📋</span>
            قائمة المرضى
          </div>
          <div class="section-content">
            <div class="patients-grid">
              ${data.patientsList.slice(0, 50).map((patient: any, index: number) => `
                <div class="patient-card">
                  <div class="patient-header">
                    <div class="patient-avatar">
                      ${(patient.full_name || patient.first_name || 'م').charAt(0)}
                    </div>
                    <div class="patient-info">
                      <h4 class="patient-name">${patient.full_name || `${patient.first_name || ''} ${patient.last_name || ''}`.trim()}</h4>
                      <span class="patient-serial">#${patient.serial_number || (index + 1).toString().padStart(3, '0')}</span>
                    </div>
                  </div>
                  <div class="patient-details">
                    <div class="detail-item">
                      <span class="detail-label">الجنس:</span>
                      <span class="detail-value">${patient.gender === 'male' ? 'ذكر' : patient.gender === 'female' ? 'أنثى' : 'غير محدد'}</span>
                    </div>
                    <div class="detail-item">
                      <span class="detail-label">العمر:</span>
                      <span class="detail-value">${patient.age || 'غير محدد'} سنة</span>
                    </div>
                    <div class="detail-item">
                      <span class="detail-label">الهاتف:</span>
                      <span class="detail-value">${patient.phone || 'غير محدد'}</span>
                    </div>
                    <div class="detail-item">
                      <span class="detail-label">الحالة:</span>
                      <span class="detail-value status-active">${patient.patient_condition || 'نشط'}</span>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
            ${data.patientsList.length > 50 ? `
            <div class="pagination-info">
              <p>عرض أول 50 مريض من إجمالي ${data.patientsList.length.toLocaleString('en-US')} مريض</p>
            </div>
            ` : ''}
          </div>
        </div>
        ` : ''}

        <!-- Age Distribution -->
        <div class="section">
          <div class="section-title">
            <span class="section-icon">📊</span>
            توزيع الأعمار
          </div>
          <div class="section-content">
            <div class="chart-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>الفئة العمرية</th>
                    <th>العدد</th>
                    <th>النسبة المئوية</th>
                    <th>المؤشر البصري</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.ageDistribution?.map(item => {
                    const percentage = data.totalPatients > 0 ? ((item.count / data.totalPatients) * 100).toFixed(1) : '0.0'
                    const barWidth = Math.max(5, parseFloat(percentage))
                    return `
                      <tr>
                        <td class="category-cell">${item.ageGroup}</td>
                        <td class="number-cell">${item.count.toLocaleString('en-US')}</td>
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

        <!-- Page Break Before Gender Distribution -->
        <div class="page-break"></div>

        <!-- Gender Distribution Page Header -->
        <div class="page-header">
          <h2 class="page-title">📊 تحليل توزيع الجنس</h2>
          <p class="page-subtitle">تقرير تفصيلي عن توزيع المرضى حسب الجنس</p>
        </div>

        <!-- Gender Distribution -->
        <div class="section">
          <div class="section-title">
            <span class="section-icon">👥</span>
            توزيع الجنس
          </div>
          <div class="section-content">
            <div class="chart-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>الجنس</th>
                    <th>العدد</th>
                    <th>النسبة المئوية</th>
                    <th>المؤشر البصري</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.genderDistribution?.map(item => {
                    const percentage = data.totalPatients > 0 ? ((item.count / data.totalPatients) * 100).toFixed(1) : '0.0'
                    const barWidth = Math.max(5, parseFloat(percentage))
                    const genderIcon = item.gender === 'ذكر' ? '👨' : item.gender === 'أنثى' ? '👩' : '👤'
                    return `
                      <tr>
                        <td class="category-cell">${genderIcon} ${item.gender}</td>
                        <td class="number-cell">${item.count.toLocaleString('en-US')}</td>
                        <td class="percentage-cell">${percentage}%</td>
                        <td class="chart-cell">
                          <div class="progress-bar">
                            <div class="progress-fill gender-${item.gender === 'ذكر' ? 'male' : 'female'}" style="width: ${barWidth}%"></div>
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

        <!-- Gender Analysis Summary -->
        <div class="section">
          <div class="section-title">
            <span class="section-icon">📈</span>
            تحليل إحصائي لتوزيع الجنس
          </div>
          <div class="section-content">
            <div class="analysis-cards">
              ${data.genderDistribution?.map(item => {
                const percentage = data.totalPatients > 0 ? ((item.count / data.totalPatients) * 100).toFixed(1) : '0.0'
                const genderIcon = item.gender === 'ذكر' ? '👨' : item.gender === 'أنثى' ? '👩' : '👤'
                const genderColor = item.gender === 'ذكر' ? '#1e40af' : item.gender === 'أنثى' ? '#be185d' : '#374151'
                const genderBgColor = item.gender === 'ذكر' ? '#dbeafe' : item.gender === 'أنثى' ? '#fce7f3' : '#f3f4f6'
                return `
                  <div class="analysis-card" style="border-left-color: ${genderColor}; border-left-width: 6px;">
                    <div class="analysis-icon" style="background: ${genderBgColor}; color: ${genderColor}; border: 2px solid ${genderColor};">
                      ${genderIcon}
                    </div>
                    <div class="analysis-content">
                      <h3 style="color: ${genderColor};">${item.gender}</h3>
                      <div class="analysis-stats">
                        <div class="stat">
                          <span class="stat-label">العدد:</span>
                          <span class="stat-value" style="color: ${genderColor};">${item.count.toLocaleString('en-US')}</span>
                        </div>
                        <div class="stat">
                          <span class="stat-label">النسبة:</span>
                          <span class="stat-value" style="color: ${genderColor};">${percentage}%</span>
                        </div>
                        <div class="stat">
                          <span class="stat-label">من إجمالي:</span>
                          <span class="stat-value">${data.totalPatients.toLocaleString('en-US')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                `
              }).join('') || '<p class="no-data">لا توجد بيانات للتحليل</p>'}
            </div>
          </div>
        </div>

        <!-- Registration Trend -->
        ${data.registrationTrend && data.registrationTrend.length > 0 ? `
        <div class="section">
          <div class="section-title">
            <span class="section-icon">📈</span>
            اتجاه التسجيل الشهري
          </div>
          <div class="section-content">
            <div class="chart-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>الشهر</th>
                    <th>عدد المرضى الجدد</th>
                    <th>المؤشر البصري</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.registrationTrend.map(item => {
                    const maxCount = Math.max(...data.registrationTrend.map(t => t.count))
                    const barWidth = maxCount > 0 ? Math.max(5, (item.count / maxCount) * 100) : 5
                    return `
                      <tr>
                        <td class="category-cell">${item.period}</td>
                        <td class="number-cell">${item.count.toLocaleString('en-US')}</td>
                        <td class="chart-cell">
                          <div class="progress-bar">
                            <div class="progress-fill trend" style="width: ${barWidth}%"></div>
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
            </div>
            <div class="footer-right">
              <div class="footer-stats">
                <span class="stat-item">📊 ${data.totalPatients.toLocaleString('en-US')} مريض</span>
                <span class="stat-item">✨ ${(data.newPatients || 0).toLocaleString('en-US')} جديد</span>
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  }

  // Create HTML report for patients (legacy - keeping for compatibility)
  private static createPatientReportHTML(data: PatientReportData): string {
    return `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>تقرير المرضى</title>
        <style>
          body { font-family: 'Tajawal', Arial, sans-serif; direction: rtl; margin: 20px; }
          .header { text-align: center; border-bottom: 2px solid #0ea5e9; padding-bottom: 20px; margin-bottom: 30px; }
          .clinic-name { font-size: 24px; font-weight: bold; color: #0ea5e9; margin-bottom: 10px; }
          .report-title { font-size: 20px; font-weight: bold; color: #1e293b; margin-bottom: 5px; }
          .report-date { font-size: 14px; color: #64748b; }
          .summary-cards { display: flex; justify-content: space-around; margin: 30px 0; }
          .summary-card { background: #f8fafc; padding: 20px; border-radius: 8px; text-align: center; min-width: 150px; }
          .summary-card h3 { margin: 0 0 10px 0; font-size: 16px; color: #1e293b; }
          .summary-card .number { font-size: 24px; font-weight: bold; color: #0ea5e9; }
          .section { margin: 30px 0; }
          .section-title { font-size: 18px; font-weight: bold; color: #0ea5e9; margin-bottom: 15px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { padding: 12px; text-align: center; border: 1px solid #e2e8f0; }
          th { background: #f8fafc; font-weight: bold; color: #1e293b; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="clinic-name">عيادة الأسنان الحديثة</div>
          <div class="report-title">تقرير المرضى</div>
          <div class="report-date">${(() => {
            // Format date as DD/MM/YYYY (Gregorian calendar)
            const date = new Date()
            const day = date.getDate().toString().padStart(2, '0')
            const month = (date.getMonth() + 1).toString().padStart(2, '0')
            const year = date.getFullYear()
            return `${day}/${month}/${year}`
          })()}</div>
        </div>

        <div class="summary-cards">
          <div class="summary-card">
            <h3>إجمالي المرضى</h3>
            <div class="number">${data.totalPatients}</div>
          </div>
          <div class="summary-card">
            <h3>المرضى الجدد</h3>
            <div class="number">${data.newPatients || 0}</div>
          </div>
          <div class="summary-card">
            <h3>المرضى النشطون</h3>
            <div class="number">${data.activePatients}</div>
          </div>
          <div class="summary-card">
            <h3>المرضى غير النشطين</h3>
            <div class="number">${(data.totalPatients - data.activePatients) || 0}</div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">توزيع الأعمار</div>
          <table>
            <thead>
              <tr>
                <th>الفئة العمرية</th>
                <th>العدد</th>
              </tr>
            </thead>
            <tbody>
              ${data.ageDistribution?.map(item => `
                <tr>
                  <td>${item.ageGroup}</td>
                  <td>${item.count}</td>
                </tr>
              `).join('') || '<tr><td colspan="2">لا توجد بيانات</td></tr>'}
            </tbody>
          </table>
        </div>

        <div class="section">
          <div class="section-title">توزيع الجنس</div>
          <table>
            <thead>
              <tr>
                <th>الجنس</th>
                <th>العدد</th>
              </tr>
            </thead>
            <tbody>
              ${data.genderDistribution?.map(item => `
                <tr>
                  <td>${item.gender === 'male' ? 'ذكر' : 'أنثى'}</td>
                  <td>${item.count}</td>
                </tr>
              `).join('') || '<tr><td colspan="2">لا توجد بيانات</td></tr>'}
            </tbody>
          </table>
        </div>
      </body>
      </html>
    `
  }

  // Create HTML report for appointments
  private static createAppointmentReportHTML(data: AppointmentReportData): string {
    return `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>تقرير المواعيد</title>
        <style>
          body { font-family: 'Tajawal', Arial, sans-serif; direction: rtl; margin: 20px; }
          .header { text-align: center; border-bottom: 2px solid #0ea5e9; padding-bottom: 20px; margin-bottom: 30px; }
          .clinic-name { font-size: 24px; font-weight: bold; color: #0ea5e9; margin-bottom: 10px; }
          .report-title { font-size: 20px; font-weight: bold; color: #1e293b; margin-bottom: 5px; }
          .report-date { font-size: 14px; color: #64748b; }
          .summary-cards { display: flex; justify-content: space-around; margin: 30px 0; flex-wrap: wrap; }
          .summary-card { background: #f8fafc; padding: 20px; border-radius: 8px; text-align: center; min-width: 120px; margin: 5px; }
          .summary-card h3 { margin: 0 0 10px 0; font-size: 14px; color: #1e293b; }
          .summary-card .number { font-size: 20px; font-weight: bold; color: #0ea5e9; }
          .section { margin: 30px 0; }
          .section-title { font-size: 18px; font-weight: bold; color: #0ea5e9; margin-bottom: 15px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { padding: 12px; text-align: center; border: 1px solid #e2e8f0; }
          th { background: #f8fafc; font-weight: bold; color: #1e293b; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="clinic-name">عيادة الأسنان الحديثة</div>
          <div class="report-title">تقرير المواعيد</div>
          <div class="report-date">${(() => {
            // Format date as DD/MM/YYYY (Gregorian calendar)
            const date = new Date()
            const day = date.getDate().toString().padStart(2, '0')
            const month = (date.getMonth() + 1).toString().padStart(2, '0')
            const year = date.getFullYear()
            return `${day}/${month}/${year}`
          })()}</div>
        </div>

        <div class="summary-cards">
          <div class="summary-card">
            <h3>إجمالي المواعيد</h3>
            <div class="number">${data.totalAppointments}</div>
          </div>
          <div class="summary-card">
            <h3>المكتملة</h3>
            <div class="number">${data.completedAppointments}</div>
          </div>
          <div class="summary-card">
            <h3>الملغية</h3>
            <div class="number">${data.cancelledAppointments}</div>
          </div>
          <div class="summary-card">
            <h3>عدم الحضور</h3>
            <div class="number">${data.noShowAppointments || 0}</div>
          </div>
          <div class="summary-card">
            <h3>معدل الحضور</h3>
            <div class="number">${data.attendanceRate?.toFixed(1) || 0}%</div>
          </div>
        </div>

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
              ${data.appointmentsByStatus?.map(item => `
                <tr>
                  <td>${this.translateStatus(item.status)}</td>
                  <td>${item.count}</td>
                  <td>${item.percentage?.toFixed(1) || 0}%</td>
                </tr>
              `).join('') || '<tr><td colspan="3">لا توجد بيانات</td></tr>'}
            </tbody>
          </table>
        </div>
      </body>
      </html>
    `
  }

  // Create HTML report for financial data
  private static createFinancialReportHTML(data: any): string {
    return `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>التقرير المالي</title>
        <style>
          body { font-family: 'Tajawal', Arial, sans-serif; direction: rtl; margin: 20px; }
          .header { text-align: center; border-bottom: 2px solid #0ea5e9; padding-bottom: 20px; margin-bottom: 30px; }
          .clinic-name { font-size: 24px; font-weight: bold; color: #0ea5e9; margin-bottom: 10px; }
          .report-title { font-size: 20px; font-weight: bold; color: #1e293b; margin-bottom: 5px; }
          .report-date { font-size: 14px; color: #64748b; }
          .summary-cards { display: flex; justify-content: space-around; margin: 30px 0; flex-wrap: wrap; }
          .summary-card { background: #f8fafc; padding: 20px; border-radius: 8px; text-align: center; min-width: 150px; margin: 5px; }
          .summary-card h3 { margin: 0 0 10px 0; font-size: 14px; color: #1e293b; }
          .summary-card .number { font-size: 18px; font-weight: bold; color: #0ea5e9; }
          .section { margin: 30px 0; }
          .section-title { font-size: 18px; font-weight: bold; color: #0ea5e9; margin-bottom: 15px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { padding: 12px; text-align: center; border: 1px solid #e2e8f0; }
          th { background: #f8fafc; font-weight: bold; color: #1e293b; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="clinic-name">عيادة الأسنان الحديثة</div>
          <div class="report-title">التقرير المالي</div>
          <div class="report-date">${(() => {
            // Format date as DD/MM/YYYY (Gregorian calendar)
            const date = new Date()
            const day = date.getDate().toString().padStart(2, '0')
            const month = (date.getMonth() + 1).toString().padStart(2, '0')
            const year = date.getFullYear()
            return `${day}/${month}/${year}`
          })()}</div>
        </div>

        <div class="summary-cards">
          <div class="summary-card">
            <h3>إجمالي الإيرادات</h3>
            <div class="number">$${data.totalRevenue?.toLocaleString('en-US') || 0}</div>
          </div>
          <div class="summary-card">
            <h3>المدفوعات المكتملة</h3>
            <div class="number">$${data.totalRevenue?.toLocaleString('en-US') || 0}</div>
          </div>
          <div class="summary-card">
            <h3>المدفوعات الآجلة</h3>
            <div class="number">$${data.pendingPayments?.toLocaleString('en-US') || 0}</div>
          </div>
          <div class="summary-card">
            <h3>المدفوعات المتأخرة</h3>
            <div class="number">$${data.overduePayments?.toLocaleString('en-US') || 0}</div>
          </div>
        </div>

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
              ${data.paymentMethodStats?.map((item: any) => `
                <tr>
                  <td>${this.translatePaymentMethod(item.method)}</td>
                  <td>${item.amount?.toLocaleString('en-US') || 0} $</td>
                  <td>${item.count || 0}</td>
                </tr>
              `).join('') || '<tr><td colspan="3">لا توجد بيانات</td></tr>'}
            </tbody>
          </table>
        </div>
      </body>
      </html>
    `
  }

  // Create HTML report for inventory
  private static createInventoryReportHTML(data: InventoryReportData): string {
    return `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>تقرير المخزون</title>
        <style>
          body { font-family: 'Tajawal', Arial, sans-serif; direction: rtl; margin: 20px; }
          .header { text-align: center; border-bottom: 2px solid #0ea5e9; padding-bottom: 20px; margin-bottom: 30px; }
          .clinic-name { font-size: 24px; font-weight: bold; color: #0ea5e9; margin-bottom: 10px; }
          .report-title { font-size: 20px; font-weight: bold; color: #1e293b; margin-bottom: 5px; }
          .report-date { font-size: 14px; color: #64748b; }
          .summary-cards { display: flex; justify-content: space-around; margin: 30px 0; flex-wrap: wrap; }
          .summary-card { background: #f8fafc; padding: 20px; border-radius: 8px; text-align: center; min-width: 150px; margin: 5px; }
          .summary-card h3 { margin: 0 0 10px 0; font-size: 14px; color: #1e293b; }
          .summary-card .number { font-size: 18px; font-weight: bold; color: #0ea5e9; }
          .warning { color: #f59e0b !important; }
          .danger { color: #ef4444 !important; }
          .section { margin: 30px 0; }
          .section-title { font-size: 18px; font-weight: bold; color: #0ea5e9; margin-bottom: 15px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { padding: 12px; text-align: center; border: 1px solid #e2e8f0; }
          th { background: #f8fafc; font-weight: bold; color: #1e293b; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="clinic-name">عيادة الأسنان الحديثة</div>
          <div class="report-title">تقرير المخزون</div>
          <div class="report-date">${(() => {
            // Format date as DD/MM/YYYY (Gregorian calendar)
            const date = new Date()
            const day = date.getDate().toString().padStart(2, '0')
            const month = (date.getMonth() + 1).toString().padStart(2, '0')
            const year = date.getFullYear()
            return `${day}/${month}/${year}`
          })()}</div>
        </div>

        <div class="summary-cards">
          <div class="summary-card">
            <h3>إجمالي الأصناف</h3>
            <div class="number">${data.totalItems}</div>
          </div>
          <div class="summary-card">
            <h3>القيمة الإجمالية</h3>
            <div class="number">${data.totalValue?.toLocaleString('en-US') || 0} $</div>
          </div>
          <div class="summary-card">
            <h3>أصناف منخفضة المخزون</h3>
            <div class="number warning">${data.lowStockItems || 0}</div>
          </div>
          <div class="summary-card">
            <h3>أصناف منتهية الصلاحية</h3>
            <div class="number danger">${data.expiredItems || 0}</div>
          </div>
        </div>

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
              ${data.itemsByCategory?.map(item => `
                <tr>
                  <td>${item.category}</td>
                  <td>${item.count}</td>
                  <td>${item.value?.toLocaleString('en-US') || 0} $</td>
                </tr>
              `).join('') || '<tr><td colspan="3">لا توجد بيانات</td></tr>'}
            </tbody>
          </table>
        </div>

        ${data.stockAlerts && data.stockAlerts.length > 0 ? `
        <div class="section">
          <div class="section-title">تنبيهات المخزون</div>
          <table>
            <thead>
              <tr>
                <th>الصنف</th>
                <th>الكمية الحالية</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              ${data.stockAlerts.slice(0, 10).map(item => `
                <tr>
                  <td>${item.name}</td>
                  <td>${item.quantity}</td>
                  <td class="${item.quantity === 0 ? 'danger' : 'warning'}">
                    ${item.quantity === 0 ? 'نفد المخزون' : 'مخزون منخفض'}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}
      </body>
      </html>
    `
  }

  // Create comprehensive HTML report
  private static createComprehensiveReportHTML(
    patientData: PatientReportData,
    appointmentData: AppointmentReportData,
    financialData: FinancialReportData,
    inventoryData: InventoryReportData
  ): string {
    return `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>التقرير الشامل</title>
        <style>
          body { font-family: 'Tajawal', Arial, sans-serif; direction: rtl; margin: 20px; }
          .header { text-align: center; border-bottom: 2px solid #0ea5e9; padding-bottom: 20px; margin-bottom: 30px; }
          .clinic-name { font-size: 24px; font-weight: bold; color: #0ea5e9; margin-bottom: 10px; }
          .report-title { font-size: 20px; font-weight: bold; color: #1e293b; margin-bottom: 5px; }
          .report-date { font-size: 14px; color: #64748b; }
          .summary-section { display: flex; justify-content: space-between; margin: 30px 0; flex-wrap: wrap; }
          .summary-group { background: #f8fafc; padding: 20px; border-radius: 8px; min-width: 200px; margin: 10px; }
          .summary-group h3 { margin: 0 0 15px 0; font-size: 16px; color: #0ea5e9; text-align: center; }
          .summary-item { margin: 8px 0; font-size: 14px; }
          .section { margin: 30px 0; }
          .section-title { font-size: 18px; font-weight: bold; color: #0ea5e9; margin-bottom: 15px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { padding: 12px; text-align: center; border: 1px solid #e2e8f0; }
          th { background: #f8fafc; font-weight: bold; color: #1e293b; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="clinic-name">عيادة الأسنان الحديثة</div>
          <div class="report-title">التقرير الشامل</div>
          <div class="report-date">${(() => {
            // Format date as DD/MM/YYYY (Gregorian calendar)
            const date = new Date()
            const day = date.getDate().toString().padStart(2, '0')
            const month = (date.getMonth() + 1).toString().padStart(2, '0')
            const year = date.getFullYear()
            return `${day}/${month}/${year}`
          })()}</div>
        </div>

        <div class="summary-section">
          <div class="summary-group">
            <h3>المرضى</h3>
            <div class="summary-item">إجمالي: ${patientData.totalPatients}</div>
            <div class="summary-item">جدد: ${patientData.newPatients || 0}</div>
            <div class="summary-item">نشطون: ${patientData.activePatients}</div>
          </div>
          <div class="summary-group">
            <h3>المواعيد</h3>
            <div class="summary-item">إجمالي: ${appointmentData.totalAppointments}</div>
            <div class="summary-item">مكتملة: ${appointmentData.completedAppointments}</div>
            <div class="summary-item">معدل الحضور: ${appointmentData.attendanceRate?.toFixed(1) || 0}%</div>
          </div>
          <div class="summary-group">
            <h3>الإيرادات</h3>
            <div class="summary-item">إجمالي: ${financialData.totalRevenue?.toLocaleString('en-US') || 0} $</div>
            <div class="summary-item">مكتملة: ${financialData.totalRevenue?.toLocaleString('en-US') || 0} $</div>
          </div>
          <div class="summary-group">
            <h3>المخزون</h3>
            <div class="summary-item">إجمالي الأصناف: ${inventoryData.totalItems}</div>
            <div class="summary-item">القيمة: ${inventoryData.totalValue?.toLocaleString('en-US') || 0} $</div>
            <div class="summary-item">تنبيهات: ${(inventoryData.lowStockItems || 0) + (inventoryData.expiredItems || 0)}</div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">مؤشرات الأداء الرئيسية</div>
          <table>
            <thead>
              <tr>
                <th>المؤشر</th>
                <th>القيمة</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>معدل نمو المرضى</td>
                <td>${(((patientData.newPatients || 0) / patientData.totalPatients) * 100).toFixed(1)}%</td>
              </tr>
              <tr>
                <td>معدل حضور المواعيد</td>
                <td>${appointmentData.attendanceRate?.toFixed(1) || 0}%</td>
              </tr>
              <tr>
                <td>معدل الإلغاء</td>
                <td>${appointmentData.cancellationRate?.toFixed(1) || 0}%</td>
              </tr>
              <tr>
                <td>متوسط الإيراد لكل مريض</td>
                <td>${(() => {
                  try {
                    const { getCurrencyConfig, formatCurrencyWithConfig, getDefaultCurrency } = require('@/lib/utils')
                    const config = getCurrencyConfig(getDefaultCurrency())
                    return formatCurrencyWithConfig((financialData.totalRevenue || 0) / patientData.totalPatients, config)
                  } catch (error) {
                    return `$${((financialData.totalRevenue || 0) / patientData.totalPatients).toLocaleString('en-US')}`
                  }
                })()}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </body>
      </html>
    `
  }

  // Convert HTML to PDF using html2canvas + jsPDF with Web Worker support
  private static async convertHTMLToPDF(htmlContent: string, filename: string): Promise<void> {
    try {
      // Create a temporary iframe for better rendering with proper fonts
      const iframe = document.createElement('iframe')
      iframe.style.position = 'absolute'
      iframe.style.left = '-9999px'
      iframe.style.top = '-9999px'
      iframe.style.width = '800px'
      iframe.style.height = '1px'
      
      document.body.appendChild(iframe)
      
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
      if (!iframeDoc) {
        throw new Error('Failed to access iframe document')
      }

      // Write HTML content with proper font loading
      iframeDoc.open()
      iframeDoc.write(htmlContent)
      iframeDoc.close()

      // Wait for fonts and images to load
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Wait for fonts to be fully loaded
      if (iframeDoc.fonts) {
        await iframeDoc.fonts.ready
      }
      
      // Additional wait to ensure everything is rendered
      await new Promise(resolve => setTimeout(resolve, 300))

      const bodyElement = iframeDoc.body
      if (!bodyElement) {
        throw new Error('Failed to get iframe body')
      }

      // Set proper height for iframe
      iframe.style.height = bodyElement.scrollHeight + 'px'

      // Convert to canvas with higher quality settings for Arabic text
      const canvas = await html2canvas(bodyElement, {
        scale: 2, // Higher quality for better text rendering
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: 800,
        height: bodyElement.scrollHeight,
        scrollX: 0,
        scrollY: 0,
        windowWidth: 800,
        windowHeight: bodyElement.scrollHeight,
        logging: false,
        imageTimeout: 0,
        removeContainer: false,
        foreignObjectRendering: true // Better text rendering
      })

      // Remove iframe
      document.body.removeChild(iframe)

      // Create PDF asynchronously with chunked processing
      await this.createPDFAsync(canvas, filename)

    } catch (error) {
      console.error('Error converting HTML to PDF:', error)
      throw new Error('فشل في تحويل التقرير إلى PDF')
    }
  }

  // Web Worker implementation for heavy PDF processing
  private static async processPDFWithWebWorker(element: HTMLElement): Promise<HTMLCanvasElement> {
    try {
      // Check if Web Worker is available and content is suitable
      if (typeof Worker === 'undefined' || element.scrollHeight < 3000) {
        // Fallback to main thread for smaller content or unsupported browsers
        return await html2canvas(element, {
          scale: 1.5,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          width: 800,
          height: element.scrollHeight,
          scrollX: 0,
          scrollY: 0
        })
      }

      // Use Web Worker for large content
      const worker = getPDFWorker()
      const htmlContent = element.outerHTML

      const result = await worker.processHTML(htmlContent, 1.5)

      // Create canvas from worker result
      const canvas = document.createElement('canvas')
      canvas.width = result.width
      canvas.height = result.height

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        throw new Error('Failed to get canvas context')
      }

      const img = new Image()
      img.src = result.canvasData

      return new Promise((resolve, reject) => {
        img.onload = () => {
          ctx.drawImage(img, 0, 0)
          resolve(canvas)
        }
        img.onerror = () => {
          reject(new Error('Failed to load canvas image from Web Worker'))
        }
      })

    } catch (error) {
      console.error('Web Worker PDF processing failed:', error)
      // Fallback to main thread
      return await html2canvas(element, {
        scale: 1.2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: 800,
        height: element.scrollHeight,
        scrollX: 0,
        scrollY: 0
      })
    }
  }

  // Chunk HTML processing for large documents
  private static chunkHTMLProcessing(element: HTMLElement): Array<{element: HTMLElement, height: number}> {
    const chunks: Array<{element: HTMLElement, height: number}> = []
    const maxChunkHeight = 2000 // Maximum height per chunk in pixels

    if (element.scrollHeight <= maxChunkHeight) {
      return [{ element, height: element.scrollHeight }]
    }

    // Clone the element and split into chunks
    const totalHeight = element.scrollHeight
    let currentTop = 0

    while (currentTop < totalHeight) {
      const chunkHeight = Math.min(maxChunkHeight, totalHeight - currentTop)
      const chunk = element.cloneNode(true) as HTMLElement

      // Apply clipping to the chunk
      chunk.style.height = `${chunkHeight}px`
      chunk.style.overflow = 'hidden'
      chunk.style.position = 'relative'

      chunks.push({ element: chunk, height: chunkHeight })
      currentTop += chunkHeight
    }

    return chunks
  }

  // Combine multiple canvases into one
  private static combineCanvases(canvases: HTMLCanvasElement[]): HTMLCanvasElement {
    if (canvases.length === 0) {
      throw new Error('No canvases to combine')
    }

    if (canvases.length === 1) {
      return canvases[0]
    }

    // Calculate total dimensions
    const totalWidth = canvases[0].width
    const totalHeight = canvases.reduce((sum, canvas) => sum + canvas.height, 0)

    // Create combined canvas
    const combinedCanvas = document.createElement('canvas')
    combinedCanvas.width = totalWidth
    combinedCanvas.height = totalHeight

    const ctx = combinedCanvas.getContext('2d')
    if (!ctx) {
      throw new Error('Failed to get canvas context')
    }

    // Draw all canvases
    let currentY = 0
    canvases.forEach(canvas => {
      ctx.drawImage(canvas, 0, currentY, totalWidth, canvas.height)
      currentY += canvas.height
    })

    return combinedCanvas
  }

  // Asynchronous PDF creation with memory management
  private static async createPDFAsync(canvas: HTMLCanvasElement, filename: string): Promise<void> {
    // Create PDF in chunks to avoid memory issues
    const imgData = canvas.toDataURL('image/jpeg', 0.8) // Lower quality for better performance
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
    heightLeft -= (pdfHeight - 20) // Subtract page height minus margins

    // Add additional pages if needed (limit to avoid memory issues)
    const maxPages = 50 // Maximum pages to prevent infinite loops
    let pageCount = 1

    while (heightLeft >= 0 && pageCount < maxPages) {
      position = heightLeft - imgHeight + 10
      pdf.addPage()
      pdf.addImage(imgData, 'JPEG', 10, position, imgWidth, imgHeight)
      heightLeft -= (pdfHeight - 20)
      pageCount++

      // Allow UI to breathe between pages
      if (pageCount % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 10))
      }
    }

    // Save the PDF
    pdf.save(filename)
  }

  static async exportTreatmentReport(reportData: any, settings: any): Promise<void> {
    try {
      const htmlContent = EnhancedPdfReports.createEnhancedTreatmentReportHTML(reportData, settings)
      const fileName = this.generatePDFFileName('treatments')
      await this.convertHTMLToPDF(htmlContent, fileName)
    } catch (error) {
      console.error('Error exporting treatment report:', error)
      throw new Error('فشل في تصدير تقرير العلاجات')
    }
  }

  /**
   * تصدير سجل مريض فردي شامل
   */
  static async exportIndividualPatientRecord(patientData: any, settings?: ClinicSettings | null): Promise<void> {
    try {
      const htmlContent = this.createIndividualPatientRecordHTML(patientData, settings)
      // تنسيق اسم الملف: اسم المريض + التاريخ فقط
      const now = new Date()
      const dateStr = now.toLocaleDateString('en-US').replace(/\//g, '-') // DD-MM-YYYY
      const fileName = `${patientData.patient.full_name.replace(/\s+/g, '_')}_${dateStr}.pdf`
      await this.convertHTMLToPDF(htmlContent, fileName)
    } catch (error) {
      console.error('Error exporting individual patient record:', error)
      throw new Error('فشل في تصدير سجل المريض')
    }
  }

  /**
   * تصدير مدفوعات مريض فردي
   */
  static async exportPatientPayments(patientData: any, settings?: ClinicSettings | null): Promise<void> {
    try {
      const htmlContent = this.createPatientPaymentsHTML(patientData, settings)
      // تنسيق اسم الملف: مدفوعات_اسم المريض + التاريخ
      const now = new Date()
      const dateStr = now.toLocaleDateString('en-US').replace(/\//g, '-') // DD-MM-YYYY
      const fileName = `مدفوعات_${patientData.patient.full_name.replace(/\s+/g, '_')}_${dateStr}.pdf`
      await this.convertHTMLToPDF(htmlContent, fileName)
    } catch (error) {
      console.error('Error exporting patient payments:', error)
      throw new Error('فشل في تصدير مدفوعات المريض')
    }
  }

  /**
   * تصدير علاجات مريض فردي
   */
  static async exportPatientTreatments(patientData: any, settings?: ClinicSettings | null): Promise<void> {
    try {
      const htmlContent = this.createPatientTreatmentsHTML(patientData, settings)
      // تنسيق اسم الملف: علاجات_اسم المريض + التاريخ
      const now = new Date()
      const dateStr = now.toLocaleDateString('en-US').replace(/\//g, '-') // DD-MM-YYYY
      const fileName = `علاجات_${patientData.patient.full_name.replace(/\s+/g, '_')}_${dateStr}.pdf`
      await this.convertHTMLToPDF(htmlContent, fileName)
    } catch (error) {
      console.error('Error exporting patient treatments:', error)
      throw new Error('فشل في تصدير علاجات المريض')
    }
  }

  /**
   * تصدير مواعيد مريض فردي
   */
  static async exportPatientAppointments(patientData: any, settings?: ClinicSettings | null): Promise<void> {
    try {
      const htmlContent = this.createPatientAppointmentsHTML(patientData, settings)
      // تنسيق اسم الملف: مواعيد_اسم المريض + التاريخ
      const now = new Date()
      const dateStr = now.toLocaleDateString('en-US').replace(/\//g, '-') // DD-MM-YYYY
      const fileName = `مواعيد_${patientData.patient.full_name.replace(/\s+/g, '_')}_${dateStr}.pdf`
      await this.convertHTMLToPDF(htmlContent, fileName)
    } catch (error) {
      console.error('Error exporting patient appointments:', error)
      throw new Error('فشل في تصدير مواعيد المريض')
    }
  }

  /**
   * تصدير وصفات مريض فردي
   */
  static async exportPatientPrescriptions(patientData: any, settings?: ClinicSettings | null): Promise<void> {
    try {
      const htmlContent = this.createPatientPrescriptionsHTML(patientData, settings)
      // تنسيق اسم الملف: وصفات_اسم المريض + التاريخ
      const now = new Date()
      const dateStr = now.toLocaleDateString('en-US').replace(/\//g, '-') // DD-MM-YYYY
      const fileName = `وصفات_${patientData.patient.full_name.replace(/\s+/g, '_')}_${dateStr}.pdf`
      await this.convertHTMLToPDF(htmlContent, fileName)
    } catch (error) {
      console.error('Error exporting patient prescriptions:', error)
      throw new Error('فشل في تصدير وصفات المريض')
    }
  }

  /**
   * إنشاء HTML لسجل المريض للطباعة المباشرة
   */
  static createPatientRecordHTMLForPrint(patientData: any, settings?: ClinicSettings | null): string {
    return this.createIndividualPatientRecordHTML(patientData, settings)
  }

  /**
   * إنشاء قالب HTML لسجل المريض الفردي الشامل
   */
  private static createIndividualPatientRecordHTML(patientData: any, settings?: ClinicSettings | null): string {
    const { patient, appointments, treatments, payments, prescriptions, labOrders, stats } = patientData

    // تنسيق التواريخ بالميلادي
    const formatDate = (dateString: string) => {
      if (!dateString) return 'غير محدد'
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      })
    }

    // تنسيق الوقت
    const formatTime = (dateString: string) => {
      if (!dateString) return 'غير محدد'
      return new Date(dateString).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit'
      })
    }

    // تنسيق العملة
    const formatCurrency = (amount: number) => {
      try {
        const config = getCurrencyConfig(settings?.currency || getDefaultCurrency())
        return formatCurrencyWithConfig(amount || 0, config)
      } catch (error) {
        return `$${(amount || 0).toFixed(2)}`
      }
    }

    // دالة لإنشاء جدول محمي من الانقطاع
    const createProtectedTable = (title: string, headers: string[], rows: string[], showTotal: boolean = false, totalRow: string = '') => {
      return `
        <div style="page-break-before: auto; page-break-inside: avoid !important; break-inside: avoid !important; display: block; margin-bottom: 30px;">
          <div class="section-title" style="page-break-after: avoid !important; break-after: avoid !important; margin-bottom: 10px;">${title}</div>
          <div style="page-break-inside: avoid !important; break-inside: avoid !important; display: block; overflow: visible;">
            <table class="data-table" style="page-break-inside: avoid !important; break-inside: avoid !important; width: 100%; table-layout: fixed; border-collapse: collapse; margin: 0;">
              <thead style="page-break-inside: avoid !important; break-inside: avoid !important; page-break-after: avoid !important;">
                <tr>
                  ${headers.map(header => `<th>${header}</th>`).join('')}
                </tr>
              </thead>
              <tbody style="page-break-inside: avoid !important; break-inside: avoid !important;">
                ${rows.join('')}
                ${showTotal && totalRow ? totalRow : ''}
              </tbody>
            </table>
          </div>
        </div>`
    }

    // حساب الإحصائيات المالية الصحيحة
    let totalDue = 0
    let totalPaid = 0

    // حساب المدفوعات بشكل مفصل
    const appointmentPayments: any[] = []
    const treatmentPayments: any[] = []
    const generalPayments: any[] = []

    payments?.forEach((payment: any) => {
      if (payment.appointment_id) {
        appointmentPayments.push(payment)
      } else if (payment.tooth_treatment_id) {
        treatmentPayments.push(payment)
      } else {
        generalPayments.push(payment)
      }
      totalPaid += payment.amount || 0
    })

    // حساب إجمالي التكاليف من المواعيد والعلاجات
    appointments?.forEach((apt: any) => {
      if (apt.cost) totalDue += apt.cost
    })
    treatments?.forEach((treatment: any) => {
      if (treatment.cost) totalDue += treatment.cost
    })

    // إضافة المدفوعات العامة (غير المرتبطة بعلاج) إلى إجمالي التكاليف
    // لأنها تمثل خدمات أو رسوم إضافية
    generalPayments.forEach((payment: any) => {
      // إضافة المبلغ الإجمالي للدفعة العامة كتكلفة
      const paymentCost = payment.treatment_cost || payment.total_amount || payment.amount || 0
      totalDue += paymentCost
    })

    const remainingBalance = Math.max(0, totalDue - totalPaid)

    let htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>${patient.full_name} - ${formatDate(new Date().toISOString())}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #000;
            background: #fff;
            padding: 20px;
            direction: rtl;
          }
          .header {
            text-align: center;
            border-bottom: 3px solid #000;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .clinic-name {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
          }
          .report-title {
            font-size: 20px;
            margin-bottom: 5px;
          }
          .report-date {
            font-size: 14px;
            color: #666;
          }
          .patient-info {
            border: 2px solid #000;
            padding: 20px;
            margin-bottom: 30px;
          }
          .patient-name {
            font-size: 22px;
            font-weight: bold;
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 1px solid #000;
            padding-bottom: 10px;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            padding: 5px 0;
            border-bottom: 1px dotted #ccc;
          }
          .info-label {
            font-weight: bold;
            width: 30%;
          }
          .info-value {
            width: 65%;
          }
          .section-title {
            font-size: 18px;
            font-weight: bold;
            margin: 30px 0 15px 0;
            padding: 10px;
            border: 2px solid #000;
            text-align: center;
            background: #f5f5f5;
            page-break-after: avoid;
            break-after: avoid;
          }
          .data-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            border: 2px solid #000;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .data-table th {
            background: #f0f0f0;
            border: 1px solid #000;
            padding: 10px;
            text-align: center;
            font-weight: bold;
          }
          .data-table td {
            border: 1px solid #000;
            padding: 8px;
            text-align: center;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .data-table tr {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .data-table tr:nth-child(even) {
            background: #f9f9f9;
          }
          .financial-summary {
            border: 2px solid #000;
            padding: 20px;
            margin: 20px 0;
            page-break-before: always;
            page-break-inside: avoid;
          }
          .financial-title {
            font-size: 18px;
            font-weight: bold;
            text-align: center;
            margin-bottom: 15px;
            border-bottom: 1px solid #000;
            padding-bottom: 10px;
          }
          .financial-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            padding: 5px 0;
            border-bottom: 1px dotted #ccc;
          }
          .financial-label {
            font-weight: bold;
          }
          .financial-amount {
            font-weight: bold;
          }
          .no-data {
            text-align: center;
            color: #666;
            font-style: italic;
            padding: 20px;
            border: 1px solid #ccc;
            margin: 20px 0;
          }
          .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 12px;
            color: #666;
            border-top: 1px solid #ccc;
            padding-top: 20px;
          }

          @media print {
  .data-table {
    page-break-inside: avoid;
    break-inside: avoid;
    display: table;
    width: 100%;
  }

  .data-table thead {
    display: table-header-group;
  }

  .data-table tbody {
    display: table-row-group;
  }

  .data-table tr {
    page-break-inside: avoid;
    break-inside: avoid;
  }

  .data-table td,
  .data-table th {
    page-break-inside: avoid;
    break-inside: avoid;
  }

  .section-title {
    page-break-before: always;
    break-before: always;
  }
}

        </style>
      </head>
      <body>
        <!-- رأس التقرير -->
        <div class="header">
          ${settings?.clinic_logo && settings.clinic_logo.trim() !== '' ? `
            <div style="text-align: center; margin-bottom: 15px;">
              <img src="${settings.clinic_logo}" alt="شعار العيادة" style="width: 80px; height: 80px; border-radius: 50%; border: 2px solid #000; object-fit: cover;" />
            </div>
          ` : ''}
          <div class="clinic-name">${settings?.clinic_name || 'عيادة الأسنان'}</div>
          ${settings?.doctor_name ? `<div style="font-size: 16px; margin-bottom: 10px;">د. ${settings.doctor_name}</div>` : ''}
          <div class="report-title">سجل المريض الطبي</div>
          <div class="report-date">تاريخ التقرير: ${formatDate(new Date().toISOString())}</div>
        </div>

        <!-- معلومات المريض الأساسية -->
        <div class="patient-info">
          <div class="patient-name">${patient.full_name}</div>
          <div class="info-row">
            <span class="info-label">العمر:</span>
            <span class="info-value">${patient.age} سنة</span>
          </div>
          <div class="info-row">
            <span class="info-label">الجنس:</span>
            <span class="info-value">${patient.gender === 'male' ? 'ذكر' : 'أنثى'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">رقم الهاتف:</span>
            <span class="info-value">${patient.phone || 'غير محدد'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">البريد الإلكتروني:</span>
            <span class="info-value">${patient.email || 'غير محدد'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">العنوان:</span>
            <span class="info-value">${patient.address || 'غير محدد'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">حالة المريض:</span>
            <span class="info-value">${patient.patient_condition || 'غير محدد'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">الحساسية:</span>
            <span class="info-value">${patient.allergies || 'لا توجد'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">الحالات المرضية:</span>
            <span class="info-value">${patient.medical_conditions || 'لا توجد'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">تاريخ التسجيل:</span>
            <span class="info-value">${formatDate(patient.date_added)}</span>
          </div>
        </div>`

    // إضافة الملخص المالي في صفحة منفصلة
    htmlContent += `
      <!-- الملخص المالي -->
      <div class="financial-summary">
        <div class="header" style="margin-bottom: 30px;">
          <div class="clinic-name">${settings?.clinic_name || 'عيادة الأسنان'}</div>
          <div class="report-title">الملخص المالي للمريض</div>
          <div class="report-date">${patient.full_name} - ${formatDate(new Date().toISOString())}</div>
        </div>

        <div class="financial-title">تفاصيل الحساب المالي</div>
        <div class="financial-row">
          <span class="financial-label">إجمالي التكاليف:</span>
          <span class="financial-amount">${formatCurrency(totalDue)}</span>
        </div>
        <div class="financial-row">
          <span class="financial-label">إجمالي المدفوع:</span>
          <span class="financial-amount">${formatCurrency(totalPaid)}</span>
        </div>
        <div class="financial-row">
          <span class="financial-label">المبلغ المتبقي:</span>
          <span class="financial-amount">${formatCurrency(remainingBalance)}</span>
        </div>

        <div style="margin-top: 30px; padding: 15px; background: #f5f5f5; border-radius: 5px;">
          <div style="font-weight: bold; margin-bottom: 10px;">ملاحظات مالية:</div>
          <div style="font-size: 14px; line-height: 1.6;">
            ${remainingBalance > 0 ?
              `• يوجد مبلغ متبقي قدره ${formatCurrency(remainingBalance)} يجب تحصيله` :
              '• تم سداد جميع المستحقات المالية بالكامل'
            }
            <br>• تاريخ آخر تحديث: ${formatDate(new Date().toISOString())}
            <br>• عدد المدفوعات المسجلة: ${payments ? payments.length : 0}
          </div>
        </div>
      </div>`

    // إضافة قسم المواعيد - جدول واحد فقط
    if (appointments && appointments.length > 0) {
      const title = `سجل المواعيد (${appointments.length})`
      const headers = ['التاريخ', 'الوقت', 'نوع الموعد', 'الحالة', 'الملاحظات']

      const rows = appointments.map((appointment: any) => {
        const statusText = appointment.status === 'completed' ? 'مكتمل' :
                          appointment.status === 'scheduled' ? 'مجدول' :
                          appointment.status === 'cancelled' ? 'ملغي' : 'آجل'

        return `
          <tr>
            <td>${formatDate(appointment.start_time)}</td>
            <td>${formatTime(appointment.start_time)}</td>
            <td>${appointment.appointment_type || 'عام'}</td>
            <td>${statusText}</td>
            <td>${appointment.notes || '-'}</td>
          </tr>`
      })

      htmlContent += createProtectedTable(title, headers, rows)
    } else {
      htmlContent += `
        <div class="section-title">سجل المواعيد</div>
        <div class="no-data">لا توجد مواعيد مسجلة لهذا المريض</div>`
    }

    // إضافة قسم العلاجات - جدول واحد فقط
    if (treatments && treatments.length > 0) {
      const title = `سجل العلاجات (${treatments.length})`
      const headers = ['رقم السن', 'نوع العلاج', 'التكلفة', 'الحالة', 'التاريخ', 'المدفوعات المرتبطة', 'الملاحظات']

      const rows = treatments.map((treatment: any) => {
        const statusText = treatment.treatment_status === 'completed' ? 'مكتمل' :
                          treatment.treatment_status === 'in_progress' ? 'قيد التنفيذ' : 'مخطط'

        // ترجمة اسم العلاج إلى العربية
        const treatmentNameArabic = getTreatmentNameInArabic(treatment.treatment_name || treatment.treatment_type || '')

        // البحث عن المدفوعات المرتبطة بهذا العلاج
        const relatedPayments = treatmentPayments.filter((payment: any) =>
          payment.tooth_treatment_id === treatment.id
        )
        const totalPaidForTreatment = relatedPayments.reduce((sum: number, payment: any) =>
          sum + (payment.amount || 0), 0
        )

        return `
          <tr>
            <td>${treatment.tooth_number || '-'}</td>
            <td>${treatmentNameArabic}</td>
            <td>${formatCurrency(treatment.cost || 0)}</td>
            <td>${statusText}</td>
            <td>${formatDate(treatment.treatment_date || treatment.created_at)}</td>
            <td>${formatCurrency(totalPaidForTreatment)}</td>
            <td>${treatment.notes || '-'}</td>
          </tr>`
      })

      htmlContent += createProtectedTable(title, headers, rows)
    } else {
      htmlContent += `
        <div class="section-title">سجل العلاجات</div>
        <div class="no-data">لا توجد علاجات مسجلة لهذا المريض</div>`
    }

    // إضافة قسم السجل المالي الشامل - جدول واحد فقط
    if (payments && payments.length > 0) {
      const title = `السجل المالي الشامل - جميع المدفوعات (${payments.length})`
      const headers = ['التاريخ', 'المبلغ المدفوع', 'المبلغ الإجمالي', 'طريقة الدفع', 'النوع', 'الوصف', 'الملاحظات']

      const rows = payments.map((payment: any) => {
        const paymentMethod = payment.payment_method === 'cash' ? 'نقدي' :
                             payment.payment_method === 'card' ? 'بطاقة' :
                             payment.payment_method === 'bank_transfer' ? 'تحويل بنكي' : 'أخرى'

        // تحديد نوع الدفعة والوصف بالعربية
        let paymentType = 'عام'
        let description = payment.description || '-'

        // قاموس ترجمة أنواع العلاجات من الإنجليزية للعربية
        const treatmentTranslations: { [key: string]: string } = {
          'zirconia_post_core': 'دعامة زيركونيا - قلب وتد',
          'bone_graft': 'ترقيع عظم',
          'crown': 'تاج',
          'filling': 'حشوة',
          'root_canal': 'علاج عصب',
          'extraction': 'خلع',
          'cleaning': 'تنظيف',
          'implant': 'زراعة',
          'bridge': 'جسر',
          'veneer': 'قشرة',
          'orthodontics': 'تقويم',
          'whitening': 'تبييض',
          'scaling': 'تنظيف الجير',
          'polishing': 'تلميع',
          'consultation': 'استشارة'
        }

        if (payment.tooth_treatment_id) {
          paymentType = 'علاج أسنان'
          // ترجمة نوع العلاج إذا كان بالإنجليزية
          const treatmentName = payment.treatment_name || payment.description || ''
          description = treatmentTranslations[treatmentName] || treatmentName || 'علاج أسنان'
        } else if (payment.appointment_id) {
          paymentType = 'موعد'
          description = payment.appointment_title || payment.description || 'موعد'
        } else {
          // للمدفوعات العامة، ترجم الوصف إذا كان بالإنجليزية
          const originalDesc = payment.description || ''
          description = treatmentTranslations[originalDesc] || originalDesc || 'دفعة عامة'
        }

        return `
          <tr>
            <td>${formatDate(payment.payment_date || payment.created_at)}</td>
            <td>${formatCurrency(payment.amount || payment.total_amount)}</td>
            <td>${formatCurrency(payment.treatment_cost || payment.total_amount || payment.amount)}</td>
            <td>${paymentMethod}</td>
            <td>${paymentType}</td>
            <td>${description}</td>
            <td>${payment.notes || '-'}</td>
          </tr>`
      })

      // إضافة صف المجموع
      const totalPaidAmount = payments.reduce((sum: number, payment: any) => sum + (payment.amount || payment.total_amount || 0), 0)
      const totalCostAmount = payments.reduce((sum: number, payment: any) => sum + (payment.treatment_cost || payment.total_amount || payment.amount || 0), 0)

      const totalRow = `
        <tr style="background-color: #f8f9fa; font-weight: bold; border-top: 2px solid #dee2e6;">
          <td style="text-align: right; padding: 12px;">المجموع:</td>
          <td style="padding: 12px; color: #28a745;">${formatCurrency(totalPaidAmount)}</td>
          <td style="padding: 12px; color: #007bff;">${formatCurrency(totalCostAmount)}</td>
          <td colspan="4"></td>
        </tr>`

      htmlContent += createProtectedTable(title, headers, rows, true, totalRow)

    } else {
      htmlContent += `
        <div class="section-title">سجل المدفوعات</div>
        <div class="no-data">لا توجد مدفوعات مسجلة لهذا المريض</div>`
    }

    // إضافة قسم الوصفات الطبية - جدول واحد فقط
    if (prescriptions && prescriptions.length > 0) {
      const title = `الوصفات الطبية (${prescriptions.length})`
      const headers = ['التاريخ', 'اسم الدواء', 'الجرعة', 'التكرار', 'المدة', 'تعليمات الاستخدام', 'الملاحظات']
      const rows: string[] = []

      prescriptions.forEach((prescription: any) => {
        // Handle medications array if it exists
        if (prescription.medications && prescription.medications.length > 0) {
          prescription.medications.forEach((medication: any, index: number) => {
            rows.push(`
              <tr>
                <td>${formatDate(prescription.prescription_date || prescription.created_at)}</td>
                <td>${medication.medication_name || medication.name || '-'}</td>
                <td>${medication.dosage || '-'}</td>
                <td>${medication.frequency || '-'}</td>
                <td>${medication.duration || '-'}</td>
                <td>${medication.medication_instructions || medication.instructions || '-'}</td>
                <td>${prescription.notes || '-'}</td>
              </tr>`)
          })
        } else {
          // Fallback for single medication data
          rows.push(`
            <tr>
              <td>${formatDate(prescription.prescription_date || prescription.created_at)}</td>
              <td>${prescription.medication_name || '-'}</td>
              <td>${prescription.dosage || '-'}</td>
              <td>${prescription.frequency || '-'}</td>
              <td>${prescription.duration || '-'}</td>
              <td>${prescription.instructions || '-'}</td>
              <td>${prescription.notes || '-'}</td>
            </tr>`)
        }
      })

      htmlContent += createProtectedTable(title, headers, rows)
    } else {
      htmlContent += `
        <div class="section-title">الوصفات الطبية</div>
        <div class="no-data">لا توجد وصفات طبية مسجلة لهذا المريض</div>`
    }

    // إضافة قسم طلبات المختبر
    if (labOrders && labOrders.length > 0) {
      htmlContent += `
        <div style="page-break-before: auto; page-break-inside: avoid; break-inside: avoid;">
          <div class="section-title">طلبات المختبر (${labOrders.length})</div>
          <table class="data-table" style="page-break-inside: avoid !important; break-inside: avoid !important;">
            <thead>
              <tr>
                <th>التاريخ</th>
                <th>نوع الطلب</th>
                <th>الحالة</th>
                <th>التكلفة</th>
                <th>الملاحظات</th>
              </tr>
            </thead>
            <tbody>`

      labOrders.forEach((labOrder: any) => {
        const statusText = labOrder.status === 'completed' ? 'مكتمل' :
                          labOrder.status === 'in_progress' ? 'قيد التنفيذ' : 'آجل'

        htmlContent += `
            <tr>
              <td>${formatDate(labOrder.order_date || labOrder.created_at)}</td>
              <td>${labOrder.order_type || '-'}</td>
              <td>${statusText}</td>
              <td>${formatCurrency(labOrder.cost || 0)}</td>
              <td>${labOrder.notes || '-'}</td>
            </tr>`
      })

      htmlContent += `
            </tbody>
          </table>
        </div>`
    } else {
      htmlContent += `
        <div class="section-title">طلبات المختبر</div>
        <div class="no-data">لا توجد طلبات مختبر مسجلة لهذا المريض</div>`
    }

    // إضافة ملاحظات المريض إذا وجدت
    if (patient.notes) {
      htmlContent += `
        <div class="section-title">ملاحظات إضافية</div>
        <div style="border: 1px solid #ccc; padding: 20px; margin: 20px 0;">
          ${patient.notes}
        </div>`
    }

    // إنهاء HTML
    htmlContent += `
        <div class="footer">
          تم إنشاء هذا  التقرير في ${formatDate(new Date().toISOString())} - ${settings?.clinic_name || 'عيادة الأسنان'}
        </div>
      </body>
      </html>`

    return htmlContent
  }


  static createClinicNeedsReportHTML(data: any, options: { title: string; currency: string; isDarkMode: boolean }): string {
    const { title, currency, isDarkMode } = options

    // Helper functions
    const formatCurrency = (amount: number) => {
      try {
        // Import currency utilities
        const { getCurrencyConfig, formatCurrencyWithConfig } = require('@/lib/utils')
        const config = getCurrencyConfig(currency || 'USD')
        return formatCurrencyWithConfig(amount || 0, config)
      } catch (error) {
        // Fallback formatting
        try {
          return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency || 'USD',
            minimumFractionDigits: 2
          }).format(amount || 0)
        } catch (fallbackError) {
          // Ultimate fallback with dynamic currency
          try {
            const { getCurrencyConfig, getDefaultCurrency } = require('@/lib/utils')
            const config = getCurrencyConfig(currency || getDefaultCurrency())
            const fixedAmount = (amount || 0).toFixed(config.decimals)
            return config.position === 'before' ? `${config.symbol}${fixedAmount}` : `${fixedAmount} ${config.symbol}`
          } catch (ultimateError) {
            return `$${(amount || 0).toFixed(2)}`
          }
        }
      }
    }

    const formatDate = (dateString: string) => {
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

    const getStatusLabel = (status: string) => {
      return getClinicNeedStatusInArabic(status)
    }

    const getPriorityLabel = (priority: string) => {
      return getPriorityLabelInArabic(priority)
    }

    const getStatusColor = (status: string) => {
      const colors: { [key: string]: string } = {
        pending: '#f59e0b',
        ordered: '#3b82f6',
        received: '#10b981',
        cancelled: '#ef4444'
      }
      return colors[status as keyof typeof colors] || '#6b7280'
    }

    const getPriorityColor = (priority: string) => {
      const colors: { [key: string]: string } = {
        urgent: '#dc2626',
        high: '#f59e0b',
        medium: '#3b82f6',
        low: '#10b981'
      }
      return colors[priority as keyof typeof colors] || '#6b7280'
    }



    return `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;500;600;700&display=swap');

          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            font-family: 'Noto Sans Arabic', Arial, sans-serif;
            line-height: 1.6;
            color: ${isDarkMode ? '#e5e7eb' : '#1f2937'};
            background-color: ${isDarkMode ? '#1f2937' : '#ffffff'};
            direction: rtl;
            padding: 20px;
          }

          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 3px solid #3b82f6;
            padding-bottom: 20px;
          }

          .header h1 {
            color: #3b82f6;
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 10px;
          }

          .header p {
            color: ${isDarkMode ? '#9ca3af' : '#6b7280'};
            font-size: 14px;
          }

          .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
          }

          .stat-card {
            background: ${isDarkMode ? '#374151' : '#f8fafc'};
            border: 1px solid ${isDarkMode ? '#4b5563' : '#e2e8f0'};
            border-radius: 8px;
            padding: 20px;
            text-align: center;
          }

          .stat-card h3 {
            color: #3b82f6;
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 8px;
          }

          .stat-card .value {
            font-size: 24px;
            font-weight: 700;
            color: ${isDarkMode ? '#e5e7eb' : '#1f2937'};
          }

          .section {
            margin-bottom: 30px;
          }

          .section h2 {
            color: #3b82f6;
            font-size: 20px;
            font-weight: 600;
            margin-bottom: 15px;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 8px;
          }

          .table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            background: ${isDarkMode ? '#374151' : '#ffffff'};
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          }

          .table th,
          .table td {
            padding: 12px;
            text-align: right;
            border-bottom: 1px solid ${isDarkMode ? '#4b5563' : '#e2e8f0'};
          }

          .table th {
            background: ${isDarkMode ? '#4b5563' : '#f1f5f9'};
            font-weight: 600;
            color: ${isDarkMode ? '#e5e7eb' : '#374151'};
          }

          .table tr:hover {
            background: ${isDarkMode ? '#4b5563' : '#f8fafc'};
          }

          .badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 500;
          }

          .badge-pending { background: #fef3c7; color: #92400e; }
          .badge-ordered { background: #dbeafe; color: #1e40af; }
          .badge-received { background: #d1fae5; color: #065f46; }
          .badge-cancelled { background: #fee2e2; color: #991b1b; }
          .badge-urgent { background: #fee2e2; color: #991b1b; }
          .badge-high { background: #fef3c7; color: #92400e; }
          .badge-medium { background: #dbeafe; color: #1e40af; }
          .badge-low { background: #d1fae5; color: #065f46; }

          .footer {
            margin-top: 40px;
            text-align: center;
            color: ${isDarkMode ? '#9ca3af' : '#6b7280'};
            font-size: 12px;
            border-top: 1px solid ${isDarkMode ? '#4b5563' : '#e2e8f0'};
            padding-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${title}</h1>
          <p>تاريخ التقرير: ${(() => {
            const date = new Date()
            const day = date.getDate().toString().padStart(2, '0')
            const month = (date.getMonth() + 1).toString().padStart(2, '0')
            const year = date.getFullYear()
            return `${day}/${month}/${year}`
          })()} | ${data.filterInfo || 'جميع البيانات'}</p>
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <h3>إجمالي الاحتياجات</h3>
            <div class="value">${data.totalNeeds || 0}</div>
          </div>
          <div class="stat-card">
            <h3>القيمة الإجمالية</h3>
            <div class="value">${formatCurrency(data.totalValue || 0)}</div>
          </div>
          <div class="stat-card">
            <h3>الاحتياجات الآجلة</h3>
            <div class="value">${data.pendingCount || 0}</div>
          </div>
          <div class="stat-card">
            <h3>الاحتياجات العاجلة</h3>
            <div class="value">${data.urgentCount || 0}</div>
          </div>
          <div class="stat-card">
            <h3>معدل الإنجاز</h3>
            <div class="value">${(data.completionRate || 0).toFixed(1)}%</div>
          </div>
          <div class="stat-card">
            <h3>متوسط قيمة الاحتياج</h3>
            <div class="value">${formatCurrency(data.averageNeedValue || 0)}</div>
          </div>
        </div>

        ${data.needsByStatus && data.needsByStatus.length > 0 ? `
        <div class="section">
          <h2>توزيع الاحتياجات حسب الحالة</h2>
          <table class="table">
            <thead>
              <tr>
                <th>الحالة</th>
                <th>العدد</th>
                <th>النسبة المئوية</th>
                <th>القيمة الإجمالية</th>
              </tr>
            </thead>
            <tbody>
              ${data.needsByStatus.map((item: any) => `
                <tr>
                  <td><span class="badge badge-${item.status}">${getStatusLabel(item.status)}</span></td>
                  <td>${item.count}</td>
                  <td>${item.percentage.toFixed(1)}%</td>
                  <td>${formatCurrency(item.value)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        ${data.needsByPriority && data.needsByPriority.length > 0 ? `
        <div class="section">
          <h2>توزيع الاحتياجات حسب الأولوية</h2>
          <table class="table">
            <thead>
              <tr>
                <th>الأولوية</th>
                <th>العدد</th>
                <th>النسبة المئوية</th>
                <th>القيمة الإجمالية</th>
              </tr>
            </thead>
            <tbody>
              ${data.needsByPriority.map((item: any) => `
                <tr>
                  <td><span class="badge badge-${item.priority}">${getPriorityLabel(item.priority)}</span></td>
                  <td>${item.count}</td>
                  <td>${item.percentage.toFixed(1)}%</td>
                  <td>${formatCurrency(item.value)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        ${data.topExpensiveNeeds && data.topExpensiveNeeds.length > 0 ? `
        <div class="section">
          <h2>الاحتياجات الأغلى سعراً (أعلى 10)</h2>
          <table class="table">
            <thead>
              <tr>
                <th>اسم الاحتياج</th>
                <th>الكمية</th>
                <th>القيمة الإجمالية</th>
              </tr>
            </thead>
            <tbody>
              ${data.topExpensiveNeeds.map((need: any) => `
                <tr>
                  <td>${need.need_name}</td>
                  <td>${need.quantity}</td>
                  <td>${formatCurrency(need.value)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        ${data.needsByCategory && data.needsByCategory.length > 0 ? `
        <div class="section">
          <h2>توزيع الاحتياجات حسب الفئة</h2>
          <table class="table">
            <thead>
              <tr>
                <th>الفئة</th>
                <th>العدد</th>
                <th>القيمة الإجمالية</th>
              </tr>
            </thead>
            <tbody>
              ${data.needsByCategory.map((item: any) => `
                <tr>
                  <td>${item.category || 'غير محدد'}</td>
                  <td>${item.count}</td>
                  <td>${formatCurrency(item.value)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        ${data.urgentNeeds && data.urgentNeeds.length > 0 ? `
        <div class="section">
          <h2>الاحتياجات العاجلة</h2>
          <table class="table">
            <thead>
              <tr>
                <th>اسم الاحتياج</th>
                <th>الحالة</th>
                <th>الفئة</th>
                <th>القيمة</th>
                <th>تاريخ الإنشاء</th>
              </tr>
            </thead>
            <tbody>
              ${data.urgentNeeds.slice(0, 10).map((need: any) => `
                <tr>
                  <td>${need.need_name}</td>
                  <td><span class="badge badge-${need.status}">${getStatusLabel(need.status)}</span></td>
                  <td>${need.category || 'غير محدد'}</td>
                  <td>${formatCurrency(need.price * need.quantity)}</td>
                  <td>${formatDate(need.created_at)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        ${data.pendingNeeds && data.pendingNeeds.length > 0 ? `
        <div class="section">
          <h2>الاحتياجات الآجلة</h2>
          <table class="table">
            <thead>
              <tr>
                <th>اسم الاحتياج</th>
                <th>الفئة</th>
                <th>الأولوية</th>
                <th>القيمة</th>
                <th>تاريخ الإنشاء</th>
              </tr>
            </thead>
            <tbody>
              ${data.pendingNeeds.slice(0, 10).map((need: any) => `
                <tr>
                  <td>${need.need_name}</td>
                  <td>${need.category || 'غير محدد'}</td>
                  <td><span class="badge badge-${need.priority}">${getPriorityLabel(need.priority)}</span></td>
                  <td>${formatCurrency(need.price * need.quantity)}</td>
                  <td>${formatDate(need.created_at)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        ${data.recentlyReceived && data.recentlyReceived.length > 0 ? `
        <div class="section">
          <h2>الاحتياجات المستلمة حديثاً</h2>
          <table class="table">
            <thead>
              <tr>
                <th>اسم الاحتياج</th>
                <th>الفئة</th>
                <th>المورد</th>
                <th>القيمة</th>
                <th>تاريخ الإنشاء</th>
              </tr>
            </thead>
            <tbody>
              ${data.recentlyReceived.slice(0, 10).map((need: any) => `
                <tr>
                  <td>${need.need_name}</td>
                  <td>${need.category || 'غير محدد'}</td>
                  <td>${need.supplier || 'غير محدد'}</td>
                  <td>${formatCurrency(need.price * need.quantity)}</td>
                  <td>${formatDate(need.created_at)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        <div class="footer">
          <p>تم إنشاء هذا التقرير بواسطة نظام إدارة العيادة | ${(() => {
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
      </body>
      </html>
    `
  }

  // Create comprehensive financial report HTML with expenses
  private static createComprehensiveFinancialReportHTML(data: any, settings?: ClinicSettings | null): string {
    const formatCurrency = (amount: number) => {
      try {
        const config = getCurrencyConfig(settings?.currency || getDefaultCurrency())
        return formatCurrencyWithConfig(amount || 0, config)
      } catch (error) {
        return `$${(amount || 0).toFixed(2)}`
      }
    }
    const formatDate = (dateStr: string) => {
      if (!dateStr) return 'غير محدد'
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) return 'غير محدد'
      // Use Gregorian date format instead of Arabic
      return date.toLocaleDateString('en-US')
    }

    return `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>التقرير المالي الشامل - ${settings?.clinic_name || 'عيادة الأسنان'}</title>
        <style>
          body {
            font-family: 'Tajawal', Arial, sans-serif;
            direction: rtl;
            margin: 20px;
            line-height: 1.6;
            color: #1e293b;
          }
          .header {
            text-align: center;
            border-bottom: 3px solid #0ea5e9;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .clinic-name {
            font-size: 28px;
            font-weight: bold;
            color: #0ea5e9;
            margin-bottom: 10px;
          }
          .report-title {
            font-size: 24px;
            font-weight: bold;
            color: #1e293b;
            margin-bottom: 5px;
          }
          .report-subtitle {
            font-size: 16px;
            color: #64748b;
            margin-bottom: 10px;
          }
          .report-date {
            font-size: 14px;
            color: #64748b;
          }
          .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 30px 0;
          }
          .summary-card {
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            padding: 20px;
            border-radius: 12px;
            text-align: center;
            border: 1px solid #e2e8f0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .summary-card h3 {
            margin: 0 0 10px 0;
            font-size: 14px;
            color: #64748b;
            font-weight: 600;
          }
          .summary-card .number {
            font-size: 20px;
            font-weight: bold;
            color: #0ea5e9;
          }
          .profit { color: #10b981 !important; }
          .loss { color: #ef4444 !important; }
          .warning { color: #f59e0b !important; }
          .section {
            margin: 40px 0;
            page-break-inside: avoid;
          }
          .section-title {
            font-size: 20px;
            font-weight: bold;
            color: #0ea5e9;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #e2e8f0;
          }
          .subsection-title {
            font-size: 16px;
            font-weight: bold;
            color: #1e293b;
            margin: 20px 0 10px 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
          th, td {
            padding: 12px 15px;
            text-align: center;
            border-bottom: 1px solid #e2e8f0;
          }
          th {
            background: #f8fafc;
            font-weight: bold;
            color: #1e293b;
            font-size: 14px;
          }
          td {
            font-size: 13px;
          }
          .profit-loss-section {
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            padding: 25px;
            border-radius: 12px;
            border: 1px solid #0ea5e9;
            margin: 30px 0;
          }
          .two-column {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin: 20px 0;
          }
          .info-box {
            background: #f8fafc;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #0ea5e9;
            margin: 15px 0;
          }
          .footer {
            text-align: center;
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
            color: #64748b;
            font-size: 12px;
          }
          @media print {
            body { margin: 0; }
            .section { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="clinic-name">${settings?.clinic_name || 'عيادة الأسنان الحديثة'}</div>
          <div class="report-title">التقرير المالي الشامل</div>
          <div class="report-subtitle">تحليل شامل للأرباح والخسائر والإيرادات والمصروفات</div>
          <div class="report-date">${(() => {
            const date = new Date()
            const day = date.getDate().toString().padStart(2, '0')
            const month = (date.getMonth() + 1).toString().padStart(2, '0')
            const year = date.getFullYear()
            const time = date.toLocaleTimeString('ar-SA', {
              hour: '2-digit',
              minute: '2-digit'
            })
            return `${day}/${month}/${year} - ${time}`
          })()}</div>
          ${data.filterInfo ? `<div class="info-box">${data.filterInfo}</div>` : ''}
        </div>

        <!-- الإحصائيات المالية الرئيسية -->
        <div class="section">
          <div class="section-title">الإحصائيات المالية الرئيسية</div>
          <div class="summary-grid">
            <div class="summary-card">
              <h3>إجمالي الإيرادات</h3>
              <div class="number profit">${formatCurrency(data.totalRevenue || 0)}</div>
            </div>
            <div class="summary-card">
              <h3>إجمالي المصروفات</h3>
              <div class="number">${formatCurrency(data.totalExpenses || 0)}</div>
            </div>
            <div class="summary-card">
              <h3>صافي ${data.isProfit ? 'الربح' : 'الخسارة'}</h3>
              <div class="number ${data.isProfit ? 'profit' : 'loss'}">
                ${formatCurrency(data.isProfit ? (data.netProfit || 0) : (data.lossAmount || 0))}
              </div>
            </div>
            <div class="summary-card">
              <h3>هامش الربح</h3>
              <div class="number ${data.profitMargin >= 0 ? 'profit' : 'loss'}">
                ${(data.profitMargin || 0).toFixed(2)}%
              </div>
            </div>
            <div class="summary-card">
              <h3>المبالغ الآجلة</h3>
              <div class="number warning">${formatCurrency(data.totalPending || 0)}</div>
            </div>
            <div class="summary-card">
              <h3>المبالغ المتبقية</h3>
              <div class="number warning">${formatCurrency(data.totalOverdue || 0)}</div>
            </div>
          </div>
        </div>

        <!-- تحليل الأرباح والخسائر -->
        <div class="profit-loss-section">
          <div class="section-title">تحليل الأرباح والخسائر التفصيلي</div>
          <div class="two-column">
            <div>
              <div class="subsection-title">الإيرادات</div>
              <table>
                <tr><td>المدفوعات المكتملة</td><td>${formatCurrency(data.totalPaid || 0)}</td></tr>
                <tr><td>المدفوعات الجزئية</td><td>${formatCurrency((data.totalRevenue || 0) - (data.totalPaid || 0))}</td></tr>
                <tr><td><strong>إجمالي الإيرادات</strong></td><td><strong>${formatCurrency(data.totalRevenue || 0)}</strong></td></tr>
              </table>
            </div>
            <div>
              <div class="subsection-title">المصروفات</div>
              <table>
                <tr><td>مصروفات العيادة المباشرة</td><td>${formatCurrency(data.clinicExpensesTotal || 0)}</td></tr>
                <tr><td>مصروفات المخابر</td><td>${formatCurrency(data.labOrdersTotal || 0)}</td></tr>
                <tr><td>مصروفات الاحتياجات</td><td>${formatCurrency(data.clinicNeedsTotal || 0)}</td></tr>
                <tr><td>مصروفات المخزون</td><td>${formatCurrency(data.inventoryExpenses || 0)}</td></tr>
                <tr><td><strong>إجمالي المصروفات</strong></td><td><strong>${formatCurrency(data.totalExpenses || 0)}</strong></td></tr>
              </table>
            </div>
          </div>
        </div>

        <!-- إحصائيات المعاملات -->
        <div class="section">
          <div class="section-title">إحصائيات المعاملات</div>
          <div class="summary-grid">
            <div class="summary-card">
              <h3>إجمالي المعاملات</h3>
              <div class="number">${data.totalTransactions || 0}</div>
            </div>
            <div class="summary-card">
              <h3>المعاملات المكتملة</h3>
              <div class="number profit">${data.completedPayments || 0}</div>
            </div>
            <div class="summary-card">
              <h3>المعاملات الجزئية</h3>
              <div class="number warning">${data.partialPayments || 0}</div>
            </div>
            <div class="summary-card">
              <h3>المعاملات الآجلة</h3>
              <div class="number">${data.pendingPayments || 0}</div>
            </div>
            <div class="summary-card">
              <h3>معدل النجاح</h3>
              <div class="number profit">${data.successRate || '0.0'}%</div>
            </div>
            <div class="summary-card">
              <h3>متوسط المعاملة</h3>
              <div class="number">${formatCurrency(parseFloat(data.averageTransaction || '0'))}</div>
            </div>
          </div>
        </div>

        <!-- توزيع طرق الدفع -->
        ${data.revenueByPaymentMethod && data.revenueByPaymentMethod.length > 0 ? `
        <div class="section">
          <div class="section-title">توزيع الإيرادات حسب طريقة الدفع</div>
          <table>
            <thead>
              <tr>
                <th>طريقة الدفع</th>
                <th>المبلغ</th>
                <th>النسبة المئوية</th>
              </tr>
            </thead>
            <tbody>
              ${data.revenueByPaymentMethod.map((method: any) => `
                <tr>
                  <td>${method.method}</td>
                  <td>${formatCurrency(method.amount)}</td>
                  <td>${method.percentage.toFixed(2)}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        <!-- توزيع المصروفات حسب النوع -->
        ${data.expensesByType && data.expensesByType.length > 0 ? `
        <div class="section">
          <div class="section-title">توزيع المصروفات حسب النوع</div>
          <table>
            <thead>
              <tr>
                <th>نوع المصروف</th>
                <th>المبلغ</th>
                <th>النسبة المئوية</th>
              </tr>
            </thead>
            <tbody>
              ${data.expensesByType.map((expense: any) => `
                <tr>
                  <td>${expense.type}</td>
                  <td>${formatCurrency(expense.amount)}</td>
                  <td>${expense.percentage.toFixed(2)}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        <!-- تفاصيل المصروفات الحديثة -->
        ${data.expenses && data.expenses.length > 0 ? `
        <div class="section">
          <div class="section-title">المصروفات الحديثة (آخر 10 مصروفات)</div>
          <table>
            <thead>
              <tr>
                <th>اسم المصروف</th>
                <th>النوع</th>
                <th>المبلغ</th>
                <th>طريقة الدفع</th>
                <th>تاريخ الدفع</th>
                <th>المورد</th>
              </tr>
            </thead>
            <tbody>
              ${data.expenses.slice(0, 10).map((expense: any) => `
                <tr>
                  <td>${expense.expense_name || 'غير محدد'}</td>
                  <td>${(() => {
                    const typeMapping: { [key: string]: string } = {
                      'salary': 'رواتب',
                      'utilities': 'مرافق',
                      'rent': 'إيجار',
                      'maintenance': 'صيانة',
                      'supplies': 'مستلزمات',
                      'insurance': 'تأمين',
                      'other': 'أخرى'
                    }
                    return typeMapping[expense.expense_type as string] || expense.expense_type || 'غير محدد'
                  })()}</td>
                  <td>${formatCurrency(expense.amount || 0)}</td>
                  <td>${(() => {
                    const methodMapping: { [key: string]: string } = {
                      'cash': 'نقداً',
                      'bank_transfer': 'تحويل بنكي',
                      'check': 'شيك',
                      'credit_card': 'بطاقة ائتمان'
                    }
                    return methodMapping[expense.payment_method as string] || expense.payment_method || 'غير محدد'
                  })()}</td>
                  <td>${expense.payment_date ? (() => {
                    try {
                      const date = new Date(expense.payment_date)
                      // Use Gregorian date format instead of Arabic
                      return date.toLocaleDateString('en-US')
                    } catch {
                      return expense.payment_date
                    }
                  })() : 'غير محدد'}</td>
                  <td>${expense.vendor || 'غير محدد'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        <div class="footer">
          <p>تم إنشاء هذا التقرير بواسطة نظام إدارة العيادة | ${(() => {
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
      </body>
      </html>
    `
  }

  // Helper methods for translations
  private static translateStatus(status: string): string {
    return getStatusLabelInArabic(status)
  }

  private static translatePaymentMethod(method: string): string {
    return getPaymentStatusInArabic(method)
  }

  /**
   * تنسيق التاريخ بالتقويم الميلادي
   */
  private static formatGregorianDate(date: Date): string {
    if (!date || isNaN(date.getTime())) {
      return 'غير محدد'
    }

    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = date.getFullYear()

    return `${day}/${month}/${year}`
  }

  /**
   * إنشاء HTML لمدفوعات المريض فقط
   */
  private static createPatientPaymentsHTML(patientData: any, settings?: ClinicSettings | null): string {
    const { patient, payments } = patientData
    const clinic_info = settings || {}

    // دالة تنسيق العملة
    const formatCurrency = (amount: number): string => {
      if ((clinic_info as any)?.currency && (clinic_info as any)?.currency !== 'SYP') {
        const currencySymbols: { [key: string]: string } = {
          'USD': '$',
          'EUR': '€',
          'SYP': 'ل.س',
          'TRY': '₺',
          'SAR': 'ر.س'
        }
        const symbol = currencySymbols[(clinic_info as any).currency] || (clinic_info as any).currency
        return `${amount.toLocaleString('en-US')} ${symbol}`
      }
      return `${amount.toLocaleString('en-US')} ل.س`
    }

    // دالة تنسيق التاريخ بالتقويم الميلادي
    const formatDate = (dateString: string): string => {
      const date = new Date(dateString)
      if (!date || isNaN(date.getTime())) {
        return 'غير محدد'
      }

      const day = date.getDate().toString().padStart(2, '0')
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      const year = date.getFullYear()

      return `${day}/${month}/${year}`
    }

    // حساب الإحصائيات المالية
    let totalPaid = 0
    const treatmentPayments: any[] = []
    const appointmentPayments: any[] = []
    const generalPayments: any[] = []

    payments?.forEach((payment: any) => {
      if (payment.tooth_treatment_id) {
        treatmentPayments.push(payment)
      } else if (payment.appointment_id) {
        appointmentPayments.push(payment)
      } else {
        generalPayments.push(payment)
      }
      totalPaid += payment.amount || 0
    })

    let htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>مدفوعات المريض - ${patient.full_name}</title>
        <style>
          body {
            font-family: 'Tajawal', Arial, sans-serif;
            direction: rtl;
            margin: 20px;
            line-height: 1.6;
            color: #1e293b;
          }
          .header {
            text-align: center;
            border-bottom: 3px solid #0ea5e9;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .clinic-info h1 {
            font-size: 28px;
            font-weight: bold;
            color: #0ea5e9;
            margin-bottom: 10px;
          }
          .report-info h2 {
            font-size: 24px;
            font-weight: bold;
            color: #1e293b;
            margin-bottom: 5px;
          }
          .patient-info, .financial-summary {
            margin: 30px 0;
            padding: 20px;
            background: #f8fafc;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
          }
          .info-grid, .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-top: 15px;
          }
          .summary-item {
            display: flex;
            justify-content: space-between;
            padding: 10px;
            background: white;
            border-radius: 6px;
            border: 1px solid #e2e8f0;
          }
          .label {
            font-weight: 600;
            color: #64748b;
          }
          .value {
            font-weight: bold;
            color: #0ea5e9;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
          th, td {
            padding: 12px 15px;
            text-align: center;
            border-bottom: 1px solid #e2e8f0;
          }
          th {
            background: #f8fafc;
            font-weight: bold;
            color: #1e293b;
            font-size: 14px;
          }
          .section-title {
            font-size: 20px;
            font-weight: bold;
            color: #0ea5e9;
            margin: 30px 0 15px 0;
            padding-bottom: 10px;
            border-bottom: 2px solid #e2e8f0;
          }
          .no-data {
            text-align: center;
            padding: 40px;
            color: #64748b;
            font-style: italic;
          }
          .footer {
            text-align: center;
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
            color: #64748b;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="clinic-info">
            <h1>${(clinic_info as any)?.clinic_name || 'عيادة الأسنان الحديثة'}</h1>
            ${(clinic_info as any)?.address ? `<p>${(clinic_info as any).address}</p>` : ''}
            ${(clinic_info as any)?.phone ? `<p>الهاتف: ${(clinic_info as any).phone}</p>` : ''}
            ${(clinic_info as any)?.email ? `<p>البريد الإلكتروني: ${(clinic_info as any).email}</p>` : ''}
          </div>
          <div class="report-info">
            <h2>تقرير مدفوعات المريض</h2>
            <p>تاريخ التقرير: ${formatDate(new Date().toISOString())}</p>
          </div>
        </div>

        <div class="patient-info">
          <h3>معلومات المريض</h3>
          <div class="info-grid">
            <div><strong>الاسم:</strong> ${patient.full_name}</div>
            <div><strong>الجنس:</strong> ${patient.gender === 'male' ? 'ذكر' : 'أنثى'}</div>
            <div><strong>العمر:</strong> ${patient.age} سنة</div>
            ${patient.phone ? `<div><strong>الهاتف:</strong> ${patient.phone}</div>` : ''}
            ${patient.email ? `<div><strong>البريد الإلكتروني:</strong> ${patient.email}</div>` : ''}
          </div>
        </div>

        <div class="financial-summary">
          <h3>الملخص المالي</h3>
          <div class="summary-grid">
            <div class="summary-item">
              <span class="label">إجمالي المدفوعات:</span>
              <span class="value">${formatCurrency(totalPaid)}</span>
            </div>
            <div class="summary-item">
              <span class="label">عدد المدفوعات:</span>
              <span class="value">${payments?.length || 0}</span>
            </div>
            <div class="summary-item">
              <span class="label">مدفوعات العلاجات:</span>
              <span class="value">${treatmentPayments.length}</span>
            </div>
            <div class="summary-item">
              <span class="label">مدفوعات المواعيد:</span>
              <span class="value">${appointmentPayments.length}</span>
            </div>
          </div>
        </div>`

    // جدول المدفوعات
    if (payments && payments.length > 0) {
      const title = 'سجل المدفوعات'
      const headers = ['التاريخ', 'المبلغ', 'طريقة الدفع', 'النوع', 'الوصف', 'رقم الإيصال', 'الحالة']

      const rows = payments.map((payment: any) => {
        const paymentType = payment.tooth_treatment_id ? 'علاج سني' :
                           payment.appointment_id ? 'موعد' : 'دفعة عامة'

        const statusText = payment.status === 'completed' ? 'مكتمل' :
                          payment.status === 'partial' ? 'جزئي' : 'آجل'

        const methodText = payment.payment_method === 'cash' ? 'نقدي' : 'تحويل بنكي'

        return `
          <tr>
            <td>${formatDate(payment.payment_date)}</td>
            <td>${formatCurrency(payment.amount)}</td>
            <td>${methodText}</td>
            <td>${paymentType}</td>
            <td>${payment.description || '-'}</td>
            <td>${payment.receipt_number || '-'}</td>
            <td>${statusText}</td>
          </tr>`
      })

      htmlContent += `
        <div class="section-title">${title}</div>
        <table>
          <thead>
            <tr>
              ${headers.map(header => `<th>${header}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${rows.join('')}
          </tbody>
        </table>`
    } else {
      htmlContent += `
        <div class="section-title">سجل المدفوعات</div>
        <div class="no-data">لا توجد مدفوعات مسجلة لهذا المريض</div>`
    }

    htmlContent += `
        <div class="footer">
          <p>تم إنشاء هذا التقرير بواسطة ${(clinic_info as any)?.clinic_name || 'عيادة الأسنان الحديثة'}</p>
          <p>تاريخ الطباعة: ${formatDate(new Date().toISOString())}</p>
        </div>
      </body>
      </html>`

    return htmlContent
  }

  /**
   * إنشاء HTML لعلاجات المريض فقط
   */
  private static createPatientTreatmentsHTML(patientData: any, settings?: ClinicSettings | null): string {
    const { patient, treatments } = patientData
    const clinic_info = settings || {}

    // دالة تنسيق العملة
    const formatCurrency = (amount: number): string => {
      if ((clinic_info as any)?.currency && (clinic_info as any)?.currency !== 'SYP') {
        const currencySymbols: { [key: string]: string } = {
          'USD': '$',
          'EUR': '€',
          'SYP': 'ل.س',
          'TRY': '₺',
          'SAR': 'ر.س'
        }
        const symbol = currencySymbols[(clinic_info as any).currency] || (clinic_info as any).currency
        return `${amount.toLocaleString('en-US')} ${symbol}`
      }
      return `${amount.toLocaleString('en-US')} ل.س`
    }

    // دالة تنسيق التاريخ بالتقويم الميلادي
    const formatDate = (dateString: string): string => {
      const date = new Date(dateString)
      if (!date || isNaN(date.getTime())) {
        return 'غير محدد'
      }

      const day = date.getDate().toString().padStart(2, '0')
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      const year = date.getFullYear()

      return `${day}/${month}/${year}`
    }

    // حساب الإحصائيات
    const totalTreatments = treatments?.length || 0
    const completedTreatments = treatments?.filter((t: any) => t.treatment_status === 'completed').length || 0
    const inProgressTreatments = treatments?.filter((t: any) => t.treatment_status === 'in_progress').length || 0
    const plannedTreatments = treatments?.filter((t: any) => t.treatment_status === 'planned').length || 0
    const totalCost = treatments?.reduce((sum: number, t: any) => sum + (t.cost || 0), 0) || 0

    let htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>علاجات المريض - ${patient.full_name}</title>
        <style>
          body {
            font-family: 'Tajawal', Arial, sans-serif;
            direction: rtl;
            margin: 20px;
            line-height: 1.6;
            color: #1e293b;
          }
          .header {
            text-align: center;
            border-bottom: 3px solid #0ea5e9;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .clinic-info h1 {
            font-size: 28px;
            font-weight: bold;
            color: #0ea5e9;
            margin-bottom: 10px;
          }
          .report-info h2 {
            font-size: 24px;
            font-weight: bold;
            color: #1e293b;
            margin-bottom: 5px;
          }
          .patient-info, .financial-summary {
            margin: 30px 0;
            padding: 20px;
            background: #f8fafc;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
          }
          .info-grid, .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-top: 15px;
          }
          .summary-item {
            display: flex;
            justify-content: space-between;
            padding: 10px;
            background: white;
            border-radius: 6px;
            border: 1px solid #e2e8f0;
          }
          .label {
            font-weight: 600;
            color: #64748b;
          }
          .value {
            font-weight: bold;
            color: #0ea5e9;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
          th, td {
            padding: 12px 15px;
            text-align: center;
            border-bottom: 1px solid #e2e8f0;
          }
          th {
            background: #f8fafc;
            font-weight: bold;
            color: #1e293b;
            font-size: 14px;
          }
          .section-title {
            font-size: 20px;
            font-weight: bold;
            color: #0ea5e9;
            margin: 30px 0 15px 0;
            padding-bottom: 10px;
            border-bottom: 2px solid #e2e8f0;
          }
          .no-data {
            text-align: center;
            padding: 40px;
            color: #64748b;
            font-style: italic;
          }
          .footer {
            text-align: center;
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
            color: #64748b;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="clinic-info">
            <h1>${(clinic_info as any)?.clinic_name || 'عيادة الأسنان الحديثة'}</h1>
            ${(clinic_info as any)?.address ? `<p>${(clinic_info as any).address}</p>` : ''}
            ${(clinic_info as any)?.phone ? `<p>الهاتف: ${(clinic_info as any).phone}</p>` : ''}
            ${(clinic_info as any)?.email ? `<p>البريد الإلكتروني: ${(clinic_info as any).email}</p>` : ''}
          </div>
          <div class="report-info">
            <h2>تقرير علاجات المريض</h2>
            <p>تاريخ التقرير: ${formatDate(new Date().toISOString())}</p>
          </div>
        </div>

        <div class="patient-info">
          <h3>معلومات المريض</h3>
          <div class="info-grid">
            <div><strong>الاسم:</strong> ${patient.full_name}</div>
            <div><strong>الجنس:</strong> ${patient.gender === 'male' ? 'ذكر' : 'أنثى'}</div>
            <div><strong>العمر:</strong> ${patient.age} سنة</div>
            ${patient.phone ? `<div><strong>الهاتف:</strong> ${patient.phone}</div>` : ''}
            ${patient.email ? `<div><strong>البريد الإلكتروني:</strong> ${patient.email}</div>` : ''}
          </div>
        </div>

        <div class="financial-summary">
          <h3>ملخص العلاجات</h3>
          <div class="summary-grid">
            <div class="summary-item">
              <span class="label">إجمالي العلاجات:</span>
              <span class="value">${totalTreatments}</span>
            </div>
            <div class="summary-item">
              <span class="label">العلاجات المكتملة:</span>
              <span class="value">${completedTreatments}</span>
            </div>
            <div class="summary-item">
              <span class="label">العلاجات قيد التنفيذ:</span>
              <span class="value">${inProgressTreatments}</span>
            </div>
            <div class="summary-item">
              <span class="label">العلاجات المخططة:</span>
              <span class="value">${plannedTreatments}</span>
            </div>
            <div class="summary-item">
              <span class="label">إجمالي التكلفة:</span>
              <span class="value">${formatCurrency(totalCost)}</span>
            </div>
          </div>
        </div>`

    // جدول العلاجات
    if (treatments && treatments.length > 0) {
      const title = 'سجل العلاجات'
      const headers = ['رقم السن', 'اسم السن', 'نوع العلاج', 'التكلفة', 'الحالة', 'تاريخ البدء', 'تاريخ الانتهاء', 'الملاحظات']

      const rows = treatments.map((treatment: any) => {
        const statusText = treatment.treatment_status === 'completed' ? 'مكتمل' :
                          treatment.treatment_status === 'in_progress' ? 'قيد التنفيذ' :
                          treatment.treatment_status === 'planned' ? 'مخطط' : 'ملغي'

        // ترجمة اسم العلاج إلى العربية
        const treatmentNameArabic = getTreatmentNameInArabic(treatment.treatment_type || '')

        return `
          <tr>
            <td>${treatment.tooth_number || '-'}</td>
            <td>${treatment.tooth_name || '-'}</td>
            <td>${treatmentNameArabic}</td>
            <td>${formatCurrency(treatment.cost || 0)}</td>
            <td>${statusText}</td>
            <td>${treatment.start_date ? formatDate(treatment.start_date) : '-'}</td>
            <td>${treatment.completion_date ? formatDate(treatment.completion_date) : '-'}</td>
            <td>${treatment.notes || '-'}</td>
          </tr>`
      })

      htmlContent += `
        <div class="section-title">${title}</div>
        <table>
          <thead>
            <tr>
              ${headers.map(header => `<th>${header}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${rows.join('')}
          </tbody>
        </table>`
    } else {
      htmlContent += `
        <div class="section-title">سجل العلاجات</div>
        <div class="no-data">لا توجد علاجات مسجلة لهذا المريض</div>`
    }

    htmlContent += `
        <div class="footer">
          <p>تم إنشاء هذا التقرير بواسطة ${(clinic_info as any)?.clinic_name || 'عيادة الأسنان الحديثة'}</p>
          <p>تاريخ الطباعة: ${formatDate(new Date().toISOString())}</p>
        </div>
      </body>
      </html>`

    return htmlContent
  }

  /**
   * إنشاء HTML لمواعيد المريض فقط
   */
  private static createPatientAppointmentsHTML(patientData: any, settings?: ClinicSettings | null): string {
    const { patient, appointments } = patientData
    const clinic_info = settings || {}

    // دالة تنسيق التاريخ بالتقويم الميلادي
    const formatDate = (dateString: string): string => {
      if (!dateString) return 'غير محدد'

      const date = new Date(dateString)
      if (!date || isNaN(date.getTime())) {
        return 'غير محدد'
      }

      const day = date.getDate().toString().padStart(2, '0')
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      const year = date.getFullYear()

      return `${day}/${month}/${year}`
    }

    // دالة تنسيق الوقت
    const formatTime = (dateTimeString: string): string => {
      if (!dateTimeString) return 'غير محدد'

      const date = new Date(dateTimeString)
      if (!date || isNaN(date.getTime())) {
        return 'غير محدد'
      }

      // تنسيق الوقت بصيغة HH:MM
      return date.toLocaleTimeString('ar-SA', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      })
    }

    // دالة تنسيق التاريخ والوقت معاً
    const formatDateTime = (dateTimeString: string): { date: string, time: string } => {
      if (!dateTimeString) return { date: 'غير محدد', time: 'غير محدد' }

      const date = new Date(dateTimeString)
      if (!date || isNaN(date.getTime())) {
        return { date: 'غير محدد', time: 'غير محدد' }
      }

      return {
        date: formatDate(dateTimeString),
        time: formatTime(dateTimeString)
      }
    }

    // حساب الإحصائيات
    const totalAppointments = appointments?.length || 0
    const completedAppointments = appointments?.filter((a: any) => a.status === 'completed').length || 0
    const cancelledAppointments = appointments?.filter((a: any) => a.status === 'cancelled').length || 0
    const scheduledAppointments = appointments?.filter((a: any) => a.status === 'scheduled').length || 0
    const noShowAppointments = appointments?.filter((a: any) => a.status === 'no_show').length || 0

    let htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>مواعيد المريض - ${patient.full_name}</title>
        <style>
          body {
            font-family: 'Tajawal', Arial, sans-serif;
            direction: rtl;
            margin: 20px;
            line-height: 1.6;
            color: #1e293b;
          }
          .header {
            text-align: center;
            border-bottom: 3px solid #0ea5e9;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .clinic-info h1 {
            font-size: 28px;
            font-weight: bold;
            color: #0ea5e9;
            margin-bottom: 10px;
          }
          .report-info h2 {
            font-size: 24px;
            font-weight: bold;
            color: #1e293b;
            margin-bottom: 5px;
          }
          .patient-info, .financial-summary {
            margin: 30px 0;
            padding: 20px;
            background: #f8fafc;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
          }
          .info-grid, .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-top: 15px;
          }
          .summary-item {
            display: flex;
            justify-content: space-between;
            padding: 10px;
            background: white;
            border-radius: 6px;
            border: 1px solid #e2e8f0;
          }
          .label {
            font-weight: 600;
            color: #64748b;
          }
          .value {
            font-weight: bold;
            color: #0ea5e9;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
          th, td {
            padding: 12px 15px;
            text-align: center;
            border-bottom: 1px solid #e2e8f0;
          }
          th {
            background: #f8fafc;
            font-weight: bold;
            color: #1e293b;
            font-size: 14px;
          }
          .section-title {
            font-size: 20px;
            font-weight: bold;
            color: #0ea5e9;
            margin: 30px 0 15px 0;
            padding-bottom: 10px;
            border-bottom: 2px solid #e2e8f0;
          }
          .no-data {
            text-align: center;
            padding: 40px;
            color: #64748b;
            font-style: italic;
          }
          .footer {
            text-align: center;
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
            color: #64748b;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="clinic-info">
            <h1>${(clinic_info as any)?.clinic_name || 'عيادة الأسنان الحديثة'}</h1>
            ${(clinic_info as any)?.address ? `<p>${(clinic_info as any).address}</p>` : ''}
            ${(clinic_info as any)?.phone ? `<p>الهاتف: ${(clinic_info as any).phone}</p>` : ''}
            ${(clinic_info as any)?.email ? `<p>البريد الإلكتروني: ${(clinic_info as any).email}</p>` : ''}
          </div>
          <div class="report-info">
            <h2>تقرير مواعيد المريض</h2>
            <p>تاريخ التقرير: ${formatDate(new Date().toISOString())}</p>
          </div>
        </div>

        <div class="patient-info">
          <h3>معلومات المريض</h3>
          <div class="info-grid">
            <div><strong>الاسم:</strong> ${patient.full_name}</div>
            <div><strong>الجنس:</strong> ${patient.gender === 'male' ? 'ذكر' : 'أنثى'}</div>
            <div><strong>العمر:</strong> ${patient.age} سنة</div>
            ${patient.phone ? `<div><strong>الهاتف:</strong> ${patient.phone}</div>` : ''}
            ${patient.email ? `<div><strong>البريد الإلكتروني:</strong> ${patient.email}</div>` : ''}
          </div>
        </div>

        <div class="financial-summary">
          <h3>ملخص المواعيد</h3>
          <div class="summary-grid">
            <div class="summary-item">
              <span class="label">إجمالي المواعيد:</span>
              <span class="value">${totalAppointments}</span>
            </div>
            <div class="summary-item">
              <span class="label">المواعيد المكتملة:</span>
              <span class="value">${completedAppointments}</span>
            </div>
            <div class="summary-item">
              <span class="label">المواعيد المجدولة:</span>
              <span class="value">${scheduledAppointments}</span>
            </div>
            <div class="summary-item">
              <span class="label">المواعيد الملغية:</span>
              <span class="value">${cancelledAppointments}</span>
            </div>
            <div class="summary-item">
              <span class="label">لم يحضر:</span>
              <span class="value">${noShowAppointments}</span>
            </div>
          </div>
        </div>`

    // جدول المواعيد
    if (appointments && appointments.length > 0) {
      const title = 'سجل المواعيد'
      const headers = ['التاريخ', 'الوقت', 'نوع الموعد', 'الحالة', 'الملاحظات']

      const rows = appointments.map((appointment: any) => {
        const statusText = appointment.status === 'completed' ? 'مكتمل' :
                          appointment.status === 'cancelled' ? 'ملغي' :
                          appointment.status === 'scheduled' ? 'مجدول' :
                          appointment.status === 'no_show' ? 'لم يحضر' : 'آجل'

        // استخدام start_time للتاريخ والوقت
        const dateTime = formatDateTime(appointment.start_time)

        return `
          <tr>
            <td>${dateTime.date}</td>
            <td>${dateTime.time}</td>
            <td>${appointment.title || appointment.appointment_type || 'فحص عام'}</td>
            <td>${statusText}</td>
            <td>${appointment.notes || '-'}</td>
          </tr>`
      })

      htmlContent += `
        <div class="section-title">${title}</div>
        <table>
          <thead>
            <tr>
              ${headers.map(header => `<th>${header}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${rows.join('')}
          </tbody>
        </table>`
    } else {
      htmlContent += `
        <div class="section-title">سجل المواعيد</div>
        <div class="no-data">لا توجد مواعيد مسجلة لهذا المريض</div>`
    }

    htmlContent += `
        <div class="footer">
          <p>تم إنشاء هذا التقرير بواسطة ${(clinic_info as any)?.clinic_name || 'عيادة الأسنان الحديثة'}</p>
          <p>تاريخ الطباعة: ${formatDate(new Date().toISOString())}</p>
        </div>
      </body>
      </html>`

    return htmlContent
  }

  /**
   * إنشاء HTML لوصفات المريض فقط
   */
  private static createPatientPrescriptionsHTML(patientData: any, settings?: ClinicSettings | null): string {
    const { patient, prescriptions } = patientData
    const clinic_info = settings || {}

    // دالة تنسيق التاريخ بالتقويم الميلادي
    const formatDate = (dateString: string): string => {
      const date = new Date(dateString)
      if (!date || isNaN(date.getTime())) {
        return 'غير محدد'
      }

      const day = date.getDate().toString().padStart(2, '0')
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      const year = date.getFullYear()

      return `${day}/${month}/${year}`
    }

    // حساب الإحصائيات
    const totalPrescriptions = prescriptions?.length || 0
    const totalMedications = prescriptions?.reduce((total: number, p: any) => {
      return total + (p.medications?.length || 0)
    }, 0) || 0
    const recentPrescriptions = prescriptions?.filter((p: any) => {
      const prescriptionDate = new Date(p.prescription_date)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      return prescriptionDate >= thirtyDaysAgo
    }).length || 0

    let htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>وصفات المريض - ${patient.full_name}</title>
        <style>
          body {
            font-family: 'Tajawal', Arial, sans-serif;
            direction: rtl;
            margin: 20px;
            line-height: 1.6;
            color: #1e293b;
          }
          .header {
            text-align: center;
            border-bottom: 3px solid #0ea5e9;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .clinic-info h1 {
            font-size: 28px;
            font-weight: bold;
            color: #0ea5e9;
            margin-bottom: 10px;
          }
          .report-info h2 {
            font-size: 24px;
            font-weight: bold;
            color: #1e293b;
            margin-bottom: 5px;
          }
          .patient-info, .financial-summary {
            margin: 30px 0;
            padding: 20px;
            background: #f8fafc;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
          }
          .info-grid, .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-top: 15px;
          }
          .summary-item {
            display: flex;
            justify-content: space-between;
            padding: 10px;
            background: white;
            border-radius: 6px;
            border: 1px solid #e2e8f0;
          }
          .label {
            font-weight: 600;
            color: #64748b;
          }
          .value {
            font-weight: bold;
            color: #0ea5e9;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
          th, td {
            padding: 12px 15px;
            text-align: center;
            border-bottom: 1px solid #e2e8f0;
          }
          th {
            background: #f8fafc;
            font-weight: bold;
            color: #1e293b;
            font-size: 14px;
          }
          .section-title {
            font-size: 20px;
            font-weight: bold;
            color: #0ea5e9;
            margin: 30px 0 15px 0;
            padding-bottom: 10px;
            border-bottom: 2px solid #e2e8f0;
          }
          .no-data {
            text-align: center;
            padding: 40px;
            color: #64748b;
            font-style: italic;
          }
          .footer {
            text-align: center;
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
            color: #64748b;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="clinic-info">
            <h1>${(clinic_info as any)?.clinic_name || 'عيادة الأسنان الحديثة'}</h1>
            ${(clinic_info as any)?.address ? `<p>${(clinic_info as any).address}</p>` : ''}
            ${(clinic_info as any)?.phone ? `<p>الهاتف: ${(clinic_info as any).phone}</p>` : ''}
            ${(clinic_info as any)?.email ? `<p>البريد الإلكتروني: ${(clinic_info as any).email}</p>` : ''}
          </div>
          <div class="report-info">
            <h2>تقرير وصفات المريض</h2>
            <p>تاريخ التقرير: ${formatDate(new Date().toISOString())}</p>
          </div>
        </div>

        <div class="patient-info">
          <h3>معلومات المريض</h3>
          <div class="info-grid">
            <div><strong>الاسم:</strong> ${patient.full_name}</div>
            <div><strong>الجنس:</strong> ${patient.gender === 'male' ? 'ذكر' : 'أنثى'}</div>
            <div><strong>العمر:</strong> ${patient.age} سنة</div>
            ${patient.phone ? `<div><strong>الهاتف:</strong> ${patient.phone}</div>` : ''}
            ${patient.email ? `<div><strong>البريد الإلكتروني:</strong> ${patient.email}</div>` : ''}
          </div>
        </div>

        <div class="financial-summary">
          <h3>ملخص الوصفات</h3>
          <div class="summary-grid">
            <div class="summary-item">
              <span class="label">إجمالي الوصفات:</span>
              <span class="value">${totalPrescriptions}</span>
            </div>
            <div class="summary-item">
              <span class="label">إجمالي الأدوية:</span>
              <span class="value">${totalMedications}</span>
            </div>
            <div class="summary-item">
              <span class="label">الوصفات الحديثة (30 يوم):</span>
              <span class="value">${recentPrescriptions}</span>
            </div>
          </div>
        </div>`

    // جدول الوصفات
    if (prescriptions && prescriptions.length > 0) {
      const title = 'سجل الوصفات'
      const headers = ['تاريخ الوصفة', 'اسم الدواء', 'الجرعة', 'تعليمات الاستخدام', 'ملاحظات']

      const rows: string[] = []

      prescriptions.forEach((prescription: any) => {
        if (prescription.medications && prescription.medications.length > 0) {
          // إذا كانت الوصفة تحتوي على أدوية، أضف كل دواء في صف منفصل
          prescription.medications.forEach((medication: any) => {
            rows.push(`
              <tr>
                <td>${formatDate(prescription.prescription_date)}</td>
                <td>${medication.medication_name || medication.name || '-'}</td>
                <td>${medication.dose || '-'}</td>
                <td>${medication.medication_instructions || medication.instructions || '-'}</td>
                <td>${prescription.notes || '-'}</td>
              </tr>`)
          })
        } else {
          // إذا لم تكن هناك أدوية، أضف صف فارغ مع ملاحظات الوصفة فقط
          rows.push(`
            <tr>
              <td>${formatDate(prescription.prescription_date)}</td>
              <td>-</td>
              <td>-</td>
              <td>-</td>
              <td>${prescription.notes || '-'}</td>
            </tr>`)
        }
      })

      htmlContent += `
        <div class="section-title">${title}</div>
        <table>
          <thead>
            <tr>
              ${headers.map(header => `<th>${header}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${rows.join('')}
          </tbody>
        </table>`
    } else {
      htmlContent += `
        <div class="section-title">سجل الوصفات</div>
        <div class="no-data">لا توجد وصفات مسجلة لهذا المريض</div>`
    }

    htmlContent += `
        <div class="footer">
          <p>تم إنشاء هذا التقرير بواسطة ${(clinic_info as any)?.clinic_name || 'عيادة الأسنان الحديثة'}</p>
          <p>تاريخ الطباعة: ${formatDate(new Date().toISOString())}</p>
        </div>
      </body>
      </html>`

    return htmlContent
  }

  // Export lab report to PDF
  static async exportLabReport(data: LabReportData, settings: ClinicSettings | null, options?: { fileName?: string }): Promise<void> {
    if (!data || data.totalOrders === 0) {
      if (typeof window !== 'undefined' && (window as any).api) {
        (window as any).api.sendNotification('لا توجد بيانات لتصديرها.', 'error')
      }
      return
    }
    const htmlContent = EnhancedPdfReports.createEnhancedLabReportHTML(data, settings)
    const filename = options?.fileName || `تقرير_المختبرات_${new Date().toISOString().slice(0, 10)}.pdf`
    await this.convertHTMLToPDF(htmlContent, filename)
  }

  // Export clinic needs report to PDF
  static async exportClinicNeedsReport(data: ClinicNeedsReportData, settings: ClinicSettings | null, options?: { fileName?: string }): Promise<void> {
    if (!data || data.totalNeeds === 0) {
      if (typeof window !== 'undefined' && (window as any).api) {
        (window as any).api.sendNotification('لا توجد بيانات لتصديرها.', 'error')
      }
      return
    }
    const htmlContent = EnhancedPdfReports.createEnhancedClinicNeedsReportHTML(data, settings)
    const filename = options?.fileName || `تقرير_احتياجات_العيادة_${new Date().toISOString().slice(0, 10)}.pdf`
    await this.convertHTMLToPDF(htmlContent, filename)
  }

  // Export expense report to PDF
  static async exportExpenseReport(data: ExpenseReportData, settings: ClinicSettings | null, options?: { fileName?: string }): Promise<void> {
    if (!data || data.totalExpenses === 0) {
      if (typeof window !== 'undefined' && (window as any).api) {
        (window as any).api.sendNotification('لا توجد بيانات لتصديرها.', 'error')
      }
      return
    }
    const htmlContent = EnhancedPdfReports.createEnhancedExpenseReportHTML(data, settings)
    const filename = options?.fileName || `تقرير_المصروفات_${new Date().toISOString().slice(0, 10)}.pdf`
    await this.convertHTMLToPDF(htmlContent, filename)
  }
}