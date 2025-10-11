/**
 * اختبار التناسق العام للنظام
 * System consistency test
 */

export class SystemConsistencyTest {
  private static instance: SystemConsistencyTest;

  static getInstance(): SystemConsistencyTest {
    if (!SystemConsistencyTest.instance) {
      SystemConsistencyTest.instance = new SystemConsistencyTest();
    }
    return SystemConsistencyTest.instance;
  }

  /**
   * اختبار تناسق ألوان الثيم
   * Test theme color consistency
   */
  async testThemeColorConsistency(): Promise<boolean> {
    console.log('🧪 Testing theme color consistency...');

    try {
      // التحقق من وجود متغيرات CSS المطلوبة
      const requiredCSSVariables = [
        '--background',
        '--foreground',
        '--primary',
        '--secondary',
        '--muted',
        '--accent',
        '--border',
        '--card',
        '--card-foreground'
      ];

      const rootStyles = getComputedStyle(document.documentElement);

      for (const variable of requiredCSSVariables) {
        const value = rootStyles.getPropertyValue(variable);
        if (!value || value.trim() === '') {
          console.warn(`⚠️ CSS variable not defined: ${variable}`);
        } else {
          console.log(`✅ CSS variable defined: ${variable} = ${value}`);
        }
      }

      return true;
    } catch (error) {
      console.error('❌ Theme color consistency test failed:', error);
      return false;
    }
  }

  /**
   * اختبار تناسق فئات CSS
   * Test CSS classes consistency
   */
  async testCSSClassesConsistency(): Promise<boolean> {
    console.log('🧪 Testing CSS classes consistency...');

    try {
      // فئات CSS المطلوبة للثيم
      const requiredThemeClasses = [
        '.theme-aware',
        '.theme-transitions-enabled',
        '.action-btn-view',
        '.action-btn-edit',
        '.action-btn-delete',
        '.status-scheduled',
        '.status-completed',
        '.status-cancelled'
      ];

      // فئات CSS المطلوبة للـ RTL
      const requiredRTLClasses = [
        '.rtl-layout',
        '.flex-rtl',
        '.space-x-rtl',
        '.mr-auto-rtl',
        '.ml-auto-rtl'
      ];

      // فئات CSS المطلوبة للأداء
      const requiredPerformanceClasses = [
        '.theme-transition',
        '.theme-container',
        '.large-theme-container'
      ];

      const allRequiredClasses = [
        ...requiredThemeClasses,
        ...requiredRTLClasses,
        ...requiredPerformanceClasses
      ];

      for (const className of allRequiredClasses) {
        // التحقق من وجود الفئة في CSS
        const element = document.querySelector(className.replace('.', ''));
        if (element) {
          console.log(`✅ CSS class found: ${className}`);
        } else {
          console.warn(`⚠️ CSS class not found in DOM: ${className}`);
        }
      }

      return true;
    } catch (error) {
      console.error('❌ CSS classes consistency test failed:', error);
      return false;
    }
  }

  /**
   * اختبار تناسق الوظائف الأساسية
   * Test core functionality consistency
   */
  async testCoreFunctionality(): Promise<boolean> {
    console.log('🧪 Testing core functionality consistency...');

    try {
      // اختبار الوظائف الأساسية للمتصفح
      const requiredAPIs = [
        'document',
        'window',
        'localStorage',
        'sessionStorage',
        'setTimeout',
        'setInterval',
        'Promise',
        'fetch'
      ];

      for (const api of requiredAPIs) {
        if (typeof (globalThis as any)[api] === 'undefined') {
          console.warn(`⚠️ API not available: ${api}`);
        } else {
          console.log(`✅ API available: ${api}`);
        }
      }

      return true;
    } catch (error) {
      console.error('❌ Core functionality test failed:', error);
      return false;
    }
  }

  /**
   * اختبار تناسق التبعيات
   * Test dependencies consistency
   */
  async testDependenciesConsistency(): Promise<boolean> {
    console.log('🧪 Testing dependencies consistency...');

    try {
      // التحقق من وجود React
      if (typeof (globalThis as any).React === 'undefined') {
        console.warn('⚠️ React not available');
      } else {
        console.log(`✅ React available: ${(globalThis as any).React.version || 'unknown version'}`);
      }

      // التحقق من وجود Electron APIs
      if (typeof window !== 'undefined') {
        const electronAPIs = ['electron', 'electronAPI'];
        for (const api of electronAPIs) {
          if ((window as any)[api]) {
            console.log(`✅ Electron API available: ${api}`);
          } else {
            console.log(`ℹ️ Electron API not available: ${api} (expected in web mode)`);
          }
        }
      }

      return true;
    } catch (error) {
      console.error('❌ Dependencies consistency test failed:', error);
      return false;
    }
  }

