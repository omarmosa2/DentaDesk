import React, { useEffect, useState } from 'react'
import { usePaymentStore } from '../../store/paymentStore'

export default function PaymentDebug() {
  const { payments, loadPayments } = usePaymentStore()
  const [debugInfo, setDebugInfo] = useState<any>(null)

  useEffect(() => {
    loadPayments()
  }, [loadPayments])

  useEffect(() => {
    if (payments.length > 0) {
      console.log('=== PAYMENT DEBUG INFO ===')
      console.log('Total payments:', payments.length)
      console.log('Sample payments:', payments.slice(0, 3))
      
      // Calculate monthly revenue
      const monthlyRevenue: { [key: string]: number } = {}
      
      payments
        .filter(p => p.status === 'completed' || p.status === 'partial')
        .forEach(payment => {
          const paymentDate = new Date(payment.payment_date)
          if (!isNaN(paymentDate.getTime())) {
            const month = paymentDate.toISOString().slice(0, 7) // YYYY-MM
            const amount = Number(payment.amount) || 0
            
            monthlyRevenue[month] = (monthlyRevenue[month] || 0) + amount
            
            console.log(`Payment ${payment.id}: ${payment.payment_date} -> ${month} -> +${amount} = ${monthlyRevenue[month]}`)
          }
        })
      
      console.log('Monthly revenue:', monthlyRevenue)
      
      // Calculate total revenue
      const totalRevenue = payments
        .filter(p => p.status === 'completed' || p.status === 'partial')
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
      
      console.log('Total revenue:', totalRevenue)
      
      // Status breakdown
      const statusCounts: { [key: string]: number } = {}
      payments.forEach(p => {
        statusCounts[p.status] = (statusCounts[p.status] || 0) + 1
      })
      
      console.log('Status breakdown:', statusCounts)
      
      setDebugInfo({
        totalPayments: payments.length,
        monthlyRevenue,
        totalRevenue,
        statusCounts,
        samplePayments: payments.slice(0, 5).map(p => ({
          id: p.id,
          amount: p.amount,
          status: p.status,
          date: p.payment_date,
          amount_paid: p.amount_paid
        }))
      })
    }
  }, [payments])

  if (!debugInfo) {
    return <div>Loading debug info...</div>
  }

  return (
    <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
      <h3 className="text-lg font-bold mb-4">Payment Debug Info</h3>
      
      <div className="space-y-4">
        <div>
          <strong>Total Payments:</strong> {debugInfo.totalPayments}
        </div>
        
        <div>
          <strong>Total Revenue:</strong> ${debugInfo.totalRevenue}
        </div>
        
        <div>
          <strong>Status Breakdown:</strong>
          <pre className="bg-gray-200 dark:bg-gray-700 p-2 rounded mt-2">
            {JSON.stringify(debugInfo.statusCounts, null, 2)}
          </pre>
        </div>
        
        <div>
          <strong>Monthly Revenue:</strong>
          <pre className="bg-gray-200 dark:bg-gray-700 p-2 rounded mt-2">
            {JSON.stringify(debugInfo.monthlyRevenue, null, 2)}
          </pre>
        </div>
        
        <div>
          <strong>Sample Payments:</strong>
          <pre className="bg-gray-200 dark:bg-gray-700 p-2 rounded mt-2 text-xs">
            {JSON.stringify(debugInfo.samplePayments, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  )
}
