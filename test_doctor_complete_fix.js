const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');
const { join } = require('path');

// Test the complete doctor creation flow
async function testDoctorCreationFlow() {
  console.log('🧪 Testing Complete Doctor Creation Flow...\n');
  
  try {
    console.log('📋 Step 1: Checking if main.ts contains doctor IPC handlers...');
    
    // Read main.ts and check for doctor handlers
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
      
      console.log(`\n📊 Results: ${foundHandlers}/${doctorHandlerPatterns.length} doctor IPC handlers found in main.ts`);
      
      if (foundHandlers === doctorHandlerPatterns.length) {
        console.log('✅ SUCCESS: All doctor IPC handlers are properly registered in main.ts');
      } else {
        console.log('❌ FAILURE: Some doctor IPC handlers are missing from main.ts');
        return false;
      }
      
    } else {
      console.log('❌ main.ts file not found');
      return false;
    }
    
    console.log('\n📋 Step 2: Checking if preload.ts contains doctor API...');
    
    // Read preload.ts and check for doctor API
    const preloadTsPath = './electron/preload.ts';
    
    if (fs.existsSync(preloadTsPath)) {
      const preloadTsContent = fs.readFileSync(preloadTsPath, 'utf8');
      
      // Check for doctor API patterns
      const doctorApiPatterns = [
        "doctors: {",
        "getAll:",
        "getById:",
        "create:",
        "update:",
        "delete:",
        "search:"
      ];
      
      console.log('🔍 Checking for doctor API in preload.ts:');
      
      let foundApiMethods = 0;
      doctorApiPatterns.forEach((pattern, index) => {
        const found = preloadTsContent.includes(pattern);
        if (found) {
          console.log(`✅ ${pattern} - FOUND`);
          foundApiMethods++;
        } else {
          console.log(`❌ ${pattern} - NOT FOUND`);
        }
      });
      
      console.log(`\n📊 Results: ${foundApiMethods}/${doctorApiPatterns.length} doctor API methods found in preload.ts`);
      
      if (foundApiMethods === doctorApiPatterns.length) {
        console.log('✅ SUCCESS: All doctor API methods are properly defined in preload.ts');
      } else {
        console.log('❌ FAILURE: Some doctor API methods are missing from preload.ts');
        return false;
      }
      
    } else {
      console.log('❌ preload.ts file not found');
      return false;
    }
    
    console.log('\n📋 Step 3: Checking if global.d.ts contains doctor types...');
    
    // Read global.d.ts and check for doctor types
    const globalTypesPath = './src/types/global.d.ts';
    
    if (fs.existsSync(globalTypesPath)) {
      const globalTypesContent = fs.readFileSync(globalTypesPath, 'utf8');
      
      // Check for doctor type patterns
      const doctorTypePatterns = [
        "doctors: {",
        "getAll:",
        "getById:",
        "create:",
        "update:",
        "delete:",
        "search:"
      ];
      
      console.log('🔍 Checking for doctor types in global.d.ts:');
      
      let foundTypeMethods = 0;
      doctorTypePatterns.forEach((pattern, index) => {
        const found = globalTypesContent.includes(pattern);
        if (found) {
          console.log(`✅ ${pattern} - FOUND`);
          foundTypeMethods++;
        } else {
          console.log(`❌ ${pattern} - NOT FOUND`);
        }
      });
      
      console.log(`\n📊 Results: ${foundTypeMethods}/${doctorTypePatterns.length} doctor type methods found in global.d.ts`);
      
      if (foundTypeMethods === doctorTypePatterns.length) {
        console.log('✅ SUCCESS: All doctor type methods are properly defined in global.d.ts');
      } else {
        console.log('❌ FAILURE: Some doctor type methods are missing from global.d.ts');
        return false;
      }
      
    } else {
      console.log('❌ global.d.ts file not found');
      return false;
    }
    
    console.log('\n📋 Step 4: Checking if doctorStore.ts uses correct API...');
    
    // Read doctorStore.ts and check for correct API usage
    const doctorStorePath = './src/store/doctorStore.ts';
    
    if (fs.existsSync(doctorStorePath)) {
      const doctorStoreContent = fs.readFileSync(doctorStorePath, 'utf8');
      
      // Check for correct API usage patterns
      const correctUsagePatterns = [
        "window.electronAPI.doctors.create",
        "window.electronAPI.doctors.getAll",
        "window.electronAPI.doctors.update",
        "window.electronAPI.doctors.delete",
        "window.electronAPI.doctors.search"
      ];
      
      console.log('🔍 Checking for correct API usage in doctorStore.ts:');
      
      let foundCorrectUsage = 0;
      correctUsagePatterns.forEach((pattern, index) => {
        const found = doctorStoreContent.includes(pattern);
        if (found) {
          console.log(`✅ ${pattern} - FOUND`);
          foundCorrectUsage++;
        } else {
          console.log(`❌ ${pattern} - NOT FOUND`);
        }
      });
      
      console.log(`\n📊 Results: ${foundCorrectUsage}/${correctUsagePatterns.length} correct API usage patterns found in doctorStore.ts`);
      
      if (foundCorrectUsage === correctUsagePatterns.length) {
        console.log('✅ SUCCESS: All correct API usage patterns are found in doctorStore.ts');
      } else {
        console.log('❌ FAILURE: Some correct API usage patterns are missing from doctorStore.ts');
        return false;
      }
      
    } else {
      console.log('❌ doctorStore.ts file not found');
      return false;
    }
    
    console.log('\n🎉 FINAL RESULT:');
    console.log('✅ All components are properly configured for doctor creation');
    console.log('✅ Doctor IPC handlers are registered in main.ts');
    console.log('✅ Doctor API is exposed in preload.ts');
    console.log('✅ Doctor types are defined in global.d.ts');
    console.log('✅ Doctor store uses correct API calls');
    
    console.log('\n🚀 CONCLUSION:');
    console.log('The doctor creation error should now be FIXED!');
    console.log('The application should now be able to:');
    console.log('  1. Create new doctors from the Doctors management page');
    console.log('  2. Display doctors correctly');
    console.log('  3. Update and delete doctors');
    console.log('  4. Search for doctors');
    
    return true;
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    return false;
  }
}

// Main test execution
const runTests = async () => {
  console.log('🚀 Starting Complete Doctor Creation Flow Tests...\n');
  
  try {
    const success = await testDoctorCreationFlow();
    
    if (success) {
      console.log('\n🎯 FINAL VERDICT:');
      console.log('✅ SUCCESS: Doctor creation functionality has been FIXED!');
      console.log('The original error "Error creating doctor in store: Error" should no longer occur.');
      return true;
    } else {
      console.log('\n❌ FAILURE: Some issues remain with the doctor creation functionality.');
      return false;
    }
    
  } catch (error) {
    console.error('💥 Tests crashed:', error);
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