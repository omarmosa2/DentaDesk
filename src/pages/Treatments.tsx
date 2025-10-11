import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Stethoscope, Plus } from 'lucide-react'

export default function Treatments() {
  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">العلاجات</h1>
          <p className="text-muted-foreground mt-2">
            إدارة أنواع العلاجات والإجراءات والأسعار
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4 ml-2" />
          إضافة علاج
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>إدارة العلاجات</CardTitle>
          <CardDescription>
            تكوين العلاجات المتاحة وتفاصيلها
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Stethoscope className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">كتالوج العلاجات</h3>
            <p className="text-muted-foreground">
              سيتم تطبيق واجهة إدارة العلاجات هنا
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
