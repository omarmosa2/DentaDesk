// Simple diagnostic test to verify doctor methods exist
const fs = require('fs')

function testDoctorMethodsExist() {
  console.log('🧪 Testing doctor methods existence in databaseService.js...')
  
  try {
    // Read the database service file
    const dbServiceContent = fs.readFileSync('./src/services/databaseService.js', 'utf8')
    
    // Check if doctor-related methods exist
    const methodsToCheck = [
      'ensureDoctorsTableExists',
      'getAllDoctors',
      'getDoctorById', 
      'createDoctor',
      'updateDoctor',
      'deleteDoctor',
      'searchDoctors'
    ]
    
    const missingMethods = []
    const foundMethods = []
    
    methodsToCheck.forEach(method => {
      if (dbServiceContent.includes(`${method}(`)) {
        foundMethods.push(method)
        console.log(`✅ Found method: ${method}`)
      } else {
        missingMethods.push(method)
        console.log(`❌ Missing method: ${method}`)
      }
    })
    
    // Check if doctors table creation is called during initialization
    const hasInitializationCall = dbServiceContent.includes('this.ensureDoctorsTableExists()')
    if (hasInitializationCall) {
      console.log('✅ Doctors table initialization called')
    } else {
      console.log('❌ Doctors table initialization not called')
      missingMethods.push('ensureDoctorsTableExists initialization call')
    }
    
    console.log('\n📊 Summary:')
    console.log(`✅ Found methods: ${foundMethods.length}`)
    console.log(`❌ Missing methods: ${missingMethods.length}`)
    
    if (missingMethods.length === 0) {
      console.log('🎉 All doctor methods are properly implemented!')
      return true
    } else {
      console.log('💥 Some doctor methods are missing:')
      missingMethods.forEach(method => console.log(`  - ${method}`))
      return false
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    return false
  }
}

// Run the test
const success = testDoctorMethodsExist()
process.exit(success ? 0 : 1)