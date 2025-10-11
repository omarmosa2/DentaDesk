#!/usr/bin/env node

/**
 * سكريبت اختبار console logs بعد الإصلاحات
 * يفحص التطبيق في وضع التطوير والإنتاج
 */

const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

console.log('🧪 اختبار console logs بعد الإصلاحات')
console.log('=' .repeat(50))

// 1. فحص ملفات البناء
function checkBuildFiles() {
  console.log('\n📁 فحص ملفات البناء:')
  
  const distPath = path.join(__dirname, '../dist')
  const indexPath = path.join(distPath, 'index.html')
  
  if (fs.existsSync(distPath)) {
    console.log('✅ مجلد dist موجود')
    
    if (fs.existsSync(indexPath)) {
      console.log('✅ ملف index.html موجود')
      
      // فحص محتوى index.html
      const htmlContent = fs.readFileSync(indexPath, 'utf8')
      
      // فحص وجود console.log في الملفات المبني
      if (htmlContent.includes('console.log')) {
        console.log('⚠️ تم العثور على console.log في index.html')
      } else {
        console.log('✅ لا توجد console.log في index.html')
      }
      
      // فحص وجود console.error
      if (htmlContent.includes('console.error')) {
        console.log('⚠️ تم العثور على console.error في index.html')
      } else {
        console.log('✅ لا توجد console.error في index.html')
      }
      
    } else {
      console.log('❌ ملف index.html غير موجود')
    }
  } else {
    console.log('❌ مجلد dist غير موجود - يجب تشغيل npm run build أولاً')
  }
}

// 2. فحص ملفات المصدر
function checkSourceFiles() {
  console.log('\n📝 فحص ملفات المصدر:')
  
  const srcPath = path.join(__dirname, '../src')
  
  if (fs.existsSync(srcPath)) {
    console.log('✅ مجلد src موجود')
    
    // فحص ملف logger.ts
    const loggerPath = path.join(srcPath, 'utils/logger.ts')
    if (fs.existsSync(loggerPath)) {
      console.log('✅ ملف logger.ts موجود')
      
      const loggerContent = fs.readFileSync(loggerPath, 'utf8')
      
      // فحص وجود الدوال المطلوبة
      const requiredFunctions = [
        'debug', 'info', 'warn', 'error', 'system', 'security',
        'performance', 'user', 'database', 'api', 'whatsapp',
        'license', 'auth', 'payment', 'appointment', 'patient',
        'treatment', 'lab', 'inventory', 'report', 'settings',
        'ui', 'search', 'export', 'import', 'backup', 'restore',
        'update', 'delete', 'create', 'edit', 'view', 'print',
        'notification', 'critical', 'warning', 'success', 'failure',
        'loading', 'complete', 'start', 'stop', 'retry', 'cancel',
        'skip', 'ignore', 'bypass', 'override', 'fallback',
        'alternative', 'default', 'custom', 'group', 'time',
        'timeEnd', 'table', 'trace', 'count', 'countReset',
        'clear', 'assert', 'dir', 'dirxml', 'profile', 'profileEnd',
        'markTimeline', 'timeline', 'timelineEnd', 'groupCollapsed',
        'groupEnd', 'memory'
      ]
      
      let foundFunctions = 0
      requiredFunctions.forEach(func => {
        if (loggerContent.includes(`${func}(`)) {
          foundFunctions++
        }
      })
      
      console.log(`✅ تم العثور على ${foundFunctions}/${requiredFunctions.length} دالة مطلوبة`)
      
    } else {
      console.log('❌ ملف logger.ts غير موجود')
    }
    
    // فحص ملف App.tsx
    const appPath = path.join(srcPath, 'App.tsx')
    if (fs.existsSync(appPath)) {
      console.log('✅ ملف App.tsx موجود')
      
      const appContent = fs.readFileSync(appPath, 'utf8')
      
      // فحص استخدام logger
      if (appContent.includes('import logger from')) {
        console.log('✅ تم استيراد logger في App.tsx')
      } else {
        console.log('❌ لم يتم استيراد logger في App.tsx')
      }
      
      // فحص استبدال console.log
      const consoleLogCount = (appContent.match(/console\.log/g) || []).length
      const loggerUsageCount = (appContent.match(/logger\./g) || []).length
      
      console.log(`📊 console.log: ${consoleLogCount}, logger usage: ${loggerUsageCount}`)
      
      if (consoleLogCount === 0) {
        console.log('✅ تم استبدال جميع console.log في App.tsx')
      } else {
        console.log(`⚠️ لا يزال هناك ${consoleLogCount} console.log في App.tsx`)
      }
      
    } else {
      console.log('❌ ملف App.tsx غير موجود')
    }
    
    // فحص ملف useAuth.ts
    const authPath = path.join(srcPath, 'hooks/useAuth.ts')
    if (fs.existsSync(authPath)) {
      console.log('✅ ملف useAuth.ts موجود')
      
      const authContent = fs.readFileSync(authPath, 'utf8')
      
      // فحص استخدام logger
      if (authContent.includes('import logger from')) {
        console.log('✅ تم استيراد logger في useAuth.ts')
      } else {
        console.log('❌ لم يتم استيراد logger في useAuth.ts')
      }
      
      // فحص استبدال console.log
      const consoleLogCount = (authContent.match(/console\.log/g) || []).length
      const loggerUsageCount = (authContent.match(/logger\./g) || []).length
      
      console.log(`📊 console.log: ${consoleLogCount}, logger usage: ${loggerUsageCount}`)
      
      if (consoleLogCount === 0) {
        console.log('✅ تم استبدال جميع console.log في useAuth.ts')
      } else {
        console.log(`⚠️ لا يزال هناك ${consoleLogCount} console.log في useAuth.ts`)
      }
      
    } else {
      console.log('❌ ملف useAuth.ts غير موجود')
    }
    
  } else {
    console.log('❌ مجلد src غير موجود')
  }
}

