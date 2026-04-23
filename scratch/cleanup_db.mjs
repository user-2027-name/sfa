import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve(process.cwd(), 'sfa.db');
const db = new Database(dbPath);

console.log('--- Database Cleanup Started ---');

try {
  // 1. Delete tasks associated with empty project IDs
  const taskRes = db.prepare("DELETE FROM tasks WHERE project_id IS NULL OR TRIM(project_id) = ''").run();
  console.log(`- Removed ${taskRes.changes} orphaned tasks.`);

  // 2. Delete projects with empty IDs
  const projectRes = db.prepare("DELETE FROM projects WHERE id IS NULL OR TRIM(id) = ''").run();
  console.log(`- Removed ${projectRes.changes} invalid projects.`);

  console.log('--- Cleanup Completed Successfully ---');
} catch (error) {
  console.error('Cleanup failed:', error);
} finally {
  db.close();
}
