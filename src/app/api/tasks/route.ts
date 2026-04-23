import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { sendNotification } from '@/lib/notifier';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');
  
  if (!projectId) return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });

  try {
    const tasks = await sql`
      SELECT * FROM tasks 
      WHERE project_id = ${projectId} 
      ORDER BY order_index ASC, created_at ASC
    `;
    return NextResponse.json(tasks);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { project_id, name, start_date, due_date, predecessor_id } = await request.json();
    
    if (!project_id || !name) {
      return NextResponse.json({ error: '必須項目（project_id, name）が不足しています' }, { status: 400 });
    }
    
    const projects = await sql`SELECT order_date FROM projects WHERE id = ${project_id}`;
    const project = projects[0];
    if (project && (due_date < project.order_date || (start_date && start_date < project.order_date))) {
      return NextResponse.json({ error: '受注日より前の日付は設定できません' }, { status: 400 });
    }

    const maxResults = await sql`SELECT MAX(order_index) as max_idx FROM tasks WHERE project_id = ${project_id}`;
    const nextIndex = (maxResults[0].max_idx || 0) + 1;

    const result = await sql`
      INSERT INTO tasks (project_id, name, start_date, due_date, status, order_index, predecessor_id)
      VALUES (${project_id}, ${name}, ${start_date || null}, ${due_date}, '未着手', ${nextIndex}, ${predecessor_id || null})
      RETURNING id
    `;

    return NextResponse.json({ id: result[0].id, name, start_date, due_date });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, status, completed_at, due_date, start_date, predecessor_id } = body;
    
    if (!id) return NextResponse.json({ error: 'IDは必須です' }, { status: 400 });
    
    const currentTasks = await sql`SELECT * FROM tasks WHERE id = ${id}`;
    if (currentTasks.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const currentTask = currentTasks[0];

    let finalCompletedAt = completed_at;
    if (status === '完了' && !completed_at) {
      finalCompletedAt = new Date().toISOString();
    } else if (status && status !== '完了') {
      finalCompletedAt = null;
    }

    if (due_date && due_date !== currentTask.due_date) {
      const diffTime = new Date(due_date).getTime() - new Date(currentTask.due_date).getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays !== 0) {
        await adjustSubsequentTasks(id, diffDays);
      }
    }

    await sql`
      UPDATE tasks 
      SET status = COALESCE(${status || null}, status), 
          completed_at = ${finalCompletedAt}, 
          due_date = COALESCE(${due_date || null}, due_date),
          start_date = COALESCE(${start_date || null}, start_date),
          predecessor_id = COALESCE(${predecessor_id || null}, predecessor_id)
      WHERE id = ${id}
    `;

    if (status && status !== currentTask.status) {
      const projects = await sql`
        SELECT name, notify_external, sales_webhook, production_webhook 
        FROM projects 
        WHERE id = ${currentTask.project_id}
      `;
      const project = projects[0];

      if (project && project.notify_external) {
        const msg = `【${project.name}】工程「${currentTask.name}」➔ ${status}`;
        const sharedWebhookRows = await sql`SELECT value FROM system_settings WHERE key = 'shared_webhook_url'`;
        const sharedWebhook = process.env.SHARED_WEBHOOK_URL || sharedWebhookRows[0]?.value;

        if (sharedWebhook) {
          await sendNotification(currentTask.project_id, msg, sharedWebhook);
        } else {
          if (project.sales_webhook) await sendNotification(currentTask.project_id, `[営業連絡] ${msg}`, project.sales_webhook);
          if (project.production_webhook) await sendNotification(currentTask.project_id, `[制作連絡] ${msg}`, project.production_webhook);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

async function adjustSubsequentTasks(predecessorId: number, diffDays: number) {
  const successors = await sql`SELECT * FROM tasks WHERE predecessor_id = ${predecessorId}`;
  
  for (const task of successors) {
    const newStart = shiftDate(task.start_date, diffDays);
    const newDue = shiftDate(task.due_date, diffDays);
    
    await sql`UPDATE tasks SET start_date = ${newStart}, due_date = ${newDue} WHERE id = ${task.id}`;
    await adjustSubsequentTasks(task.id, diffDays);
  }
}

function shiftDate(dateStr: string | null, days: number): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  try {
    await sql`DELETE FROM tasks WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
