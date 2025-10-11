import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Activity,
  Calendar,
  User,
  FileText,
  Package,
  RefreshCw
} from 'lucide-react'
import { useInventoryStore } from '../store/inventoryStore'
import type { InventoryItem, InventoryUsage } from '../types'

interface UsageHistoryDialogProps {
  isOpen: boolean
  onClose: () => void
  item: InventoryItem | null
}

export default function UsageHistoryDialog({
  isOpen,
  onClose,
  item
}: UsageHistoryDialogProps) {
  const [usageHistory, setUsageHistory] = useState<InventoryUsage[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const { getUsageHistory } = useInventoryStore()

  useEffect(() => {
    if (item && isOpen) {
      loadUsageHistory()
    }
  }, [item, isOpen])

  const loadUsageHistory = async () => {
    if (!item) return

    setIsLoading(true)
    try {
      const history = getUsageHistory(item.id)
      setUsageHistory(history)
    } catch (error) {
      console.error('Error loading usage history:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const day = date.getDate()
    const month = date.getMonth() + 1 // Add 1 because getMonth() returns 0-11
    const year = date.getFullYear()
    const hours = date.getHours()
    const minutes = date.getMinutes()

    // Format date as DD/MM/YYYY HH:MM
    const formattedDay = day.toString().padStart(2, '0')
    const formattedMonth = month.toString().padStart(2, '0')
    const formattedHours = hours.toString().padStart(2, '0')
    const formattedMinutes = minutes.toString().padStart(2, '0')

    return `${formattedDay}/${formattedMonth}/${year} ${formattedHours}:${formattedMinutes}`
  }

  const getTotalUsed = () => {
    return usageHistory.reduce((total, usage) => total + usage.quantity_used, 0)
  }

  if (!item) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
            <Activity className="h-5 w-5" />
            تاريخ الاستخدام
          </DialogTitle>
          <DialogDescription>
            تاريخ استخدام: {item.name}
          </DialogDescription>
        </DialogHeader>

        {/* Item Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-4 w-4" />
              معلومات العنصر
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">الكمية الحالية</p>
                <p className="font-medium">{item.quantity} {item.unit || 'قطعة'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">إجمالي المستخدم</p>
                <p className="font-medium">{getTotalUsed()} {item.unit || 'قطعة'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">عدد مرات الاستخدام</p>
                <p className="font-medium">{usageHistory.length}</p>
              </div>
              <div>
                <p className="text-muted-foreground">الفئة</p>
                <p className="font-medium">{item.category || 'غير محدد'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Usage History */}
        <Card className="flex-1">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                سجل الاستخدام
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={loadUsageHistory}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                تحديث
              </Button>
            </div>
            <CardDescription>
              {usageHistory.length} سجل استخدام
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px] w-full">
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-muted-foreground">جاري التحميل...</p>
                </div>
              ) : usageHistory.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-medium mb-2">لا يوجد سجل استخدام</h3>
                  <p className="text-muted-foreground">
                    لم يتم تسجيل أي استخدام لهذا العنصر بعد
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {usageHistory.map((usage, index) => (
                    <div
                      key={usage.id || index}
                      className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg"
                    >
                      <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <Activity className="h-4 w-4 text-primary" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {usage.quantity_used} {item.unit || 'قطعة'}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {formatDate(usage.usage_date)}
                            </span>
                          </div>
                        </div>

                        {usage.appointment_id && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                            <User className="h-3 w-3" />
                            <span>مرتبط بموعد</span>
                          </div>
                        )}

                        {usage.notes && (
                          <div className="flex items-start gap-1 text-sm">
                            <FileText className="h-3 w-3 mt-0.5 text-muted-foreground" />
                            <p className="text-muted-foreground">{usage.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        {usageHistory.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-primary">{getTotalUsed()}</p>
                  <p className="text-sm text-muted-foreground">إجمالي المستخدم</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">{usageHistory.length}</p>
                  <p className="text-sm text-muted-foreground">مرات الاستخدام</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">
                    {usageHistory.length > 0 ? Math.round(getTotalUsed() / usageHistory.length * 10) / 10 : 0}
                  </p>
                  <p className="text-sm text-muted-foreground">متوسط الاستخدام</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </DialogContent>
    </Dialog>
  )
}
