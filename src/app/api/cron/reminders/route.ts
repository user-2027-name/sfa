import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { sendNotification } from '@/lib/notifier';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    
    if (key !== process.env.CRON_SECRET) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 2); // 2 days later
    const targetStr = targetDate.toISOString().split('T')[0];

    console.log(`[Cron] Checking reminders for deadline: ${targetStr}`);

    let notificationCount = 0;

    const upcomingProjects = await sql`
      SELECT * FROM projects 
      WHERE deadline = ${targetStr} 
      AND status NOT IN ('完了', '失注') 
      AND (notify_external = 1 OR notify_external = true)
    `;

    for (const project of upcomingProjects) {
      const msg = `【納期アラート】案件「${project.name}」の納期があと2日（${targetStr}）に迫っています！`;
      if (project.sales_webhook) await sendNotification(project.id, `[営業アラート] ${msg}`, project.sales_webhook);
      if (project.production_webhook) await sendNotification(project.id, `[制作アラート] ${msg}`, project.production_webhook);
      notificationCount++;
    }

    const upcomingTasks = await sql`
      SELECT t.*, p.name as project_name, p.sales_webhook, p.production_webhook, p.notify_external
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      WHERE t.due_date = ${targetStr} 
      AND t.status != '完了' 
      AND (p.notify_external = 1 OR p.notify_external = true)
    `;

    for (const task of upcomingTasks) {
      const msg = `【期限アラート】案件「${task.project_name}」内の工程「${task.name}」が2日後（${targetStr}）に期限を迎えます。`;
      if (task.sales_webhook) await sendNotification(task.project_id, `[営業連絡] ${msg}`, task.sales_webhook);
      if (task.production_webhook) await sendNotification(task.project_id, `[制作連絡] ${msg}`, task.production_webhook);
      notificationCount++;
    }

    return NextResponse.json({ 
      success: true, 
      processed_at: new Date().toISOString(),
      target_date: targetStr,
      notifications_sent: notificationCount 
    });
  } catch (error) {
    console.error('Cron error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