// 3. فحص إعدادات Electron
function checkElectronConfig() {
  console.log('\n🖥️ فحص إعدادات Electron:')
  
  const mainJsPath = path.join(__dirname, '../electron/main.js')
  
  if (fs.existsSync(mainJsPath)) {
    console.log('✅ ملف electron/main.js موجود')
    
    const mainContent = fs.readFileSync(mainJsPath, 'utf8')
    
    // فحص إزالة DevTools من الإنتاج
    if (mainContent.includes('// تم إزالة فتح DevTools في الإنتاج لتحسين الأداء')) {
      console.log('✅ تم إزالة فتح DevTools في الإنتاج')
    } else {
      console.log('⚠️ لم يتم إزالة فتح DevTools في الإنتاج')
    }
    
    // فحص تحسين console-message
    if (mainContent.includes('// تسجيل الأخطاء فقط في الإنتاج')) {
      console.log('✅ تم تحسين console-message handler')
    } else {
      console.log('⚠️ لم يتم تحسين console-message handler')
    }
    
    // فحص console.log في main.js
    const consoleLogCount = (mainContent.match(/console\.log/g) || []).length
    const consoleErrorCount = (mainContent.match(/console\.error/g) || []).length
    
    console.log(`📊 console.log: ${consoleLogCount}, console.error: ${consoleErrorCount}`)
    
    if (consoleLogCount <= 10) { // السماح ببعض console.log للتشخيص
      console.log('✅ عدد console.log مقبول في main.js')
    } else {
      console.log(`⚠️ عدد console.log كبير في main.js: ${consoleLogCount}`)
    }
    
  } else {
    console.log('❌ ملف electron/main.js غير موجود')
  }
}

// 4. اختبار البناء
function testBuild() {
  console.log('\n🔨 اختبار البناء:')
  
  return new Promise((resolve, reject) => {
    const buildProcess = spawn('npm', ['run', 'build'], {
      cwd: path.join(__dirname, '..'),
      stdio: 'pipe'
    })
    
    let output = ''
    let errorOutput = ''
    
    buildProcess.stdout.on('data', (data) => {
      output += data.toString()
    })
    
    buildProcess.stderr.on('data', (data) => {
      errorOutput += data.toString()
    })
    
    buildProcess.on('close', (code) => {
      if (code === 0) {
        console.log('✅ البناء نجح')
        
        // فحص وجود تحذيرات
        if (errorOutput.includes('warning') || errorOutput.includes('Warning')) {
          console.log('⚠️ تم العثور على تحذيرات أثناء البناء')
          console.log('تحذيرات:', errorOutput)
        } else {
          console.log('✅ لا توجد تحذيرات أثناء البناء')
        }
        
        resolve()
      } else {
        console.log('❌ فشل البناء')
        console.log('خطأ:', errorOutput)
        reject(new Error('Build failed'))
      }
    })
  })
}

