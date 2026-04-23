import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { projectId, tasks } = await request.json();
    
    if (!projectId || !Array.isArray(tasks)) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }

    const projects = await sql`SELECT id FROM projects WHERE projsync_id = ${projectId}`;
    const project = projects[0];
    
    if (!project) {
      return NextResponse.json({ error: 'Linked project not found in SFA' }, { status: 404 });
    }

    // Map internal project.id to tasks for bulk insert
    const taskData = tasks.map(t => ({
      ...t,
      project_id: project.id,
      projsync_id: t.id // mapping incoming 'id' as 'projsync_id'
    }));

    await sql`
      INSERT INTO tasks ${sql(taskData, 'projsync_id', 'project_id', 'name', 'status', 'start_date', 'due_date')}
      ON CONFLICT(projsync_id) DO UPDATE SET
        name = EXCLUDED.name,
        status = EXCLUDED.status,
        start_date = EXCLUDED.start_date,
        due_date = EXCLUDED.due_date,
        completed_at = CASE WHEN EXCLUDED.status = '完了' THEN CURRENT_TIMESTAMP ELSE NULL END
    `;

    return NextResponse.json({ success: true, count: tasks.length });
  } catch (error) {
    console.error('Task import error:', error);
    return NextResponse.json({ error: 'Import failed' }, { status: 500 });
  }
}
