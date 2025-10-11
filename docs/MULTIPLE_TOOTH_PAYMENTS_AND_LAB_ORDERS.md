# تحديث ميزة التحديد المتعدد للأسنان - الدفعات وطلبات المختبر

## نظرة عامة

تم تحديث ميزة التحديد المتعدد للأسنان لتعمل بنفس طريقة إضافة العلاج المفرد تماماً، بحيث تشمل:

1. **إنشاء دفعات آجلة تلقائياً** لكل علاج له تكلفة
2. **إنشاء طلبات مختبر تلقائياً** للتعويضات التي تحتوي على معلومات مختبر

## التحديثات المضافة

### 🔄 التدفق الجديد للمعالجة

```typescript
// لكل سن محدد:
1. إنشاء العلاج
2. إنشاء دفعة آجلة (إذا كانت التكلفة > 0)
3. إنشاء طلب مختبر (للتعويضات مع بيانات مختبر)
```

### 💰 إنشاء الدفعات الآجلة

```typescript
const createPendingPaymentForTreatment = async (treatmentId: string, toothNumber: number) => {
  const paymentData = {
    patient_id: patientId,
    tooth_treatment_id: treatmentId, // ربط مباشر بالعلاج
    amount: 0, // مبلغ مدفوع = 0 لجعل الحالة آجلة
    payment_method: 'cash' as const,
    payment_date: new Date().toISOString().split('T')[0],
    description: `${treatmentTypeInfo?.label} - السن ${toothNumber}`,
    status: 'pending' as const,
    notes: `دفعة آجلة للمريض: ${patient.full_name} - السن: ${toothNumber}`,
    total_amount_due: treatmentData.cost,
    amount_paid: 0,
    remaining_balance: treatmentData.cost,
    treatment_total_cost: treatmentData.cost,
    treatment_total_paid: 0,
    treatment_remaining_balance: treatmentData.cost
  }

  await createPayment(paymentData)
}
```

### 🧪 إنشاء طلبات المختبر

```typescript
const createLabOrderForTreatment = async (treatmentId: string, toothNumber: number) => {
  const labOrderData = {
    lab_id: selectedLab,
    patient_id: patientId,
    tooth_treatment_id: treatmentId,
    tooth_number: toothNumber,
    service_name: `${treatmentType?.label} - السن ${toothNumber}`,
    cost: labCost,
    order_date: new Date().toISOString().split('T')[0],
    status: 'آجل' as const,
    notes: `طلب مخبر للمريض: ${patient.full_name} - السن: ${toothNumber}`,
    paid_amount: 0,
    remaining_balance: labCost
  }

  await createLabOrder(labOrderData)
}
```

### 🔄 المعالجة المحدثة

```typescript
const handleSubmit = async () => {
  let successCount = 0
  let paymentSuccessCount = 0
  let labOrderSuccessCount = 0

  // معالجة كل سن على حدة
  for (const toothNumber of selectedTeeth) {
    try {
      // الخطوة 1: إنشاء العلاج
      const createdTreatments = await onAddTreatments([treatmentToCreate])
      const treatmentId = createdTreatments[0].id
      successCount++

      // الخطوة 2: إنشاء دفعة آجلة إذا تم تعبئة التكلفة
      if (treatmentData.cost && treatmentData.cost > 0) {
        await createPendingPaymentForTreatment(treatmentId, toothNumber)
        paymentSuccessCount++
      }

      // الخطوة 3: إنشاء طلب مختبر للتعويضات
      if (treatmentData.treatment_category === 'التعويضات' && selectedLab && labCost > 0) {
        await createLabOrderForTreatment(treatmentId, toothNumber)
        labOrderSuccessCount++
      }

    } catch (toothError) {
      notify.error(`فشل في معالجة السن ${toothNumber}`)
    }
  }

  // رسائل النجاح الشاملة
  let successMessage = `تم إضافة العلاج بنجاح لـ ${successCount} سن`
  if (paymentSuccessCount > 0) {
    successMessage += ` مع ${paymentSuccessCount} دفعة آجلة`
  }
  if (labOrderSuccessCount > 0) {
    successMessage += ` و ${labOrderSuccessCount} طلب مختبر`
  }
  notify.success(successMessage)
}
```

## الميزات المضافة

### ✅ الدفعات التلقائية
- **إنشاء تلقائي**: دفعة آجلة لكل علاج له تكلفة
- **ربط مباشر**: كل دفعة مربوطة بمعرف العلاج
- **حالة آجلة**: المبلغ المدفوع = 0، الحالة = آجل
- **تفاصيل كاملة**: جميع الحقول المطلوبة للدفعة

### 🧪 طلبات المختبر التلقائية
- **للتعويضات فقط**: يتم إنشاء طلب مختبر للتعويضات
- **شروط الإنشاء**: وجود مختبر محدد وتكلفة مختبر
- **ربط بالعلاج**: كل طلب مربوط بمعرف العلاج
- **حالة آجلة**: المبلغ المدفوع = 0، الحالة = آجل

### 📊 تقارير مفصلة
- **عداد النجاح**: عدد العلاجات المنشأة بنجاح
- **عداد الدفعات**: عدد الدفعات المنشأة
- **عداد طلبات المختبر**: عدد طلبات المختبر المنشأة
- **رسائل شاملة**: تقرير واحد يشمل جميع العمليات

## معالجة الأخطاء

### 🛡️ معالجة فردية لكل سن
```typescript
// إذا فشل علاج سن واحد، لا يؤثر على باقي الأسنان
for (const toothNumber of selectedTeeth) {
  try {
    // معالجة السن
  } catch (toothError) {
    // تسجيل الخطأ والمتابعة للسن التالي
    notify.error(`فشل في معالجة السن ${toothNumber}`)
  }
}
```

### ⚠️ تحذيرات مفيدة
- **فشل الدفعة**: "تم إنشاء العلاج ولكن فشل في إنشاء الدفعة"
- **فشل المختبر**: "تم إنشاء العلاج والدفعة ولكن فشل في إنشاء طلب المختبر"
- **معالجة جزئية**: "تم معالجة X من أصل Y أسنان بنجاح"

## التحديثات التقنية

### 🔧 الملفات المحدثة

1. **`MultipleToothTreatmentDialog.tsx`**
   - إضافة stores للدفعات وطلبات المختبر
   - دوال إنشاء الدفعات وطلبات المختبر
   - معالجة فردية لكل سن

2. **`DentalTreatments.tsx`**
   - تحديث `handleAddMultipleTreatments` لإرجاع العلاجات المنشأة
   - دعم العمليات المتسلسلة

### 📦 Dependencies المضافة
```typescript
import { usePaymentStore } from '@/store/paymentStore'
import { useLabOrderStore } from '@/store/labOrderStore'
import { usePatientStore } from '@/store/patientStore'
```

## النتيجة النهائية

الآن عند استخدام ميزة التحديد المتعدد للأسنان:

1. **يتم إنشاء العلاج** لكل سن محدد
2. **تُنشأ دفعة آجلة تلقائياً** إذا كان للعلاج تكلفة
3. **يُنشأ طلب مختبر تلقائياً** للتعويضات مع بيانات مختبر
4. **تظهر رسالة شاملة** تلخص جميع العمليات المنجزة

**الميزة تعمل الآن بنفس طريقة إضافة العلاج المفرد تماماً! 🎉**
