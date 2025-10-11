import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertTriangle,
  Calendar,
  Package,
  X,
  Eye,
  EyeOff,
  RefreshCw
} from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import type { InventoryItem } from '../types'
import { useCurrency } from '@/contexts/CurrencyContext'

interface InventoryAlertsProps {
  items: InventoryItem[]
  onRefresh?: () => void
  onItemClick?: (item: InventoryItem) => void
}

export default function InventoryAlerts({
  items,
  onRefresh,
  onItemClick
}: InventoryAlertsProps) {
  const [showLowStock, setShowLowStock] = useState(true)
  const [showExpired, setShowExpired] = useState(true)
  const [showExpiringSoon, setShowExpiringSoon] = useState(true)

  const today = new Date()

  // Calculate alerts
  const lowStockItems = items.filter(item =>
    item.quantity <= item.minimum_stock && item.quantity > 0
  )

  const outOfStockItems = items.filter(item =>
    item.quantity === 0
  )

  const expiredItems = items.filter(item =>
    item.expiry_date && new Date(item.expiry_date) < today
  )

  const expiringSoonItems = items.filter(item => {
    if (!item.expiry_date) return false
    const expiryDate = new Date(item.expiry_date)
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0
  })

  // Use centralized currency formatting
  const { formatAmount } = useCurrency()

  const getDaysUntilExpiry = (expiryDate: string) => {
    const expiry = new Date(expiryDate)
    const days = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return days
  }

  const AlertSection = ({
    title,
    items: alertItems,
    icon,
    color,
    isVisible,
    onToggle,
    emptyMessage
  }: {
    title: string
    items: InventoryItem[]
    icon: React.ReactNode
    color: string
    isVisible: boolean
    onToggle: () => void
    emptyMessage: string
  }) => (
    <Card className={`border-l-4 ${color}`}>
      <Collapsible open={isVisible} onOpenChange={onToggle}>
        <CardHeader className="pb-3">
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-3">
                {icon}
                <div>
                  <CardTitle className="text-lg font-semibold">
                    {title}
                  </CardTitle>
                  <CardDescription>
                    {alertItems.length} عنصر
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-sm">
                  {alertItems.length}
                </Badge>
                {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </div>
            </div>
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0">
            {alertItems.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                {emptyMessage}
              </p>
            ) : (
              <div className="space-y-3">
                {alertItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => onItemClick?.(item)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-foreground">{item.name}</h4>
                        <div className="text-left">
                          {item.category && (
                            <Badge variant="outline" className="text-xs">
                              {item.category}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-1 text-sm text-muted-foreground">
                        <div>
                          الكمية: {item.quantity} {item.unit || 'قطعة'}
                          {item.minimum_stock > 0 && (
                            <span className="mr-2">
                              (الحد الأدنى: {item.minimum_stock})
                            </span>
                          )}
                        </div>

                        {item.expiry_date && (
                          <div className="text-left">
                            {expiredItems.includes(item) ? (
                              <span className="text-destructive font-medium">
                                منتهي الصلاحية
                              </span>
                            ) : expiringSoonItems.includes(item) ? (
                              <span className="text-yellow-600 dark:text-yellow-400 font-medium">
                                ينتهي خلال {getDaysUntilExpiry(item.expiry_date)} يوم
                              </span>
                            ) : (
                              <span>
                                ينتهي: {(() => {
                                  const date = new Date(item.expiry_date)
                                  const day = date.getDate().toString().padStart(2, '0')
                                  const month = (date.getMonth() + 1).toString().padStart(2, '0')
                                  const year = date.getFullYear()
                                  return `${day}/${month}/${year}`
                                })()}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {item.cost_per_unit && (
                        <div className="text-xs text-muted-foreground mt-1">
                          القيمة الإجمالية: {formatAmount(item.quantity * item.cost_per_unit)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )

  const totalAlerts = lowStockItems.length + outOfStockItems.length + expiredItems.length + expiringSoonItems.length

  if (totalAlerts === 0) {
    return (
      <Card className="border-green-200 dark:border-green-800">
        <CardContent className="p-6">
          <div className="text-center">
            <Package className="h-12 w-12 mx-auto mb-3 text-green-500" />
            <h3 className="text-lg font-semibold text-green-700 dark:text-green-400 mb-2">
              لا توجد تنبيهات
            </h3>
            <p className="text-green-600 dark:text-green-300">
              جميع عناصر المخزون في حالة جيدة
            </p>
            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                className="mt-3"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                تحديث
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">تنبيهات المخزون</h3>
          <p className="text-sm text-muted-foreground">
            {totalAlerts} تنبيه يتطلب انتباهك
          </p>
        </div>
        {onRefresh && (
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            تحديث
          </Button>
        )}
      </div>

      {/* Out of Stock - Critical */}
      {outOfStockItems.length > 0 && (
        <AlertSection
          title="نفد المخزون"
          items={outOfStockItems}
          icon={<AlertTriangle className="h-5 w-5 text-destructive" />}
          color="border-l-destructive"
          isVisible={showExpired}
          onToggle={() => setShowExpired(!showExpired)}
          emptyMessage="لا توجد عناصر نفد مخزونها"
        />
      )}

      {/* Low Stock */}
      {lowStockItems.length > 0 && (
        <AlertSection
          title="مخزون منخفض"
          items={lowStockItems}
          icon={<Package className="h-5 w-5 text-yellow-600" />}
          color="border-l-yellow-500"
          isVisible={showLowStock}
          onToggle={() => setShowLowStock(!showLowStock)}
          emptyMessage="لا توجد عناصر بمخزون منخفض"
        />
      )}

      {/* Expired Items */}
      {expiredItems.length > 0 && (
        <AlertSection
          title="منتهية الصلاحية"
          items={expiredItems}
          icon={<Calendar className="h-5 w-5 text-destructive" />}
          color="border-l-destructive"
          isVisible={showExpired}
          onToggle={() => setShowExpired(!showExpired)}
          emptyMessage="لا توجد عناصر منتهية الصلاحية"
        />
      )}

      {/* Expiring Soon */}
      {expiringSoonItems.length > 0 && (
        <AlertSection
          title="تنتهي صلاحيتها قريباً"
          items={expiringSoonItems}
          icon={<Calendar className="h-5 w-5 text-yellow-600" />}
          color="border-l-yellow-500"
          isVisible={showExpiringSoon}
          onToggle={() => setShowExpiringSoon(!showExpiringSoon)}
          emptyMessage="لا توجد عناصر تنتهي صلاحيتها قريباً"
        />
      )}
    </div>
  )
}
