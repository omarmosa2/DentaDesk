/**
 * License Key Generator Utility
 * 
 * This utility generates valid license keys for testing the dental clinic application.
 * License keys follow the format: XXXXX-XXXXX-XXXXX-XXXXX (20 characters + 3 hyphens)
 * 
 * Usage:
 * node scripts/licenseGenerator.js [count]
 * 
 * Examples:
 * node scripts/licenseGenerator.js        // Generate 1 license key
 * node scripts/licenseGenerator.js 5      // Generate 5 license keys
 */

const crypto = require('crypto')

// Character set for license keys (uppercase letters and numbers)
const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

/**
 * Generate a random character from the charset
 */
function getRandomChar() {
  const randomIndex = crypto.randomInt(0, CHARSET.length)
  return CHARSET[randomIndex]
}

/**
 * Generate a single license key segment (5 characters)
 */
function generateSegment() {
  let segment = ''
  for (let i = 0; i < 5; i++) {
    segment += getRandomChar()
  }
  return segment
}

/**
 * Generate a complete license key (XXXXX-XXXXX-XXXXX-XXXXX)
 */
function generateLicenseKey() {
  const segments = []
  for (let i = 0; i < 4; i++) {
    segments.push(generateSegment())
  }
  return segments.join('-')
}

/**
 * Validate license key format
 */
function validateLicenseKey(key) {
  const regex = /^[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}$/
  return regex.test(key)
}

/**
 * Generate multiple license keys
 */
function generateLicenseKeys(count = 1) {
  const keys = []
  for (let i = 0; i < count; i++) {
    const key = generateLicenseKey()
    
    // Validate the generated key
    if (!validateLicenseKey(key)) {
      console.error(`❌ Generated invalid key: ${key}`)
      i-- // Retry this iteration
      continue
    }
    
    keys.push(key)
  }
  return keys
}

/**
 * Generate a test license key with specific pattern for easy recognition
 */
function generateTestLicenseKey() {
  // Generate a test key that starts with 'TEST1' for easy identification
  const segments = [
    'TEST1',
    generateSegment(),
    generateSegment(),
    generateSegment()
  ]
  return segments.join('-')
}

/**
 * Generate demo license keys with specific patterns
 */
function generateDemoLicenseKeys() {
  return [
    'DEMO1-' + generateSegment() + '-' + generateSegment() + '-' + generateSegment(),
    'TRIAL-' + generateSegment() + '-' + generateSegment() + '-' + generateSegment(),
    'DEVEL-' + generateSegment() + '-' + generateSegment() + '-' + generateSegment()
  ]
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2)
  const count = parseInt(args[0]) || 1
  
  console.log('🔑 License Key Generator for Dental Clinic Management System')
  console.log('=' .repeat(60))
  
  if (count === 1) {
    console.log('\n📋 Generated License Key:')
    const key = generateLicenseKey()
    console.log(`   ${key}`)
    console.log(`   ✅ Valid: ${validateLicenseKey(key)}`)
  } else {
    console.log(`\n📋 Generated ${count} License Keys:`)
    const keys = generateLicenseKeys(count)
    keys.forEach((key, index) => {
      console.log(`   ${index + 1}. ${key}`)
    })
    console.log(`   ✅ All keys validated successfully`)
  }
  
  // Generate special test keys
  console.log('\n🧪 Test License Keys:')
  const testKey = generateTestLicenseKey()
  console.log(`   Test Key: ${testKey}`)
  
  console.log('\n🎯 Demo License Keys:')
  const demoKeys = generateDemoLicenseKeys()
  demoKeys.forEach((key, index) => {
    console.log(`   Demo ${index + 1}: ${key}`)
  })
  
  console.log('\n📝 Usage Instructions:')
  console.log('   1. Copy any of the generated license keys')
  console.log('   2. Start the dental clinic application')
  console.log('   3. Enter the license key when prompted')
  console.log('   4. The license will be bound to your current machine')
  
  console.log('\n⚠️  Development Notes:')
  console.log('   - These keys are for testing purposes only')
  console.log('   - Keys are validated by format, not against a server')
  console.log('   - Each key becomes bound to the machine where it\'s activated')
  console.log('   - Use the license reset functionality to clear test data')
  
  console.log('\n🔧 Development Commands:')
  console.log('   Clear license data: Open DevTools and run:')
  console.log('   window.electronAPI.license.clearData()')
}

// Export functions for use in other scripts
module.exports = {
  generateLicenseKey,
  generateLicenseKeys,
  generateTestLicenseKey,
  generateDemoLicenseKeys,
  validateLicenseKey
}

// Run main function if this script is executed directly
if (require.main === module) {
  main()
}
