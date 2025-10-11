import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './App.css'
import './styles/globals.css'
import { initGlobalErrorHandler } from './utils/globalErrorHandler'

// ✅ معالج الأخطاء الشامل لـ React
console.log('🚀 Starting React application...')

// Initialize global error handler
initGlobalErrorHandler()

// Additional safety measures
if (typeof window !== 'undefined') {
  // Override Object.prototype.toString to prevent primitive conversion errors
  const originalToString = Object.prototype.toString
  Object.prototype.toString = function() {
    try {
      return originalToString.call(this)
    } catch (error) {
      return '[Object]'
    }
  }

  // Override Array.prototype.toString
  const originalArrayToString = Array.prototype.toString
  Array.prototype.toString = function() {
    try {
      return originalArrayToString.call(this)
    } catch (error) {
      return '[Array]'
    }
  }
}

// التحقق من وجود عنصر root
const rootElement = document.getElementById('root')
if (!rootElement) {
  console.error('❌ Root element not found!')
  document.body.innerHTML = `
    <div style="
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      font-family: Arial, sans-serif;
      background: #f5f5f5;
      color: #333;
      text-align: center;
    ">
      <div>
        <h1>خطأ في التحميل</h1>
        <p>لم يتم العثور على عنصر الجذر في الصفحة</p>
        <p>يرجى إعادة تشغيل التطبيق</p>
      </div>
    </div>
  `
  throw new Error('Root element not found')
}

console.log('✅ Root element found, creating React root...')

try {
  const root = ReactDOM.createRoot(rootElement)
  console.log('✅ React root created successfully')

  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )

  console.log('✅ React app rendered successfully')
} catch (error) {
  console.error('❌ Failed to render React app:', error)

  // عرض رسالة خطأ بديلة
  rootElement.innerHTML = `
    <div style="
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      font-family: Arial, sans-serif;
      background: #f5f5f5;
      color: #333;
      text-align: center;
    ">
      <div>
        <h1>خطأ في تحميل التطبيق</h1>
        <p>حدث خطأ أثناء تحميل التطبيق</p>
        <p>يرجى إعادة تشغيل التطبيق أو الاتصال بالدعم الفني</p>
        <details style="margin-top: 20px; text-align: left;">
          <summary>تفاصيل الخطأ</summary>
          <pre style="background: #fff; padding: 10px; border-radius: 4px; margin-top: 10px;">
${error.message}
${error.stack}
          </pre>
        </details>
      </div>
    </div>
  `
}
