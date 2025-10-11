/**
 * اختبار تصدير تقرير الأرباح والخسائر
 * Test for Profit and Loss Export Functionality
 */

import { ExportService } from '../services/exportService'
import { PdfService } from '../services/pdfService'
import { ComprehensiveProfitLossService } from '../services/comprehensiveProfitLossService'

// Mock data for testing
const mockPayments = [
  {
    id: '1',
    patient_id: 'p1',
    patient_name: 'أحمد محمد',
    amount: 1000,
    status: 'completed',
    payment_method: 'cash',
    payment_date: '2024-01-15',
    notes: 'دفعة كاملة'
  },
  {
    id: '2',
    patient_id: 'p2',
    patient_name: 'فاطمة علي',
    amount: 500,
    status: 'partial',
    payment_method: 'bank_transfer',
    payment_date: '2024-01-20',
    notes: 'دفعة جزئية'
  }
]

const mockLabOrders = [
  {
    id: '1',
    lab: { name: 'مختبر الأسنان المتقدم' },
    patient: { full_name: 'أحمد محمد' },
    cost: 800,
    paid_amount: 600,
    status: 'completed',
    order_date: '2024-01-10'
  }
]

const mockClinicNeeds = [
  {
    id: '1',
    item_name: 'قفازات طبية',
    quantity: 100,
    priority: 'high',
    status: 'received',
    date_needed: '2024-01-05',
    date_received: '2024-01-08',
    notes: 'للاستخدام اليومي'
  }
]

const mockInventoryItems = [
  {
    id: '1',
    name: 'حشوات أسنان',
    quantity: 50,
    cost_per_unit: 25,
    unit_price: 30,
    minimum_stock: 10,
    category: 'مواد طبية',
    expiry_date: '2025-12-31'
  }
]

const mockClinicExpenses = [
  {
    id: '1',
    expense_name: 'فاتورة كهرباء',
    expense_type: 'utilities',
    amount: 300,
    payment_method: 'bank_transfer',
    payment_date: '2024-01-01',
    vendor: 'شركة الكهرباء',
    notes: 'فاتورة شهر ديسمبر'
  }
]

const mockPatients = [
  { id: 'p1', full_name: 'أحمد محمد' },
  { id: 'p2', full_name: 'فاطمة علي' }
]

const mockAppointments = [
  {
    id: '1',
    patient_id: 'p1',
    start_time: '2024-01-15T10:00:00',
    status: 'completed'
  }
]

/**
 * اختبار تصدير Excel
 */
export async function testExcelExport(): Promise<boolean> {
  try {
    console.log('🧪 اختبار تصدير Excel للأرباح والخسائر...')

    // إنشاء تقرير الأرباح والخسائر
    const reportData = ComprehensiveProfitLossService.generateComprehensiveProfitLossReport(
      mockPayments,
      mockLabOrders,
      mockClinicNeeds,
      mockInventoryItems,
      mockPatients,
      mockAppointments,
      undefined, // no filter
      mockClinicExpenses
    )

    // اختبار تصدير Excel
    await ExportService.exportProfitLossToExcel({
      reportData,
      payments: mockPayments,
      labOrders: mockLabOrders,
      clinicNeeds: mockClinicNeeds,
      inventoryItems: mockInventoryItems,
      clinicExpenses: mockClinicExpenses,
      patients: mockPatients,
      appointments: mockAppointments,
      filter: { preset: 'all', startDate: '', endDate: '' },
      currency: 'SAR'
    })

    console.log('✅ تم اختبار تصدير Excel بنجاح')
    return true
  } catch (error) {
    console.error('❌ فشل اختبار تصدير Excel:', error)
    return false
  }
}

/**
 * اختبار تصدير PDF
 */
export async function testPDFExport(): Promise<boolean> {
  try {
    console.log('🧪 اختبار تصدير PDF للأرباح والخسائر...')

    // إنشاء تقرير الأرباح والخسائر
    const reportData = ComprehensiveProfitLossService.generateComprehensiveProfitLossReport(
      mockPayments,
      mockLabOrders,
      mockClinicNeeds,
      mockInventoryItems,
      mockPatients,
      mockAppointments,
      undefined, // no filter
      mockClinicExpenses
    )

    // اختبار تصدير PDF
    await PdfService.exportProfitLossReport({
      reportData,
      payments: mockPayments,
      labOrders: mockLabOrders,
      clinicNeeds: mockClinicNeeds,
      inventoryItems: mockInventoryItems,
      clinicExpenses: mockClinicExpenses,
      patients: mockPatients,
      appointments: mockAppointments,
      filter: { preset: 'all', startDate: '', endDate: '' },
      currency: 'SAR'
    }, {
      clinic_name: 'عيادة الأسنان الحديثة',
      doctor_name: 'د. محمد أحمد',
      clinic_address: 'الرياض، المملكة العربية السعودية',
      clinic_phone: '+966501234567'
    })

    console.log('✅ تم اختبار تصدير PDF بنجاح')
    return true
  } catch (error) {
    console.error('❌ فشل اختبار تصدير PDF:', error)
    return false
  }
}

/**
 * اختبار شامل لوظائف التصدير
 */
export async function runProfitLossExportTests(): Promise<void> {
  console.log('🚀 بدء اختبارات تصدير الأرباح والخسائر...')

  const excelTest = await testExcelExport()
  const pdfTest = await testPDFExport()

  console.log('\n📊 نتائج الاختبارات:')
  console.log(`Excel Export: ${excelTest ? '✅ نجح' : '❌ فشل'}`)
  console.log(`PDF Export: ${pdfTest ? '✅ نجح' : '❌ فشل'}`)

  if (excelTest && pdfTest) {
    console.log('\n🎉 جميع اختبارات التصدير نجحت!')
  } else {
    console.log('\n⚠️ بعض اختبارات التصدير فشلت')
  }
}

// تشغيل الاختبارات إذا تم استدعاء الملف مباشرة
if (typeof window !== 'undefined') {
  (window as any).testProfitLossExport = runProfitLossExportTests
  console.log('💡 يمكنك تشغيل الاختبارات باستخدام: window.testProfitLossExport()')
}
