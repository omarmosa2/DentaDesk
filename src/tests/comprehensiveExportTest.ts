import { ComprehensiveExportService } from '@/services/comprehensiveExportService'
import { Payment, Appointment, Patient, InventoryItem } from '@/types'

/**
 * اختبار شامل لخدمة التصدير الشامل
 * للتأكد من دقة 100% في البيانات المصدرة
 */
export class ComprehensiveExportTest {

  /**
   * إنشاء بيانات اختبار
   */
  static createTestData() {
    // بيانات المرضى (باستخدام الحقول الحقيقية)
    const patients: Patient[] = [
      {
        id: '1',
        serial_number: 'P001',
        full_name: 'أحمد محمد علي',
        name: 'أحمد محمد',
        phone: '0501234567',
        email: 'ahmed@example.com',
        age: 34,
        gender: 'male',
        patient_condition: 'طبيعي',
        allergies: 'لا يوجد',
        address: 'الرياض، حي النرجس',
        notes: 'مريض منتظم',
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z'
      },
      {
        id: '2',
        serial_number: 'P002',
        full_name: 'فاطمة علي حسن',
        name: 'فاطمة علي',
        phone: '0507654321',
        email: 'fatima@example.com',
        age: 39,
        gender: 'female',
        patient_condition: 'حساسية من البنسلين',
        allergies: 'البنسلين',
        address: 'جدة، حي الصفا',
        notes: 'تحتاج متابعة دورية',
        created_at: '2024-02-01T10:00:00Z',
        updated_at: '2024-02-01T10:00:00Z'
      }
    ]

    // بيانات المواعيد (باستخدام الحقول الحقيقية)
    const appointments: Appointment[] = [
      {
        id: '1',
        patient_id: '1',
        title: 'تنظيف أسنان شامل',
        start_time: '2024-03-01T09:00:00Z',
        end_time: '2024-03-01T10:00:00Z',
        treatment_type: 'تنظيف أسنان',
        status: 'completed',
        cost: 200,
        notes: 'تنظيف عادي مع فلورايد',
        created_at: '2024-02-28T10:00:00Z',
        updated_at: '2024-03-01T10:00:00Z'
      },
      {
        id: '2',
        patient_id: '2',
        title: 'حشو ضرس علوي',
        start_time: '2024-03-02T14:00:00Z',
        end_time: '2024-03-02T15:00:00Z',
        treatment_type: 'حشو أسنان',
        status: 'completed',
        cost: 500,
        notes: 'حشو ضرس بمادة الكومبوزيت',
        created_at: '2024-03-01T10:00:00Z',
        updated_at: '2024-03-02T15:00:00Z'
      },
      {
        id: '3',
        patient_id: '1',
        title: 'استشارة تقويم أسنان',
        start_time: '2024-03-03T11:00:00Z',
        end_time: '2024-03-03T12:00:00Z',
        treatment_type: 'تقويم أسنان',
        status: 'cancelled',
        cost: 1000,
        notes: 'ألغي الموعد لظروف طارئة',
        created_at: '2024-03-02T10:00:00Z',
        updated_at: '2024-03-03T11:00:00Z'
      }
    ]

    // بيانات المدفوعات
    const payments: Payment[] = [
      {
        id: '1',
        patient_id: '1',
        appointment_id: '1',
        amount: 200,
        payment_method: 'cash',
        payment_date: '2024-03-01T10:00:00Z',
        status: 'completed',
        description: 'دفع تنظيف أسنان',
        created_at: '2024-03-01T10:00:00Z',
        updated_at: '2024-03-01T10:00:00Z'
      },
      {
        id: '2',
        patient_id: '2',
        appointment_id: '2',
        amount: 500,
        amount_paid: 300,
        payment_method: 'bank_transfer',
        payment_date: '2024-03-02T15:00:00Z',
        status: 'partial',
        description: 'دفع جزئي لحشو أسنان',
        remaining_balance: 200,
        created_at: '2024-03-02T15:00:00Z',
        updated_at: '2024-03-02T15:00:00Z'
      },
      {
        id: '3',
        patient_id: '1',
        amount: 100,
        payment_method: 'cash',
        payment_date: '2024-03-04T10:00:00Z',
        status: 'pending',
        description: 'دفع عام',
        created_at: '2024-03-04T10:00:00Z',
        updated_at: '2024-03-04T10:00:00Z'
      },
      {
        id: '4',
        patient_id: '2',
        amount: 40,
        payment_method: 'cash',
        payment_date: '2024-01-15T10:00:00Z', // أكثر من 30 يوم مضت
        status: 'pending',
        description: 'دفع متأخر',
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z'
      }
    ]

    // بيانات المخزون (باستخدام الحقول الحقيقية)
    const inventory: InventoryItem[] = [
      {
        id: '1',
        name: 'فرشاة أسنان ناعمة',
        description: 'فرشاة أسنان ناعمة للاستخدام اليومي',
        category: 'أدوات تنظيف',
        quantity: 50,
        unit: 'قطعة',
        minimum_stock: 10,
        cost_per_unit: 15,
        supplier: 'شركة الأدوات الطبية',
        expiry_date: '2025-12-31',
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-03-01T10:00:00Z'
      },
      {
        id: '2',
        name: 'حشوة كومبوزيت',
        description: 'حشوة أسنان بيضاء من مادة الكومبوزيت',
        category: 'مواد طبية',
        quantity: 5,
        unit: 'أنبوب',
        minimum_stock: 10,
        cost_per_unit: 50,
        supplier: 'شركة المواد الطبية المتقدمة',
        expiry_date: '2024-06-30',
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-03-01T10:00:00Z'
      },
      {
        id: '3',
        name: 'مخدر ليدوكايين',
        description: 'مخدر موضعي للأسنان',
        category: 'أدوية',
        quantity: 0,
        unit: 'أمبولة',
        minimum_stock: 5,
        cost_per_unit: 25,
        supplier: 'شركة الأدوية الحديثة',
        expiry_date: '2024-04-15',
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-03-01T10:00:00Z'
      }
    ]

    return { patients, appointments, payments, inventory }
  }

