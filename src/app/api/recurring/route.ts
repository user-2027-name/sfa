import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { sendNotification } from '@/lib/notifier';

export async function POST() {
  try {
    const today = new Date();
    const currentMonthStr = today.toISOString().slice(0, 7); // YYYY-MM
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const nextMonthStr = nextMonth.toISOString().slice(0, 7);
    const nextMonthLastDay = new Date(today.getFullYear(), today.getMonth() + 2, 0).toISOString().slice(0, 10);

    // Find all '月額定額' projects
    const projects = await sql`
      SELECT * FROM projects 
      WHERE contract_type = '月額定額' 
      AND (recurring_last_processed IS NULL OR recurring_last_processed < ${currentMonthStr})
    `;

    let processedCount = 0;

    await sql.begin(async (sql) => {
      for (const project of projects) {
        const tasks = [
          { name: '制作 (定期)', due: nextMonthLastDay },
          { name: '納品 (定期)', due: nextMonthLastDay }
        ];

        for (const t of tasks) {
          await sql`
            INSERT INTO tasks (project_id, name, due_date, status, order_index)
            VALUES (${project.id}, ${t.name}, ${t.due}, '未着手', 99)
          `;
        }

        await sql`UPDATE projects SET recurring_last_processed = ${currentMonthStr} WHERE id = ${project.id}`;
        
        if (project.notify_external) {
          await sendNotification(project.id, `翌月 (${nextMonthStr}) のリカーリングタスク（制作・納品）を自動生成しました。`, project.notification_webhook);
        }

        processedCount++;
      }
    });

    return NextResponse.json({ success: true, processedCount });
  } catch (error) {
    console.error('Recurring error:', error);
    return NextResponse.json({ error: 'Failed to process recurring tasks' }, { status: 500 });
  }
}
