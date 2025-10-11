/**
 * إعدادات نظام الإشعارات الذكية
 * Smart Alerts System Configuration
 */

export interface SmartAlertsConfig {
  // إعدادات الأداء
  performance: {
    maxAlertsToLoad: number
    refreshIntervalMs: number
    batchUpdateDelayMs: number
    cleanupIntervalMs: number
  }
  
  // إعدادات قاعدة البيانات
  database: {
    enableIndexes: boolean
    maxRetries: number
    timeoutMs: number
    enableWALCheckpoint: boolean
  }
  
  // إعدادات نظام الأحداث
  events: {
    enableRealTimeUpdates: boolean
    maxListeners: number
    enableCompatibilityEvents: boolean
    debugMode: boolean
  }
  
  // إعدادات واجهة المستخدم
  ui: {
    maxVisibleAlerts: number
    enableAnimations: boolean
    showReadAlerts: boolean
    enableToastNotifications: boolean
    autoRefreshEnabled: boolean
  }
  
  // إعدادات التنظيف
  cleanup: {
    enableAutoCleanup: boolean
    dismissedAlertsRetentionDays: number
    completedAlertsRetentionDays: number
    enableExpiredSnoozedCleanup: boolean
  }
  
  // إعدادات التنبيهات
  alerts: {
    enableAppointmentAlerts: boolean
    enablePaymentAlerts: boolean
    enableTreatmentAlerts: boolean
    enableFollowUpAlerts: boolean
    enablePrescriptionAlerts: boolean
    enableInventoryAlerts: boolean
    enableLabOrderAlerts: boolean
  }
  
  // إعدادات الأولوية
  priority: {
    appointmentReminderHours: number
    paymentOverdueDays: number
    followUpReminderDays: number
    prescriptionFollowUpDays: number
    inventoryLowStockThreshold: number
  }
}

/**
 * الإعدادات الافتراضية للنظام
 */
export const DEFAULT_SMART_ALERTS_CONFIG: SmartAlertsConfig = {
  performance: {
    maxAlertsToLoad: 1000,
    refreshIntervalMs: 60000, // دقيقة واحدة
    batchUpdateDelayMs: 100,
    cleanupIntervalMs: 300000 // 5 دقائق
  },
  
  database: {
    enableIndexes: true,
    maxRetries: 3,
    timeoutMs: 5000,
    enableWALCheckpoint: true
  },
  
  events: {
    enableRealTimeUpdates: true,
    maxListeners: 100,
    enableCompatibilityEvents: true,
    debugMode: false
  },
  
  ui: {
    maxVisibleAlerts: 20,
    enableAnimations: true,
    showReadAlerts: false,
    enableToastNotifications: true,
    autoRefreshEnabled: true
  },
  
  cleanup: {
    enableAutoCleanup: true,
    dismissedAlertsRetentionDays: 3,
    completedAlertsRetentionDays: 7,
    enableExpiredSnoozedCleanup: true
  },
  
  alerts: {
    enableAppointmentAlerts: true,
    enablePaymentAlerts: true,
    enableTreatmentAlerts: true,
    enableFollowUpAlerts: true,
    enablePrescriptionAlerts: true,
    enableInventoryAlerts: true,
    enableLabOrderAlerts: true
  },
  
  priority: {
    appointmentReminderHours: 24,
    paymentOverdueDays: 7,
    followUpReminderDays: 30,
    prescriptionFollowUpDays: 7,
    inventoryLowStockThreshold: 10
  }
}

/**
 * إعدادات الأداء العالي (للأنظمة القوية)
 */
export const HIGH_PERFORMANCE_CONFIG: Partial<SmartAlertsConfig> = {
  performance: {
    maxAlertsToLoad: 2000,
    refreshIntervalMs: 30000, // 30 ثانية
    batchUpdateDelayMs: 50,
    cleanupIntervalMs: 180000 // 3 دقائق
  },
  
  ui: {
    maxVisibleAlerts: 50,
    enableAnimations: true,
    autoRefreshEnabled: true
  }
}

/**
 * إعدادات الأداء المنخفض (للأنظمة الضعيفة)
 */
export const LOW_PERFORMANCE_CONFIG: Partial<SmartAlertsConfig> = {
  performance: {
    maxAlertsToLoad: 500,
    refreshIntervalMs: 120000, // دقيقتان
    batchUpdateDelayMs: 200,
    cleanupIntervalMs: 600000 // 10 دقائق
  },
  
  ui: {
    maxVisibleAlerts: 10,
    enableAnimations: false,
    autoRefreshEnabled: false
  },
  
  events: {
    enableRealTimeUpdates: false,
    enableCompatibilityEvents: false
  }
}

/**
 * إعدادات وضع التطوير
 */
export const DEVELOPMENT_CONFIG: Partial<SmartAlertsConfig> = {
  events: {
    debugMode: true,
    enableCompatibilityEvents: true
  },
  
  cleanup: {
    enableAutoCleanup: false,
    dismissedAlertsRetentionDays: 1,
    completedAlertsRetentionDays: 1
  },
  
  performance: {
    refreshIntervalMs: 10000 // 10 ثواني للاختبار السريع
  }
}

/**
 * فئة إدارة الإعدادات
 */
export class SmartAlertsConfigManager {
  private static config: SmartAlertsConfig = { ...DEFAULT_SMART_ALERTS_CONFIG }
  