  /**
   * اختبار حسابات المدفوعات الجزئية
   */
  static testPartialPaymentCalculations() {
    const { payments } = this.createTestData()
    const financialStats = ComprehensiveExportService.calculateFinancialStats(payments)

    console.log('🧪 اختبار حسابات المدفوعات الجزئية:')

    // التحقق من الحسابات المتوقعة
    const expectedTotalRevenue = 200 + 300 // مكتمل + جزئي (amount_paid)
    const expectedCompletedAmount = 200
    const expectedPartialAmount = 300
    const expectedPendingAmount = 100 + 40 // دفع عام + دفع متأخر
    const expectedOverdueAmount = 40 // الدفع المتأخر (أكثر من 30 يوم)

    console.log('المتوقع:', {
      totalRevenue: expectedTotalRevenue,
      completedAmount: expectedCompletedAmount,
      partialAmount: expectedPartialAmount,
      pendingAmount: expectedPendingAmount,
      overdueAmount: expectedOverdueAmount
    })

    console.log('الفعلي:', {
      totalRevenue: financialStats.totalRevenue,
      completedAmount: financialStats.completedAmount,
      partialAmount: financialStats.partialAmount,
      pendingAmount: financialStats.pendingAmount,
      overdueAmount: financialStats.overdueAmount
    })

    const isCorrect =
      financialStats.totalRevenue === expectedTotalRevenue &&
      financialStats.completedAmount === expectedCompletedAmount &&
      financialStats.partialAmount === expectedPartialAmount &&
      financialStats.pendingAmount === expectedPendingAmount &&
      financialStats.overdueAmount === expectedOverdueAmount

    console.log(isCorrect ? '✅ الحسابات صحيحة' : '❌ الحسابات خاطئة')
    return isCorrect
  }

  /**
   * اختبار إحصائيات المواعيد
   */
  static testAppointmentStats() {
    const { appointments } = this.createTestData()
    const appointmentStats = ComprehensiveExportService.calculateAppointmentStats(appointments)

    console.log('🧪 اختبار إحصائيات المواعيد:')

    const expectedStats = {
      total: 3,
      completed: 2,
      cancelled: 1,
      noShow: 0,
      scheduled: 0,
      attendanceRate: 67 // 2/3 * 100 = 66.67 ≈ 67
    }

    console.log('المتوقع:', expectedStats)
    console.log('الفعلي:', appointmentStats)

    const isCorrect =
      appointmentStats.total === expectedStats.total &&
      appointmentStats.completed === expectedStats.completed &&
      appointmentStats.cancelled === expectedStats.cancelled &&
      appointmentStats.attendanceRate === expectedStats.attendanceRate

    console.log(isCorrect ? '✅ الإحصائيات صحيحة' : '❌ الإحصائيات خاطئة')
    return isCorrect
  }

