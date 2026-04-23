import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve(process.cwd(), 'sfa.db');
const db = new Database(dbPath);

console.log('--- Database Migration Started ---');

try {
  // Create table for individual recipient history
  db.prepare(`
    CREATE TABLE IF NOT EXISTS mail_recipient_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER,
      customer_name TEXT,
      recipient_email TEXT,
      subject TEXT,
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
  
  console.log('- Table "mail_recipient_logs" created or already exists.');
  console.log('--- Migration Completed Successfully ---');
} catch (error) {
  console.error('Migration failed:', error);
} finally {
  db.close();
}