  /**
   * الحصول على الإعدادات الحالية
   */
  static getConfig(): SmartAlertsConfig {
    return { ...this.config }
  }
  
  /**
   * تحديث الإعدادات
   */
  static updateConfig(updates: Partial<SmartAlertsConfig>): void {
    this.config = this.mergeConfig(this.config, updates)
    console.log('📝 Smart Alerts config updated:', updates)
  }
  
  /**
   * إعادة تعيين الإعدادات للقيم الافتراضية
   */
  static resetToDefaults(): void {
    this.config = { ...DEFAULT_SMART_ALERTS_CONFIG }
    console.log('🔄 Smart Alerts config reset to defaults')
  }
  
  /**
   * تطبيق إعدادات محددة مسبقاً
   */
  static applyPreset(preset: 'default' | 'high-performance' | 'low-performance' | 'development'): void {
    switch (preset) {
      case 'high-performance':
        this.updateConfig(HIGH_PERFORMANCE_CONFIG)
        break
      case 'low-performance':
        this.updateConfig(LOW_PERFORMANCE_CONFIG)
        break
      case 'development':
        this.updateConfig(DEVELOPMENT_CONFIG)
        break
      default:
        this.resetToDefaults()
    }
    console.log(`🎛️ Applied ${preset} preset to Smart Alerts config`)
  }
  
  /**
   * حفظ الإعدادات في localStorage
   */
  static saveToStorage(): void {
    try {
      localStorage.setItem('smartAlertsConfig', JSON.stringify(this.config))
      console.log('💾 Smart Alerts config saved to storage')
    } catch (error) {
      console.error('❌ Failed to save config to storage:', error)
    }
  }
  
  /**
   * تحميل الإعدادات من localStorage
   */
  static loadFromStorage(): void {
    try {
      const saved = localStorage.getItem('smartAlertsConfig')
      if (saved) {
        const savedConfig = JSON.parse(saved)
        this.config = this.mergeConfig(DEFAULT_SMART_ALERTS_CONFIG, savedConfig)
        console.log('📂 Smart Alerts config loaded from storage')
      }
    } catch (error) {
      console.error('❌ Failed to load config from storage:', error)
      this.resetToDefaults()
    }
  }
  
  /**
   * التحقق من صحة الإعدادات
   */
  static validateConfig(config: Partial<SmartAlertsConfig>): boolean {
    try {
      // التحقق من القيم الرقمية
      if (config.performance?.maxAlertsToLoad && config.performance.maxAlertsToLoad < 1) {
        throw new Error('maxAlertsToLoad must be greater than 0')
      }
      
      if (config.performance?.refreshIntervalMs && config.performance.refreshIntervalMs < 1000) {
        throw new Error('refreshIntervalMs must be at least 1000ms')
      }
      
      if (config.ui?.maxVisibleAlerts && config.ui.maxVisibleAlerts < 1) {
        throw new Error('maxVisibleAlerts must be greater than 0')
      }
      
      if (config.cleanup?.dismissedAlertsRetentionDays && config.cleanup.dismissedAlertsRetentionDays < 0) {
        throw new Error('dismissedAlertsRetentionDays must be non-negative')
      }
      
      return true
    } catch (error) {
      console.error('❌ Config validation failed:', error)
      return false
    }
  }
  
  /**
   * دمج الإعدادات بعمق
   */
  private static mergeConfig(base: SmartAlertsConfig, updates: Partial<SmartAlertsConfig>): SmartAlertsConfig {
    const result = { ...base }
    
    Object.keys(updates).forEach(key => {
      const updateValue = updates[key as keyof SmartAlertsConfig]
      if (updateValue && typeof updateValue === 'object' && !Array.isArray(updateValue)) {
        result[key as keyof SmartAlertsConfig] = {
          ...result[key as keyof SmartAlertsConfig],
          ...updateValue
        } as any
      } else if (updateValue !== undefined) {
        result[key as keyof SmartAlertsConfig] = updateValue as any
      }
    })
    
    return result
  }
  
  /**
   * الحصول على إعداد محدد
   */
  static getSetting<T extends keyof SmartAlertsConfig>(
    category: T,
    setting?: keyof SmartAlertsConfig[T]
  ): SmartAlertsConfig[T] | SmartAlertsConfig[T][keyof SmartAlertsConfig[T]] {
    if (setting) {
      return this.config[category][setting]
    }
    return this.config[category]
  }
  
  /**
   * تحديث إعداد محدد
   */
  static setSetting<T extends keyof SmartAlertsConfig>(
    category: T,
    setting: keyof SmartAlertsConfig[T],
    value: SmartAlertsConfig[T][keyof SmartAlertsConfig[T]]
  ): void {
    this.config[category][setting] = value
    console.log(`📝 Updated ${category}.${String(setting)} = ${value}`)
  }
  
  /**
   * طباعة الإعدادات الحالية
   */
  static printConfig(): void {
    console.log('🎛️ Current Smart Alerts Configuration:')
    console.table(this.config)
  }
}

// تحميل الإعدادات عند بدء التشغيل
if (typeof window !== 'undefined') {
  SmartAlertsConfigManager.loadFromStorage()
}

// تصدير الإعدادات الافتراضية
export default SmartAlertsConfigManager
