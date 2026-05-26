import postgres from 'postgres';

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('Error: POSTGRES_URL or DATABASE_URL environment variable is not set.');
  process.exit(1);
}

const sql = postgres(connectionString, { ssl: 'require' });

async function run() {
  console.log('Running PostgreSQL schema migrations...');
  try {
    // customers テーブルに position カラムを追加
    await sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS position TEXT;`;
    console.log('Added "position" column to customers table.');

    // customers テーブルに postal_code カラムを追加
    await sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS postal_code TEXT;`;
    console.log('Added "postal_code" column to customers table.');

    // projects テーブルに discussion_date カラムを追加
    await sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS discussion_date DATE;`;
    console.log('Added "discussion_date" column to projects table.');

    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

run();
