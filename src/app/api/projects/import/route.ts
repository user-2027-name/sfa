import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function POST(request: Request) {
  try {
    const data = await request.json(); // Array of project objects
    
    if (!Array.isArray(data)) {
      return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
    }

    const validData = data.filter(item => 
      item && typeof item === 'object' && 
      item.id && item.id.trim() !== '' && 
      item.name && item.name.trim() !== '' &&
      item.name.length <= 500
    );

    if (validData.length === 0) {
      return NextResponse.json({ success: true, count: 0, total: data.length });
    }

    await sql`
      INSERT INTO projects ${sql(validData, 'id', 'name', 'contract_type', 'status', 'amount', 'order_date', 'deadline')}
      ON CONFLICT(id) DO UPDATE SET
        name = EXCLUDED.name,
        contract_type = EXCLUDED.contract_type,
        status = EXCLUDED.status,
        amount = EXCLUDED.amount,
        order_date = EXCLUDED.order_date,
        deadline = EXCLUDED.deadline
    `;

    return NextResponse.json({ success: true, count: validData.length, total: data.length });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({ error: 'Import failed' }, { status: 500 });
  }
}
