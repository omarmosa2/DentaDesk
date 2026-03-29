import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MoreVertical, Edit2, History, Clock, User } from 'lucide-react'
import { ToothTreatment } from '@/types'

interface CompletedTreatmentActionsProps {
  treatment: ToothTreatment | any
  onEditClick?: () => void
  isCompleted: boolean
}

export default function CompletedTreatmentActions({
  treatment,
  onEditClick,
  isCompleted,
}: CompletedTreatmentActionsProps) {
  const [auditDialogOpen, setAuditDialogOpen] = useState(false)
  const [auditTrail, setAuditTrail] = useState<any[]>([])

  const fetchAuditTrail = async () => {
    try {
      const result = await (window as any).electron?.ipcRenderer?.invoke(
        'db:treatmentEditAudit:getTrail',
        treatment.id
      )
      if (result?.success) {
        setAuditTrail(result.auditTrail || [])
      }
    } catch (error) {
      console.error('Error fetching audit trail:', error)
    }
  }

  // فقط نعرض الأزرار للعلاجات المكتملة
  if (!isCompleted) {
    return null
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            title="الخيارات"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={onEditClick}
          >
            <Edit2 className="ml-2 h-4 w-4" />
            <span>تعديل العلاج</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              fetchAuditTrail()
              setAuditDialogOpen(true)
            }}
          >
            <History className="ml-2 h-4 w-4" />
            <span>سجل التعديلات</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* حوار سجل التدقيق */}
      <Dialog open={auditDialogOpen} onOpenChange={setAuditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>سجل التعديلات</DialogTitle>
            <DialogDescription>
              عرض جميع التعديلات التي تمت على هذا العلاج
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {auditTrail.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                لا توجد تعديلات لهذا العلاج
              </div>
            ) : (
              auditTrail.map((entry, idx) => (
                <Card key={idx}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold">{entry.edited_by_user}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <Clock className="h-4 w-4" />
                          <span>{new Date(entry.created_at).toLocaleString('ar-EG')}</span>
                        </div>
                      </div>
                      <Badge className="bg-blue-100 text-blue-800">
                        {entry.edit_reason}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {entry.change_summary && (
                      <p><strong>الملخص:</strong> {entry.change_summary}</p>
                    )}
                    {entry.fields_modified && (
                      <div>
                        <strong>الحقول المعدلة:</strong>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {entry.fields_modified.map((field: string) => (
                            <Badge key={field} variant="outline">{field}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
