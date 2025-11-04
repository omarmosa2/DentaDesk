import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useDoctorStore } from '@/store/doctorStore'
import { useToast } from '@/hooks/use-toast'
import { Plus, Edit, Trash2, Eye, Search, X } from 'lucide-react'
import type { Doctor } from '@/types'
import { useRealTimeSync } from '@/hooks/useRealTimeSync'
import { useRealTimeTableSync } from '@/hooks/useRealTimeTableSync'

export default function Doctors() {
  const { doctors, loadDoctors, createDoctor, updateDoctor, deleteDoctor, isLoading } = useDoctorStore()
  const { toast } = useToast()
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null)
  const [deletingDoctor, setDeletingDoctor] = useState<Doctor | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [formData, setFormData] = useState({ name: '', specialty: '' })

  // Enable real-time synchronization
  useRealTimeSync()
  useRealTimeTableSync()

  // Load doctors on component mount
  useEffect(() => {
    loadDoctors()
  }, [loadDoctors])

  // Filter doctors based on search query
  const filteredDoctors = doctors.filter(doctor => {
    const query = searchQuery.toLowerCase()
    return (
      doctor.name.toLowerCase().includes(query) ||
      doctor.specialty.toLowerCase().includes(query)
    )
  })

  const handleOpenAddDialog = () => {
    setFormData({ name: '', specialty: '' })
    setEditingDoctor(null)
    setShowAddDialog(true)
  }

  const handleOpenEditDialog = (doctor: Doctor) => {
    setFormData({ name: doctor.name, specialty: doctor.specialty })
    setEditingDoctor(doctor)
    setShowAddDialog(true)
  }

  const handleCloseDialog = () => {
    setShowAddDialog(false)
    setEditingDoctor(null)
    setFormData({ name: '', specialty: '' })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim() || !formData.specialty.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى ملء جميع الحقول المطلوبة",
        variant: "destructive",
      })
      return
    }

    try {
      if (editingDoctor) {
        await updateDoctor(editingDoctor.id, formData)
        toast({
          title: "نجح",
          description: "تم تحديث بيانات الطبيب بنجاح",
        })
      } else {
        const newDoctor = await createDoctor(formData)
        if (newDoctor) {
          toast({
            title: "نجح",
            description: "تم إضافة الطبيب بنجاح",
          })
          // إعادة تحميل قائمة الأطباء للتأكد من التحديث
          await loadDoctors()
        }
      }
      handleCloseDialog()
    } catch (error) {
      console.error('Error saving doctor:', error)
      toast({
        title: "خطأ",
        description: error instanceof Error ? error.message : "حدث خطأ أثناء حفظ بيانات الطبيب",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async () => {
    if (!deletingDoctor) return

    try {
      await deleteDoctor(deletingDoctor.id)
      // إعادة تحميل قائمة الأطباء بعد الحذف
      await loadDoctors()
      toast({
        title: "نجح",
        description: "تم حذف الطبيب بنجاح",
      })
      setDeletingDoctor(null)
    } catch (error) {
      console.error('Error deleting doctor:', error)
      toast({
        title: "خطأ",
        description: error instanceof Error ? error.message : "حدث خطأ أثناء حذف الطبيب",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-heading-1 text-foreground arabic-enhanced">إدارة الأطباء</h1>
          <p className="text-body text-muted-foreground mt-2 arabic-enhanced">
            إدارة بيانات الأطباء المسجلين في النظام
          </p>
        </div>
        <Button onClick={handleOpenAddDialog}>
          <Plus className="w-4 h-4 mr-2" />
          إضافة طبيب جديد
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="البحث في الأطباء (الاسم، الاختصاص)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10 text-right"
              dir="rtl"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute left-2 top-1/2 transform -translate-y-1/2"
                onClick={() => setSearchQuery('')}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Doctors Table */}
      <Card>
        <CardHeader>
          <CardTitle className="arabic-enhanced">قائمة الأطباء</CardTitle>
          <CardDescription className="arabic-enhanced">
            {filteredDoctors.length} طبيب
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground arabic-enhanced">
              جاري التحميل...
            </div>
          ) : filteredDoctors.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground arabic-enhanced">
              {searchQuery ? 'لا توجد نتائج للبحث' : 'لا توجد أطباء مسجلين'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right arabic-enhanced">اسم الطبيب</TableHead>
                  <TableHead className="text-right arabic-enhanced">الاختصاص</TableHead>
                  <TableHead className="text-right arabic-enhanced">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDoctors.map((doctor) => (
                  <TableRow key={doctor.id}>
                    <TableCell className="font-medium arabic-enhanced">{doctor.name}</TableCell>
                    <TableCell className="arabic-enhanced">{doctor.specialty}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEditDialog(doctor)}
                          title="تعديل"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletingDoctor(doctor)}
                          title="حذف"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="arabic-enhanced">
              {editingDoctor ? 'تعديل بيانات الطبيب' : 'إضافة طبيب جديد'}
            </DialogTitle>
            <DialogDescription className="arabic-enhanced">
              {editingDoctor ? 'تعديل بيانات الطبيب المحدد' : 'إضافة طبيب جديد إلى النظام'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="arabic-enhanced">اسم الطبيب *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="أدخل اسم الطبيب"
                  className="text-right"
                  dir="rtl"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="specialty" className="arabic-enhanced">اختصاص الطبيب *</Label>
                <Input
                  id="specialty"
                  value={formData.specialty}
                  onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                  placeholder="أدخل اختصاص الطبيب"
                  className="text-right"
                  dir="rtl"
                  required
                />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                إلغاء
              </Button>
              <Button type="submit">
                {editingDoctor ? 'حفظ التعديلات' : 'إضافة'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingDoctor} onOpenChange={() => setDeletingDoctor(null)}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="arabic-enhanced">تأكيد الحذف</DialogTitle>
            <DialogDescription className="arabic-enhanced">
              هل أنت متأكد من حذف الطبيب "{deletingDoctor?.name}"؟ لا يمكن التراجع عن هذه العملية.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingDoctor(null)}>
              إلغاء
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

