import Database from 'better-sqlite3';
import { resolve } from 'path';

const dbPath = resolve(process.cwd(), 'sfa.db');
const db = new Database(dbPath);

console.log('Adding email column to employees table...');

try {
  db.exec('ALTER TABLE employees ADD COLUMN email TEXT;');
  console.log('Successfully added email to employees');
} catch (e) {
  if (e.message.includes('duplicate column name')) {
    console.log('Email column already exists.');
  } else {
    console.error('Migration error:', e.message);
  }
}

db.close();
console.log('Done.');
