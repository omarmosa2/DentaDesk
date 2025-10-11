/**
 * Test file for Financial Reports Data Validation
 * This file contains test cases to verify that the financial reports handle invalid data correctly
 */

import { validateAmount, validatePayment, validatePayments } from '../utils/dataValidation'

// Test data with various invalid scenarios
const testPayments = [
  // Valid payment
  {
    id: '1',
    patient_id: 'patient1',
    amount: 100.50,
    payment_method: 'cash',
    payment_date: '2024-06-20',
    status: 'completed'
  },
  // Payment with NaN amount
  {
    id: '2',
    patient_id: 'patient2',
    amount: 'invalid',
    payment_method: 'card',
    payment_date: '2024-06-19',
    status: 'completed'
  },
  // Payment with null amount
  {
    id: '3',
    patient_id: 'patient3',
    amount: null,
    payment_method: 'bank_transfer',
    payment_date: '2024-06-18',
    status: 'completed'
  },
  // Payment with undefined amount
  {
    id: '4',
    patient_id: 'patient4',
    amount: undefined,
    payment_method: 'check',
    payment_date: '2024-06-17',
    status: 'completed'
  },
  // Payment with Infinity amount
  {
    id: '5',
    patient_id: 'patient5',
    amount: Infinity,
    payment_method: 'insurance',
    payment_date: '2024-06-16',
    status: 'completed'
  },
  // Payment with negative amount
  {
    id: '6',
    patient_id: 'patient6',
    amount: -50.25,
    payment_method: 'cash',
    payment_date: '2024-06-15',
    status: 'completed'
  },
  // Payment with very large amount
  {
    id: '7',
    patient_id: 'patient7',
    amount: 9999999.99,
    payment_method: 'card',
    payment_date: '2024-06-14',
    status: 'completed'
  },
  // Payment with missing required fields
  {
    id: '8',
    // missing patient_id
    amount: 75.00,
    payment_method: 'cash',
    payment_date: '2024-06-13',
    status: 'completed'
  },
  // Payment with invalid date
  {
    id: '9',
    patient_id: 'patient9',
    amount: 125.75,
    payment_method: 'card',
    payment_date: 'invalid-date',
    status: 'completed'
  },
  // Valid payment with decimal precision
  {
    id: '10',
    patient_id: 'patient10',
    amount: 99.999,
    payment_method: 'bank_transfer',
    payment_date: '2024-06-12',
    status: 'completed'
  }
]

/**
 * Run validation tests
 */
export function runFinancialReportsTests() {
  console.log('🧪 Running Financial Reports Validation Tests...')
  
  // Test 1: Amount validation
  console.log('\n📊 Test 1: Amount Validation')
  
  const amountTests = [
    { input: 100.50, expected: true, description: 'Valid positive amount' },
    { input: 'invalid', expected: false, description: 'Invalid string amount' },
    { input: null, expected: false, description: 'Null amount' },
    { input: undefined, expected: false, description: 'Undefined amount' },
    { input: Infinity, expected: false, description: 'Infinity amount' },
    { input: -50.25, expected: true, description: 'Negative amount (valid but warning)' },
    { input: 0, expected: true, description: 'Zero amount' },
    { input: 99.999, expected: true, description: 'Amount with high precision' }
  ]
  
  amountTests.forEach(test => {
    const result = validateAmount(test.input)
    const passed = result.isValid === test.expected
    console.log(`${passed ? '✅' : '❌'} ${test.description}: ${result.isValid ? 'Valid' : 'Invalid'}`)
    if (result.sanitizedValue !== undefined) {
      console.log(`   Sanitized: ${result.sanitizedValue}`)
    }
    if (result.errors.length > 0) {
      console.log(`   Errors: ${result.errors.join(', ')}`)
    }
    if (result.warnings.length > 0) {
      console.log(`   Warnings: ${result.warnings.join(', ')}`)
    }
  })
  
  // Test 2: Payment validation
  console.log('\n💳 Test 2: Payment Validation')
  
  testPayments.forEach((payment, index) => {
    const result = validatePayment(payment)
    console.log(`Payment ${index + 1} (ID: ${payment.id}): ${result.isValid ? '✅ Valid' : '❌ Invalid'}`)
    if (result.errors.length > 0) {
      console.log(`   Errors: ${result.errors.join(', ')}`)
    }
    if (result.warnings.length > 0) {
      console.log(`   Warnings: ${result.warnings.join(', ')}`)
    }
  })
  
  // Test 3: Bulk payment validation
  console.log('\n📋 Test 3: Bulk Payment Validation')
  
  const bulkResult = validatePayments(testPayments)
  console.log(`Total payments: ${testPayments.length}`)
  console.log(`Valid payments: ${bulkResult.validPayments.length}`)
  console.log(`Invalid payments: ${bulkResult.invalidPayments.length}`)
  console.log(`Total errors: ${bulkResult.totalErrors}`)
  console.log(`Total warnings: ${bulkResult.totalWarnings}`)
  
  // Test 4: Financial calculations with invalid data
  console.log('\n🧮 Test 4: Financial Calculations')
  
  const validPayments = bulkResult.validPayments
  const totalRevenue = validPayments
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + p.amount, 0)
  
  console.log(`Calculated total revenue from valid payments: $${totalRevenue.toFixed(2)}`)
  
  // Test monthly revenue calculation
  const monthlyRevenue = {}
  validPayments
    .filter(p => p.status === 'completed')
    .forEach(payment => {
      try {
        const paymentDate = new Date(payment.payment_date)
        if (!isNaN(paymentDate.getTime())) {
          const month = paymentDate.toISOString().slice(0, 7)
          monthlyRevenue[month] = (monthlyRevenue[month] || 0) + payment.amount
        }
      } catch (error) {
        console.warn('Error processing payment date:', payment.payment_date)
      }
    })
  
  console.log('Monthly revenue breakdown:')
  Object.entries(monthlyRevenue).forEach(([month, amount]) => {
    console.log(`  ${month}: $${amount.toFixed(2)}`)
  })
  
  // Test payment method statistics
  const methodStats = {}
  validPayments
    .filter(p => p.status === 'completed')
    .forEach(payment => {
      const method = payment.payment_method || 'unknown'
      methodStats[method] = (methodStats[method] || 0) + payment.amount
    })
  
  console.log('Payment method statistics:')
  Object.entries(methodStats).forEach(([method, amount]) => {
    console.log(`  ${method}: $${amount.toFixed(2)}`)
  })
  
  console.log('\n✅ Financial Reports Validation Tests Completed!')
  
  return {
    totalTests: amountTests.length + testPayments.length + 2, // +2 for bulk and calculations
    validPayments: bulkResult.validPayments.length,
    invalidPayments: bulkResult.invalidPayments.length,
    totalRevenue,
    monthlyRevenue,
    methodStats
  }
}

// Export test data for use in other tests
export { testPayments }

// Auto-run tests if this file is executed directly
if (typeof window !== 'undefined' && window.location?.search?.includes('runTests=true')) {
  runFinancialReportsTests()
}
