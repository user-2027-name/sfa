import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET() {
  try {
    const history = await sql`SELECT * FROM mail_logs ORDER BY sent_at DESC LIMIT 50`;
    return NextResponse.json(history);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch mail history' }, { status: 500 });
  }
}