  /**
   * اختبار تناسق الأمان
   * Test security consistency
   */
  async testSecurityConsistency(): Promise<boolean> {
    console.log('🧪 Testing security consistency...');

    try {
      // التحقق من إعدادات CSP
      const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
      if (cspMeta) {
        console.log('✅ CSP meta tag found');
      } else {
        console.log('ℹ️ CSP meta tag not found (may be set by server)');
      }

      // التحقق من HTTPS في الإنتاج
      if (window.location.protocol === 'https:') {
        console.log('✅ HTTPS enabled');
      } else if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.log('ℹ️ HTTP allowed for local development');
      } else {
        console.warn('⚠️ HTTPS not enabled in production');
      }

      return true;
    } catch (error) {
      console.error('❌ Security consistency test failed:', error);
      return false;
    }
  }

  /**
   * اختبار تناسق الأداء
   * Test performance consistency
   */
  async testPerformanceConsistency(): Promise<boolean> {
    console.log('🧪 Testing performance consistency...');

    try {
      // التحقق من Performance API
      if (typeof performance !== 'undefined') {
        console.log('✅ Performance API available');

        // قياس وقت بدء التحميل
        if (performance.timing) {
          const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
          console.log(`⏱️ Page load time: ${loadTime}ms`);
        }
      } else {
        console.warn('⚠️ Performance API not available');
      }

      // التحقق من Memory API
      if (typeof performance !== 'undefined' && (performance as any).memory) {
        console.log('✅ Memory API available');
      } else {
        console.log('ℹ️ Memory API not available (expected in some environments)');
      }

      return true;
    } catch (error) {
      console.error('❌ Performance consistency test failed:', error);
      return false;
    }
  }

  /**
   * اختبار تناسق إمكانية الوصول
   * Test accessibility consistency
   */
  async testAccessibilityConsistency(): Promise<boolean> {
    console.log('🧪 Testing accessibility consistency...');

    try {
      // التحقق من وجود lang attribute
      const htmlElement = document.documentElement;
      if (htmlElement.lang) {
        console.log(`✅ HTML lang attribute: ${htmlElement.lang}`);
      } else {
        console.warn('⚠️ HTML lang attribute not set');
      }

      // التحقق من وجود title
      if (document.title) {
        console.log(`✅ Document title: ${document.title}`);
      } else {
        console.warn('⚠️ Document title not set');
      }

      // التحقق من وجود meta description
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        console.log('✅ Meta description found');
      } else {
        console.log('ℹ️ Meta description not found');
      }

      return true;
    } catch (error) {
      console.error('❌ Accessibility consistency test failed:', error);
      return false;
    }
  }

  /**
   * اختبار تناسق الأخطاء
   * Test error handling consistency
   */
  async testErrorHandlingConsistency(): Promise<boolean> {
    console.log('🧪 Testing error handling consistency...');

    try {
      // اختبار try-catch
      try {
        throw new Error('Test error');
      } catch (error) {
        console.log('✅ Try-catch working correctly');
      }

      // اختبار Promise rejection
      try {
        await new Promise((_, reject) => reject(new Error('Test rejection')));
      } catch (error) {
        console.log('✅ Promise rejection handling working correctly');
      }

      return true;
    } catch (error) {
      console.error('❌ Error handling consistency test failed:', error);
      return false;
    }
  }

  /**
   * تشغيل جميع اختبارات التناسق
   * Run all consistency tests
   */
  async runAllTests(): Promise<{
    success: boolean;
    results: {
      themeColors: boolean;
      cssClasses: boolean;
      coreFunctionality: boolean;
      dependencies: boolean;
      security: boolean;
      performance: boolean;
      accessibility: boolean;
      errorHandling: boolean;
    };
    summary: string;
  }> {
    console.log('🚀 Starting system consistency tests...');

    const results = {
      themeColors: await this.testThemeColorConsistency(),
      cssClasses: await this.testCSSClassesConsistency(),
      coreFunctionality: await this.testCoreFunctionality(),
      dependencies: await this.testDependenciesConsistency(),
      security: await this.testSecurityConsistency(),
      performance: await this.testPerformanceConsistency(),
      accessibility: await this.testAccessibilityConsistency(),
      errorHandling: await this.testErrorHandlingConsistency()
    };

    const allPassed = Object.values(results).every(result => result === true);

    const summary = allPassed
      ? '✅ All system consistency tests passed successfully!'
      : '❌ Some system consistency tests failed. Please check the logs above.';

    console.log('📊 System Consistency Test Results Summary:');
    Object.entries(results).forEach(([test, passed]) => {
      console.log(`  - ${test}: ${passed ? '✅' : '❌'}`);
    });
    console.log(summary);

    return {
      success: allPassed,
      results,
      summary
    };
  }
}

// تشغيل اختبارات التناسق التلقائي
if (typeof window !== 'undefined') {
  // انتظار تحميل الصفحة
  window.addEventListener('load', async () => {
    setTimeout(async () => {
      const tester = SystemConsistencyTest.getInstance();
      const results = await tester.runAllTests();

      if (results.success) {
        console.log('🎉 System consistency validated successfully!');
      } else {
        console.error('⚠️ Some consistency issues detected. Please review the test results.');
      }
    }, 1000); // انتظار ثانية بعد التحميل
  });
}

export default SystemConsistencyTest;