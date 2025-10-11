// Test database service import and instantiation
console.log('🧪 Testing database service import...')

try {
  console.log('📦 Importing DatabaseService...')
  const { DatabaseService } = require('./src/services/databaseService.js')
  console.log('✅ DatabaseService imported successfully')

  // Create a temporary database in the current directory
  const tempDbPath = './test_temp.db'
  console.log('📂 Using temporary database path:', tempDbPath)

  // Clean up any existing database file first
  const fs = require('fs')
  if (fs.existsSync(tempDbPath)) {
    console.log('🧹 Cleaning up existing database file...')
    fs.unlinkSync(tempDbPath)
  }

  console.log('🏗️ Creating DatabaseService instance...')
  const dbService = new DatabaseService(tempDbPath)
  console.log('✅ DatabaseService instance created successfully')

  console.log('📊 Checking database tables...')
  const tables = dbService.db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all()
  console.log('📋 Tables found:', tables.length)
  if (tables.length > 0) {
    console.log('Table names:', tables.map(t => t.name).join(', '))
    // Show table structure for debugging
    tables.forEach(table => {
      try {
        const columns = dbService.db.prepare(`PRAGMA table_info(${table.name})`).all()
        console.log(`📋 ${table.name}: ${columns.length} columns`)
      } catch (error) {
        console.log(`⚠️ Could not get structure for ${table.name}:`, error.message)
      }
    })
  }

  // Clean up
  console.log('🧹 Cleaning up temporary database...')
  if (fs.existsSync(tempDbPath)) {
    fs.unlinkSync(tempDbPath)
    console.log('✅ Temporary database file removed')
  }

  console.log('✅ Database service test completed successfully')

} catch (error) {
  console.error('❌ Database service test failed:', error)
  console.error('Error message:', error.message)
  console.error('Stack trace:', error.stack)
}

console.log('🧪 Database service import test finished')