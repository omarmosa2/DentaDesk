#!/usr/bin/env node

/**
 * اختبار سريع لنظام التنبيهات الذكية
 * يمكن تشغيله من سطر الأوامر لاختبار الوظائف الأساسية
 */

console.log('🔔 اختبار نظام التنبيهات الذكية');
console.log('=====================================');

// محاكاة بيانات الاختبار
const mockData = {
  appointments: [
    {
      id: 'apt_1',
      patient_id: 'patient_1',
      patient: { full_name: 'أحمد محمد' },
      start_time: new Date().toISOString(), // اليوم
      title: 'فحص دوري',
      status: 'scheduled'
    },
    {
      id: 'apt_2',
      patient_id: 'patient_2',
      patient: { full_name: 'فاطمة علي' },
      start_time: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // منذ يومين
      title: 'علاج عصب',
      status: 'scheduled'
    }
  ],
  
  payments: [
    {
      id: 'pay_1',
      patient_id: 'patient_1',
      patient: { full_name: 'أحمد محمد' },
      status: 'pending',
      remaining_balance: 150,
      payment_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      amount: 100
    },
    {
      id: 'pay_2',
      patient_id: 'patient_3',
      patient: { full_name: 'محمد حسن' },
      status: 'partial',
      remaining_balance: 75,
      payment_date: new Date().toISOString(),
      amount: 125
    }
  ],
  
  treatments: [
    {
      id: 'treat_1',
      patient_id: 'patient_2',
      patient: { full_name: 'فاطمة علي' },
      treatment_status: 'in_progress',
      treatment_type: 'تقويم',
      tooth_number: '12',
      created_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
      appointment_id: 'apt_2'
    }
  ],
  
  prescriptions: [
    {
      id: 'presc_1',
      patient_id: 'patient_1',
      patient: { full_name: 'أحمد محمد' },
      prescription_date: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
      notes: 'مضاد حيوي',
      appointment_id: 'apt_1'
    }
  ],
  
  inventory: [
    {
      id: 'inv_1',
      name: 'قفازات طبية',
      quantity: 2,
      min_quantity: 10,
      expiry_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'inv_2',
      name: 'مخدر موضعي',
      quantity: 0,
      min_quantity: 5,
      expiry_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    }
  ]
};

// دوال مساعدة
function isSameDay(date1, date2) {
  return date1.toDateString() === date2.toDateString();
}

