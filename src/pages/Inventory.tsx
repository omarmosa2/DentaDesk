import { useState, useEffect } from 'react'
import { useInventoryStore } from '../store/inventoryStore'
import { useAppointmentStore } from '../store/appointmentStore'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getCardStyles, getIconStyles } from '@/lib/cardStyles'
import { useRealTimeSync } from '@/hooks/useRealTimeSync'
import { notify } from '@/services/notificationService'
import { ExportService } from '@/services/exportService'
import {
  Package,
  Plus,
  AlertTriangle,
  Calendar,
  TrendingDown,
  TrendingUp,
  DollarSign,
  Bell,
  Download
} from 'lucide-react'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import AddInventoryDialog from '../components/AddInventoryDialog'
import EditInventoryDialog from '../components/EditInventoryDialog'
import ConfirmDeleteInventoryDialog from '../components/ConfirmDeleteInventoryDialog'
import UsageDialog from '../components/UsageDialog'
import InventoryAlerts from '../components/InventoryAlerts'
import UsageHistoryDialog from '../components/UsageHistoryDialog'
import InventoryTable from '../components/inventory/InventoryTable'
import { useCurrency } from '@/contexts/CurrencyContext'
import CurrencyDisplay from '@/components/ui/currency-display'

export default function Inventory() {
  // Enable real-time synchronization for automatic updates
  useRealTimeSync()

  const [showAddItem, setShowAddItem] = useState(false)
  const [showEditItem, setShowEditItem] = useState(false)
  const [showDeleteItem, setShowDeleteItem] = useState(false)
  const [showUsageDialog, setShowUsageDialog] = useState(false)
  const [showUsageHistory, setShowUsageHistory] = useState(false)
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [activeTab, setActiveTab] = useState('inventory')

  const {
    items,
    filteredItems,
    isLoading,
    error,
    categories,
    suppliers,
    totalValue,
    lowStockCount,
    expiredCount,
    expiringSoonCount,
    loadItems,
    createItem,
    updateItem,
    deleteItem,
    recordUsage,
    clearError
  } = useInventoryStore()

  const { appointments, loadAppointments } = useAppointmentStore()

  useEffect(() => {
    loadItems()
    loadAppointments()
  }, [loadItems, loadAppointments])



  // Handler functions
  const handleAddItem = async (data: any) => {
    await createItem(data)
  }

  const handleEditItem = async (id: string, data: any) => {
    await updateItem(id, data)
  }

  const handleDeleteItem = async (id: string) => {
    await deleteItem(id)
  }

  const handleRecordUsage = async (data: any) => {
    await recordUsage(data)
  }

  const handleItemClick = (item: any) => {
    setSelectedItem(item)
    setShowEditItem(true)
  }

  const handleViewDetails = (item: any) => {
    setSelectedItem(item)
    setShowUsageHistory(true)
  }

  const handleEditFromTable = (item: any) => {
    setSelectedItem(item)
    setShowEditItem(true)
  }

  const handleDeleteFromTable = (itemId: string) => {
    const item = items.find(i => i.id === itemId)
    if (item) {
      setSelectedItem(item)
      setShowDeleteItem(true)
    }
  }







  const StatCard = ({ title, value, icon, color = "blue", trend }: any) => (
    <Card className={getCardStyles(color)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            {trend && (
              <div className="flex items-center mt-1">
                {trend > 0 ? (
                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                )}
                <span className={`text-xs ${trend > 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {Math.abs(trend)}%
                </span>
              </div>
            )}
          </div>
          <div className={`text-2xl ${getIconStyles(color)}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">إدارة المخزون</h1>
          <p className="text-muted-foreground mt-2">
            تتبع المواد والمعدات ومستويات المخزون
          </p>
        </div>
        <div className="flex items-center space-x-2 space-x-reverse">
          <Button
            variant="outline"
            onClick={async () => {
              // Export inventory data
              if (filteredItems.length === 0) {
                notify.noDataToExport('لا توجد بيانات مخزون للتصدير')
                return
              }

              try {
                // التحقق من العناصر التي لا تحتوي على أسعار
                const itemsWithoutCost = filteredItems.filter(item => {
                  const costPerUnit = parseFloat(String(item.cost_per_unit || 0)) || 0
                  const unitPrice = parseFloat(String(item.unit_price || 0)) || 0
                  return costPerUnit === 0 && unitPrice === 0
                })

                // تصدير إلى Excel مع التنسيق الجميل والمقروء
                await ExportService.exportInventoryToExcel(filteredItems)

                let successMessage = `تم تصدير ${filteredItems.length} عنصر مخزون بنجاح إلى ملف Excel مع التنسيق الجميل!`

                if (itemsWithoutCost.length > 0) {
                  successMessage += ` (تنبيه: ${itemsWithoutCost.length} عنصر لا يحتوي على سعر - يمكنك تعديل العناصر لإضافة الأسعار)`
                }

                notify.exportSuccess(successMessage)
              } catch (error) {
                console.error('Error exporting inventory:', error)
                notify.exportError('فشل في تصدير بيانات المخزون')
              }
            }}
          >
            <Download className="w-4 h-4 ml-2" />
            تصدير
          </Button>
          <Button onClick={() => setShowAddItem(true)} className="flex items-center space-x-2 space-x-reverse">
            <Plus className="w-4 h-4" />
            <span>إضافة عنصر جديد</span>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="inventory" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            المخزون
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            التنبيهات
            {(lowStockCount + expiredCount + expiringSoonCount) > 0 && (
              <Badge variant="destructive" className="ml-1 text-xs">
                {lowStockCount + expiredCount + expiringSoonCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="إجمالي العناصر"
              value={items.length}
              icon={<Package />}
              color="blue"
            />
            <StatCard
              title="قيمة المخزون"
              value={<CurrencyDisplay amount={totalValue} />}
              icon={<DollarSign />}
              color="green"
            />
            <StatCard
              title="مخزون منخفض"
              value={lowStockCount}
              icon={<AlertTriangle />}
              color="yellow"
            />
            <StatCard
              title="منتهي الصلاحية"
              value={expiredCount + expiringSoonCount}
              icon={<Calendar />}
              color="red"
            />
          </div>

          {/* Error State */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <p className="text-destructive">خطأ: {error}</p>
              <Button variant="outline" size="sm" onClick={clearError} className="mt-2">
                إغلاق
              </Button>
            </div>
          )}

          {/* Inventory Table */}
          <InventoryTable
            items={filteredItems}
            isLoading={isLoading}
            onEdit={handleEditFromTable}
            onDelete={handleDeleteFromTable}
            onViewDetails={handleViewDetails}
          />
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          <InventoryAlerts
            items={items}
            onRefresh={loadItems}
            onItemClick={handleItemClick}
          />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <AddInventoryDialog
        isOpen={showAddItem}
        onClose={() => setShowAddItem(false)}
        onSave={handleAddItem}
        categories={categories}
        suppliers={suppliers}
      />

      <EditInventoryDialog
        isOpen={showEditItem}
        onClose={() => setShowEditItem(false)}
        onSave={handleEditItem}
        item={selectedItem}
        categories={categories}
        suppliers={suppliers}
      />

      <ConfirmDeleteInventoryDialog
        isOpen={showDeleteItem}
        onClose={() => setShowDeleteItem(false)}
        onConfirm={handleDeleteItem}
        item={selectedItem}
        isLoading={isLoading}
      />

      <UsageDialog
        isOpen={showUsageDialog}
        onClose={() => setShowUsageDialog(false)}
        onSave={handleRecordUsage}
        item={selectedItem}
        appointments={appointments}
      />

      <UsageHistoryDialog
        isOpen={showUsageHistory}
        onClose={() => setShowUsageHistory(false)}
        item={selectedItem}
      />
    </div>
  )
}
