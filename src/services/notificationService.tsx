import { toast } from '@/hooks/use-toast'
import React from 'react'
import { CheckCircle, AlertTriangle, Info, XCircle, Download, Upload, Trash2, Save, RefreshCw } from 'lucide-react'

export type NotificationType =
  | 'success'
  | 'error'
  | 'warning'
  | 'info'
  | 'loading'

export type NotificationAction =
  | 'save'
  | 'delete'
  | 'export'
  | 'import'
  | 'backup'
  | 'restore'
  | 'update'
  | 'create'
  | 'general'

export interface NotificationOptions {
  title?: string
  description: string
  type: NotificationType
  action?: NotificationAction
  duration?: number
  showIcon?: boolean
  actionButton?: {
    label: string
    onClick: () => void
  }
}

class NotificationService {
  private getIcon(type: NotificationType, action?: NotificationAction) {
    if (action) {
      switch (action) {
        case 'save':
          return <Save className="w-4 h-4" />
        case 'delete':
          return <Trash2 className="w-4 h-4" />
        case 'export':
        case 'backup':
          return <Download className="w-4 h-4" />
        case 'import':
        case 'restore':
          return <Upload className="w-4 h-4" />
        case 'update':
          return <RefreshCw className="w-4 h-4" />
        default:
          break
      }
    }

    switch (type) {
      case 'success':
        return <CheckCircle className="w-4 h-4" />
      case 'error':
        return <XCircle className="w-4 h-4" />
      case 'warning':
        return <AlertTriangle className="w-4 h-4" />
      case 'info':
      case 'loading':
        return <Info className="w-4 h-4" />
      default:
        return <Info className="w-4 h-4" />
    }
  }

  private getDefaultTitle(type: NotificationType, action?: NotificationAction): string {
    if (action) {
      switch (action) {
        case 'save':
          return type === 'success' ? 'تم الحفظ بنجاح' : type === 'error' ? 'فشل في الحفظ' : 'جاري الحفظ...'
        case 'delete':
          return type === 'success' ? 'تم الحذف بنجاح' : type === 'error' ? 'فشل في الحذف' : 'جاري الحذف...'
        case 'export':
          return type === 'success' ? 'تم التصدير بنجاح' : type === 'error' ? 'فشل في التصدير' : 'جاري التصدير...'
        case 'import':
          return type === 'success' ? 'تم الاستيراد بنجاح' : type === 'error' ? 'فشل في الاستيراد' : 'جاري الاستيراد...'
        case 'backup':
          return type === 'success' ? 'تم إنشاء النسخة الاحتياطية' : type === 'error' ? 'فشل في إنشاء النسخة الاحتياطية' : 'جاري إنشاء النسخة الاحتياطية...'
        case 'restore':
          return type === 'success' ? 'تم استعادة النسخة الاحتياطية' : type === 'error' ? 'فشل في استعادة النسخة الاحتياطية' : 'جاري استعادة النسخة الاحتياطية...'
        case 'update':
          return type === 'success' ? 'تم التحديث بنجاح' : type === 'error' ? 'فشل في التحديث' : 'جاري التحديث...'
        case 'create':
          return type === 'success' ? 'تم الإنشاء بنجاح' : type === 'error' ? 'فشل في الإنشاء' : 'جاري الإنشاء...'
        default:
          break
      }
    }

    switch (type) {
      case 'success':
        return 'نجح'
      case 'error':
        return 'خطأ'
      case 'warning':
        return 'تحذير'
      case 'info':
        return 'معلومات'
      case 'loading':
        return 'جاري التحميل...'
      default:
        return 'إشعار'
    }
  }

  private getVariant(type: NotificationType) {
    switch (type) {
      case 'error':
        return 'destructive'
      default:
        return 'default'
    }
  }

  show(options: NotificationOptions) {
    const {
      title,
      description,
      type,
      action,
      duration = 3000,
      showIcon = true,
      actionButton
    } = options

    const finalTitle = title || this.getDefaultTitle(type, action)
    const icon = showIcon ? this.getIcon(type, action) : null

    return toast({
      title: (
        <div className="flex items-center gap-2 text-right" dir="rtl">
          {icon}
          <span>{finalTitle}</span>
        </div>
      ),
      description: (
        <div className="text-right mt-1" dir="rtl">
          {description}
        </div>
      ),
      variant: this.getVariant(type),
      duration: type === 'loading' ? 0 : duration,
      action: actionButton ? (
        <button
          onClick={actionButton.onClick}
          className="inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium transition-colors hover:bg-secondary focus:outline-none focus:ring-1 focus:ring-ring"
        >
          {actionButton.label}
        </button>
      ) : undefined,
    })
  }

  // Convenience methods
  success(description: string, action?: NotificationAction, options?: Partial<NotificationOptions>) {
    return this.show({
      description,
      type: 'success',
      action,
      ...options
    })
  }

  error(description: string, action?: NotificationAction, options?: Partial<NotificationOptions>) {
    return this.show({
      description,
      type: 'error',
      action,
      ...options
    })
  }

  warning(description: string, action?: NotificationAction, options?: Partial<NotificationOptions>) {
    return this.show({
      description,
      type: 'warning',
      action,
      ...options
    })
  }

  info(description: string, action?: NotificationAction, options?: Partial<NotificationOptions>) {
    return this.show({
      description,
      type: 'info',
      action,
      ...options
    })
  }

  loading(description: string, action?: NotificationAction, options?: Partial<NotificationOptions>) {
    return this.show({
      description,
      type: 'loading',
      action,
      ...options
    })
  }

  // Specific action methods
  saveSuccess(description: string = 'تم حفظ البيانات بنجاح') {
    return this.success(description, 'save')
  }

  saveError(description: string = 'فشل في حفظ البيانات') {
    return this.error(description, 'save')
  }

  deleteSuccess(description: string = 'تم حذف العنصر بنجاح') {
    return this.success(description, 'delete')
  }

  deleteError(description: string = 'فشل في حذف العنصر') {
    return this.error(description, 'delete')
  }

  exportSuccess(description: string = 'تم تصدير البيانات بنجاح') {
    return this.success(description, 'export')
  }

  exportError(description: string = 'فشل في تصدير البيانات') {
    return this.error(description, 'export')
  }

  noDataToExport(description: string = 'لا توجد بيانات للتصدير') {
    return this.warning(description, 'export')
  }

  backupSuccess(description: string = 'تم إنشاء النسخة الاحتياطية بنجاح') {
    return this.success(description, 'backup')
  }

  backupError(description: string = 'فشل في إنشاء النسخة الاحتياطية') {
    return this.error(description, 'backup')
  }

  restoreSuccess(description: string = 'تم استعادة النسخة الاحتياطية بنجاح') {
    return this.success(description, 'restore')
  }

  restoreError(description: string = 'فشل في استعادة النسخة الاحتياطية') {
    return this.error(description, 'restore')
  }

  testSuccess(description: string = 'نجح الاختبار بنجاح') {
    return this.success(description, 'update')
  }

  testError(description: string = 'فشل الاختبار') {
    return this.error(description, 'update')
  }
}

// Create singleton instance
export const notificationService = new NotificationService()

// Export convenience function for easy import
export const notify = notificationService
