const Database = require('better-sqlite3');
const db = new Database('./test_temp.db');

console.log('=== Database Contents Check ===');
console.log('Tables:');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log(tables.map(t => t.name));

if (tables.length > 0) {
  console.log('\n=== Table Details ===');
  tables.forEach(table => {
    const columns = db.prepare(`PRAGMA table_info(${table.name})`).all();
    console.log(`\n${table.name} (${columns.length} columns):`);
    columns.forEach(col => {
      console.log(`  - ${col.name} (${col.type})`);
    });
  });
}

db.close();