// Debug script to check payment data
const { app, BrowserWindow } = require('electron')
const path = require('path')
const Database = require('better-sqlite3')

// Initialize database
const dbPath = path.join(__dirname, 'dental_clinic.db')
const db = new Database(dbPath)

console.log('=== PAYMENT DATA DEBUG ===')

try {
  // Get all payments
  const payments = db.prepare('SELECT * FROM payments ORDER BY payment_date DESC').all()
  
  console.log(`Total payments in database: ${payments.length}`)
  
  if (payments.length > 0) {
    console.log('\n=== SAMPLE PAYMENTS ===')
    payments.slice(0, 5).forEach((payment, index) => {
      console.log(`Payment ${index + 1}:`)
      console.log(`  ID: ${payment.id}`)
      console.log(`  Amount: ${payment.amount}`)
      console.log(`  Status: ${payment.status}`)
      console.log(`  Date: ${payment.payment_date}`)
      console.log(`  Patient ID: ${payment.patient_id}`)
      console.log(`  Amount Paid: ${payment.amount_paid || 'N/A'}`)
      console.log(`  Total Amount: ${payment.total_amount || 'N/A'}`)
      console.log('  ---')
    })
    
    console.log('\n=== MONTHLY REVENUE CALCULATION ===')
    const monthlyRevenue = {}
    
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
    
    console.log('\n=== FINAL MONTHLY REVENUE ===')
    Object.entries(monthlyRevenue).forEach(([month, revenue]) => {
      console.log(`${month}: $${revenue}`)
    })
    
    console.log('\n=== TOTAL REVENUE ===')
    const totalRevenue = payments
      .filter(p => p.status === 'completed' || p.status === 'partial')
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
    
    console.log(`Total Revenue: $${totalRevenue}`)
    
    console.log('\n=== STATUS BREAKDOWN ===')
    const statusCounts = {}
    payments.forEach(p => {
      statusCounts[p.status] = (statusCounts[p.status] || 0) + 1
    })
    console.log(statusCounts)
  }
  
} catch (error) {
  console.error('Error:', error)
} finally {
  db.close()
}
