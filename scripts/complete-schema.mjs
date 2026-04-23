import Database from 'better-sqlite3';
import { resolve } from 'path';

const dbPath = resolve(process.cwd(), 'sfa.db');
const db = new Database(dbPath);

console.log('Completing database schema for integration...');

try {
  // 1. Add email to customers
  try {
    db.exec('ALTER TABLE customers ADD COLUMN email TEXT;');
    console.log('Added email to customers');
  } catch (e) {}

  // 2. Add notification_webhook to employees
  try {
    db.exec('ALTER TABLE employees ADD COLUMN notification_webhook TEXT;');
    console.log('Added notification_webhook to employees');
  } catch (e) {}

  // 3. Add columns to projects
  try {
    db.exec('ALTER TABLE projects ADD COLUMN notify_external INTEGER DEFAULT 0;');
    db.exec('ALTER TABLE projects ADD COLUMN notification_webhook TEXT;');
    db.exec('ALTER TABLE projects ADD COLUMN completed_at DATETIME;');
    console.log('Added columns to projects');
  } catch (e) {}

  // 4. Create mail_logs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS mail_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_name TEXT,
      from_email TEXT,
      subject TEXT,
      recipient_count INTEGER,
      body TEXT,
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('Ensured mail_logs table exists');

  // 5. Update tasks table (Add start_date and predecessor_id)
  // SQLite ALTER TABLE doesn't support multiple columns or complex changes easily, 
  // but adding columns is fine.
  try {
    db.exec('ALTER TABLE tasks ADD COLUMN start_date DATE;');
    console.log('Added start_date to tasks');
  } catch (e) {}

  try {
    db.exec('ALTER TABLE tasks ADD COLUMN predecessor_id INTEGER;');
    console.log('Added predecessor_id to tasks');
  } catch (e) {}

} catch (error) {
  console.error('Migration error:', error);
}

db.close();
console.log('Schema preparation completed.');
