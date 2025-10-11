/**
 * Test script for payment security functionality
 * This is for development testing only
 */

import {
  setupPassword,
  verifyPassword,
  changePassword,
  verifySecurityAnswer,
  resetPassword,
  isPasswordSet,
  validatePasswordStrength,
  clearAllSecurityData,
  SECURITY_QUESTIONS
} from './paymentSecurity'

// Test password setup
export async function testPasswordSetup() {
  console.log('🧪 Testing password setup...')

  // Clear any existing data
  clearAllSecurityData()

  // Test password validation
  console.log('Testing password strength validation:')
  console.log('Weak password "123":', validatePasswordStrength('123')) // false
  console.log('Weak password "ab":', validatePasswordStrength('ab')) // false
  console.log('Valid password "test":', validatePasswordStrength('test')) // true
  console.log('Valid password "1234":', validatePasswordStrength('1234')) // true

  // Setup password
  const result = await setupPassword({
    password: 'MySecure123!',
    securityQuestion: SECURITY_QUESTIONS[0], // First question
    securityAnswer: 'Test Answer'
  })

  console.log('Password setup result:', result)
  console.log('Is password set:', isPasswordSet())

  return result
}

// Test password verification
export async function testPasswordVerification() {
  console.log('🧪 Testing password verification...')

  // Test correct password
  const correctResult = await verifyPassword('MySecure123!')
  console.log('Correct password verification:', correctResult)

  // Test incorrect password
  const incorrectResult = await verifyPassword('WrongPassword')
  console.log('Incorrect password verification:', incorrectResult)

  return correctResult && !incorrectResult
}

// Test password change
export async function testPasswordChange() {
  console.log('🧪 Testing password change...')

  const result = await changePassword('MySecure123!', 'NewSecure456!')
  console.log('Password change result:', result)

  // Verify new password works
  const newPasswordWorks = await verifyPassword('NewSecure456!')
  console.log('New password verification:', newPasswordWorks)

  return result && newPasswordWorks
}

// Test security answer verification
export async function testSecurityAnswer() {
  console.log('🧪 Testing security answer verification...')

  // Test correct answer (normalized)
  const correctResult = await verifySecurityAnswer('test answer')
  console.log('Correct security answer:', correctResult)

  // Test incorrect answer
  const incorrectResult = await verifySecurityAnswer('wrong answer')
  console.log('Incorrect security answer:', incorrectResult)

  return correctResult && !incorrectResult
}

// Test password reset
export async function testPasswordReset() {
  console.log('🧪 Testing password reset...')

  const result = await resetPassword('ResetSecure789!', 'test answer')
  console.log('Password reset result:', result)

  // Verify new password works
  const newPasswordWorks = await verifyPassword('ResetSecure789!')
  console.log('Reset password verification:', newPasswordWorks)

  return result && newPasswordWorks
}

// Run all tests
export async function runAllTests() {
  console.log('🚀 Starting payment security tests...')

  try {
    const setupTest = await testPasswordSetup()
    if (!setupTest) throw new Error('Setup test failed')

    const verificationTest = await testPasswordVerification()
    if (!verificationTest) throw new Error('Verification test failed')

    const changeTest = await testPasswordChange()
    if (!changeTest) throw new Error('Change test failed')

    const securityTest = await testSecurityAnswer()
    if (!securityTest) throw new Error('Security answer test failed')

    const resetTest = await testPasswordReset()
    if (!resetTest) throw new Error('Reset test failed')

    console.log('✅ All tests passed!')
    return true

  } catch (error) {
    console.error('❌ Test failed:', error)
    return false
  } finally {
    // Clean up
    clearAllSecurityData()
  }
}

// Auto-run tests if this file is executed directly
if (typeof window !== 'undefined' && window.location) {
  // Browser environment - expose for console testing
  (window as any).paymentSecurityTests = {
    testPasswordSetup,
    testPasswordVerification,
    testPasswordChange,
    testSecurityAnswer,
    testPasswordReset,
    runAllTests
  }
  console.log('Payment security tests loaded. Run paymentSecurityTests.runAllTests() to start.')
}