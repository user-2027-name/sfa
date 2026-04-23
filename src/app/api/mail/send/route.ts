import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { recipients, subject, body, fromName, fromEmail, attachments } = await request.json();

    if (!recipients || !Array.isArray(recipients)) {
      return NextResponse.json({ error: 'Invalid recipients' }, { status: 400 });
    }

    // 1. Save to history summary
    await sql`
      INSERT INTO mail_logs (from_name, from_email, subject, recipient_count, body)
      VALUES (${fromName}, ${fromEmail}, ${subject}, ${recipients.length}, ${body})
    `;

    const timestamp = new Date().toLocaleString();
    console.log(`\n=== BULK MAIL PROCESS STARTED (${timestamp}) ===`);
    console.log(`FROM: ${fromName} <${fromEmail}>`);
    console.log(`Subject: ${subject}`);
    console.log(`Total Recipients: ${recipients.length}`);

    // Simulate sending individually with a delay
    for (const [index, person] of recipients.entries()) {
      const personalizedBody = body.replace(/{name}/g, `${person.name} 様`);
      console.log(`[${index + 1}/${recipients.length}] Sending TO: ${person.email} (${person.name})`);
      
      // Log individual recipient
      await sql`
        INSERT INTO mail_recipient_logs (customer_id, customer_name, recipient_email, subject)
        VALUES (${person.id || null}, ${person.name}, ${person.email}, ${subject})
      `;
      
      if (attachments && attachments.length > 0) {
        console.log(`   - Attachments: ${attachments.map((a: any) => a.name).join(', ')}`);
      }
      
      if (index < recipients.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`=== BULK MAIL PROCESS COMPLETED ===\n`);

    return NextResponse.json({ success: true, count: recipients.length });
  } catch (error) {
    console.error('Mail system error:', error);
    return NextResponse.json({ error: 'Mail processing failed' }, { status: 500 });
  }
}
