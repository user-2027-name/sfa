'use client';

import { useState, useEffect } from 'react';

interface Customer {
  id: number;
  name: string;
  customer_rep?: string; 
  email?: string;
  phone?: string;
  status: string; 
  contract_type?: string; 
  address?: string; 
  created_at?: string;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [name, setName] = useState('');
  const [customerRep, setCustomerRep] = useState(''); 
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState('検討中');
  const [contractType, setContractType] = useState('未定'); 
  const [address, setAddress] = useState(''); 

  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editForm, setEditForm] = useState<Partial<Customer>>({});

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const res = await fetch('/api/customers');
      if (res.ok) {
        setCustomers(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      alert('顧客名は必須です。');
      return;
    }

    const payload = {
      name,
      customer_rep: customerRep || null,
      email: email || null,
      phone: phone || null,
      status,
      contract_type: contractType, 
      address: address || null
    };

    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setName('');
        setCustomerRep('');
        setEmail('');
        setPhone('');
        setStatus('検討中');
        setContractType('未定'); 
        setAddress('');
        fetchCustomers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditClick = (customer: Customer) => {
    setEditingCustomer(customer);
    setEditForm({ ...customer });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;

    try {
      const res = await fetch('/api/customers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: editingCustomer.id,
          name: editForm.name,
          customer_rep: editForm.customer_rep,
          email: editForm.email,
          phone: editForm.phone,
          status: editForm.status,
          contract_type: editForm.contract_type,
          address: editForm.address
        })
      });
      if (res.ok) {
        setEditingCustomer(null);
        fetchCustomers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('この顧客データを削除してもよろしいですか？')) return;
    try {
      const res = await fetch(`/api/customers?id=${id}`, { method: 'DELETE' });
      if (res.ok) fetchCustomers();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '100%' }}>
      <header style={{ marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>顧客マスタデータベース</h1>
        <p style={{ color: 'var(--text-muted)' }}>取引状況ステータスおよび契約種別を完全に分離して管理します。</p>
      </header>

      {/* 新規顧客登録フォーム */}
      <div className="glass-panel" style={{ marginBottom: '3rem', padding: '2rem' }}>
        <h3 style={{ marginBottom: '1.5rem' }}>👥 新規顧客を登録</h3>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
            <div className="form-group">
              <label className="label">顧客名 *</label>
              <input className="input" placeholder="例: 株式会社インテグレーション" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="label">担当者名</label>
              <input className="input" placeholder="例: 山田 太郎" value={customerRep} onChange={(e) => setCustomerRep(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="label">メールアドレス</label>
              <input type="email" className="input" placeholder="example@domain.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="label">電話番号</label>
              <input type="tel" className="input" placeholder="03-XXXX-XXXX" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            {/* 👈 【レイアウト復元】取引状況と現在の契約種別をきれいに横並びに分離 */}
            <div className="form-group">
              <label className="label">取引状況 (ステータス)</label>
              <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="検討中">検討中</option>
                <option value="契約中">🎉 契約中</option>
                <option value="解約">解約</option>
              </select>
            </div>
            <div className="form-group">
              <label className="label">現在の契約種別</label>
              <select className="select" value={contractType} onChange={(e) => setContractType(e.target.value)}>
                <option value="未定">未定（検討中など）</option>
                <option value="単発">単発案件</option>
                <option value="月定額">月額定額案件 (リカーリング)</option>
                <option value="年間契約">年間契約案件</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="label">住所・アクセス情報</label>
            <input className="input" placeholder="東京都渋谷区..." value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>

          <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start', padding: '0.75rem 2rem' }}>
            👥 顧客データベースに登録
          </button>
        </form>
      </div>

      {/* 顧客一覧テーブル */}
      <div className="glass-panel" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              <th style={{ padding: '1rem', width: '60px' }}>ID</th>
              <th style={{ padding: '1rem' }}>顧客名</th>
              <th style={{ padding: '1rem' }}>担当者名</th>
              <th style={{ padding: '1rem' }}>メールアドレス</th>
              <th style={{ padding: '1rem' }}>電話番号</th>
              {/* 👈 【表示復元】取引状況と契約種別を別々の独立した列として一覧に配置 */}
              <th style={{ padding: '1rem' }}>取引状況</th>
              <th style={{ padding: '1rem' }}>契約種別</th> 
              <th style={{ padding: '1rem', textAlign: 'right' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {customers.map(c => (
              <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', fontSize: '0.9rem' }} className="table-row-hover">
                <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{c.id}</td>
                <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--primary)' }}>{c.name}</td>
                <td style={{ padding: '1rem' }}>{c.customer_rep || '---'}</td>
                <td style={{ padding: '1rem', color: 'var(--text-main)' }}>{c.email || '---'}</td>
                <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{c.phone || '---'}</td>
                <td style={{ padding: '1rem' }}>
                  <span style={{ 
                    padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600,
                    background: c.status === '契約中' ? 'rgba(16, 185, 129, 0.15)' : c.status === '解約' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                    color: c.status === '契約中' ? '#34d399' : c.status === '解約' ? '#f87171' : '#fbbf24'
                  }}>
                    {c.status}
                  </span>
                </td>
                <td style={{ padding: '1rem' }}>
                  <span style={{ 
                    padding: '0.25rem 0.6rem', 
                    borderRadius: '6px', 
                    fontSize: '0.75rem', 
                    fontWeight: 700,
                    background: c.contract_type === '月定額' ? 'rgba(168, 85, 247, 0.15)' : c.contract_type === '年間契約' ? 'rgba(236, 72, 153, 0.15)' : c.contract_type === '単発' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.05)',
                    color: c.contract_type === '月定額' ? '#c084fc' : c.contract_type === '年間契約' ? '#f472b6' : c.contract_type === '単発' ? '#60a5fa' : 'var(--text-muted)' 
                  }}>
                    {c.contract_type || '未定'}
                  </span>
                </td>
                <td style={{ padding: '1rem', textAlign: 'right' }}>
                  <button className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', marginRight: '0.5rem' }} onClick={() => handleEditClick(c)}>編集</button>
                  <button className="btn" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' }} onClick={() => handleDelete(c.id)}>削除</button>
                </td>
              </tr>
            ))}
            {customers.length === 0 && (
              <tr>
                <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>登録された顧客がいません。</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 編集用モーダル */}
      {editingCustomer && (
        <div style={{ position: 'fixed', top:0, left:0, width:'100vw', height:'100vh', background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex: 2000, padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', padding: '2rem', background: 'var(--bg-dark)', border: '1px solid var(--border)' }}>
            <h3 style={{ marginBottom: '1.5rem' }}>📝 顧客情報を編集</h3>
            <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="label">顧客名</label>
                  <input className="input" value={editForm.name || ''} onChange={(e) => setEditForm({...editForm, name: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="label">担当者名</label>
                  <input className="input" value={editForm.customer_rep || ''} onChange={(e) => setEditForm({...editForm, customer_rep: e.target.value})} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="label">メールアドレス</label>
                  <input type="email" className="input" value={editForm.email || ''} onChange={(e) => setEditForm({...editForm, email: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="label">電話番号</label>
                  <input type="tel" className="input" value={editForm.phone || ''} onChange={(e) => setEditForm({...editForm, phone: e.target.value})} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="label">取引状況</label>
                  <select className="select" value={editForm.status || '検討中'} onChange={(e) => setEditForm({...editForm, status: e.target.value})}>
                    <option value="検討中">検討中</option>
                    <option value="契約中">契約中</option>
                    <option value="解約">解約</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">現在の契約種別</label>
                  <select className="select" value={editForm.contract_type || '未定'} onChange={(e) => setEditForm({...editForm, contract_type: e.target.value})}>
                    <option value="未定">未定（検討中など）</option>
                    <option value="単発">単発案件</option>
                    <option value="月定額">月額定額案件</option>
                    <option value="年間契約">年間契約案件</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="label">住所・アクセス情報</label>
                <textarea className="input" style={{ height: '60px', paddingTop: '0.5rem' }} value={editForm.address || ''} onChange={(e) => setEditForm({...editForm, address: e.target.value})} />
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