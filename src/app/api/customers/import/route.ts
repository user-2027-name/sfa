import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }
    
    await sql`
      INSERT INTO customers ${sql(data, 'id', 'name', 'status')}
      ON CONFLICT(id) DO UPDATE SET
        name = EXCLUDED.name,
        status = EXCLUDED.status
    `;

    return NextResponse.json({ success: true, count: data.length });
  } catch (error) {
    console.error('Customers import error:', error);
    return NextResponse.json({ error: 'Import failed' }, { status: 500 });
  }
}
