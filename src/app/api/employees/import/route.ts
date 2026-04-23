import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }
    
    // postgres.js での一括挿入とON CONFLICT
    await sql`
      INSERT INTO employees ${sql(data, 'id', 'name', 'department', 'role', 'notification_webhook')}
      ON CONFLICT(id) DO UPDATE SET
        name = EXCLUDED.name,
        department = EXCLUDED.department,
        role = EXCLUDED.role,
        notification_webhook = EXCLUDED.notification_webhook
    `;

    return NextResponse.json({ success: true, count: data.length });
  } catch (error) {
    console.error('Employees import error:', error);
    return NextResponse.json({ error: 'Import failed' }, { status: 500 });
  }
}
