'use client';

import { useState, useEffect } from 'react';
import Papa from 'papaparse';

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
  const [department, setDepartment] = useState('');
  const [role, setRole] = useState('営業');
  const [email, setEmail] = useState('');
  const [notificationWebhook, setNotificationWebhook] = useState('');

  // Edit states
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editForm, setEditForm] = useState<Employee | null>(null);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    const res = await fetch('/api/employees');
    const data = await res.json();
    setEmployees(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, department, role, email, notification_webhook: notificationWebhook }),
    });
    if (res.ok) {
      setName('');
      setDepartment('');
      setEmail('');
      setNotificationWebhook('');
      fetchEmployees();
    }
  };

  const handleExport = () => {
    const csv = Papa.unparse(employees);
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `employees_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const res = await fetch('/api/employees/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(results.data),
        });
        if (res.ok) {
          alert('インポート成功');
          fetchEmployees();
        } else {
          alert('インポートに失敗しました');
        }
      }
    });
  };

  const startEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setEditForm({ ...employee });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm) return;

    const res = await fetch('/api/employees', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    });

    if (res.ok) {
      setEditingEmployee(null);
      fetchEmployees();
    } else {
      alert('更新に失敗しました');
    }
  };

  return (
    <div className="container">
      <h1 style={{ marginBottom: '2rem' }}>従業員マスタ管理</h1>

      <div className="glass-panel" style={{ marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1.5rem' }}>新規従業員登録</h3>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', alignItems: 'end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="label">氏名</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="label">役割</label>
            <select className="select" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="営業">営業</option>
              <option value="制作">制作</option>
              <option value="兼務">兼務</option>
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="label">メールアドレス</label>
            <input className="input" type="email" placeholder="invited@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          
          <div className="form-group" style={{ gridColumn: 'span 2', marginTop: '1rem', marginBottom: 0 }}>
            <label className="label">部署 (任意)</label>
            <input className="input" value={department} onChange={(e) => setDepartment(e.target.value)} />
          </div>
          <div className="form-group" style={{ gridColumn: 'span 2', marginTop: '1rem', marginBottom: 0 }}>
            <label className="label">通知用Webhook URL (任意)</label>
            <input className="input" placeholder="Google Chat Webhook URL" value={notificationWebhook} onChange={(e) => setNotificationWebhook(e.target.value)} />
          </div>

          <div style={{ gridColumn: 'span 4', textAlign: 'right', marginTop: '1.5rem' }}>
            <button type="submit" className="btn btn-primary" style={{ padding: '0.8rem 2.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.75rem', boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)' }}>
              <span style={{ fontSize: '1.3rem' }}>👤➕</span> 新規従業員を登録
            </button>
          </div>
        </form>
      </div>

      <div className="glass-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3>従業員一覧</h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-secondary" onClick={handleExport} style={{ fontSize: '0.8rem' }}>CSV出力</button>
            <label className="btn btn-secondary" style={{ fontSize: '0.8rem', cursor: 'pointer' }}>
              CSV取込
              <input type="file" accept=".csv" style={{ display: 'none' }} onChange={handleImport} />
            </label>
          </div>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '50px' }}>ID</th>
              <th style={{ minWidth: '120px' }}>名前</th>
              <th style={{ minWidth: '200px' }}>メール / 部署</th>
              <th style={{ minWidth: '80px' }}>役割</th>
              <th>Webhook URL</th>
              <th style={{ width: '80px' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => (
              <tr key={employee.id}>
                <td>{employee.id}</td>
                <td style={{ fontWeight: 600 }}>{employee.name}</td>
                <td>
                  <div style={{ fontSize: '0.85rem' }}>{employee.email || '-'}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{employee.department || '-'}</div>
                </td>
                <td>
                  <span style={{ 
                    padding: '0.25rem 0.75rem', 
                    borderRadius: '20px', 
                    fontSize: '0.75rem',
                    whiteSpace: 'nowrap',
                    background: employee.role === '営業' ? 'rgba(59, 130, 246, 0.2)' : employee.role === '制作' ? 'rgba(236, 72, 153, 0.2)' : 'rgba(139, 92, 246, 0.2)',
                    color: employee.role === '営業' ? '#3b82f6' : employee.role === '制作' ? '#ec4899' : '#8b5cf6'
                  }}>
                    {employee.role}
                  </span>
                </td>
                <td style={{ 
                  maxWidth: '200px', 
                  overflow: 'hidden', 
                  textOverflow: 'ellipsis', 
                  whiteSpace: 'nowrap',
                  fontSize: '0.7rem', 
                  color: 'var(--text-muted)' 
                }} title={employee.notification_webhook}>
                  {employee.notification_webhook || '-'}
                </td>
                <td>
                  <button className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} onClick={() => startEdit(employee)}>修正</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editingEmployee && editForm && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, backdropFilter: 'blur(4px)'
        }}>
          <div className="glass-panel" style={{ width: '90%', maxWidth: '500px' }}>
            <h3 style={{ marginBottom: '1.5rem' }}>従業員情報の修正</h3>
            <form onSubmit={handleUpdate}>
              <div className="form-group">
                <label className="label">氏名</label>
                <input className="input" value={editForm.name} onChange={(e) => setEditForm({...editForm, name: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="label">メールアドレス</label>
                <input className="input" type="email" value={editForm.email || ''} onChange={(e) => setEditForm({...editForm, email: e.target.value})} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="label">部署</label>
                  <input className="input" value={editForm.department || ''} onChange={(e) => setEditForm({...editForm, department: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="label">役割</label>
                  <select className="select" value={editForm.role} onChange={(e) => setEditForm({...editForm, role: e.target.value})}>
                    <option value="営業">営業</option>
                    <option value="制作">制作</option>
                    <option value="兼務">兼務</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="label">通知用Webhook URL</label>
                <input className="input" value={editForm.notification_webhook || ''} onChange={(e) => setEditForm({...editForm, notification_webhook: e.target.value})} />
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>更新する</button>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setEditingEmployee(null)}>キャンセル</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
