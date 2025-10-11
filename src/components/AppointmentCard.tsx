import React, { memo } from 'react'
import { Appointment } from '../types'
import {
  Calendar,
  Clock,
  User,
  FileText,
  DollarSign,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react'

// shadcn/ui imports
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDateTime, formatTime, getStatusColor } from '../lib/utils'

interface AppointmentCardProps {
  appointment: Appointment
  onClick?: () => void
  onEdit?: (appointment: Appointment) => void
  onDelete?: (appointment: Appointment) => void
}

function AppointmentCardComponent({ appointment, onClick, onEdit, onDelete }: AppointmentCardProps) {

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Clock className="w-4 h-4" />
      case 'completed':
        return <CheckCircle className="w-4 h-4" />
      case 'cancelled':
        return <XCircle className="w-4 h-4" />
      case 'no_show':
        return <AlertCircle className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'مجدول'
      case 'completed':
        return 'مكتمل'
      case 'cancelled':
        return 'ملغي'
      case 'no_show':
        return 'لم يحضر'
      default:
        return status
    }
  }

  return (
    <Card
      className="hover:shadow-lg transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-heading-3 arabic-enhanced">
            {appointment.title}
          </CardTitle>

            <div className="flex items-center space-x-2 space-x-reverse">
              <Badge
                variant="outline"
                className={`flex items-center space-x-1 space-x-reverse ${getStatusColor(appointment.status)}`}
              >
                {getStatusIcon(appointment.status)}
                <span>{getStatusText(appointment.status)}</span>
              </Badge>

              {/* Action Buttons */}
              <div className="flex items-center space-x-1 space-x-reverse">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-primary hover:text-primary hover:bg-primary/10"
                  onClick={(e) => {
                    e.stopPropagation()
                    onEdit?.(appointment)
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
                    onDelete?.(appointment)
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
            {/* Patient Info */}
            {appointment.patient && (
              <div className="flex items-center space-x-2 space-x-reverse text-body-small text-muted-foreground arabic-enhanced">
                <User className="w-4 h-4" />
                <span>{appointment.patient.first_name} {appointment.patient.last_name}</span>
              </div>
            )}

            {/* Treatment Info */}
            {appointment.treatment && (
              <div className="flex items-center space-x-2 space-x-reverse text-sm text-muted-foreground">
                <FileText className="w-4 h-4" />
                <span>{appointment.treatment.name}</span>
              </div>
            )}

            {/* Date and Time */}
            <div className="flex items-center space-x-2 space-x-reverse text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>{formatDateTime(appointment.start_time)}</span>
            </div>

            {/* Duration */}
            <div className="flex items-center space-x-2 space-x-reverse text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>
                {formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}
              </span>
            </div>

            {/* Cost */}
            {appointment.cost && (
              <div className="flex items-center space-x-2 space-x-reverse text-sm text-muted-foreground">
                <DollarSign className="w-4 h-4" />
                <span>{appointment.cost} $</span>
              </div>
            )}
          </div>

          {/* Description */}
          {appointment.description && (
            <div className="mb-3 p-3 bg-muted rounded-md">
              <h4 className="text-sm font-medium text-foreground mb-1">وصف الموعد</h4>
              <p className="text-sm text-muted-foreground">{appointment.description}</p>
            </div>
          )}

          {/* Notes */}
          {appointment.notes && (
            <div className="mb-3 p-3 bg-primary/10 rounded-md">
              <h4 className="text-sm font-medium text-primary mb-1">ملاحظات</h4>
              <p className="text-sm text-primary">{appointment.notes}</p>
            </div>
          )}

        {/* Footer */}
        <div className="pt-3 border-t border-border">
          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <span>تم الإنشاء: {formatDateTime(appointment.created_at)}</span>
            <span>آخر تحديث: {formatDateTime(appointment.updated_at)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default memo(AppointmentCardComponent)