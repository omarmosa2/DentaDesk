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
import { Loader2, AlertTriangle } from 'lucide-react'
import type { InventoryItem, Appointment } from '../types'

// Validation schema
const usageSchema = z.object({
  quantity_used: z.number().min(1, 'الكمية المستخدمة يجب أن تكون أكبر من صفر'),
  appointment_id: z.string().optional(),
  notes: z.string().optional(),
  usage_date: z.string().min(1, 'تاريخ الاستخدام مطلوب'),
})

type UsageFormData = z.infer<typeof usageSchema>

interface UsageDialogProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: any) => Promise<void>
  item: InventoryItem | null
  appointments: Appointment[]
}

export default function UsageDialog({
  isOpen,
  onClose,
  onSave,
  item,
  appointments
}: UsageDialogProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<UsageFormData>({
    resolver: zodResolver(usageSchema),
    defaultValues: {
      quantity_used: 1,
      appointment_id: '',
      notes: '',
      usage_date: new Date().toISOString().split('T')[0],
    },
  })

  const handleSubmit = async (data: UsageFormData) => {
    if (!item) return

    // Check if quantity is available
    if (data.quantity_used > item.quantity) {
      toast({
        title: 'خطأ',
        description: `الكمية المطلوبة (${data.quantity_used}) أكبر من الكمية المتوفرة (${item.quantity})`,
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)
    try {
      const usageData = {
        inventory_id: item.id,
        quantity_used: data.quantity_used,
        appointment_id: data.appointment_id || undefined,
        notes: data.notes || undefined,
        usage_date: data.usage_date,
      }

      await onSave(usageData)
      form.reset({
        quantity_used: 1,
        appointment_id: '',
        notes: '',
        usage_date: new Date().toISOString().split('T')[0],
      })
      onClose()
      toast({
        title: 'نجح',
        description: 'تم تسجيل الاستخدام بنجاح',
      })
    } catch (error) {
      console.error('Error recording usage:', error)
      toast({
        title: 'خطأ',
        description: 'فشل في تسجيل الاستخدام. يرجى المحاولة مرة أخرى',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    form.reset()
    onClose()
  }

  if (!item) return null

  // Get today's appointments
  const today = new Date().toISOString().split('T')[0]
  const todayAppointments = appointments.filter(apt =>
    apt.start_time.startsWith(today)
  )

  // Check if item is low stock or out of stock
  const isLowStock = item.quantity <= item.minimum_stock
  const isOutOfStock = item.quantity === 0

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground">
            تسجيل استخدام المواد
          </DialogTitle>
          <DialogDescription>
            تسجيل استخدام: {item.name}
          </DialogDescription>
        </DialogHeader>

        {/* Item Info */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <div className="flex justify-between">
            <span className="font-medium text-foreground">{item.name}</span>
            <span className="text-sm text-muted-foreground">العنصر:</span>
          </div>

          <div className="flex justify-between">
            <span className="text-sm">
              {item.quantity} {item.unit || 'قطعة'}
            </span>
            <span className="text-sm text-muted-foreground">الكمية المتوفرة:</span>
          </div>

          <div className="flex justify-between">
            <span className="text-sm">{item.minimum_stock}</span>
            <span className="text-sm text-muted-foreground">الحد الأدنى:</span>
          </div>
        </div>

        {/* Warnings */}
        {isOutOfStock && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <p className="text-sm text-destructive font-medium">
                تحذير: نفد المخزون من هذا العنصر
              </p>
            </div>
          </div>
        )}

        {isLowStock && !isOutOfStock && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              <p className="text-sm text-yellow-700 dark:text-yellow-300 font-medium">
                تحذير: المخزون منخفض (أقل من الحد الأدنى)
              </p>
            </div>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Quantity Used */}
            <FormField
              control={form.control}
              name="quantity_used"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    الكمية المستخدمة * ({item.unit || 'قطعة'})
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      max={item.quantity}
                      placeholder="1"
                      {...field}
                      onChange={(e) => {
                        const value = e.target.value
                        field.onChange(value === '' ? 1 : Number(value))
                      }}
                      onBlur={(e) => {
                        const value = Number(e.target.value) || 1
                        field.onChange(value)
                      }}
                      className="text-right"
                      disabled={isOutOfStock}
                    />
                  </FormControl>
                  <FormMessage />
                  {field.value > item.quantity && (
                    <p className="text-sm text-destructive">
                      الكمية المطلوبة أكبر من المتوفر ({item.quantity})
                    </p>
                  )}
                </FormItem>
              )}
            />

            {/* Usage Date */}
            <FormField
              control={form.control}
              name="usage_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">تاريخ الاستخدام *</FormLabel>
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

            {/* Appointment */}
            <FormField
              control={form.control}
              name="appointment_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">الموعد المرتبط (اختياري)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الموعد" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">بدون موعد محدد</SelectItem>
                      {todayAppointments.map((appointment) => (
                        <SelectItem key={appointment.id} value={appointment.id}>
                          {appointment.title} - {appointment.patient?.first_name} {appointment.patient?.last_name}
                        </SelectItem>
                      ))}
                      {appointments.filter(apt => !apt.start_time.startsWith(today)).slice(0, 10).map((appointment) => (
                        <SelectItem key={appointment.id} value={appointment.id}>
                          {appointment.title} - {appointment.patient?.first_name} {appointment.patient?.last_name}
                          <span className="text-xs text-muted-foreground ml-2">
                            ({(() => {
                              const date = new Date(appointment.start_time)
                              const day = date.getDate().toString().padStart(2, '0')
                              const month = (date.getMonth() + 1).toString().padStart(2, '0')
                              const year = date.getFullYear()
                              return `${day}/${month}/${year}`
                            })()})
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">ملاحظات</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="ملاحظات حول الاستخدام..."
                      {...field}
                      className="text-right resize-none"
                      rows={3}
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
              <Button
                type="submit"
                disabled={isLoading || isOutOfStock || form.watch('quantity_used') > item.quantity}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                تسجيل الاستخدام
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
