const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 تثبيت Chrome لـ Puppeteer...');

try {
  // تثبيت Chrome باستخدام puppeteer-core الموجود
  console.log('🔧 تثبيت Chrome...');
  
  // استخدام puppeteer-core لتثبيت Chrome
  const puppeteer = require('puppeteer-core');
  
  // البحث عن Chrome في المسارات المحتملة
  const possiblePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Users\\' + require('os').userInfo().username + '\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe'
  ];
  
  let chromePath = null;
  for (const path of possiblePaths) {
    if (fs.existsSync(path)) {
      chromePath = path;
      console.log('✅ تم العثور على Chrome في:', path);
      break;
    }
  }
  
  if (!chromePath) {
    console.log('⚠️ لم يتم العثور على Chrome، سيتم استخدام المتصفح الافتراضي');
    console.log('💡 يرجى تثبيت Google Chrome من: https://www.google.com/chrome/');
  }
  
  // إنشاء ملف معلومات
  const info = {
    installed: true,
    timestamp: new Date().toISOString(),
    chromePath: chromePath,
    found: !!chromePath
  };
  
  fs.writeFileSync(
    path.join(__dirname, '..', 'chrome-info.json'), 
    JSON.stringify(info, null, 2)
  );
  
  console.log('✅ تم حفظ معلومات Chrome في chrome-info.json');
  
  if (chromePath) {
    console.log('✅ تم العثور على Chrome بنجاح');
    console.log('📁 مسار Chrome:', chromePath);
  } else {
    console.log('⚠️ لم يتم العثور على Chrome، سيتم استخدام المتصفح الافتراضي');
  }
  
} catch (error) {
  console.error('❌ خطأ في تثبيت Chrome:', error.message);
  process.exit(1);
}
