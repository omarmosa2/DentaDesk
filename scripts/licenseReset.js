/**
 * License Reset Utility
 * 
 * This utility provides functions to reset license data for development and testing.
 * It can be used to clear license data and reset the application to first-run state.
 * 
 * Usage:
 * node scripts/licenseReset.js
 * 
 * Or import functions for use in other scripts:
 * const { resetLicense } = require('./licenseReset.js')
 */

const path = require('path')
const fs = require('fs')
const os = require('os')

/**
 * Get the application data directory where license data is stored
 */
function getAppDataDir() {
  const appName = 'dental-clinic-management'
  
  switch (process.platform) {
    case 'win32':
      return path.join(os.homedir(), 'AppData', 'Roaming', appName)
    case 'darwin':
      return path.join(os.homedir(), 'Library', 'Application Support', appName)
    case 'linux':
      return path.join(os.homedir(), '.config', appName)
    default:
      return path.join(os.homedir(), '.config', appName)
  }
}

/**
 * Get the license data file path
 */
function getLicenseDataPath() {
  const appDataDir = getAppDataDir()
  return path.join(appDataDir, 'license-data.json')
}

/**
 * Check if license data file exists
 */
function licenseDataExists() {
  const licensePath = getLicenseDataPath()
  return fs.existsSync(licensePath)
}

/**
 * Read current license data (if any)
 */
function readLicenseData() {
  const licensePath = getLicenseDataPath()
  
  if (!fs.existsSync(licensePath)) {
    return null
  }
  
  try {
    const data = fs.readFileSync(licensePath, 'utf8')
    return JSON.parse(data)
  } catch (error) {
    console.error('❌ Error reading license data:', error.message)
    return null
  }
}

/**
 * Delete license data file
 */
function deleteLicenseData() {
  const licensePath = getLicenseDataPath()
  
  if (!fs.existsSync(licensePath)) {
    console.log('ℹ️  No license data file found')
    return true
  }
  
  try {
    fs.unlinkSync(licensePath)
    console.log('✅ License data file deleted successfully')
    return true
  } catch (error) {
    console.error('❌ Error deleting license data file:', error.message)
    return false
  }
}

/**
 * Clear all application data (including license data)
 */
function clearAllAppData() {
  const appDataDir = getAppDataDir()
  
  if (!fs.existsSync(appDataDir)) {
    console.log('ℹ️  No application data directory found')
    return true
  }
  
  try {
    // List all files in the app data directory
    const files = fs.readdirSync(appDataDir)
    console.log(`📁 Found ${files.length} files in app data directory:`)
    files.forEach(file => console.log(`   - ${file}`))
    
    // Delete each file
    let deletedCount = 0
    files.forEach(file => {
      const filePath = path.join(appDataDir, file)
      try {
        if (fs.statSync(filePath).isFile()) {
          fs.unlinkSync(filePath)
          deletedCount++
          console.log(`   ✅ Deleted: ${file}`)
        }
      } catch (error) {
        console.error(`   ❌ Failed to delete ${file}:`, error.message)
      }
    })
    
    console.log(`✅ Deleted ${deletedCount} files from app data directory`)
    return true
  } catch (error) {
    console.error('❌ Error clearing app data:', error.message)
    return false
  }
}

/**
 * Reset license to first-run state
 */
function resetLicense() {
  console.log('🔄 Resetting license data...')
  
  const appDataDir = getAppDataDir()
  console.log(`📁 App data directory: ${appDataDir}`)
  
  const licensePath = getLicenseDataPath()
  console.log(`📄 License file path: ${licensePath}`)
  
  // Check current license status
  const currentData = readLicenseData()
  if (currentData) {
    console.log('📋 Current license data found:')
    console.log(`   - Keys: ${Object.keys(currentData).join(', ')}`)
  } else {
    console.log('ℹ️  No current license data found')
  }
  
  // Delete license data
  const success = deleteLicenseData()
  
  if (success) {
    console.log('✅ License reset completed successfully')
    console.log('ℹ️  Application will now show license entry screen on next startup')
  } else {
    console.log('❌ License reset failed')
  }
  
  return success
}

/**
 * Show license status information
 */
function showLicenseStatus() {
  console.log('📊 License Status Information')
  console.log('=' .repeat(50))
  
  const appDataDir = getAppDataDir()
  console.log(`📁 App Data Directory: ${appDataDir}`)
  console.log(`   Exists: ${fs.existsSync(appDataDir)}`)
  
  const licensePath = getLicenseDataPath()
  console.log(`📄 License File: ${licensePath}`)
  console.log(`   Exists: ${licenseDataExists()}`)
  
  const licenseData = readLicenseData()
  if (licenseData) {
    console.log('📋 License Data:')
    Object.keys(licenseData).forEach(key => {
      const value = licenseData[key]
      if (typeof value === 'string' && value.length > 50) {
        console.log(`   ${key}: ${value.substring(0, 20)}...${value.substring(value.length - 10)}`)
      } else {
        console.log(`   ${key}: ${value}`)
      }
    })
  } else {
    console.log('📋 License Data: None')
  }
  
  console.log('\n🔧 Available Actions:')
  console.log('   1. Reset license: node scripts/licenseReset.js reset')
  console.log('   2. Clear all data: node scripts/licenseReset.js clear-all')
  console.log('   3. Show status: node scripts/licenseReset.js status')
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2)
  const action = args[0] || 'status'
  
  console.log('🔐 License Reset Utility for Dental Clinic Management System')
  console.log('=' .repeat(60))
  
  switch (action.toLowerCase()) {
    case 'reset':
      resetLicense()
      break
      
    case 'clear-all':
      console.log('⚠️  This will delete ALL application data!')
      console.log('🔄 Clearing all application data...')
      clearAllAppData()
      break
      
    case 'status':
    default:
      showLicenseStatus()
      break
  }
  
  console.log('\n📝 Usage:')
  console.log('   node scripts/licenseReset.js [action]')
  console.log('   Actions: status (default), reset, clear-all')
}

// Export functions for use in other scripts
module.exports = {
  resetLicense,
  clearAllAppData,
  showLicenseStatus,
  licenseDataExists,
  readLicenseData,
  deleteLicenseData,
  getAppDataDir,
  getLicenseDataPath
}

// Run main function if this script is executed directly
if (require.main === module) {
  main()
}
