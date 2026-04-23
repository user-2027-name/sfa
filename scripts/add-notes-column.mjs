import Database from 'better-sqlite3';
import { resolve } from 'path';

const dbPath = resolve(process.cwd(), 'sfa.db');
const db = new Database(dbPath);

console.log('Adding notes column to projects table...');

try {
  db.exec('ALTER TABLE projects ADD COLUMN notes TEXT;');
  console.log('Notes column added successfully.');
} catch (error) {
  if (error.message.includes('duplicate column name')) {
    console.log('Notes column already exists.');
  } else {
    console.error('Failed to add notes column:', error);
  }
} finally {
  db.close();
}
