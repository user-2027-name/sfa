import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET() {
  try {
    const employees = await sql`SELECT * FROM employees ORDER BY created_at DESC`;
    return NextResponse.json(employees);
  } catch (error) {
    console.error('Fetch employees error:', error);
    return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, department, role, notification_webhook, email } = await request.json();
    
    // バリデーション
    if (!name || !department) {
      return NextResponse.json({ error: '名前と部署は必須です' }, { status: 400 });
    }
    if (name.length > 100 || (email && email.length > 255)) {
      return NextResponse.json({ error: '入力値が長すぎます' }, { status: 400 });
    }

    const result = await sql`
      INSERT INTO employees (name, department, role, notification_webhook, email) 
      VALUES (${name}, ${department}, ${role}, ${notification_webhook}, ${email})
      RETURNING id
    `;
    
    return NextResponse.json({ 
      id: result[0].id, 
      name, 
      department, 
      role, 
      notification_webhook, 
      email 
    });
  } catch (error) {
    console.error('Create employee error:', error);
    return NextResponse.json({ error: 'Failed to create employee' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, name, department, role, notification_webhook, email } = await request.json();
    if (!id) return NextResponse.json({ error: 'Missing employee ID' }, { status: 400 });

    await sql`
      UPDATE employees SET
        name = COALESCE(${name || null}, name),
        department = COALESCE(${department || null}, department),
        role = COALESCE(${role || null}, role),
        notification_webhook = COALESCE(${notification_webhook || null}, notification_webhook),
        email = COALESCE(${email || null}, email)
      WHERE id = ${id}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update employee error:', error);
    return NextResponse.json({ error: 'Failed to update employee' }, { status: 500 });
  }
}
