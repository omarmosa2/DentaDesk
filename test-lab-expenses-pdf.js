// Test script for lab and clinic expenses PDF generation
// This script tests the new PDF generators to ensure they work correctly

const testLabReportGeneration = async () => {
  console.log('🧪 Testing Lab Report PDF Generation...')

  try {
    // Mock lab data for testing
    const mockLabs = [
      {
        id: '1',
        name: 'مختبر الأسنان المتطور',
        contact_info: '0123456789',
        address: 'القاهرة، مصر',
        created_at: new Date().toISOString()
      },
      {
        id: '2',
        name: 'مختبر الدقة العالية',
        contact_info: '01122334455',
        address: 'الإسكندرية، مصر',
        created_at: new Date().toISOString()
      }
    ]

    // Mock lab orders data for testing
    const mockLabOrders = [
      {
        id: '1',
        lab_id: '1',
        patient_id: '1',
        service_name: 'تركيب تاج خزفي',
        cost: 1500,
        order_date: new Date().toISOString(),
        status: 'مكتمل',
        paid_amount: 1500,
        remaining_balance: 0,
        lab: mockLabs[0],
        patient: {
          full_name: 'أحمد محمد علي'
        }
      },
      {
        id: '2',
        lab_id: '1',
        patient_id: '2',
        service_name: 'تركيب جسر أسنان',
        cost: 3000,
        order_date: new Date().toISOString(),
        status: 'آجل',
        paid_amount: 1000,
        remaining_balance: 2000,
        lab: mockLabs[0],
        patient: {
          full_name: 'فاطمة أحمد حسن'
        }
      },
      {
        id: '3',
        lab_id: '2',
        patient_id: '3',
        service_name: 'تصنيع طقم أسنان كامل',
        cost: 2500,
        order_date: new Date().toISOString(),
        status: 'ملغي',
        paid_amount: 0,
        remaining_balance: 2500,
        lab: mockLabs[1],
        patient: {
          full_name: 'محمد علي أحمد'
        }
      }
    ]

    console.log('📊 Test data prepared:')
    console.log(`   - Labs: ${mockLabs.length}`)
    console.log(`   - Lab Orders: ${mockLabOrders.length}`)

    // Test the lab report generation
    const { ExportService } = require('./src/services/exportService')
    const result = await ExportService.testLabReportGeneration(mockLabs, mockLabOrders)

    if (result) {
      console.log('✅ Lab report PDF generation test PASSED')
      return true
    } else {
      console.log('❌ Lab report PDF generation test FAILED')
      return false
    }
  } catch (error) {
    console.error('❌ Lab report PDF generation test ERROR:', error)
    return false
  }
}

const testClinicExpensesReportGeneration = async () => {
  console.log('🧪 Testing Clinic Expenses Report PDF Generation...')

  try {
    // Mock clinic expenses data for testing
    const mockExpenses = [
      {
        id: '1',
        expense_name: 'راتب الدكتور أحمد',
        amount: 5000,
        expense_type: 'salary',
        payment_method: 'cash',
        payment_date: new Date().toISOString(),
        status: 'paid',
        vendor: 'د. أحمد محمد',
        created_at: new Date().toISOString()
      },
      {
        id: '2',
        expense_name: 'فاتورة الكهرباء',
        amount: 800,
        expense_type: 'utilities',
        payment_method: 'bank_transfer',
        payment_date: new Date().toISOString(),
        status: 'paid',
        vendor: 'شركة الكهرباء',
        created_at: new Date().toISOString()
      },
      {
        id: '3',
        expense_name: 'إيجار العيادة',
        amount: 3000,
        expense_type: 'rent',
        payment_method: 'check',
        payment_date: new Date().toISOString(),
        status: 'pending',
        vendor: 'مالك العقار',
        created_at: new Date().toISOString()
      },
      {
        id: '4',
        expense_name: 'صيانة المعدات',
        amount: 1200,
        expense_type: 'maintenance',
        payment_method: 'cash',
        payment_date: new Date().toISOString(),
        status: 'overdue',
        vendor: 'شركة الصيانة',
        created_at: new Date().toISOString()
      }
    ]

    console.log('📊 Test data prepared:')
    console.log(`   - Expenses: ${mockExpenses.length}`)

    // Test the clinic expenses report generation
    const { ExportService } = require('./src/services/exportService')
    const result = await ExportService.testClinicExpensesReportGeneration(mockExpenses)

    if (result) {
      console.log('✅ Clinic expenses report PDF generation test PASSED')
      return true
    } else {
      console.log('❌ Clinic expenses report PDF generation test FAILED')
      return false
    }
  } catch (error) {
    console.error('❌ Clinic expenses report PDF generation test ERROR:', error)
    return false
  }
}

// Run tests
const runTests = async () => {
  console.log('🚀 Starting PDF Generation Tests...\n')

  let passedTests = 0
  let totalTests = 2

  // Test lab report generation
  if (await testLabReportGeneration()) {
    passedTests++
  }

  console.log('')

  // Test clinic expenses report generation
  if (await testClinicExpensesReportGeneration()) {
    passedTests++
  }

  console.log('\n📊 Test Results:')
  console.log(`   Passed: ${passedTests}/${totalTests}`)
  console.log(`   Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`)

  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! PDF generators are working correctly.')
    process.exit(0)
  } else {
    console.log('⚠️ Some tests failed. Please check the implementation.')
    process.exit(1)
  }
}

// Run the tests
runTests().catch(console.error)