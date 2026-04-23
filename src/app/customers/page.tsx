'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Papa from 'papaparse';

interface Customer {
  id: number;
  name: string;
  phone: string;
  email?: string;
  status: string;
  customer_rep?: string;
  address?: string;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('見込み');
  const [customerRep, setCustomerRep] = useState('');
  const [address, setAddress] = useState('');
  
  // Edit states
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editForm, setEditForm] = useState<any | null>(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    const res = await fetch('/api/customers');
    const data = await res.json();
    setCustomers(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone, email, status, customer_rep: customerRep, address }),
    });
    if (res.ok) {
      setName('');
      setPhone('');
      setEmail('');
      setCustomerRep('');
      setAddress('');
      fetchCustomers();
    }
  };

  const handleExport = () => {
    const csv = Papa.unparse(customers);
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `customers_${new Date().toISOString().slice(0,10)}.csv`);
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
        const res = await fetch('/api/customers/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(results.data),
        });
        if (res.ok) {
          alert('インポート成功');
          fetchCustomers();
        } else {
          alert('インポートに失敗しました');
        }
      }
    });
  };

  const startEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setEditForm({ ...customer });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm) return;

    const res = await fetch('/api/customers', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    });

    if (res.ok) {
      setEditingCustomer(null);
      fetchCustomers();
    } else {
      alert('更新に失敗しました');
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`顧客「${name}」を削除しますか？\n※この操作は取り消せません。`)) return;
    
    const res = await fetch(`/api/customers?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
      fetchCustomers();
    } else {
      alert('削除に失敗しました');
    }
  };

  const activeCustomers = customers.filter(c => c.status === '契約中');
  const otherCustomers = customers.filter(c => c.status !== '契約中');

  const CustomerTable = ({ data, title, showGlobalActions = false }: { data: Customer[], title: string, showGlobalActions?: boolean }) => (
    <div className="glass-panel" style={{ marginBottom: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}>
          <span style={{ width: '8px', height: '1.5rem', background: title.includes('取引') ? 'var(--accent)' : 'var(--text-muted)', borderRadius: '4px' }}></span>
          {title} ({data.length})
        </h3>
        {showGlobalActions && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-secondary" onClick={handleExport} style={{ fontSize: '0.8rem' }}>CSV出力</button>
            <label className="btn btn-secondary" style={{ fontSize: '0.8rem', cursor: 'pointer' }}>
              CSV取込
              <input type="file" accept=".csv" style={{ display: 'none' }} onChange={handleImport} />
            </label>
          </div>
        )}
      </div>
      <div className="table-wrapper">
        <table className="data-table">
        <thead>
          <tr>
            <th style={{ width: '60px' }}>ID</th>
            <th>顧客名 / 担当者</th>
            <th>電話番号 / メール</th>
            <th>住所</th>
            <th>ステータス</th>
            <th style={{ width: '130px' }}>操作</th>
          </tr>
        </thead>
        <tbody>
          {data.map((customer) => (
            <tr key={customer.id}>
              <td>{customer.id}</td>
              <td>
                <Link href={`/customers/${customer.id}`} style={{ fontWeight: 600, color: 'var(--primary)', textDecoration: 'none' }}>
                  {customer.name}
                </Link>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>👤 {customer.customer_rep || '担当者未設定'}</div>
              </td>
              <td>
                <div style={{ fontSize: '0.875rem' }}>{customer.phone || '-'}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--primary)' }}>{customer.email || '-'}</div>
              </td>
              <td>
                <div style={{ fontSize: '0.8rem', maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={customer.address}>
                  {customer.address || '-'}
                </div>
              </td>
              <td>
                <span style={{ 
                  padding: '0.25rem 0.75rem', 
                  borderRadius: '20px', 
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  background: customer.status === '契約中' ? 'rgba(16, 185, 129, 0.2)' : 
                              customer.status === '休止中' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                  color: customer.status === '契約中' ? '#10b981' : 
                        customer.status === '休止中' ? '#ef4444' : '#3b82f6'
                }}>
                  {customer.status}
                </span>
              </td>
              <td>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} onClick={() => startEdit(customer)}>修正</button>
                  <button className="btn btn-danger" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} onClick={() => handleDelete(customer.id, customer.name)}>削除</button>
                </div>
              </td>
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>対象の顧客はいません</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
    </div>
  );

  return (
    <div className="container" style={{ maxWidth: '1400px' }}>
      <h1 style={{ marginBottom: '2rem' }}>顧客マスタ管理</h1>

      <div className="glass-panel" style={{ marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1.5rem' }}>新規顧客登録</h3>
        <form onSubmit={handleSubmit}>
          <div className="grid-responsive" style={{ gridTemplateColumns: '2fr 1fr 1fr', marginBottom: '1.5rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="label">顧客名 (会社名)</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="株式会社サンプル" required />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="label">先方担当者名</label>
              <input className="input" placeholder="◯◯ 様" value={customerRep} onChange={(e) => setCustomerRep(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="label">取引状況</label>
              <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="見込み">見込み</option>
                <option value="契約中">契約中</option>
                <option value="休止中">休止中</option>
              </select>
            </div>
          </div>

          <div className="grid-responsive" style={{ gridTemplateColumns: '2fr 1fr 1fr', marginBottom: '1.5rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="label">住所</label>
              <input className="input" placeholder="東京都... (任意)" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="label">電話番号</label>
              <input className="input" placeholder="03-xxxx-xxxx" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="label">メールアドレス</label>
              <input type="email" className="input" placeholder="example@domain.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>

          <div style={{ textAlign: 'right', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.5rem' }}>
            <button type="submit" className="btn btn-primary" style={{ padding: '0.8rem 3rem', fontSize: '1rem', boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)' }}>
              ＋ 顧客を新規登録する
            </button>
          </div>
        </form>
      </div>

      <CustomerTable data={activeCustomers} title="取引中の顧客（アクティブ）" showGlobalActions={true} />
      <CustomerTable data={otherCustomers} title="見込み・休止中の顧客" />

      {/* Edit Modal */}
      {editingCustomer && editForm && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, backdropFilter: 'blur(4px)'
        }}>
          <div className="glass-panel" style={{ width: '90%', maxWidth: '500px' }}>
            <h3 style={{ marginBottom: '1.5rem' }}>顧客情報の修正: ID {editingCustomer.id}</h3>
            <form onSubmit={handleUpdate}>
              <div className="form-group">
                <label className="label">顧客名 (会社名)</label>
                <input className="input" value={editForm.name} onChange={(e) => setEditForm({...editForm, name: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="label">先方担当者名</label>
                <input className="input" value={editForm.customer_rep || ''} onChange={(e) => setEditForm({...editForm, customer_rep: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="label">電話番号</label>
                <input className="input" value={editForm.phone} onChange={(e) => setEditForm({...editForm, phone: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="label">メールアドレス</label>
                <input type="email" className="input" value={editForm.email || ''} onChange={(e) => setEditForm({...editForm, email: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="label">取引状況</label>
                <select className="select" value={editForm.status} onChange={(e) => setEditForm({...editForm, status: e.target.value})}>
                  <option value="見込み">見込み</option>
                  <option value="契約中">契約中</option>
                  <option value="休止中">休止中</option>
                </select>
              </div>
              <div className="form-group">
                <label className="label">住所</label>
                <input className="input" value={editForm.address || ''} onChange={(e) => setEditForm({...editForm, address: e.target.value})} />
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>更新する</button>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setEditingCustomer(null)}>キャンセル</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
