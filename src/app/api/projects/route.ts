import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { sendNotification } from '@/lib/notifier';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    
    let projects;
    if (customerId) {
      projects = await sql`
        SELECT p.*, 
               s.name as sales_rep_name, s.email as sales_rep_email,
               pr.name as production_rep_name, pr.email as production_rep_email,
               c.name as customer_name,
               (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status = '完了') as completed_tasks,
               (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as total_tasks
        FROM projects p
        LEFT JOIN employees s ON p.sales_rep_id = s.id
        LEFT JOIN employees pr ON p.production_rep_id = pr.id
        LEFT JOIN customers c ON p.customer_id = c.id
        WHERE p.customer_id = ${customerId}
        ORDER BY p.created_at DESC
      `;
    } else {
      projects = await sql`
        SELECT p.*, 
               s.name as sales_rep_name, s.email as sales_rep_email,
               pr.name as production_rep_name, pr.email as production_rep_email,
               c.name as customer_name,
               (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status = '完了') as completed_tasks,
               (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as total_tasks
        FROM projects p
        LEFT JOIN employees s ON p.sales_rep_id = s.id
        LEFT JOIN employees pr ON p.production_rep_id = pr.id
        LEFT JOIN customers c ON p.customer_id = c.id
        ORDER BY p.created_at DESC
      `;
    }

    return NextResponse.json(projects);
  } catch (error) {
    console.error('Fetch projects error:', error);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { 
      name, contract_type, status, amount, order_date, deadline, 
      sales_rep_id, production_rep_id, customer_id, 
      notify_external, sales_webhook, production_webhook, notes, template_id, shared_drive_url
    } = await request.json();

    const dateStr = order_date.replace(/-/g, '');
    const typeCode = contract_type === '月額定額' ? 'R' : 'S';
    
    const projectId = await sql.begin(async (sql) => {
      const seqRows = await sql`
        SELECT last_val FROM project_sequences 
        WHERE date = ${dateStr} AND type = ${typeCode}
        FOR UPDATE
      `;
      
      const nextVal = (seqRows.length > 0 ? seqRows[0].last_val : 0) + 1;
      
      await sql`
        INSERT INTO project_sequences (date, type, last_val) 
        VALUES (${dateStr}, ${typeCode}, ${nextVal}) 
        ON CONFLICT(date, type) DO UPDATE SET last_val = ${nextVal}
      `;
      
      const formattedSeq = nextVal.toString().padStart(3, '0');
      const newProjectId = `${typeCode}-${dateStr}-${formattedSeq}`;
      
      const today = new Date().toISOString().split('T')[0];
      let negAt = null, ordAt = null, progAt = null, doneAt = null;
      if (status === '商談') negAt = today;
      if (status === '受注') { negAt = today; ordAt = today; }
      if (status === '制作') { negAt = today; ordAt = today; progAt = today; }
      if (status === '完了' || status === '失注') { negAt = today; ordAt = today; progAt = today; doneAt = today; }

      await sql`
        INSERT INTO projects (
          id, name, contract_type, status, amount, order_date, deadline, 
          sales_rep_id, production_rep_id, customer_id, 
          notify_external, sales_webhook, production_webhook,
          status_negotiation_at, status_order_at, status_progress_at, status_done_at, notes, shared_drive_url
        ) VALUES (
          ${newProjectId}, ${name}, ${contract_type}, ${status}, ${amount}, ${order_date}, ${deadline}, 
          ${sales_rep_id}, ${production_rep_id}, ${customer_id}, 
          ${notify_external ? 1 : 0}, ${sales_webhook}, ${production_webhook},
          ${negAt}, ${ordAt}, ${progAt}, ${doneAt}, ${notes}, ${shared_drive_url}
        )
      `;
      
      let tasksToInsert: string[] = ['受注', '制作', '納品'];
      if (template_id === 'web') {
        tasksToInsert = ['ヒアリング', '要件定義', 'デザイン制作', '実装', 'テスト・検収', '納品'];
      } else if (template_id === 'sales') {
        tasksToInsert = ['アプローチ', 'テレアポ', '商談実施', '見積提出', 'クロージング'];
      } else if (template_id === 'maintenance') {
        tasksToInsert = ['月次点検', '実績報告', '保守作業'];
      }

      const taskQueries = tasksToInsert.map((taskName, index) => {
        let dueDate = order_date;
        if (taskName === '納品' || taskName === 'クロージング') dueDate = deadline || order_date;
        return sql`
          INSERT INTO tasks (project_id, name, due_date, status, order_index) 
          VALUES (${newProjectId}, ${taskName}, ${dueDate}, '未着手', ${index})
        `;
      });
      
      await Promise.all(taskQueries);

      return newProjectId;
    });

    return NextResponse.json({ id: projectId, name, contract_type, status });
  } catch (error) {
    console.error('Project creation error:', error);
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const data = await request.json();
    const { 
      id, name, customer_id, contract_type, status, amount, order_date, deadline, 
      sales_rep_id, production_rep_id, notify_external, sales_webhook, production_webhook, notes, shared_drive_url
    } = data;

    if (!id) return NextResponse.json({ error: 'Missing project ID' }, { status: 400 });

    const currentRows = await sql`SELECT status, notify_external, sales_webhook, production_webhook FROM projects WHERE id = ${id}`;
    if (currentRows.length === 0) throw new Error(`Project with ID ${id} not found`);
    const current = currentRows[0];

    let completedAt = null;
    const today = new Date().toISOString().split('T')[0];
    
    let negAt = null, ordAt = null, progAt = null, doneAt = null;
    if (status && status !== current.status) {
      if (status === '商談') negAt = today;
      if (status === '受注') ordAt = today;
      if (status === '制作') progAt = today;
      if (status === '完了' || status === '失注') {
        doneAt = today;
        completedAt = new Date().toISOString();
      }
    }

    await sql`
      UPDATE projects SET
        name = COALESCE(${name || null}, name),
        customer_id = COALESCE(${customer_id || null}, customer_id),
        contract_type = COALESCE(${contract_type || null}, contract_type),
        status = COALESCE(${status || null}, status),
        amount = COALESCE(${amount || null}, amount),
        order_date = COALESCE(${order_date || null}, order_date),
        deadline = COALESCE(${deadline || null}, deadline),
        sales_rep_id = COALESCE(${sales_rep_id || null}, sales_rep_id),
        production_rep_id = COALESCE(${production_rep_id || null}, production_rep_id),
        notify_external = COALESCE(${notify_external !== undefined ? (notify_external ? 1 : 0) : null}, notify_external),
        sales_webhook = COALESCE(${sales_webhook || null}, sales_webhook),
        production_webhook = COALESCE(${production_webhook || null}, production_webhook),
        notes = COALESCE(${notes || null}, notes),
        shared_drive_url = COALESCE(${shared_drive_url || null}, shared_drive_url),
        completed_at = CASE WHEN ${status || null} = '完了' THEN COALESCE(completed_at, ${completedAt}) ELSE NULL END,
        status_negotiation_at = COALESCE(status_negotiation_at, ${negAt}),
        status_order_at = COALESCE(status_order_at, ${ordAt}),
        status_progress_at = COALESCE(status_progress_at, ${progAt}),
        status_done_at = COALESCE(status_done_at, ${doneAt})
      WHERE id = ${id}
    `;

    // Notification Logic
    const finalNotifyExternal = notify_external !== undefined ? notify_external : current.notify_external;
    const finalSalesWebhook = sales_webhook || current.sales_webhook;
    const finalProductionWebhook = production_webhook || current.production_webhook;

    if (finalNotifyExternal && status && status !== current.status) {
      const projResult = await sql`SELECT name FROM projects WHERE id = ${id}`;
      const projectName = name || projResult[0]?.name || '案件';
      const msg = `【${projectName}】ステータス変更: ${current.status} ➔ ${status}`;
      
      const sharedWebhookRows = await sql`SELECT value FROM system_settings WHERE key = 'shared_webhook_url'`;
      const sharedWebhook = process.env.SHARED_WEBHOOK_URL || sharedWebhookRows[0]?.value;

      if (sharedWebhook) {
        await sendNotification(id, msg, sharedWebhook);
      } else {
        if (finalSalesWebhook) await sendNotification(id, `[営業連絡] ${msg}`, finalSalesWebhook);
        if (finalProductionWebhook) await sendNotification(id, `[制作連絡] ${msg}`, finalProductionWebhook);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Project update error details:', error.message || error);
    return NextResponse.json({ error: 'Failed to update project', details: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'Missing project ID' }, { status: 400 });

    await sql.begin(async (sql) => {
      await sql`DELETE FROM tasks WHERE project_id = ${id}`;
      const result = await sql`DELETE FROM projects WHERE id = ${id} RETURNING id`;
      if (result.length === 0) throw new Error('Project not found in database');
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Project deletion error details:', error.message || error);
    return NextResponse.json({ error: 'Failed to delete project', details: error.message }, { status: 500 });
  }
}
