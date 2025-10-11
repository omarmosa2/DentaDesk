/**
 * Test utility for real-time updates
 * This file helps test and debug real-time update functionality
 */

export const testRealTimeUpdates = () => {
  console.log('🧪 Testing Real-Time Updates...')

  // Test inventory events
  console.log('📦 Testing inventory events...')
  window.dispatchEvent(new CustomEvent('inventory-changed', {
    detail: {
      type: 'test',
      itemId: 'test-item',
      item: { id: 'test-item', name: 'Test Item' }
    }
  }))

  window.dispatchEvent(new CustomEvent('inventory-added', {
    detail: {
      type: 'test',
      itemId: 'test-item',
      item: { id: 'test-item', name: 'Test Item' }
    }
  }))

  // Test payment events
  console.log('💰 Testing payment events...')
  window.dispatchEvent(new CustomEvent('payment-changed', {
    detail: {
      type: 'test',
      paymentId: 'test-payment',
      payment: { id: 'test-payment', amount: 100 }
    }
  }))

  window.dispatchEvent(new CustomEvent('payment-added', {
    detail: {
      type: 'test',
      paymentId: 'test-payment',
      payment: { id: 'test-payment', amount: 100 }
    }
  }))

  // Test patient events
  console.log('👥 Testing patient events...')
  window.dispatchEvent(new CustomEvent('patient-changed', {
    detail: {
      type: 'test',
      patientId: 'test-patient',
      patient: { id: 'test-patient', name: 'Test Patient' }
    }
  }))

  // Test appointment events
  console.log('📅 Testing appointment events...')
  window.dispatchEvent(new CustomEvent('appointment-changed', {
    detail: {
      type: 'test',
      appointmentId: 'test-appointment',
      appointment: { id: 'test-appointment', title: 'Test Appointment' }
    }
  }))

  console.log('✅ Real-time update tests completed!')
}

export const logEventListeners = () => {
  console.log('🔍 Checking event listeners...')
  
  const events = [
    'inventory-changed',
    'inventory-added', 
    'inventory-updated',
    'inventory-deleted',
    'payment-changed',
    'payment-added',
    'payment-updated', 
    'payment-deleted',
    'patient-changed',
    'patient-added',
    'patient-updated',
    'patient-deleted',
    'appointment-changed',
    'appointment-added',
    'appointment-updated',
    'appointment-deleted'
  ]

  events.forEach(eventType => {
    console.log(`📡 Event: ${eventType}`)
  })
}

// Add to window for debugging
if (typeof window !== 'undefined') {
  (window as any).testRealTimeUpdates = testRealTimeUpdates
  (window as any).logEventListeners = logEventListeners
}
