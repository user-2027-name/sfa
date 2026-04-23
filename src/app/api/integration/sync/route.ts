import { NextResponse } from 'next/server';
import { fetchProjectsFromProjSync, fetchUsersFromProjSync } from '@/lib/projsync';
import sql from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { type } = await request.json();
    
    // 自システムのベースURL（APIを内部的に叩くためのURL）
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

    if (type === 'projects') {
      const projects = await fetchProjectsFromProjSync();
      
      const res = await fetch(`${baseUrl}/api/projects/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projects),
      });

      if (!res.ok) throw new Error('Failed to import projects');
      return NextResponse.json({ success: true, count: projects.length });

    } else if (type === 'employees') {
      const users = await fetchUsersFromProjSync();
      
      const res = await fetch(`${baseUrl}/api/employees/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(users),
      });

      if (!res.ok) throw new Error('Failed to import employees');
      return NextResponse.json({ success: true, count: users.length });

    } else if (type === 'tasks') {
      const projects = await sql`SELECT projsync_id FROM projects WHERE projsync_id IS NOT NULL`;
      
      let totalTasks = 0;
      for (const p of projects) {
        const { fetchTasksForProjectFromProjSync } = await import('@/lib/projsync');
        const tasks = await fetchTasksForProjectFromProjSync(p.projsync_id);
        if (tasks.length > 0) {
          const res = await fetch(`${baseUrl}/api/tasks/import`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId: p.projsync_id, tasks }),
          });
          if (res.ok) totalTasks += tasks.length;
        }
      }
      return NextResponse.json({ success: true, count: totalTasks });
    }

    return NextResponse.json({ error: 'Invalid sync type' }, { status: 400 });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json({ error: 'Synchronization failed' }, { status: 500 });
  }
}