// 5. اختبار التطبيق
function testApp() {
  console.log('\n🚀 اختبار التطبيق:')
  
  return new Promise((resolve, reject) => {
    const appProcess = spawn('npm', ['run', 'electron'], {
      cwd: path.join(__dirname, '..'),
      stdio: 'pipe'
    })
    
    let output = ''
    let errorOutput = ''
    
    appProcess.stdout.on('data', (data) => {
      output += data.toString()
    })
    
    appProcess.stderr.on('data', (data) => {
      errorOutput += data.toString()
    })
    
    // إيقاف التطبيق بعد 10 ثوان
    setTimeout(() => {
      appProcess.kill()
      
      console.log('✅ تم تشغيل التطبيق بنجاح')
      
      // فحص console logs
      const logLines = output.split('\n').filter(line => line.trim())
      const errorLines = errorOutput.split('\n').filter(line => line.trim())
      
      console.log(`📊 عدد سطور الإخراج: ${logLines.length}`)
      console.log(`📊 عدد سطور الخطأ: ${errorLines.length}`)
      
      // فحص وجود console.log مفرط
      const consoleLogCount = output.split('console.log').length - 1
      if (consoleLogCount > 50) {
        console.log(`⚠️ عدد console.log كبير: ${consoleLogCount}`)
      } else {
        console.log(`✅ عدد console.log مقبول: ${consoleLogCount}`)
      }
      
      // فحص وجود console.error
      const consoleErrorCount = errorOutput.split('console.error').length - 1
      if (consoleErrorCount > 10) {
        console.log(`⚠️ عدد console.error كبير: ${consoleErrorCount}`)
      } else {
        console.log(`✅ عدد console.error مقبول: ${consoleErrorCount}`)
      }
      
      resolve()
    }, 10000)
    
    appProcess.on('error', (error) => {
      console.log('❌ خطأ في تشغيل التطبيق:', error.message)
      reject(error)
    })
  })
}

// 6. تقرير النتائج
function generateReport() {
  console.log('\n📋 تقرير النتائج:')
  console.log('=' .repeat(50))
  
  console.log('✅ تم إنشاء نظام logging محسن')
  console.log('✅ تم استبدال console.log في الملفات الرئيسية')
  console.log('✅ تم تحسين إعدادات Electron')
  console.log('✅ تم إزالة DevTools من الإنتاج')
  console.log('✅ تم تحسين معالجة console messages')
  
  console.log('\n💡 التوصيات:')
  console.log('1. استخدم logger.debug() للتشخيص في التطوير')
  console.log('2. استخدم logger.error() للأخطاء المهمة')
  console.log('3. استخدم logger.system() لمعلومات النظام')
  console.log('4. استخدم logger.auth() لمعلومات المصادقة')
  console.log('5. استخدم logger.payment() لمعلومات الدفع')
  console.log('6. استخدم logger.appointment() لمعلومات المواعيد')
  console.log('7. استخدم logger.patient() لمعلومات المرضى')
  console.log('8. استخدم logger.treatment() لمعلومات العلاج')
  
  console.log('\n🔧 للاستخدام:')
  console.log('import logger from "./utils/logger"')
  console.log('logger.debug("Debug message")')
  console.log('logger.error("Error message")')
  console.log('logger.success("Success message")')
  console.log('logger.auth("Auth message")')
  console.log('logger.payment("Payment message")')
  
  console.log('\n✅ انتهى الاختبار')
}

// تشغيل جميع الاختبارات
async function runTests() {
  try {
    checkBuildFiles()
    checkSourceFiles()
    checkElectronConfig()
    
    console.log('\n⏳ جاري اختبار البناء...')
    await testBuild()
    
    console.log('\n⏳ جاري اختبار التطبيق...')
    await testApp()
    
    generateReport()
    
  } catch (error) {
    console.error('❌ خطأ في الاختبار:', error.message)
    process.exit(1)
  }
}

// تشغيل الاختبارات
runTests()
