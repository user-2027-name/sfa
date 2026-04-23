'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';

interface Task {
  id: number;
  name: string;
  start_date: string | null;
  due_date: string;
  completed_at: string | null;
  status: string;
  predecessor_id: number | null;
}

interface Project {
  id: string;
  name: string;
  order_date: string;
  deadline: string;
  contract_type: string;
  status: string;
  customer_name?: string;
  sales_rep_email?: string;
  production_rep_email?: string;
  status_negotiation_at?: string;
  status_order_at?: string;
  status_progress_at?: string;
  status_done_at?: string;
  notes?: string;
  shared_drive_url?: string;
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  
  // New task form
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskStartDate, setNewTaskStartDate] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskPredecessorId, setNewTaskPredecessorId] = useState('');

  useEffect(() => {
    fetchProjectAndTasks();
  }, [id]);

  const fetchProjectAndTasks = async () => {
    try {
      const pRes = await fetch('/api/projects');
      const allProjects = await pRes.json();
      const currentProject = allProjects.find((p: Project) => p.id === id);
      
      if (!currentProject) {
        alert('案件が見つかりません');
        router.push('/projects');
        return;
      }
      setProject(currentProject);
      if (!newTaskStartDate) setNewTaskStartDate(currentProject.order_date);
      if (!newTaskDueDate) setNewTaskDueDate(currentProject.order_date);

      const tRes = await fetch(`/api/tasks?projectId=${id}`);
      const taskData = await tRes.json();
      setTasks(taskData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTask = async (taskId: number, updates: any) => {
    const res = await fetch('/api/tasks', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: taskId, ...updates }),
    });
    if (res.ok) fetchProjectAndTasks();
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        project_id: id, 
        name: newTaskName, 
        start_date: newTaskStartDate,
        due_date: newTaskDueDate,
        predecessor_id: newTaskPredecessorId ? Number(newTaskPredecessorId) : null
      }),
    });
    
    if (res.ok) {
      setNewTaskName('');
      setNewTaskPredecessorId('');
      fetchProjectAndTasks();
    } else {
      const err = await res.json();
      alert(err.error || 'タスクの追加に失敗しました');
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    if (!confirm('この工程を削除しますか？')) return;
    const res = await fetch(`/api/tasks?id=${taskId}`, { method: 'DELETE' });
    if (res.ok) fetchProjectAndTasks();
  };

  const getCalendarUrl = (title: string, date: string, details: string = '', invitees: string[] = []) => {
    const formattedDate = date.replace(/-/g, '');
    // For all-day events, the end date must be the day after the target date
    const end = new Date(date);
    end.setDate(end.getDate() + 1);
    const formattedEnd = end.toISOString().split('T')[0].replace(/-/g, '');
    
    const validEmails = invitees.filter(email => email && email.includes('@'));
    const addParam = validEmails.length > 0 ? `&add=${validEmails.join(',')}` : '';
    
    const baseUrl = 'https://www.google.com/calendar/render?action=TEMPLATE';
    return `${baseUrl}&text=${encodeURIComponent(title)}&dates=${formattedDate}/${formattedEnd}&details=${encodeURIComponent(details)}${addParam}&sf=true&output=xml`;
  };

  if (loading) return <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>Analyzing Project Data...</div>;
  if (!project) return null;

  const completedCount = tasks.filter(t => t.status === '完了').length;
  // Sorted tasks for the stepper
  const sortedTasks = [...tasks].sort((a, b) => {
    if (!a.start_date) return 1;
    if (!b.start_date) return -1;
    return a.start_date.localeCompare(b.start_date);
  });

  const progressPercent = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  return (
    <div className="container" style={{ maxWidth: '1300px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Project Details</span>
          <h1 style={{ fontSize: '2.5rem', marginTop: '0.2rem', marginBottom: '0.5rem' }}>{project.name}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-muted)' }}>
            <span>発注元: <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{project.customer_name || '記録なし'}</span></span>
            <span>|</span>
            <span>受注日: {project.order_date}</span>
            <span>|</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: 'var(--danger)', fontWeight: 600 }}>納期: {project.deadline}</span>
              <button 
                onClick={() => {
                  const url = getCalendarUrl(`【納期】${project.name}`, project.deadline, `案件URL: ${typeof window !== 'undefined' ? window.location.href : ''}`, [project.sales_rep_email || '', project.production_rep_email || '']);
                  window.open(url, 'GoogleCalendar', 'width=800,height=700,menubar=no,toolbar=no,location=no,status=no');
                }}
                className="btn btn-secondary"
                style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
              >
                📅 カレンダー登録
              </button>
            </div>
            {project.shared_drive_url && (
              <>
                <span>|</span>
                <a 
                  href={project.shared_drive_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="btn btn-secondary"
                  style={{ padding: '0.2rem 0.75rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', color: '#10b981', textDecoration: 'none' }}
                >
                  📂 共有ドライブを開く
                </a>
              </>
            )}
          </div>
          {project.deadline && (
            (() => {
              const today = new Date().toISOString().split('T')[0];
              const isOverdue = project.deadline < today;
              const threeDaysLater = new Date();
              threeDaysLater.setDate(threeDaysLater.getDate() + 3);
              const isRisk = project.deadline <= threeDaysLater.toISOString().split('T')[0];
              
              if (isOverdue) return <div style={{ marginTop: '0.8rem', display: 'inline-block', padding: '0.4rem 1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', color: 'var(--danger)', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 800 }}>⚠️ 納期超過：至急対応してください</div>;
              if (isRisk) return <div style={{ marginTop: '0.8rem', display: 'inline-block', padding: '0.4rem 1rem', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid #f59e0b', color: '#f59e0b', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 800 }}>🚨 遅延リスク：直近3日以内に納期があります</div>;
              return null;
            })()
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>{progressPercent}% <span style={{ fontSize: '0.8rem', fontWeight: 400 }}>完了</span></div>
          <button className="btn btn-secondary" style={{ marginTop: '1rem' }} onClick={() => router.push('/projects')}>案件一覧へ戻る</button>
        </div>
      </div>

      {project.notes && (
        <div className="glass-panel" style={{ marginBottom: '2rem', borderLeft: '4px solid var(--primary)' }}>
          <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>備考 / メモ</h3>
          <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{project.notes}</div>
        </div>
      )}

      {/* OVERALL PROJECT STATUS FLOW */}
      <div className="glass-panel" style={{ marginBottom: '2rem', padding: '1.5rem 2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {[
            { label: 'テレアポ', status: 'テレアポ', date: undefined }, 
            { label: '商談', status: '商談', date: project.status_negotiation_at }, 
            { label: '受注', status: '受注', date: project.status_order_at }, 
            { label: '制作', status: '制作', date: project.status_progress_at }, 
            { label: project.status === '失注' ? '失注' : '完了', status: project.status === '失注' ? '失注' : '完了', date: project.status_done_at }
          ].map((stage, idx, arr) => {
            const isCurrent = project.status === stage.status;
            const isPast = (stage.status !== '失注') && (
              (project.status === '商談' && idx < 1) ||
              (project.status === '受注' && idx < 2) || 
              (project.status === '制作' && idx < 3) || 
              (project.status === '完了' && idx < 4)
            );
            const isLost = project.status === '失注' && stage.status === '失注';

            return (
              <div key={idx} style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                <div style={{ 
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', 
                  color: isCurrent || isPast ? 'var(--text-main)' : 'var(--text-muted)',
                  fontWeight: isCurrent ? 700 : 400,
                  opacity: isCurrent || isPast || isLost ? 1 : 0.4,
                  minWidth: '80px'
                }}>
                  <div style={{ 
                    width: '32px', height: '32px', borderRadius: '50%', 
                    background: isLost ? 'var(--danger)' : isCurrent ? 'var(--primary)' : isPast ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.8rem', color: isCurrent || isPast || isLost ? 'white' : 'var(--text-muted)',
                    boxShadow: isCurrent ? '0 0 15px rgba(59, 130, 246, 0.4)' : 'none'
                  }}>
                    {isPast ? '✓' : idx + 1}
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.9rem' }}>{stage.label}</div>
                    {stage.date && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{stage.date}</div>}
                  </div>
                </div>
                {idx < arr.length - 1 && (
                  <div style={{ flex: 1, height: '2px', background: 'rgba(255,255,255,0.05)', margin: '0 1rem', position: 'relative', marginTop: '-1.5rem' }}>
                    <div style={{ 
                      position: 'absolute', top: 0, left: 0, height: '100%', 
                      width: isPast || isCurrent ? '100%' : '0%', 
                      background: isPast ? 'var(--accent)' : isCurrent ? 'var(--primary)' : 'transparent',
                      transition: 'width 0.5s ease'
                    }}></div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Progress Stepper (Tasks) */}
      <div className="glass-panel" style={{ marginBottom: '2rem', padding: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
          <div style={{ width: '4px', height: '1.2rem', background: 'var(--primary)', borderRadius: '2px' }}></div>
          <h3 style={{ fontSize: '1rem', margin: 0 }}>現在の工程フロー</h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative', padding: '0 1rem' }}>
          {/* Connector line */}
          <div style={{ position: 'absolute', top: '24px', left: '0', right: '0', height: '2px', background: 'rgba(255,255,255,0.05)', zIndex: 0 }}></div>
          
          {sortedTasks.map((task, index) => {
            const isCompleted = task.status === '完了';
            const isProcessing = task.status === '進行中';
            return (
              <div key={task.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, zIndex: 1, position: 'relative', minWidth: '100px' }}>
                <div style={{ 
                  width: '48px', 
                  height: '48px', 
                  borderRadius: '16px', 
                  background: isCompleted ? 'var(--accent)' : isProcessing ? 'var(--primary)' : 'var(--bg-dark)',
                  border: `2px solid ${isProcessing ? 'var(--primary)' : 'rgba(255,255,255,0.1)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1rem',
                  boxShadow: isProcessing ? '0 0 20px rgba(59, 130, 246, 0.4)' : 'none',
                  animation: isProcessing ? 'pulse 2s infinite' : 'none'
                }}>
                  {isCompleted ? '✓' : index + 1}
                </div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, textAlign: 'center', maxWidth: '80px', marginBottom: '0.25rem', color: isCompleted || isProcessing ? 'var(--text-main)' : 'var(--text-muted)' }}>
                  {task.name}
                </div>
                {task.due_date && <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{task.due_date.substring(5)}</div>}
              </div>
            );
          })}
          {tasks.length === 0 && <p style={{ width: '100%', textAlign: 'center', color: 'var(--text-muted)' }}>工程が登録されていません。</p>}
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); }
          70% { box-shadow: 0 0 0 15px rgba(59, 130, 246, 0); }
          100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
        }
      `}</style>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem', alignItems: 'start' }}>
        {/* Task List */}
        <div className="glass-panel">
          <h3 style={{ marginBottom: '1.5rem' }}>工程（タスク）詳細リスト</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--primary)', marginBottom: '1.5rem' }}>
            💡 ヒント: 期限を変更すると、連動する後続タスクの日程も自動で調整されます。
          </p>
          <table className="data-table">
            <thead>
              <tr>
                <th>工程名</th>
                <th>開始日</th>
                <th>期限</th>
                <th>先行工程</th>
                <th>状況</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id}>
                  <td style={{ fontWeight: 500 }}>{task.name}</td>
                  <td>
                    <input type="date" className="input" style={{ width: '130px', padding: '0.2rem' }} value={task.start_date || ''} onChange={(e) => handleUpdateTask(task.id, { start_date: e.target.value })} />
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <input type="date" className="input" style={{ width: '130px', padding: '0.2rem' }} value={task.due_date} onChange={(e) => handleUpdateTask(task.id, { due_date: e.target.value })} />
                      <button 
                        onClick={() => {
                          const url = getCalendarUrl(`【${task.name}】${project.name}`, task.due_date, `案件URL: ${typeof window !== 'undefined' ? window.location.href : ''}`, [project.sales_rep_email || '', project.production_rep_email || '']);
                          window.open(url, 'GoogleCalendar', 'width=800,height=700,menubar=no,toolbar=no,location=no,status=no');
                        }}
                        title="Googleカレンダーに登録（担当者を招待・別窓）"
                        style={{ fontSize: '1.2rem', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                      >
                        📅
                      </button>
                    </div>
                  </td>
                  <td>
                    <select className="select" style={{ width: '100px', padding: '0.2rem' }} value={task.predecessor_id || ''} onChange={(e) => handleUpdateTask(task.id, { predecessor_id: e.target.value ? Number(e.target.value) : null })}>
                      <option value="">なし</option>
                      {tasks.filter(t => t.id !== task.id).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </td>
                  <td>
                    <select 
                      className="select" 
                      style={{ padding: '0.25rem', width: 'auto' }}
                      value={task.status}
                      onChange={(e) => handleUpdateTask(task.id, { status: e.target.value })}
                    >
                      <option value="未着手">未着手</option>
                      <option value="進行中">進行中</option>
                      <option value="完了">完了</option>
                    </select>
                  </td>
                  <td>
                    <button onClick={() => handleDeleteTask(task.id)} style={{ color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer' }}>削除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add Task Form */}
        <div className="glass-panel">
          <h3 style={{ marginBottom: '1.5rem' }}>工程の追加</h3>
          <form onSubmit={handleAddTask}>
            <div className="form-group">
              <label className="label">工程名</label>
              <input className="input" placeholder="例: デザイン修正、検品" value={newTaskName} onChange={(e) => setNewTaskName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="label">開始日</label>
              <input type="date" className="input" value={newTaskStartDate} onChange={(e) => setNewTaskStartDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="label">期限</label>
              <input type="date" className="input" value={newTaskDueDate} onChange={(e) => setNewTaskDueDate(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="label">先行工程 (依存関係)</label>
              <select className="select" value={newTaskPredecessorId} onChange={(e) => setNewTaskPredecessorId(e.target.value)}>
                <option value="">なし</option>
                {tasks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>工程を追加</button>
          </form>
          
          <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.2)', fontSize: '0.875rem' }}>
            <p style={{ color: 'var(--primary)', fontWeight: 600, marginBottom: '0.5rem' }}>日程の連動について</p>
            <p style={{ color: 'var(--text-muted)' }}>先行工程を完了日からずらすと、後続の工程は同じ日数分だけ自動的に後ろにずれます。</p>
          </div>
        </div>
      </div>
    </div>
  );
}
