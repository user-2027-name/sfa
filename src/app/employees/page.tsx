'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

interface Employee {
  id: number;
  name: string;
  department: string;
  role: string;
  email?: string;
  notification_webhook?: string;
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('営業部');
  const [role, setRole] = useState('一般');
  const [email, setEmail] = useState('');
  const [notificationWebhook, setNotificationWebhook] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editForm, setEditForm] = useState<Partial<Employee>>({});

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const res = await fetch('/api/employees');
      if (res.ok) {
        setEmployees(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, department, role, email: email || null, notification_webhook: notificationWebhook || null })
      });
      if (res.ok) {
        toast.success('メンバーを新しく登録しました！', { position: 'top-center' });
        setName('');
        setEmail('');
        setNotificationWebhook('');
        fetchEmployees();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (emp: Employee) => {
    setEditingEmployee(emp);
    setEditForm({ ...emp });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;

    setIsUpdating(true);
    try {
      const res = await fetch('/api/employees', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingEmployee.id, ...editForm })
      });
      if (res.ok) {
        toast.success('メンバー情報を更新しました', { position: 'top-center' });
        setEditingEmployee(null);
        fetchEmployees();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (id: number, empName: string) => {
    if (!confirm(`「${empName}」さんを削除してもよろしいですか？\n※案件の担当者に設定されている場合は連動データにご注意ください。`)) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/employees?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('メンバーを削除しました', { position: 'top-center' });
        fetchEmployees();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '100%' }}>
      <header style={{ marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>組織従業員マスタ</h1>
        <p style={{ color: 'var(--text-muted)' }}>社内の営業担当および制作担当メンバーを管理し、個別通知先をマッピングします。</p>
      </header>

      {/* 新規登録フォーム */}
      <div className="glass-panel" style={{ marginBottom: '3rem', padding: '2rem' }}>
        <h3 style={{ marginBottom: '1.5rem' }}>👤 新しいメンバーを招待</h3>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          <div className="form-responsive-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.25rem' }}>
            <div className="form-group">
              <label className="label">氏名 *</label>
              <input className="input" placeholder="例: 尾崎 直人" value={name} onChange={(e) => setName(e.target.value)} required disabled={isSubmitting} />
            </div>
            <div className="form-group">
              <label className="label">所属部署</label>
              <select className="select" value={department} onChange={(e) => setDepartment(e.target.value)} disabled={isSubmitting}>
                <option value="営業部">営業部 (Sales)</option>
                <option value="制作部">制作部 (Production)</option>
                <option value="管理部">管理部 (Admin)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="label">職位・ロール</label>
              <select className="select" value={role} onChange={(e) => setRole(e.target.value)} disabled={isSubmitting}>
                <option value="一般">一般社員</option>
                <option value="マネージャー">マネージャー</option>
                <option value="役員">役員・管理者</option>
              </select>
            </div>
            <div className="form-group">
              <label className="label">社内メールアドレス</label>
              <input type="email" className="input" placeholder="username@ims-hirosaki.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={isSubmitting} />
            </div>
          </div>

          <div className="form-group">
            <label className="label">専用通知用 WebHook URL (任意)</label>
            <input className="input" placeholder="SlackやChatworkの個人通知用URL" value={notificationWebhook} onChange={(e) => setNotificationWebhook(e.target.value)} disabled={isSubmitting} />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ alignSelf: 'flex-start', padding: '0.75rem 2rem', opacity: isSubmitting ? 0.6 : 1, cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
            disabled={isSubmitting || deletingId !== null}
          >
            {isSubmitting ? '⏳ 登録中...' : '👤 メンバーをマスタに登録'}
          </button>
        </form>
      </div>

      {/* 一覧リストエリア */}
      <h3 style={{ marginBottom: '1.25rem' }}>👥 登録メンバー一覧 ({employees.length}名)</h3>
      
      <div className="employee-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
        {employees.map(emp => (
          /* 👈 【大修正】タイポのあった justifyBetween を正しい「justifyContent」に完全に修正しました */
          <div key={emp.id} className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem', borderLeft: emp.department === '営業部' ? '4px solid var(--primary)' : emp.department === '制作部' ? '4px solid var(--accent)' : '4px solid #f59e0b' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginRight: '0.5rem' }}>ID: {emp.id}</span>
                <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700, background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>
                  {emp.role}
                </span>
                <h4 style={{ fontSize: '1.2rem', margin: '0.4rem 0 0.2rem 0', fontWeight: 700, color: '#fff' }}>{emp.name}</h4>
                <p style={{ fontSize: '0.8rem', color: emp.department === '営業部' ? 'var(--primary)' : emp.department === '制作部' ? 'var(--accent)' : '#fbbf24', margin: 0, fontWeight: 600 }}>
                  {emp.department}
                </p>
              </div>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.15)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', overflow: 'hidden' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 600 }}>メールアドレス</div>
              <div style={{ color: 'var(--text-main)', fontWeight: 500, wordBreak: 'break-all', whiteSpace: 'normal' }}>
                {emp.email || '---'}
              </div>
              
              {emp.notification_webhook && (
                <>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 600, marginTop: '0.5rem' }}>通知 WebHook</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', wordBreak: 'break-all', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {emp.notification_webhook}
                  </div>
                </>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.03)' }}>
              <button className="btn btn-secondary" style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem' }} onClick={() => handleEditClick(emp)} disabled={deletingId !== null}>編集</button>
              <button 
                className="btn" 
                style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', opacity: deletingId !== null ? 0.5 : 1 }} 
                onClick={() => handleDelete(emp.id, emp.name)}
                disabled={deletingId !== null}
              >
                {deletingId === emp.id ? '⏳...' : '削除'}
              </button>
            </div>

          </div>
        ))}

        {employees.length === 0 && (
          <div className="glass-panel" style={{ gridColumn: '1 / -1', padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            登録された従業員メンバーがいません。
          </div>
        )}
      </div>

      {/* 編集用モーダル */}
      {editingEmployee && (
        <div style={{ position: 'fixed', top:0, left:0, width:'100vw', height:'100vh', background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex: 2000, padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', padding: '2rem', background: 'var(--bg-dark)', border: '1px solid var(--border)' }}>
            <h3 style={{ marginBottom: '1.5rem' }}>📝 メンバー情報を編集</h3>
            <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="label">氏名</label>
                  <input className="input" value={editForm.name || ''} onChange={(e) => setEditForm({...editForm, name: e.target.value})} required disabled={isUpdating} />
                </div>
                <div className="form-group">
                  <label className="label">所属部署</label>
                  <select className="select" value={editForm.department || '営業部'} onChange={(e) => setEditForm({...editForm, department: e.target.value})} disabled={isUpdating}>
                    <option value="営業部">営業部</option>
                    <option value="制作部">制作部</option>
                    <option value="管理部">管理部</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="label">職位・ロール</label>
                  <select className="select" value={editForm.role || '一般'} onChange={(e) => setEditForm({...editForm, role: e.target.value})} disabled={isUpdating}>
                    <option value="一般">一般社員</option>
                    <option value="マネージャー">マネージャー</option>
                    <option value="役員">役員・管理者</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">メールアドレス</label>
                  <input type="email" className="input" value={editForm.email || ''} onChange={(e) => setEditForm({...editForm, email: e.target.value})} disabled={isUpdating} />
                </div>
              </div>

              <div className="form-group">
                <label className="label">通知用 WebHook URL</label>
                <input className="input" value={editForm.notification_webhook || ''} onChange={(e) => setEditForm({...editForm, notification_webhook: e.target.value})} disabled={isUpdating} />
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, opacity: isUpdating ? 0.6 : 1 }} disabled={isUpdating}>
                  {isUpdating ? '⏳ 更新中...' : '更新する'}
                </button>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setEditingEmployee(null)} disabled={isUpdating}>キャンセル</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx global>{`
        @media (max-width: 600px) {
          .form-responsive-grid {
            grid-template-columns: 1fr !important;
          }
          .btn-primary {
            width: 100% !important;
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
}