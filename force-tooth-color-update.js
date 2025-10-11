// دالة لإجبار تحديث ألوان الأسنان فوراً
// يمكن تشغيلها من console المتصفح

function forceToothColorUpdate() {
  console.log('🦷 إجبار تحديث ألوان الأسنان...')

  // إرسال حدث تحديث الألوان
  window.dispatchEvent(new CustomEvent('tooth-color-update', {
    detail: {
      type: 'force-refresh',
      timestamp: Date.now(),
      source: 'manual-console'
    }
  }))

  // إرسال حدث تحديث العلاجات
  window.dispatchEvent(new CustomEvent('treatment-updated', {
    detail: {
      type: 'force-refresh',
      timestamp: Date.now()
    }
  }))

  // إرسال حدث تحميل العلاجات
  window.dispatchEvent(new CustomEvent('treatments-loaded', {
    detail: {
      force: true,
      timestamp: Date.now()
    }
  }))

  // استدعاء دالة إعادة التحميل إذا كانت متوفرة
  if (window.forceToothColorUpdate) {
    window.forceToothColorUpdate()
  }

  console.log('🦷 تم إرسال أحداث التحديث')
}

// دالة لاختبار تحديث علاج معين
function testTreatmentUpdate(treatmentId, newStatus = 'completed') {
  console.log(`🦷 اختبار تحديث العلاج ${treatmentId} إلى ${newStatus}`)

  window.dispatchEvent(new CustomEvent('tooth-color-update', {
    detail: {
      type: 'status-changed',
      treatmentId: treatmentId,
      updates: { treatment_status: newStatus },
      timestamp: Date.now()
    }
  }))

  console.log('🦷 تم إرسال حدث تحديث العلاج')
}

// دالة لاختبار التحديث المباشر
async function testDirectUpdate(treatmentId, newStatus = 'completed') {
  console.log(`🦷 اختبار التحديث المباشر للعلاج ${treatmentId}`)

  try {
    if (window.electronAPI && window.electronAPI.toothTreatments) {
      await window.electronAPI.toothTreatments.update(treatmentId, {
        treatment_status: newStatus,
        completion_date: newStatus === 'completed' ? new Date().toISOString().split('T')[0] : null
      })
      console.log('🦷 تم التحديث المباشر بنجاح')
      forceToothColorUpdate()
    } else {
      console.error('🦷 electronAPI غير متوفر')
    }
  } catch (error) {
    console.error('🦷 خطأ في التحديث المباشر:', error)
  }
}

// تشغيل الدالة فوراً
forceToothColorUpdate()

// إضافة الدوال للنافذة للاستخدام المستقبلي
window.forceToothColorUpdate = forceToothColorUpdate
window.testTreatmentUpdate = testTreatmentUpdate
window.testDirectUpdate = testDirectUpdate

console.log('🦷 يمكنك الآن استخدام:')
console.log('  - forceToothColorUpdate() لإجبار التحديث')
console.log('  - testTreatmentUpdate("treatment-id", "completed") لاختبار علاج معين')
console.log('  - testDirectUpdate("treatment-id", "completed") للتحديث المباشر')
