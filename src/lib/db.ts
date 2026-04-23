import postgres from 'postgres';

// Supabase / Vercel Postgres 用の設定
// 環境変数 POSTGRES_URL または DATABASE_URL を使用します
const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL or POSTGRES_URL environment variable is not set');
}

const sql = postgres(connectionString, {
  ssl: 'require',
  // Vercel/Supabase などのサーバーレス環境では、コネクションの維持時間を短く設定することが推奨されます
  max: 10,
  idle_timeout: 20,
  connect_timeout: 30,
});

export default sql;
