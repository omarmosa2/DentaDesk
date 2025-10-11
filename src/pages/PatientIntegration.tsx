import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Search,
  User,
  Activity,
  Calendar,
  FileText,
  TestTube,
  DollarSign,
  Clock,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  Download,
  Eye
} from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'
import { usePatientStore } from '@/store/patientStore'
import { PatientIntegrationService } from '@/services/patientIntegrationService'
import { TreatmentWorkflowService } from '@/services/treatmentWorkflowService'
import TreatmentDashboard from '@/components/treatment/TreatmentDashboard'
import type { Patient, PatientIntegratedData } from '@/types'

export default function PatientIntegration() {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [integratedData, setIntegratedData] = useState<PatientIntegratedData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('dashboard')

  const { patients, loadPatients, filteredPatients, setSearchQuery: setPatientSearchQuery } = usePatientStore()

  useEffect(() => {
    loadPatients()
  }, [loadPatients])

  useEffect(() => {
    setPatientSearchQuery(searchQuery)
  }, [searchQuery, setPatientSearchQuery])

  const handlePatientSelect = async (patient: Patient) => {
    setSelectedPatient(patient)
    setIsLoading(true)
    
    try {
      const data = await PatientIntegrationService.getPatientIntegratedData(patient.id)
      setIntegratedData(data)
    } catch (error) {
      console.error('خطأ في تحميل بيانات المريض:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGenerateReport = async () => {
    if (!selectedPatient) return
    
    try {
      const report = await PatientIntegrationService.generatePatientReport(selectedPatient.id)
      console.log('تقرير المريض:', report)
      // يمكن إضافة تصدير التقرير هنا
    } catch (error) {
      console.error('خطأ في إنشاء التقرير:', error)
    }
  }

  const handleRefreshData = async () => {
    if (!selectedPatient) return
    await handlePatientSelect(selectedPatient)
  }

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">التكامل الشامل للمرضى</h1>
          <p className="text-muted-foreground">
            عرض شامل ومتكامل لجميع بيانات المريض والعلاجات والمواعيد
          </p>
        </div>
        {selectedPatient && (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleRefreshData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              تحديث
            </Button>
            <Button variant="outline" onClick={handleGenerateReport}>
              <Download className="w-4 h-4 mr-2" />
              تصدير التقرير
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* قائمة المرضى */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                المرضى
              </CardTitle>
              <CardDescription>اختر مريضاً لعرض بياناته المتكاملة</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="البحث عن مريض..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredPatients.map((patient) => (
                    <div
                      key={patient.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedPatient?.id === patient.id
                          ? 'bg-primary/10 border-primary'
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => handlePatientSelect(patient)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{patient.full_name}</p>
                          <p className="text-sm text-muted-foreground">#{patient.serial_number}</p>
                        </div>
                        <Badge variant="outline">
                          {patient.age} سنة
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* المحتوى الرئيسي */}
        <div className="lg:col-span-3">
          {!selectedPatient ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <User className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-xl font-medium mb-2">اختر مريضاً</h3>
                  <p className="text-muted-foreground">
                    اختر مريضاً من القائمة لعرض بياناته المتكاملة
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : isLoading ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <div className="loading-spinner mx-auto mb-4"></div>
                  <h3 className="text-xl font-medium mb-2">جاري التحميل...</h3>
                  <p className="text-muted-foreground">
                    يتم تحميل البيانات المتكاملة للمريض
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="dashboard" className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  لوحة التحكم
                </TabsTrigger>
                <TabsTrigger value="treatments" className="flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  العلاجات
                </TabsTrigger>
                <TabsTrigger value="appointments" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  المواعيد
                </TabsTrigger>
                <TabsTrigger value="prescriptions" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  الوصفات
                </TabsTrigger>
                <TabsTrigger value="timeline" className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  الجدول الزمني
                </TabsTrigger>
              </TabsList>

              <TabsContent value="dashboard">
                <TreatmentDashboard
                  patientId={selectedPatient.id}
                  onNavigateToAppointments={() => setActiveTab('appointments')}
                  onNavigateToTreatments={() => setActiveTab('treatments')}
                  onNavigateToPrescriptions={() => setActiveTab('prescriptions')}
                  onNavigateToLabOrders={() => {
                    // Navigate to lab orders page
                    window.location.href = '/lab-orders'
                  }}
                />
              </TabsContent>

              <TabsContent value="treatments">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="w-5 h-5" />
                      العلاجات السنية
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {integratedData?.treatments.length === 0 ? (
                      <div className="text-center py-8">
                        <Activity className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                        <h3 className="text-lg font-medium mb-2">لا توجد علاجات</h3>
                        <p className="text-muted-foreground">لم يتم إضافة أي علاجات لهذا المريض بعد</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {integratedData?.treatments.map((treatment) => (
                          <div key={treatment.id} className="p-4 border rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium">
                                السن رقم {treatment.tooth_number} - {treatment.tooth_name}
                              </h4>
                              <Badge variant={
                                treatment.treatment_status === 'completed' ? 'default' :
                                treatment.treatment_status === 'in_progress' ? 'secondary' : 'outline'
                              }>
                                {treatment.treatment_status === 'completed' ? 'مكتمل' :
                                 treatment.treatment_status === 'in_progress' ? 'قيد التنفيذ' : 'مخطط'}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {treatment.treatment_type} - {treatment.treatment_category}
                            </p>
                            {treatment.cost && (
                              <p className="text-sm font-medium">
                                التكلفة: {formatCurrency(treatment.cost)}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="appointments">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      المواعيد
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {integratedData?.appointments.length === 0 ? (
                      <div className="text-center py-8">
                        <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                        <h3 className="text-lg font-medium mb-2">لا توجد مواعيد</h3>
                        <p className="text-muted-foreground">لم يتم حجز أي مواعيد لهذا المريض بعد</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {integratedData?.appointments
                          .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
                          .map((appointment) => (
                          <div key={appointment.id} className="p-4 border rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium">{appointment.title}</h4>
                              <Badge variant={
                                appointment.status === 'completed' ? 'default' :
                                appointment.status === 'scheduled' ? 'secondary' : 'destructive'
                              }>
                                {appointment.status === 'completed' ? 'مكتمل' :
                                 appointment.status === 'scheduled' ? 'مجدول' :
                                 appointment.status === 'cancelled' ? 'ملغي' : 'لم يحضر'}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {formatDate(appointment.start_time)}
                            </p>
                            {appointment.description && (
                              <p className="text-sm">{appointment.description}</p>
                            )}
                            {appointment.cost && (
                              <p className="text-sm font-medium mt-2">
                                التكلفة: {formatCurrency(appointment.cost)}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="prescriptions">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      الوصفات الطبية
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {integratedData?.prescriptions.length === 0 ? (
                      <div className="text-center py-8">
                        <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                        <h3 className="text-lg font-medium mb-2">لا توجد وصفات</h3>
                        <p className="text-muted-foreground">لم يتم إنشاء أي وصفات طبية لهذا المريض بعد</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {integratedData?.prescriptions.map((prescription) => (
                          <div key={prescription.id} className="p-4 border rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium">وصفة طبية</h4>
                              <span className="text-sm text-muted-foreground">
                                {formatDate(prescription.prescription_date)}
                              </span>
                            </div>
                            {prescription.tooth_treatment && (
                              <p className="text-sm text-muted-foreground mb-2">
                                مرتبطة بعلاج السن رقم {prescription.tooth_treatment.tooth_number}
                              </p>
                            )}
                            {prescription.notes && (
                              <p className="text-sm">{prescription.notes}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="timeline">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      الجدول الزمني للعلاج
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {integratedData?.timeline.length === 0 ? (
                      <div className="text-center py-8">
                        <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                        <h3 className="text-lg font-medium mb-2">لا توجد أحداث</h3>
                        <p className="text-muted-foreground">سيتم إنشاء الجدول الزمني تلقائياً مع تقدم العلاج</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {integratedData?.timeline
                          .sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime())
                          .map((event) => (
                          <div key={event.id} className="flex items-start gap-3 p-4 border rounded-lg">
                            <div className={`w-3 h-3 rounded-full mt-2 ${
                              event.status === 'completed' ? 'bg-green-500' :
                              event.status === 'active' ? 'bg-blue-500' : 'bg-gray-400'
                            }`} />
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <h4 className="font-medium">{event.title}</h4>
                                <span className="text-sm text-muted-foreground">
                                  {formatDate(event.event_date)}
                                </span>
                              </div>
                              {event.description && (
                                <p className="text-sm text-muted-foreground">{event.description}</p>
                              )}
                              <Badge variant="outline" className="text-xs mt-2">
                                {event.timeline_type === 'appointment' ? 'موعد' :
                                 event.timeline_type === 'treatment' ? 'علاج' :
                                 event.timeline_type === 'prescription' ? 'وصفة' :
                                 event.timeline_type === 'lab_order' ? 'مختبر' :
                                 event.timeline_type === 'payment' ? 'دفعة' : 'ملاحظة'}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  )
}