function formatTime(dateString) {
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

// توليد تنبيهات المواعيد
function generateAppointmentAlerts() {
  const alerts = [];
  const today = new Date();
  
  mockData.appointments.forEach(appointment => {
    const appointmentDate = new Date(appointment.start_time);
    
    // تنبيه للمواعيد اليوم
    if (isSameDay(appointmentDate, today) && appointment.status === 'scheduled') {
      alerts.push({
        id: `appointment_today_${appointment.id}`,
        type: 'appointment',
        priority: 'high',
        title: `موعد اليوم - ${appointment.patient.full_name}`,
        description: `موعد مجدول اليوم في ${formatTime(appointment.start_time)} - ${appointment.title}`,
        patientName: appointment.patient.full_name,
        actionRequired: true,
        isRead: false,
        isDismissed: false
      });
    }
    
    // تنبيه للمواعيد المتأخرة
    if (appointmentDate < today && appointment.status === 'scheduled') {
      const daysLate = Math.floor((today.getTime() - appointmentDate.getTime()) / (1000 * 60 * 60 * 24));
      alerts.push({
        id: `appointment_overdue_${appointment.id}`,
        type: 'appointment',
        priority: 'high',
        title: `موعد متأخر - ${appointment.patient.full_name}`,
        description: `موعد متأخر منذ ${daysLate} يوم - ${appointment.title}`,
        patientName: appointment.patient.full_name,
        actionRequired: true,
        isRead: false,
        isDismissed: false
      });
    }
  });
  
  return alerts;
}

// توليد تنبيهات المدفوعات
function generatePaymentAlerts() {
  const alerts = [];
  const today = new Date();
  
  mockData.payments.forEach(payment => {
    if (payment.status === 'pending' && payment.remaining_balance > 0) {
      const paymentDate = new Date(payment.payment_date);
      const daysOverdue = Math.floor((today.getTime() - paymentDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysOverdue > 0) {
        alerts.push({
          id: `payment_overdue_${payment.id}`,
          type: 'payment',
          priority: daysOverdue > 7 ? 'high' : 'medium',
          title: `دفعة آجلة - ${payment.patient.full_name}`,
          description: `دفعة آجلة منذ ${daysOverdue} يوم - المبلغ: ${payment.remaining_balance}$`,
          patientName: payment.patient.full_name,
          actionRequired: true,
          isRead: false,
          isDismissed: false
        });
      }
    }
    
    if (payment.status === 'partial' && payment.remaining_balance > 0) {
      alerts.push({
        id: `payment_partial_${payment.id}`,
        type: 'payment',
        priority: 'medium',
        title: `دفعة جزئية - ${payment.patient.full_name}`,
        description: `تم دفع ${payment.amount}$ من أصل ${payment.amount + payment.remaining_balance}$ - المتبقي: ${payment.remaining_balance}$`,
        patientName: payment.patient.full_name,
        actionRequired: true,
        isRead: false,
        isDismissed: false
      });
    }
  });
  
  return alerts;
}

// توليد تنبيهات العلاجات
function generateTreatmentAlerts() {
  const alerts = [];
  const today = new Date();
  
  mockData.treatments.forEach(treatment => {
    if (treatment.treatment_status === 'in_progress') {
      const createdDate = new Date(treatment.created_at);
      const daysPending = Math.floor((today.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysPending > 14) {
        alerts.push({
          id: `treatment_pending_${treatment.id}`,
          type: 'treatment',
          priority: daysPending > 30 ? 'high' : 'medium',
          title: `علاج آجل - ${treatment.patient.full_name}`,
          description: `علاج ${treatment.treatment_type} للسن ${treatment.tooth_number} آجل منذ ${daysPending} يوم`,
          patientName: treatment.patient.full_name,
          actionRequired: true,
          isRead: false,
          isDismissed: false
        });
      }
    }
  });
  
  return alerts;
}

// توليد تنبيهات الوصفات
function generatePrescriptionAlerts() {
  const alerts = [];
  const today = new Date();
  
  mockData.prescriptions.forEach(prescription => {
    const prescriptionDate = new Date(prescription.prescription_date);
    const daysSince = Math.floor((today.getTime() - prescriptionDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSince > 30) {
      alerts.push({
        id: `prescription_old_${prescription.id}`,
        type: 'prescription',
        priority: 'medium',
        title: `وصفة قديمة - ${prescription.patient.full_name}`,
        description: `وصفة صادرة منذ ${daysSince} يوم - قد تحتاج تجديد`,
        patientName: prescription.patient.full_name,
        actionRequired: false,
        isRead: false,
        isDismissed: false
      });
    }
  });
  
  return alerts;
}

// توليد تنبيهات المخزون
function generateInventoryAlerts() {
  const alerts = [];
  const today = new Date();
  
  mockData.inventory.forEach(item => {
    // تنبيه للعناصر المنتهية الصلاحية
    if (item.expiry_date) {
      const expiryDate = new Date(item.expiry_date);
      const daysUntilExpiry = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilExpiry <= 30 && daysUntilExpiry >= 0) {
        alerts.push({
          id: `inventory_expiry_${item.id}`,
          type: 'inventory',
          priority: daysUntilExpiry <= 7 ? 'high' : 'medium',
          title: `انتهاء صلاحية قريب - ${item.name}`,
          description: `ينتهي في ${daysUntilExpiry} يوم - الكمية: ${item.quantity}`,
          actionRequired: true,
          isRead: false,
          isDismissed: false
        });
      } else if (daysUntilExpiry < 0) {
        alerts.push({
          id: `inventory_expired_${item.id}`,
          type: 'inventory',
          priority: 'high',
          title: `منتهي الصلاحية - ${item.name}`,
          description: `انتهت الصلاحية منذ ${Math.abs(daysUntilExpiry)} يوم - الكمية: ${item.quantity}`,
          actionRequired: true,
          isRead: false,
          isDismissed: false
        });
      }
    }
    
    // تنبيه للعناصر قليلة المخزون
    if (item.quantity <= item.min_quantity) {
      alerts.push({
        id: `inventory_low_${item.id}`,
        type: 'inventory',
        priority: item.quantity === 0 ? 'high' : 'medium',
        title: `مخزون منخفض - ${item.name}`,
        description: `الكمية المتبقية: ${item.quantity} - الحد الأدنى: ${item.min_quantity}`,
        actionRequired: true,
        isRead: false,
        isDismissed: false
      });
    }
  });
  
  return alerts;
}

// تشغيل الاختبار
function runTest() {
  console.log('\n📅 اختبار تنبيهات المواعيد...');
  const appointmentAlerts = generateAppointmentAlerts();
  console.log(`✅ تم توليد ${appointmentAlerts.length} تنبيه للمواعيد`);
  appointmentAlerts.forEach(alert => console.log(`   - ${alert.title}`));
  
  console.log('\n💰 اختبار تنبيهات المدفوعات...');
  const paymentAlerts = generatePaymentAlerts();
  console.log(`✅ تم توليد ${paymentAlerts.length} تنبيه للمدفوعات`);
  paymentAlerts.forEach(alert => console.log(`   - ${alert.title}`));
  
  console.log('\n🦷 اختبار تنبيهات العلاجات...');
  const treatmentAlerts = generateTreatmentAlerts();
  console.log(`✅ تم توليد ${treatmentAlerts.length} تنبيه للعلاجات`);
  treatmentAlerts.forEach(alert => console.log(`   - ${alert.title}`));
  
  console.log('\n💊 اختبار تنبيهات الوصفات...');
  const prescriptionAlerts = generatePrescriptionAlerts();
  console.log(`✅ تم توليد ${prescriptionAlerts.length} تنبيه للوصفات`);
  prescriptionAlerts.forEach(alert => console.log(`   - ${alert.title}`));
  
  console.log('\n📦 اختبار تنبيهات المخزون...');
  const inventoryAlerts = generateInventoryAlerts();
  console.log(`✅ تم توليد ${inventoryAlerts.length} تنبيه للمخزون`);
  inventoryAlerts.forEach(alert => console.log(`   - ${alert.title}`));
  
  // إجمالي التنبيهات
  const allAlerts = [
    ...appointmentAlerts,
    ...paymentAlerts,
    ...treatmentAlerts,
    ...prescriptionAlerts,
    ...inventoryAlerts
  ];
  
  console.log('\n📊 ملخص النتائج:');
  console.log(`📋 إجمالي التنبيهات: ${allAlerts.length}`);
  console.log(`🔴 عالية الأولوية: ${allAlerts.filter(a => a.priority === 'high').length}`);
  console.log(`🟡 متوسطة الأولوية: ${allAlerts.filter(a => a.priority === 'medium').length}`);
  console.log(`🔵 منخفضة الأولوية: ${allAlerts.filter(a => a.priority === 'low').length}`);
  console.log(`⚡ تحتاج إجراء: ${allAlerts.filter(a => a.actionRequired).length}`);
  
  console.log('\n✅ اكتمل اختبار نظام التنبيهات الذكية بنجاح!');
  console.log('🔗 لاختبار الواجهة، افتح: src/test/alerts-test.html');
}

// تشغيل الاختبار
runTest();
