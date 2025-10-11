import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Calendar, Clock, Edit, Trash2, Save, X, CheckCircle } from 'lucide-react'
import { TreatmentSession } from '@/types'
import { SessionType } from '@/constants/treatmentSessions'

interface SessionCardProps {
  session: TreatmentSession
  isEditing: boolean
  availableSessionTypes: SessionType[]
  onEdit: () => void
  onCancelEdit: () => void
  onSave: (updates: Partial<TreatmentSession>) => void
  onDelete: () => void
  getStatusBadgeColor: (status: string) => string
  getStatusText: (status: string) => string
  isDarkMode: boolean
}

export default function SessionCard({
  session,
  isEditing,
  availableSessionTypes,
  onEdit,
  onCancelEdit,
  onSave,
  onDelete,
  getStatusBadgeColor,
  getStatusText,
  isDarkMode
}: SessionCardProps) {
  const [editData, setEditData] = useState<Partial<TreatmentSession>>({
    session_type: session.session_type,
    session_title: session.session_title,
    session_description: session.session_description,
    session_date: session.session_date,
    session_status: session.session_status,
    duration_minutes: session.duration_minutes,
    notes: session.notes
  })

  const handleSave = () => {
    onSave(editData)
  }

  const handleCancel = () => {
    setEditData({
      session_type: session.session_type,
      session_title: session.session_title,
      session_description: session.session_description,
      session_date: session.session_date,
      session_status: session.session_status,
      duration_minutes: session.duration_minutes,
      cost: session.cost,
      notes: session.notes
    })
    onCancelEdit()
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) {
        return '--'
      }

      // Using Gregorian calendar system - التقويم الميلادي
      const day = date.getDate()
      const month = date.getMonth() + 1 // Add 1 because getMonth() returns 0-11
      const year = date.getFullYear()

      // Format as DD/MM/YYYY (Gregorian format)
      const formattedDay = day.toString().padStart(2, '0')
      const formattedMonth = month.toString().padStart(2, '0')

      return `${formattedDay}/${formattedMonth}/${year}`
    } catch (error) {
      console.warn('Error formatting date:', error)
      return '--'
    }
  }

  if (isEditing) {
    return (
      <Card className={cn(
        "border-2 transition-all duration-200",
        isDarkMode
          ? "border-yellow-600 bg-yellow-900/20"
          : "border-yellow-400 bg-yellow-50"
      )}>
        <CardContent className="p-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-foreground">تعديل الجلسة #{session.session_number}</h4>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleCancel}>
                  <X className="w-4 h-4 ml-1" />
                  إلغاء
                </Button>
                <Button size="sm" onClick={handleSave}>
                  <Save className="w-4 h-4 ml-1" />
                  حفظ
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_session_type">نوع الجلسة</Label>
                <Select
                  value={editData.session_type || ''}
                  onValueChange={(value) => {
                    const selectedType = availableSessionTypes.find(type => type.value === value)
                    setEditData(prev => ({
                      ...prev,
                      session_type: value,
                      session_title: selectedType?.label || prev.session_title
                    }))
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر نوع الجلسة" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSessionTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div>
                          <div className="font-medium">{type.label}</div>
                          {type.description && (
                            <div className="text-sm text-muted-foreground">{type.description}</div>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit_session_title">عنوان الجلسة</Label>
                <Input
                  id="edit_session_title"
                  value={editData.session_title || ''}
                  onChange={(e) => setEditData(prev => ({ ...prev, session_title: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="edit_session_date">تاريخ الجلسة</Label>
                <Input
                  id="edit_session_date"
                  type="date"
                  value={editData.session_date || ''}
                  onChange={(e) => setEditData(prev => ({ ...prev, session_date: e.target.value }))}
                />
              </div>

              {/* <div>
                <Label htmlFor="edit_session_status">حالة الجلسة</Label>
                <Select
                  value={editData.session_status || ''}
                  onValueChange={(value) => setEditData(prev => ({ ...prev, session_status: value as any }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر حالة الجلسة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planned">مخططة</SelectItem>
                    <SelectItem value="completed">مكتملة</SelectItem>
                    <SelectItem value="cancelled">ملغية</SelectItem>
                  </SelectContent>
                </Select>
              </div> */}

              <div>
                <Label htmlFor="edit_duration">مدة الجلسة (دقيقة)</Label>
                <Input
                  id="edit_duration"
                  type="number"
                  value={editData.duration_minutes || 30}
                  onChange={(e) => setEditData(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) || 30 }))}
                />
              </div>


            </div>

            <div>
              <Label htmlFor="edit_session_description">وصف الجلسة</Label>
              <Textarea
                id="edit_session_description"
                value={editData.session_description || ''}
                onChange={(e) => setEditData(prev => ({ ...prev, session_description: e.target.value }))}
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="edit_notes">ملاحظات</Label>
              <Textarea
                id="edit_notes"
                value={editData.notes || ''}
                onChange={(e) => setEditData(prev => ({ ...prev, notes: e.target.value }))}
                rows={2}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn(
      "transition-all duration-200 hover:shadow-md",
      isDarkMode ? "bg-gray-800/50 hover:bg-gray-800/70" : "bg-white hover:bg-gray-50"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className={cn(
                "flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold",
                isDarkMode ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-800"
              )}>
                {session.session_number}
              </span>
              <div>
                <h4 className="font-medium text-foreground">{session.session_title}</h4>
                <p className="text-sm text-muted-foreground">
                  {availableSessionTypes.find(type => type.value === session.session_type)?.label || session.session_type}
                </p>
              </div>
              <Badge className={getStatusBadgeColor(session.session_status)}>
                {getStatusText(session.session_status)}
              </Badge>
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {formatDate(session.session_date)}
              </div>
              {session.duration_minutes && (
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {session.duration_minutes} دقيقة
                </div>
              )}
              {session.cost && session.cost > 0 && (
                <div className="font-medium text-green-600">
                  ${session.cost}
                </div>
              )}
            </div>

            {session.session_description && (
              <p className="text-sm text-muted-foreground mb-2">
                {session.session_description}
              </p>
            )}

            {session.notes && (
              <div className={cn(
                "text-xs p-2 rounded border-r-4",
                isDarkMode
                  ? "bg-gray-700/50 border-gray-600 text-gray-300"
                  : "bg-gray-50 border-gray-300 text-gray-600"
              )}>
                <strong>ملاحظات:</strong> {session.notes}
              </div>
            )}
          </div>

          <div className="flex gap-1 ml-4">
            <Button
              size="sm"
              variant="ghost"
              onClick={onEdit}
              className="h-8 w-8 p-0"
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onDelete}
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
