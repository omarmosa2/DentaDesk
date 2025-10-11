import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'

// Validation schema
const inventorySchema = z.object({
  name: z.string().min(1, 'اسم العنصر مطلوب'),
  description: z.string().optional(),
  category: z.string().min(1, 'الفئة مطلوبة'),
  quantity: z.number().min(0, 'الكمية يجب أن تكون صفر أو أكثر'),
  unit: z.string().optional(),
  cost_per_unit: z.number().min(0, 'التكلفة يجب أن تكون صفر أو أكثر').optional(),
  supplier: z.string().optional(),
  expiry_date: z.string().optional(),
  minimum_stock: z.number().min(0, 'الحد الأدنى يجب أن يكون صفر أو أكثر'),
})

type InventoryFormData = z.infer<typeof inventorySchema>

interface AddInventoryDialogProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: InventoryFormData) => Promise<void>
  categories: string[]
  suppliers: string[]
}

// Predefined categories for dental clinic
const defaultCategories = [
  'أدوات طبية',
  'مواد استهلاكية',
  'أدوية',
  'مواد حشو',
  'معدات تعقيم',
  'مواد تجميل',
  'أدوات جراحة',
  'مواد تنظيف',
  'معدات تشخيص',
  'مواد وقاية'
]

// Common units
const commonUnits = [
  'قطعة',
  'علبة',
  'زجاجة',
  'أنبوب',
  'كيس',
  'لتر',
  'مل',
  'جرام',
  'كيلو',
  'متر'
]

export default function AddInventoryDialog({
  isOpen,
  onClose,
  onSave,
  categories,
  suppliers
}: AddInventoryDialogProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [customCategory, setCustomCategory] = useState('')
  const [customSupplier, setCustomSupplier] = useState('')

  const form = useForm<InventoryFormData>({
    resolver: zodResolver(inventorySchema),
    defaultValues: {
      name: '',
      description: '',
      category: '',
      quantity: 0,
      unit: '',
      cost_per_unit: 0,
      supplier: '',
      expiry_date: '',
      minimum_stock: 0,
    },
  })

  const handleSubmit = async (data: InventoryFormData) => {
    setIsLoading(true)
    try {
      // Use custom category if provided
      const finalData = {
        ...data,
        category: customCategory || data.category,
        supplier: customSupplier || data.supplier,
      }

      await onSave(finalData)
      form.reset()
      setCustomCategory('')
      setCustomSupplier('')
      onClose()
      toast({
        title: 'نجح',
        description: 'تم إضافة العنصر بنجاح',
      })
    } catch (error) {
      console.error('Error adding inventory item:', error)
      toast({
        title: 'خطأ',
        description: 'فشل في إضافة العنصر. يرجى المحاولة مرة أخرى',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    form.reset()
    setCustomCategory('')
    setCustomSupplier('')
    onClose()
  }

  // Combine existing categories with default ones
  const allCategories = [...new Set([...defaultCategories, ...categories])]
  const allSuppliers = [...new Set(suppliers)]

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground">
            إضافة عنصر مخزون جديد
          </DialogTitle>
          <DialogDescription>
            أدخل تفاصيل العنصر الجديد في المخزون
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">اسم العنصر *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="مثال: قفازات طبية"
                      {...field}
                      className="text-right"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">الوصف</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="وصف مختصر للعنصر..."
                      {...field}
                      className="text-right resize-none"
                      rows={2}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Category */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">الفئة *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الفئة" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {allCategories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                      <SelectItem value="custom">فئة جديدة...</SelectItem>
                    </SelectContent>
                  </Select>
                  {field.value === 'custom' && (
                    <Input
                      placeholder="أدخل اسم الفئة الجديدة"
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      className="mt-2 text-right"
                    />
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Quantity and Unit */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">الكمية *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        {...field}
                        onChange={(e) => {
                          const value = e.target.value
                          field.onChange(value === '' ? 0 : Number(value))
                        }}
                        onBlur={(e) => {
                          const value = Number(e.target.value) || 0
                          field.onChange(value)
                        }}
                        className="text-right"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">الوحدة</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر الوحدة" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {commonUnits.map((unit) => (
                          <SelectItem key={unit} value={unit}>
                            {unit}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Cost and Minimum Stock */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="cost_per_unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">تكلفة الوحدة </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.1"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => {
                          const value = e.target.value
                          field.onChange(value === '' ? 0 : Number(value))
                        }}
                        onBlur={(e) => {
                          const value = Number(e.target.value) || 0
                          field.onChange(value)
                        }}
                        className="text-right"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="minimum_stock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">الحد الأدنى *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        className="text-right"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Supplier */}
            <FormField
              control={form.control}
              name="supplier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">المورد</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر المورد" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {allSuppliers.map((supplier) => (
                        <SelectItem key={supplier} value={supplier}>
                          {supplier}
                        </SelectItem>
                      ))}
                      <SelectItem value="custom">مورد جديد...</SelectItem>
                    </SelectContent>
                  </Select>
                  {field.value === 'custom' && (
                    <Input
                      placeholder="أدخل اسم المورد الجديد"
                      value={customSupplier}
                      onChange={(e) => setCustomSupplier(e.target.value)}
                      className="mt-2 text-right"
                    />
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Expiry Date */}
            <FormField
              control={form.control}
              name="expiry_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">تاريخ انتهاء الصلاحية</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      className="text-right"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
              >
                إلغاء
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                إضافة العنصر
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
