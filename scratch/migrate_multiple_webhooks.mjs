import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve(process.cwd(), 'sfa.db');
const db = new Database(dbPath);

console.log('--- Database Migration: Multiple Webhooks ---');

try {
  // Add columns for individual webhooks
  db.prepare("ALTER TABLE projects ADD COLUMN sales_webhook TEXT").run();
  db.prepare("ALTER TABLE projects ADD COLUMN production_webhook TEXT").run();
  
  // Migration of existing data: Copy current notification_webhook to sales_webhook as a fallback
  db.prepare("UPDATE projects SET sales_webhook = notification_webhook").run();
  
  console.log('- Columns "sales_webhook" and "production_webhook" added.');
  console.log('- Existing notification_webhook data migrated to sales_webhook.');
  console.log('--- Migration Completed Successfully ---');
} catch (error) {
  if (error.message.includes('duplicate column name')) {
    console.log('- Columns already exist, skipping.');
  } else {
    console.error('Migration failed:', error);
  }
} finally {
  db.close();
}
