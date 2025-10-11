// Simple test to check database initialization
const { join } = require('path')
const { app } = require('electron')

console.log('🧪 Testing database service initialization...')

try {
  // Test the database service import
  const { DatabaseService } = require('./src/services/databaseService.js')
  console.log('✅ Database service imported successfully')

  // Test database path
  const dbPath = join(app.getPath('userData'), 'dental_clinic.db')
  console.log('📂 Database path:', dbPath)

  // Check if database file exists
  const fs = require('fs')
  if (fs.existsSync(dbPath)) {
    console.log('✅ Database file exists')
    const stats = fs.statSync(dbPath)
    console.log('📊 Database file size:', stats.size, 'bytes')
  } else {
    console.log('❌ Database file does not exist')
  }

  // Try to create database service instance
  const dbService = new DatabaseService()
  console.log('✅ Database service instance created')

  // Check tables
  const tables = dbService.db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all()
  console.log('📊 Tables in database:', tables.length)
  if (tables.length > 0) {
    console.log('📋 Table names:', tables.map(t => t.name).join(', '))
  } else {
    console.log('❌ No tables found in database')
  }

} catch (error) {
  console.error('❌ Database test failed:', error)
  console.error('Stack:', error.stack)
}

console.log('🧪 Database test completed')