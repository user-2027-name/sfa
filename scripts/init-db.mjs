import Database from 'better-sqlite3';
import { resolve } from 'path';

const dbPath = resolve(process.cwd(), 'sfa.db');
const db = new Database(dbPath);

console.log('Initializing database...');

db.exec(`
  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    contact TEXT,
    status TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    department TEXT,
    role TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    contract_type TEXT NOT NULL,
    status TEXT NOT NULL,
    amount INTEGER DEFAULT 0,
    order_date DATE,
    deadline DATE,
    sales_rep_id INTEGER,
    production_rep_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sales_rep_id) REFERENCES employees(id),
    FOREIGN KEY (production_rep_id) REFERENCES employees(id)
  );

  CREATE TABLE IF NOT EXISTS project_sequences (
    date TEXT,
    type TEXT,
    last_val INTEGER,
    PRIMARY KEY (date, type)
  );
`);

console.log('Database initialized successfully.');
db.close();
