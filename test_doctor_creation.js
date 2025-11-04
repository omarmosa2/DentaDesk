// Simple test to verify doctor creation functionality
const { DatabaseService } = require('./src/services/databaseService.js')

async function testDoctorCreation() {
  console.log('🧪 Testing doctor creation functionality...')
  
  try {
    // Create a temporary database for testing
    const dbService = new DatabaseService(':memory:')
    
    console.log('✅ Database service initialized')
    
    // Test creating a doctor
    const testDoctor = {
      name: 'د. أحمد محمد',
      specialty: 'تقويم الأسنان'
    }
    
    console.log('🔄 Creating test doctor:', testDoctor)
    const createdDoctor = await dbService.createDoctor(testDoctor)
    
    console.log('✅ Doctor created successfully:', createdDoctor)
    
    // Test getting all doctors
    const allDoctors = await dbService.getAllDoctors()
    console.log('📊 All doctors:', allDoctors)
    
    // Test getting doctor by ID
    const doctorById = await dbService.getDoctorById(createdDoctor.id)
    console.log('🔍 Doctor by ID:', doctorById)
    
    // Test updating doctor
    const updatedDoctor = await dbService.updateDoctor(createdDoctor.id, {
      specialty: 'تقويم وعلاج الأسنان'
    })
    console.log('✏️ Doctor updated:', updatedDoctor)
    
    // Clean up
    dbService.close()
    console.log('🧹 Test completed successfully!')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    console.error('Stack trace:', error.stack)
    return false
  }
  
  return true
}

// Run the test
testDoctorCreation().then(success => {
  if (success) {
    console.log('🎉 All tests passed!')
    process.exit(0)
  } else {
    console.log('💥 Tests failed!')
    process.exit(1)
  }
})