import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const customers = await sql`SELECT * FROM customers WHERE id = ${id}`;
      if (customers.length === 0) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
      return NextResponse.json(customers[0]);
    }

    const customers = await sql`
      SELECT c.*, 
             MAX(l.sent_at) as last_sent_at,
             (SELECT subject FROM mail_recipient_logs WHERE customer_id = c.id ORDER BY sent_at DESC LIMIT 1) as last_subject
      FROM customers c
      LEFT JOIN mail_recipient_logs l ON c.id = l.customer_id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `;
    return NextResponse.json(customers);
  } catch (error) {
    console.error('Fetch customers error:', error);
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, phone, email, status, customer_rep, address } = await request.json();
    const result = await sql`
      INSERT INTO customers (name, phone, email, status, customer_rep, address) 
      VALUES (${name}, ${phone}, ${email}, ${status}, ${customer_rep}, ${address})
      RETURNING id
    `;
    return NextResponse.json({ 
      id: result[0].id, 
      name, phone, email, status, customer_rep, address 
    });
  } catch (error) {
    console.error('Create customer error:', error);
    return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, name, phone, email, status, customer_rep, address } = await request.json();
    
    if (!id) return NextResponse.json({ error: 'Missing customer ID' }, { status: 400 });

    await sql`
      UPDATE customers SET
        name = COALESCE(${name || null}, name),
        phone = COALESCE(${phone || null}, phone),
        email = COALESCE(${email || null}, email),
        status = COALESCE(${status || null}, status),
        customer_rep = COALESCE(${customer_rep || null}, customer_rep),
        address = COALESCE(${address || null}, address)
      WHERE id = ${id}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update customer error:', error);
    return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'Missing customer ID' }, { status: 400 });

    await sql`DELETE FROM customers WHERE id = ${id}`;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Customer deletion error:', error);
    return NextResponse.json({ error: 'Failed to delete customer' }, { status: 500 });
  }
}
