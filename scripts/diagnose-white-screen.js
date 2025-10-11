#!/usr/bin/env node

/**
 * سكريبت تشخيص مشكلة الشاشة البيضاء في Electron
 * يفحص جميع الملفات والإعدادات المطلوبة لحل المشكلة
 */

const fs = require('fs')
const path = require('path')

console.log('🔍 تشخيص مشكلة الشاشة البيضاء في Electron')
console.log('=' .repeat(50))

// 1. فحص ملفات البناء
function checkBuildFiles() {
  console.log('\n📁 فحص ملفات البناء:')
  
  const distPath = path.join(__dirname, '../dist')
  const indexPath = path.join(distPath, 'index.html')
  const assetsPath = path.join(distPath, 'assets')
  
  // فحص مجلد dist
  if (fs.existsSync(distPath)) {
    console.log('✅ مجلد dist موجود')
    
    // فحص index.html
    if (fs.existsSync(indexPath)) {
      console.log('✅ ملف index.html موجود')
      
      // فحص محتوى index.html
      const htmlContent = fs.readFileSync(indexPath, 'utf8')
      if (htmlContent.includes('<div id="root">')) {
        console.log('✅ عنصر root موجود في HTML')
      } else {
        console.log('❌ عنصر root غير موجود في HTML')
      }
      
      // فحص المسارات النسبية
      if (htmlContent.includes('src="./assets/')) {
        console.log('✅ المسارات النسبية صحيحة (./assets/)')
      } else if (htmlContent.includes('src="/assets/')) {
        console.log('⚠️ المسارات مطلقة (/assets/) - قد تسبب مشاكل')
      }
      
    } else {
      console.log('❌ ملف index.html غير موجود')
    }
    
    // فحص مجلد assets
    if (fs.existsSync(assetsPath)) {
      console.log('✅ مجلد assets موجود')
      
      const assetFiles = fs.readdirSync(assetsPath)
      console.log(`📄 عدد ملفات assets: ${assetFiles.length}`)
      
      // فحص الملفات المهمة
      const jsFiles = assetFiles.filter(f => f.endsWith('.js'))
      const cssFiles = assetFiles.filter(f => f.endsWith('.css'))
      
      console.log(`  - ملفات JS: ${jsFiles.length}`)
      console.log(`  - ملفات CSS: ${cssFiles.length}`)
      
      if (jsFiles.length === 0) {
        console.log('❌ لا توجد ملفات JavaScript!')
      }
      
    } else {
      console.log('❌ مجلد assets غير موجود')
    }
    
  } else {
    console.log('❌ مجلد dist غير موجود - يجب تشغيل npm run build أولاً')
  }
}

// 2. فحص إعدادات vite.config.ts
function checkViteConfig() {
  console.log('\n⚙️ فحص إعدادات Vite:')
  
  const viteConfigPath = path.join(__dirname, '../vite.config.ts')
  
  if (fs.existsSync(viteConfigPath)) {
    console.log('✅ ملف vite.config.ts موجود')
    
    const viteContent = fs.readFileSync(viteConfigPath, 'utf8')
    
    // فحص base
    if (viteContent.includes("base: './'")) {
      console.log('✅ base مضبوط على "./" (صحيح)')
    } else if (viteContent.includes("base: '/'")) {
      console.log('❌ base مضبوط على "/" (خطأ للإنتاج)')
    }
    
    // فحص outDir
    if (viteContent.includes("outDir: 'dist'")) {
      console.log('✅ outDir مضبوط على "dist"')
    }
    
    // فحص sourcemap
    if (viteContent.includes('sourcemap: true')) {
      console.log('✅ sourcemap مفعل للتشخيص')
    } else {
      console.log('⚠️ sourcemap غير مفعل')
    }
    
  } else {
    console.log('❌ ملف vite.config.ts غير موجود')
  }
}

// 3. فحص إعدادات Electron
function checkElectronConfig() {
  console.log('\n🖥️ فحص إعدادات Electron:')
  
  const mainJsPath = path.join(__dirname, '../electron/main.js')
  
  if (fs.existsSync(mainJsPath)) {
    console.log('✅ ملف electron/main.js موجود')
    
    const mainContent = fs.readFileSync(mainJsPath, 'utf8')
    
    // فحص loadFile vs loadURL
    if (mainContent.includes('loadFile(indexPath)')) {
      console.log('✅ يستخدم loadFile للإنتاج (صحيح)')
    } else if (mainContent.includes('loadURL(`file://')) {
      console.log('⚠️ يستخدم loadURL مع file:// (قد يعمل)')
    }
    
    // فحص webPreferences
    if (mainContent.includes('contextIsolation: true')) {
      console.log('✅ contextIsolation مفعل')
    }
    
    if (mainContent.includes('nodeIntegration: false')) {
      console.log('✅ nodeIntegration معطل (آمن)')
    }
    
    // فحص DevTools
    if (mainContent.includes('openDevTools()')) {
      console.log('✅ DevTools مفعل للتشخيص')
    }
    
  } else {
    console.log('❌ ملف electron/main.js غير موجود')
  }
}

// 4. فحص package.json
function checkPackageJson() {
  console.log('\n📦 فحص package.json:')
  
  const packagePath = path.join(__dirname, '../package.json')
  
  if (fs.existsSync(packagePath)) {
    console.log('✅ ملف package.json موجود')
    
    const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
    
    // فحص main
    if (packageContent.main === 'electron/main.js') {
      console.log('✅ main يشير إلى electron/main.js')
    } else {
      console.log(`⚠️ main يشير إلى: ${packageContent.main}`)
    }
    
    // فحص scripts
    if (packageContent.scripts && packageContent.scripts.build) {
      console.log('✅ سكريبت build موجود')
    }
    
    if (packageContent.scripts && packageContent.scripts.dist) {
      console.log('✅ سكريبت dist موجود')
    }
    
    // فحص electron-builder config
    if (packageContent.build && packageContent.build.files) {
      console.log('✅ إعدادات electron-builder موجودة')
      
      const files = packageContent.build.files
      if (files.includes('dist/**/*')) {
        console.log('✅ مجلد dist مضمن في البناء')
      }
    }
    
  } else {
    console.log('❌ ملف package.json غير موجود')
  }
}

// 5. اقتراحات الحلول
function suggestSolutions() {
  console.log('\n💡 اقتراحات الحلول:')
  console.log('1. تأكد من تشغيل: npm run build')
  console.log('2. تأكد من أن base في vite.config.ts مضبوط على "./"')
  console.log('3. تأكد من أن electron/main.js يستخدم loadFile للإنتاج')
  console.log('4. افتح DevTools في الإنتاج لرؤية الأخطاء')
  console.log('5. تحقق من وحدة التحكم في المتصفح للأخطاء')
  console.log('6. تأكد من أن جميع الملفات في dist/assets موجودة')
}

// تشغيل جميع الفحوصات
function runDiagnosis() {
  checkBuildFiles()
  checkViteConfig()
  checkElectronConfig()
  checkPackageJson()
  suggestSolutions()
  
  console.log('\n✅ انتهى التشخيص')
  console.log('إذا استمرت المشكلة، يرجى مراجعة وحدة التحكم في DevTools')
}

// تشغيل التشخيص
runDiagnosis()
