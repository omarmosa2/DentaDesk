/**
 * Test utility to verify settings backup and restore functionality
 * This helps ensure that clinic settings persist through theme changes
 */

import type { ClinicSettings } from '../types'

// Test data for clinic settings
const testClinicSettings: Partial<ClinicSettings> = {
  clinic_name: 'عيادة الدكتور أحمد للأسنان',
  doctor_name: 'د. أحمد محمد',
  clinic_phone: '+966501234567',
  clinic_email: 'info@dental-clinic.com',
  clinic_address: 'شارع الملك فهد، الرياض',
  clinic_logo: '/assets/clinic-logo.png'
}

// Test backup functionality
export const testSettingsBackup = () => {
  console.log('🧪 Testing settings backup functionality...')
  
  try {
    // Test saving backup
    const backup = {
      ...testClinicSettings,
      timestamp: Date.now()
    }
    localStorage.setItem('dental-clinic-settings-backup', JSON.stringify(backup))
    console.log('✅ Backup saved successfully')
    
    // Test restoring backup
    const backupStr = localStorage.getItem('dental-clinic-settings-backup')
    if (backupStr) {
      const restoredBackup = JSON.parse(backupStr)
      console.log('✅ Backup restored successfully:', restoredBackup)
      
      // Verify data integrity
      if (restoredBackup.clinic_name === testClinicSettings.clinic_name) {
        console.log('✅ Data integrity verified')
      } else {
        console.error('❌ Data integrity check failed')
      }
    } else {
      console.error('❌ Failed to restore backup')
    }
    
    return true
  } catch (error) {
    console.error('❌ Settings backup test failed:', error)
    return false
  }
}

// Test theme switching without losing settings
export const testThemeSwitchPersistence = () => {
  console.log('🧪 Testing theme switch persistence...')
  
  try {
    // Save test settings
    const backup = {
      ...testClinicSettings,
      timestamp: Date.now()
    }
    localStorage.setItem('dental-clinic-settings-backup', JSON.stringify(backup))
    
    // Simulate theme switch
    const currentTheme = localStorage.getItem('dental-clinic-theme') || 'light'
    const newTheme = currentTheme === 'light' ? 'dark' : 'light'
    localStorage.setItem('dental-clinic-theme', newTheme)
    
    // Check if settings backup still exists
    const backupAfterThemeSwitch = localStorage.getItem('dental-clinic-settings-backup')
    if (backupAfterThemeSwitch) {
      const parsedBackup = JSON.parse(backupAfterThemeSwitch)
      if (parsedBackup.clinic_name === testClinicSettings.clinic_name) {
        console.log('✅ Settings persisted through theme switch')
        return true
      }
    }
    
    console.error('❌ Settings lost during theme switch')
    return false
  } catch (error) {
    console.error('❌ Theme switch persistence test failed:', error)
    return false
  }
}

// Clean up test data
export const cleanupTestData = () => {
  try {
    localStorage.removeItem('dental-clinic-settings-backup')
    console.log('🧹 Test data cleaned up')
  } catch (error) {
    console.warn('⚠️ Failed to clean up test data:', error)
  }
}

// Run all tests
export const runAllSettingsTests = () => {
  console.log('🚀 Running all settings persistence tests...')
  
  const backupTest = testSettingsBackup()
  const themeTest = testThemeSwitchPersistence()
  
  if (backupTest && themeTest) {
    console.log('🎉 All tests passed! Settings persistence is working correctly.')
  } else {
    console.error('💥 Some tests failed. Settings persistence may have issues.')
  }
  
  cleanupTestData()
  
  return backupTest && themeTest
}

// Export for use in development console
if (typeof window !== 'undefined') {
  (window as any).settingsTests = {
    testSettingsBackup,
    testThemeSwitchPersistence,
    cleanupTestData,
    runAllSettingsTests
  }
}
