import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useSettingsStore } from '@/store/settingsStore'
import { useStableClinicName, useStableDoctorName } from '@/hooks/useStableSettings'
import { useCurrency } from '@/contexts/CurrencyContext'
import { useTheme } from '@/contexts/ThemeContext'
import { formatCurrency } from '@/lib/utils'
import { notify } from '@/services/notificationService'
import { 
  Plus, 
  Trash2, 
  FileText, 
  Calculator, 
  Printer, 
  Download,
  Eye,
  Edit3,
  Receipt
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TREATMENT_TYPES, TREATMENT_CATEGORIES, getTreatmentsByCategory } from '@/data/teethData'
import EstimatePreviewDialog from '@/components/external-estimate/EstimatePreviewDialog'

// Types for external estimate
interface EstimateItem {
  id: string
  treatmentType: string
  treatmentName: string
  quantity: number
  unitPrice: number
  totalPrice: number
  notes?: string
}

interface EstimateData {
  patientName: string
  patientPhone: string
  items: EstimateItem[]
  subtotal: number
  discount: number
  discountType: 'percentage' | 'fixed'
  tax: number
  taxRate: number
  total: number
  notes: string
  validUntil: string
}

export default function ExternalEstimate() {
  const { settings, loadSettings } = useSettingsStore()
  const { formatAmount } = useCurrency()
  const { isDarkMode } = useTheme()
  const clinicName = useStableClinicName()
  const doctorName = useStableDoctorName()

  // Load settings when component mounts
  useEffect(() => {
    if (!settings) {
      loadSettings()
    }
  }, [settings, loadSettings])

  // State for estimate data
  const [estimateData, setEstimateData] = useState<EstimateData>({
    patientName: '',
    patientPhone: '',
    items: [],
    subtotal: 0,
    discount: 0,
    discountType: 'percentage',
    tax: 0,
    taxRate: settings?.estimate_default_tax_rate || 0,
    total: 0,
    notes: settings?.estimate_default_notes || '',
    validUntil: new Date(Date.now() + (settings?.estimate_default_validity_days || 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  })

  // State for adding new item
  const [showAddItem, setShowAddItem] = useState(false)
  const [newItem, setNewItem] = useState<Partial<EstimateItem>>({
    treatmentType: '',
    treatmentName: '',
    quantity: 1,
    unitPrice: 0,
    notes: ''
  })

  // State for editing item
  const [editingItem, setEditingItem] = useState<EstimateItem | null>(null)
  const [showEditItem, setShowEditItem] = useState(false)

  // State for preview
  const [showPreview, setShowPreview] = useState(false)

  // Calculate totals
  useEffect(() => {
    const subtotal = estimateData.items.reduce((sum, item) => sum + item.totalPrice, 0)
    const discountAmount = estimateData.discountType === 'percentage' 
      ? (subtotal * estimateData.discount) / 100 
      : estimateData.discount
    const afterDiscount = subtotal - discountAmount
    const taxAmount = (afterDiscount * estimateData.taxRate) / 100
    const total = afterDiscount + taxAmount

    setEstimateData(prev => ({
      ...prev,
      subtotal,
      tax: taxAmount,
      total
    }))
  }, [estimateData.items, estimateData.discount, estimateData.discountType, estimateData.taxRate])

  // Add new item
  const handleAddItem = () => {
    if (!newItem.treatmentType || !newItem.treatmentName || !newItem.unitPrice) {
      notify.error('يرجى ملء جميع الحقول المطلوبة')
      return
    }

    const item: EstimateItem = {
      id: Date.now().toString(),
      treatmentType: newItem.treatmentType!,
      treatmentName: newItem.treatmentName!,
      quantity: newItem.quantity || 1,
      unitPrice: newItem.unitPrice!,
      totalPrice: (newItem.quantity || 1) * (newItem.unitPrice || 0),
      notes: newItem.notes
    }

    setEstimateData(prev => ({
      ...prev,
      items: [...prev.items, item]
    }))

    // Reset form
    setNewItem({
      treatmentType: '',
      treatmentName: '',
      quantity: 1,
      unitPrice: 0,
      notes: ''
    })
    setShowAddItem(false)
    notify.success('تم إضافة العلاج بنجاح')
  }

  // Edit item
  const handleEditItem = () => {
    if (!editingItem) return

    setEstimateData(prev => ({
      ...prev,
      items: prev.items.map(item => 
        item.id === editingItem.id 
          ? { ...editingItem, totalPrice: editingItem.quantity * editingItem.unitPrice }
          : item
      )
    }))

    setEditingItem(null)
    setShowEditItem(false)
    notify.success('تم تحديث العلاج بنجاح')
  }

  // Delete item
  const handleDeleteItem = (itemId: string) => {
    setEstimateData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId)
    }))
    notify.success('تم حذف العلاج')
  }

  // Clear all items
  const handleClearAll = () => {
    setEstimateData(prev => ({
      ...prev,
      items: [],
      patientName: '',
      patientPhone: '',
      notes: ''
    }))
    notify.success('تم مسح جميع البيانات')
  }

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">فاتورة تقديرية خارجية</h1>
          <p className="text-muted-foreground mt-1">
            إنشاء فاتورة تقديرية للمرضى دون ربطها بالنظام
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowPreview(true)}
            disabled={estimateData.items.length === 0}
          >
            <Eye className="w-4 h-4 ml-2" />
            معاينة
          </Button>
          <Button 
            variant="outline" 
            onClick={handleClearAll}
            disabled={estimateData.items.length === 0}
          >
            <Trash2 className="w-4 h-4 ml-2" />
            مسح الكل
          </Button>
        </div>
      </div>

      {/* Patient Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Receipt className="w-5 h-5 ml-2" />
            معلومات المريض
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="patientName">اسم المريض</Label>
              <Input
                id="patientName"
                value={estimateData.patientName}
                onChange={(e) => setEstimateData(prev => ({ ...prev, patientName: e.target.value }))}
                placeholder="أدخل اسم المريض"
              />
            </div>
            <div>
              <Label htmlFor="patientPhone">رقم الهاتف (اختياري)</Label>
              <Input
                id="patientPhone"
                value={estimateData.patientPhone}
                onChange={(e) => setEstimateData(prev => ({ ...prev, patientPhone: e.target.value }))}
                placeholder="أدخل رقم الهاتف"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Treatment Items */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Calculator className="w-5 h-5 ml-2" />
              العلاجات المطلوبة
            </CardTitle>
            <Button onClick={() => setShowAddItem(true)}>
              <Plus className="w-4 h-4 ml-2" />
              إضافة علاج
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {estimateData.items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>لم يتم إضافة أي علاجات بعد</p>
              <p className="text-sm">اضغط على "إضافة علاج" لبدء إنشاء الفاتورة</p>
            </div>
          ) : (
            <div className="space-y-4">
              {estimateData.items.map((item, index) => (
                <div key={item.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{index + 1}</Badge>
                        <h4 className="font-medium">{item.treatmentName}</h4>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        الكمية: {item.quantity} × {formatAmount(item.unitPrice)} = {formatAmount(item.totalPrice)}
                      </p>
                      {item.notes && (
                        <p className="text-sm text-muted-foreground mt-1">
                          ملاحظات: {item.notes}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingItem(item)
                          setShowEditItem(true)
                        }}
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteItem(item.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Calculations */}
      {estimateData.items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>الحسابات</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="discount">خصم</Label>
                <div className="flex gap-2">
                  <Input
                    id="discount"
                    type="number"
                    value={estimateData.discount}
                    onChange={(e) => setEstimateData(prev => ({ ...prev, discount: Number(e.target.value) }))}
                    placeholder="0"
                  />
                  <Select
                    value={estimateData.discountType}
                    onValueChange={(value: 'percentage' | 'fixed') =>
                      setEstimateData(prev => ({ ...prev, discountType: value }))
                    }
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">%</SelectItem>
                      <SelectItem value="fixed">ثابت</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="taxRate">ضريبة (%)</Label>
                <Input
                  id="taxRate"
                  type="number"
                  value={estimateData.taxRate}
                  onChange={(e) => setEstimateData(prev => ({ ...prev, taxRate: Number(e.target.value) }))}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="validUntil">صالح حتى</Label>
                <Input
                  id="validUntil"
                  type="date"
                  value={estimateData.validUntil}
                  onChange={(e) => setEstimateData(prev => ({ ...prev, validUntil: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">ملاحظات إضافية</Label>
              <Textarea
                id="notes"
                value={estimateData.notes}
                onChange={(e) => setEstimateData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="أي ملاحظات أو شروط إضافية..."
                rows={3}
              />
            </div>

            <Separator />

            {/* Summary */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>المجموع الفرعي:</span>
                <span>{formatAmount(estimateData.subtotal)}</span>
              </div>
              {estimateData.discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>الخصم:</span>
                  <span>
                    -{formatAmount(
                      estimateData.discountType === 'percentage'
                        ? (estimateData.subtotal * estimateData.discount) / 100
                        : estimateData.discount
                    )}
                  </span>
                </div>
              )}
              {estimateData.tax > 0 && (
                <div className="flex justify-between">
                  <span>الضريبة ({estimateData.taxRate}%):</span>
                  <span>{formatAmount(estimateData.tax)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>المجموع الكلي:</span>
                <span>{formatAmount(estimateData.total)}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                onClick={() => setShowPreview(true)}
                disabled={estimateData.items.length === 0}
                className="flex-1"
              >
                <Eye className="w-4 h-4 ml-2" />
                معاينة وطباعة
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Item Dialog */}
      <Dialog open={showAddItem} onOpenChange={setShowAddItem}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>إضافة علاج جديد</DialogTitle>
            <DialogDescription>
              أدخل تفاصيل العلاج المطلوب
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="treatmentType">نوع العلاج</Label>
              <Select
                value={newItem.treatmentType}
                onValueChange={(value) => {
                  const treatment = TREATMENT_TYPES.find(t => t.value === value)
                  setNewItem(prev => ({
                    ...prev,
                    treatmentType: value,
                    treatmentName: treatment?.label || ''
                  }))
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر نوع العلاج" />
                </SelectTrigger>
                <SelectContent>
                  {TREATMENT_CATEGORIES.map(category => (
                    <div key={category.value}>
                      <div className="px-2 py-1 text-sm font-medium text-muted-foreground">
                        {category.label}
                      </div>
                      {getTreatmentsByCategory(category.value).map(treatment => (
                        <SelectItem key={treatment.value} value={treatment.value}>
                          {treatment.label}
                        </SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="treatmentName">اسم العلاج</Label>
              <Input
                id="treatmentName"
                value={newItem.treatmentName}
                onChange={(e) => setNewItem(prev => ({ ...prev, treatmentName: e.target.value }))}
                placeholder="أو أدخل اسم مخصص"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="quantity">الكمية</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={newItem.quantity}
                  onChange={(e) => setNewItem(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                />
              </div>
              <div>
                <Label htmlFor="unitPrice">السعر</Label>
                <Input
                  id="unitPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={newItem.unitPrice}
                  onChange={(e) => setNewItem(prev => ({ ...prev, unitPrice: Number(e.target.value) }))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="itemNotes">ملاحظات (اختياري)</Label>
              <Textarea
                id="itemNotes"
                value={newItem.notes}
                onChange={(e) => setNewItem(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="أي ملاحظات خاصة بهذا العلاج..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddItem(false)}>
              إلغاء
            </Button>
            <Button onClick={handleAddItem}>
              إضافة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog open={showEditItem} onOpenChange={setShowEditItem}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>تعديل العلاج</DialogTitle>
            <DialogDescription>
              تعديل تفاصيل العلاج
            </DialogDescription>
          </DialogHeader>
          {editingItem && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="editTreatmentName">اسم العلاج</Label>
                <Input
                  id="editTreatmentName"
                  value={editingItem.treatmentName}
                  onChange={(e) => setEditingItem(prev => prev ? { ...prev, treatmentName: e.target.value } : null)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editQuantity">الكمية</Label>
                  <Input
                    id="editQuantity"
                    type="number"
                    min="1"
                    value={editingItem.quantity}
                    onChange={(e) => setEditingItem(prev => prev ? { ...prev, quantity: Number(e.target.value) } : null)}
                  />
                </div>
                <div>
                  <Label htmlFor="editUnitPrice">السعر</Label>
                  <Input
                    id="editUnitPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    value={editingItem.unitPrice}
                    onChange={(e) => setEditingItem(prev => prev ? { ...prev, unitPrice: Number(e.target.value) } : null)}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="editItemNotes">ملاحظات</Label>
                <Textarea
                  id="editItemNotes"
                  value={editingItem.notes || ''}
                  onChange={(e) => setEditingItem(prev => prev ? { ...prev, notes: e.target.value } : null)}
                  rows={2}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditItem(false)}>
              إلغاء
            </Button>
            <Button onClick={handleEditItem}>
              حفظ التغييرات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <EstimatePreviewDialog
        open={showPreview}
        onOpenChange={setShowPreview}
        estimateData={estimateData}
      />
    </div>
  )
}
