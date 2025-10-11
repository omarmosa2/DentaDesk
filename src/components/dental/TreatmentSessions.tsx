import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useTheme } from '@/contexts/ThemeContext'
import { cn } from '@/lib/utils'
import { Plus, Calendar, Clock, Edit, Trash2, Save, X, CheckCircle } from 'lucide-react'
import { TreatmentSession, ToothTreatment } from '@/types'
import { getSessionTypesByCategory } from '@/constants/treatmentSessions'
import { notify } from '@/services/notificationService'
import SessionCard from './SessionCard'

interface TreatmentSessionsProps {
  treatment: ToothTreatment
  sessions: TreatmentSession[]
  onAddSession: (sessionData: Omit<TreatmentSession, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  onUpdateSession: (id: string, updates: Partial<TreatmentSession>) => Promise<void>
  onDeleteSession: (id: string) => Promise<void>
}

export default function TreatmentSessions({
  treatment,
  sessions,
  onAddSession,
  onUpdateSession,
  onDeleteSession
}: TreatmentSessionsProps) {
  const { isDarkMode } = useTheme()
  const [isAddingSession, setIsAddingSession] = useState(false)
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [newSession, setNewSession] = useState<Partial<TreatmentSession>>({
    tooth_treatment_id: treatment.id,
    session_date: new Date().toISOString().split('T')[0],
    session_status: 'planned',
    duration_minutes: 30
  })

  // الحصول على أنواع الجلسات المناسبة لتصنيف العلاج
  const availableSessionTypes = getSessionTypesByCategory(treatment.treatment_category)

  const handleAddSession = async () => {
    if (!newSession.session_type || !newSession.session_title || !newSession.session_date) {
      notify.error('يرجى ملء جميع الحقول المطلوبة')
      return
    }

    try {
      await onAddSession(newSession as Omit<TreatmentSession, 'id' | 'created_at' | 'updated_at'>)

      // إعادة تعيين النموذج
      setNewSession({
        tooth_treatment_id: treatment.id,
        session_date: new Date().toISOString().split('T')[0],
        session_status: 'planned',
        duration_minutes: 30,
        cost: 0
      })
      setIsAddingSession(false)
      notify.success('تم إضافة الجلسة بنجاح')
    } catch (error) {
      notify.error('فشل في إضافة الجلسة')
    }
  }

  const handleUpdateSession = async (sessionId: string, updates: Partial<TreatmentSession>) => {
    try {
      await onUpdateSession(sessionId, updates)
      setEditingSessionId(null)
      notify.success('تم تحديث الجلسة بنجاح')
    } catch (error) {
      notify.error('فشل في تحديث الجلسة')
    }
  }

  const handleDeleteSession = async (sessionId: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذه الجلسة؟')) {
      try {
        await onDeleteSession(sessionId)
        notify.success('تم حذف الجلسة بنجاح')
      } catch (error) {
        notify.error('فشل في حذف الجلسة')
      }
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'planned':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-card dark:text-gray-200'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'مكتملة'
      case 'planned':
        return 'مخططة'
      case 'cancelled':
        return 'ملغية'
      default:
        return status
    }
  }

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">
          جلسات العلاج ({sessions.length})
        </h3>
        <Button
          onClick={() => setIsAddingSession(true)}
          size="sm"
          className={cn(
            "action-btn-sessions sessions-selected",
            isDarkMode
              ? "bg-blue-600 hover:bg-blue-700 text-white"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          )}
        >
          <Plus className="w-4 h-4 ml-2" />
          إضافة جلسة
        </Button>
      </div>

      {/* قائمة الجلسات */}
      <div className="space-y-3">
        {sessions.map((session) => (
          <SessionCard
            key={session.id}
            session={session}
            isEditing={editingSessionId === session.id}
            availableSessionTypes={availableSessionTypes}
            onEdit={() => setEditingSessionId(session.id)}
            onCancelEdit={() => setEditingSessionId(null)}
            onSave={(updates) => handleUpdateSession(session.id, updates)}
            onDelete={() => handleDeleteSession(session.id)}
            getStatusBadgeColor={getStatusBadgeColor}
            getStatusText={getStatusText}
            isDarkMode={isDarkMode}
          />
        ))}
      </div>

      {/* نموذج إضافة جلسة جديدة */}
      {isAddingSession && (
        <Card className={cn(
          "border-2 border-dashed transition-all duration-200",
          isDarkMode
            ? "border-blue-600 bg-gray-800/50"
            : "border-blue-300 bg-blue-50/50"
        )}>
          <CardHeader>
            <CardTitle className="text-lg text-foreground">إضافة جلسة جديدة</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="session_type">نوع الجلسة *</Label>
                <Select
                  value={newSession.session_type || ''}
                  onValueChange={(value) => {
                    const selectedType = availableSessionTypes.find(type => type.value === value)
                    setNewSession(prev => ({
                      ...prev,
                      session_type: value,
                      session_title: selectedType?.label || ''
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
                <Label htmlFor="session_title">عنوان الجلسة *</Label>
                <Input
                  id="session_title"
                  value={newSession.session_title || ''}
                  onChange={(e) => setNewSession(prev => ({ ...prev, session_title: e.target.value }))}
                  placeholder="عنوان الجلسة"
                />
              </div>

              <div>
                <Label htmlFor="session_date">تاريخ الجلسة *</Label>
                <Input
                  id="session_date"
                  type="date"
                  value={newSession.session_date || ''}
                  onChange={(e) => setNewSession(prev => ({ ...prev, session_date: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="duration_minutes">مدة الجلسة (دقيقة)</Label>
                <Input
                  id="duration_minutes"
                  type="number"
                  value={newSession.duration_minutes || 30}
                  onChange={(e) => setNewSession(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) || 30 }))}
                  placeholder="30"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="session_description">وصف الجلسة</Label>
              <Textarea
                id="session_description"
                value={newSession.session_description || ''}
                onChange={(e) => setNewSession(prev => ({ ...prev, session_description: e.target.value }))}
                placeholder="وصف ما تم عمله في الجلسة..."
                rows={3}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddingSession(false)
                  setNewSession({
                    tooth_treatment_id: treatment.id,
                    session_date: new Date().toISOString().split('T')[0],
                    session_status: 'planned',
                    duration_minutes: 30
                  })
                }}
              >
                <X className="w-4 h-4 ml-2" />
                إلغاء
              </Button>
              <Button onClick={handleAddSession}>
                <Save className="w-4 h-4 ml-2" />
                حفظ الجلسة
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {sessions.length === 0 && !isAddingSession && (
        <Card className={cn(
          "text-center py-8",
          isDarkMode ? "bg-gray-800/50" : "bg-gray-50"
        )}>
          <CardContent>
            <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">لا توجد جلسات مسجلة لهذا العلاج</p>
            <Button
              onClick={() => setIsAddingSession(true)}
              className="mt-4 action-btn-sessions sessions-outline"
              variant="outline"
            >
              <Plus className="w-4 h-4 ml-2" />
              إضافة أول جلسة
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
