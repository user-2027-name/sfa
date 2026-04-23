import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve(process.cwd(), 'sfa.db');
const db = new Database(dbPath);

try {
  db.prepare("ALTER TABLE projects ADD COLUMN status_negotiation_at TEXT").run();
  console.log("Added status_negotiation_at");
} catch (e) {
  console.log("status_negotiation_at already exists");
}

try {
  db.prepare("ALTER TABLE projects ADD COLUMN status_order_at TEXT").run();
  console.log("Added status_order_at");
} catch (e) {
  console.log("status_order_at already exists");
}

try {
  db.prepare("ALTER TABLE projects ADD COLUMN status_progress_at TEXT").run();
  console.log("Added status_progress_at");
} catch (e) {
  console.log("status_progress_at already exists");
}

try {
  db.prepare("ALTER TABLE projects ADD COLUMN status_done_at TEXT").run();
  console.log("Added status_done_at");
} catch (e) {
  console.log("status_done_at already exists");
}

db.prepare("UPDATE projects SET status_negotiation_at = date('now') WHERE status_negotiation_at IS NULL").run();

console.log("Database schema updated successfully.");
db.close();
