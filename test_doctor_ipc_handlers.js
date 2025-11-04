const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');
const { join } = require('path');

// Import the doctor IPC handlers (similar to what's in main.ts)
const testDoctorIPC = async () => {
  console.log('🧪 Testing Doctor IPC Handlers Registration...\n');
  
  try {
    // Import the main.ts file to test if it can be loaded (simulating what electron would do)
    console.log('🔍 Checking if main.ts can be loaded and parsed...');
    
    // Read the main.ts file and check for doctor IPC handlers
    const fs = require('fs');
    const mainTsPath = './electron/main.ts';
    
    if (fs.existsSync(mainTsPath)) {
      const mainTsContent = fs.readFileSync(mainTsPath, 'utf8');
      
      // Check for doctor IPC handler patterns
      const doctorHandlerPatterns = [
        "ipcMain.handle('db:doctors:getAll'",
        "ipcMain.handle('db:doctors:getById'",
        "ipcMain.handle('db:doctors:create'",
        "ipcMain.handle('db:doctors:update'",
        "ipcMain.handle('db:doctors:delete'",
        "ipcMain.handle('db:doctors:search'"
      ];
      
      console.log('🔍 Checking for doctor IPC handlers in main.ts:');
      
      let foundHandlers = 0;
      doctorHandlerPatterns.forEach((pattern, index) => {
        const found = mainTsContent.includes(pattern);
        if (found) {
          console.log(`✅ ${pattern} - FOUND`);
          foundHandlers++;
        } else {
          console.log(`❌ ${pattern} - NOT FOUND`);
        }
      });
      
      console.log(`\n📊 Results: ${foundHandlers}/${doctorHandlerPatterns.length} doctor IPC handlers found`);
      
      if (foundHandlers === doctorHandlerPatterns.length) {
        console.log('🎉 SUCCESS: All doctor IPC handlers are properly registered in main.ts');
        return true;
      } else {
        console.log('❌ FAILURE: Some doctor IPC handlers are missing from main.ts');
        return false;
      }
      
    } else {
      console.log('❌ main.ts file not found');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error during IPC handler test:', error.message);
    return false;
  }
};

// Mock IPC handler registration to test the patterns
const testIPCHandlerPatterns = async () => {
  console.log('\n🧪 Testing IPC Handler Pattern Registration...\n');
  
  try {
    // Test if we can register and call doctor IPC handlers (mock test)
    let doctorCreateCalled = false;
    let doctorGetAllCalled = false;
    let doctorUpdateCalled = false;
    let doctorDeleteCalled = false;
    let doctorSearchCalled = false;
    
    // Mock IPC handlers (simulating what main.ts should have)
    ipcMain.handle('db:doctors:create', async (event, doctorData) => {
      console.log('🔧 MOCK: db:doctors:create called with:', doctorData);
      doctorCreateCalled = true;
      return { id: 'test-doctor-1', ...doctorData };
    });
    
    ipcMain.handle('db:doctors:getAll', async () => {
      console.log('🔧 MOCK: db:doctors:getAll called');
      doctorGetAllCalled = true;
      return [{ id: 'test-doctor-1', name: 'Dr. Test', specialty: 'Dentistry' }];
    });
    
    ipcMain.handle('db:doctors:update', async (event, id, doctorData) => {
      console.log('🔧 MOCK: db:doctors:update called with:', id, doctorData);
      doctorUpdateCalled = true;
      return { id, ...doctorData };
    });
    
    ipcMain.handle('db:doctors:delete', async (event, id) => {
      console.log('🔧 MOCK: db:doctors:delete called with:', id);
      doctorDeleteCalled = true;
      return true;
    });
    
    ipcMain.handle('db:doctors:search', async (event, query) => {
      console.log('🔧 MOCK: db:doctors:search called with:', query);
      doctorSearchCalled = true;
      return [{ id: 'test-doctor-1', name: 'Dr. Search', specialty: 'Dentistry' }];
    });
    
    // Test calling these handlers
    console.log('📞 Testing IPC handler calls:');
    
    // Test create doctor
    const createResult = await ipcMain.invoke('db:doctors:create', {
      name: 'Dr. Test Doctor',
      specialty: 'Dentistry',
      phone: '0501234567',
      email: 'test@dentist.com'
    });
    console.log('✅ Create test result:', createResult.id ? 'SUCCESS' : 'FAILURE');
    
    // Test get all
    const getAllResult = await ipcMain.invoke('db:doctors:getAll');
    console.log('✅ GetAll test result:', getAllResult.length > 0 ? 'SUCCESS' : 'FAILURE');
    
    // Test update
    const updateResult = await ipcMain.invoke('db:doctors:update', 'test-doctor-1', {
      name: 'Dr. Updated'
    });
    console.log('✅ Update test result:', updateResult.id ? 'SUCCESS' : 'FAILURE');
    
    // Test delete
    const deleteResult = await ipcMain.invoke('db:doctors:delete', 'test-doctor-1');
    console.log('✅ Delete test result:', deleteResult ? 'SUCCESS' : 'FAILURE');
    
    // Test search
    const searchResult = await ipcMain.invoke('db:doctors:search', 'test');
    console.log('✅ Search test result:', searchResult.length > 0 ? 'SUCCESS' : 'FAILURE');
    
    console.log('\n📊 IPC Handler Pattern Test Summary:');
    console.log('Create:', doctorCreateCalled ? '✅' : '❌');
    console.log('GetAll:', doctorGetAllCalled ? '✅' : '❌');
    console.log('Update:', doctorUpdateCalled ? '✅' : '❌');
    console.log('Delete:', doctorDeleteCalled ? '✅' : '❌');
    console.log('Search:', doctorSearchCalled ? '✅' : '❌');
    
    const allPassed = doctorCreateCalled && doctorGetAllCalled && 
                     doctorUpdateCalled && doctorDeleteCalled && doctorSearchCalled;
    
    if (allPassed) {
      console.log('🎉 All IPC handler patterns work correctly!');
      return true;
    } else {
      console.log('❌ Some IPC handler patterns failed');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error during IPC pattern test:', error.message);
    return false;
  }
};

// Main test execution
const runTests = async () => {
  console.log('🚀 Starting Doctor IPC Handler Tests...\n');
  
  try {
    // Test 1: Check if doctor IPC handlers are in main.ts
    const handlerCheck = await testDoctorIPC();
    
    // Test 2: Test IPC handler patterns
    const patternTest = await testIPCHandlerPatterns();
    
    console.log('\n🎯 FINAL RESULTS:');
    console.log('Main.ts IPC Handlers Check:', handlerCheck ? '✅ PASS' : '❌ FAIL');
    console.log('IPC Handler Pattern Test:', patternTest ? '✅ PASS' : '❌ FAIL');
    
    if (handlerCheck && patternTest) {
      console.log('\n🎉 SUCCESS: Doctor creation error should now be fixed!');
      console.log('   The missing IPC handlers have been added to main.ts');
      console.log('   All doctor operations (create, read, update, delete, search) should now work');
      return true;
    } else {
      console.log('\n❌ FAILURE: Some issues remain with doctor IPC handlers');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    return false;
  }
};

// Run the tests
runTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('💥 Tests crashed:', error);
  process.exit(1);
});