import React, { memo } from 'react'
import { Patient } from '../types'
import { User, Phone, Mail, Calendar, Edit, Trash2 } from 'lucide-react'

// shadcn/ui imports
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate } from '../lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface PatientCardProps {
  patient: Patient
  onClick?: () => void
  onEdit?: (patient: Patient) => void
  onDelete?: (patient: Patient) => void
}

function PatientCardComponent({ patient, onClick, onEdit, onDelete }: PatientCardProps) {

  return (
    <Card
      className="hover:shadow-lg transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4 space-x-reverse">
            <Avatar className="w-12 h-12">
              <AvatarFallback className="bg-primary/10 text-primary">
                <User className="w-6 h-6" />
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-heading-3 arabic-enhanced">
                {patient.full_name}
              </CardTitle>
              <div className="flex items-center space-x-2 space-x-reverse text-sm text-muted-foreground mt-1">
                <div className="flex items-center space-x-1 space-x-reverse">
                  <User className="w-4 h-4" />
                  <span>{patient.gender === 'male' ? 'ذكر' : 'أنثى'} - {patient.age} سنة</span>
                </div>
                {patient.serial_number && (
                  <div className="flex items-center space-x-1 space-x-reverse">
                    <span>#{patient.serial_number}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 space-x-reverse">
            <Badge variant="secondary" className="text-xs">
              معرف: {patient.id.slice(-8)}
            </Badge>

            {/* Action Buttons */}
            <div className="flex items-center space-x-1 space-x-reverse">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-primary hover:text-primary hover:bg-primary/10"
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit?.(patient)
                }}
              >
                <Edit className="w-4 h-4 ml-1" />
                <span className="text-xs">تعديل</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete?.(patient)
                }}
              >
                <Trash2 className="w-4 h-4 ml-1" />
                <span className="text-xs">حذف</span>
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {patient.phone && (
            <div className="flex items-center space-x-2 space-x-reverse text-sm text-muted-foreground">
              <Phone className="w-4 h-4" />
              <span>{patient.phone}</span>
            </div>
          )}

          {patient.email && (
            <div className="flex items-center space-x-2 space-x-reverse text-sm text-muted-foreground">
              <Mail className="w-4 h-4" />
              <span>{patient.email}</span>
            </div>
          )}
        </div>

        {patient.medical_history && (
          <div className="mb-3 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-md border border-yellow-200 dark:border-yellow-800">
            <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">التاريخ الطبي</h4>
            <p className="text-sm text-yellow-700 dark:text-yellow-300">{patient.medical_history}</p>
          </div>
        )}

        {patient.allergies && (
          <div className="mb-3 p-3 bg-red-50 dark:bg-red-950/20 rounded-md border border-red-200 dark:border-red-800">
            <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">الحساسية</h4>
            <p className="text-sm text-red-700 dark:text-red-300">{patient.allergies}</p>
          </div>
        )}

        <div className="pt-4 border-t border-border">
          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <span>تم الإنشاء: {formatDate(patient.created_at)}</span>
            <span>آخر تحديث: {formatDate(patient.updated_at)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default memo(PatientCardComponent)