  /**
   * اختبار إحصائيات المخزون
   */
  static testInventoryStats() {
    const { inventory } = this.createTestData()
    const inventoryStats = ComprehensiveExportService.calculateInventoryStats(inventory)

    console.log('🧪 اختبار إحصائيات المخزون:')

    const expectedStats = {
      totalItems: 3,
      totalValue: (50 * 15) + (5 * 50) + (0 * 25), // 750 + 250 + 0 = 1000
      lowStockItems: 1, // حشوة كومبوزيت (5 <= 10)
      outOfStockItems: 1, // مخدر ليدوكايين (0)
      expiredItems: 1, // مخدر ليدوكايين (انتهت في 2024-04-15)
      nearExpiryItems: 1 // حشوة كومبوزيت (تنتهي في 2024-06-30)
    }

    console.log('المتوقع:', expectedStats)
    console.log('الفعلي:', inventoryStats)

    const isCorrect =
      inventoryStats.totalItems === expectedStats.totalItems &&
      inventoryStats.totalValue === expectedStats.totalValue &&
      inventoryStats.lowStockItems === expectedStats.lowStockItems &&
      inventoryStats.outOfStockItems === expectedStats.outOfStockItems &&
      inventoryStats.expiredItems === expectedStats.expiredItems &&
      inventoryStats.nearExpiryItems === expectedStats.nearExpiryItems

    console.log(isCorrect ? '✅ الإحصائيات صحيحة' : '❌ الإحصائيات خاطئة')
    return isCorrect
  }

  /**
   * اختبار شامل لجميع الحسابات
   */
  static runAllTests() {
    console.log('🚀 بدء الاختبارات الشاملة للتصدير...\n')

    const test1 = this.testPartialPaymentCalculations()
    console.log('')

    const test2 = this.testAppointmentStats()
    console.log('')

    const test3 = this.testInventoryStats()
    console.log('')

    const allTestsPassed = test1 && test2 && test3

    console.log('📊 نتائج الاختبارات:')
    console.log(`حسابات المدفوعات: ${test1 ? '✅' : '❌'}`)
    console.log(`إحصائيات المواعيد: ${test2 ? '✅' : '❌'}`)
    console.log(`إحصائيات المخزون: ${test3 ? '✅' : '❌'}`)
    console.log('')
    console.log(allTestsPassed ? '🎉 جميع الاختبارات نجحت!' : '⚠️ بعض الاختبارات فشلت!')

    return allTestsPassed
  }

  /**
   * اختبار تصدير التقرير الشامل
   */
  static async testComprehensiveExport() {
    const testData = this.createTestData()

    try {
      console.log('🧪 اختبار تصدير التقرير الشامل...')

      const csvContent = ComprehensiveExportService.generateComprehensiveCSV({
        patients: testData.patients,
        appointments: testData.appointments,
        payments: testData.payments,
        inventory: testData.inventory,
        filterInfo: {
          appointmentFilter: 'جميع البيانات',
          paymentFilter: 'جميع البيانات',
          inventoryFilter: 'جميع البيانات'
        }
      })

      console.log('✅ تم إنشاء التقرير بنجاح')
      console.log(`📄 حجم التقرير: ${csvContent.length} حرف`)

      // التحقق من وجود الأقسام المهمة
      const requiredSections = [
        'التقرير الشامل',
        'معلومات الفلترة المطبقة',
        'إحصائيات المرضى',
        'إحصائيات المواعيد (مفلترة)',
        'الإحصائيات المالية (مفلترة)',
        'توزيع طرق الدفع',
        'إحصائيات المخزون (مفلترة)',
        'تفاصيل المواعيد المفلترة',
        'تفاصيل المدفوعات المفلترة',
        'تفاصيل المخزون المفلتر',
        'تفاصيل المرضى (أحدث 50 مريض)',
        'ملخص إضافي للطبيب',
        'تحليلات متقدمة',
        'توصيات للطبيب'
      ]

      const missingSections = requiredSections.filter(section => !csvContent.includes(section))

      if (missingSections.length === 0) {
        console.log('✅ جميع الأقسام المطلوبة موجودة')
        return true
      } else {
        console.log('❌ أقسام مفقودة:', missingSections)
        return false
      }

    } catch (error) {
      console.error('❌ فشل في تصدير التقرير:', error)
      return false
    }
  }
}
