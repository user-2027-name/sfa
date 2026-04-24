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
    if (!name) {
      return NextResponse.json({ error: '名前は必須です' }, { status: 400 });
    }
    if (name.length > 100 || (email && email.length > 255)) {
      return NextResponse.json({ error: '入力値が長すぎます' }, { status: 400 });
    }

    const result = await sql`
      INSERT INTO employees (name, department, role, notification_webhook, email) 
      VALUES (${name}, ${department || null}, ${role}, ${notification_webhook || null}, ${email || null})
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
        name = ${name},
        department = ${department || null},
        role = ${role},
        notification_webhook = ${notification_webhook || null},
        email = ${email || null}
      WHERE id = ${id}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update employee error:', error);
    return NextResponse.json({ error: 'Failed to update employee' }, { status: 500 });
  }
}
