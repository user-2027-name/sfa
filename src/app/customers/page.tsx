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
  position?: string;
  postal_code?: string;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('見込み');
  const [customerRep, setCustomerRep] = useState('');
  const [address, setAddress] = useState('');
  const [position, setPosition] = useState('');
  const [postal_code, setPostalCode] = useState('');
  
  // Edit states
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editForm, setEditForm] = useState<any | null>(null);

  // Notification Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    const res = await fetch('/api/customers');
    const data = await res.json();
    setCustomers(data);
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const res = await fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        phone,
        email,
        status,
        customer_rep: customerRep,
        address,
        position,
        postal_code
      })
    });

    if (res.ok) {
      setName('');
      setPhone('');
      setEmail('');
      setStatus('見込み');
      setCustomerRep('');
      setAddress('');
      setPosition('');
      setPostalCode('');
      fetchCustomers();
      showToast('🎉 新しい顧客を登録しました！');
    }
  };

  const handleEditClick = (customer: Customer) => {
    setEditingCustomer(customer);
    setEditForm({ ...customer });
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm || !editForm.name.trim()) return;

    const res = await fetch('/api/customers', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm)
    });

    if (res.ok) {
      setEditingCustomer(null);
      setEditForm(null);
      fetchCustomers();
      showToast('✨ 顧客情報を更新しました！');
    } else {
      alert('更新に失敗しました');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('本当にこの顧客を削除しますか？')) return;
    const res = await fetch(`/api/customers?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
      fetchCustomers();
      showToast('🗑️ 顧客を削除しました');
    } else {
      alert('削除に失敗しました。');
    }
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        let successCount = 0;
        for (const row of results.data as any[]) {
          if (!row.name) continue;
          
          const res = await fetch('/api/customers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: row.name,
              phone: row.phone || '',
              email: row.email || '',
              status: row.status || '見込み',
              customer_rep: row.customer_rep || '',
              address: row.address || '',
              position: row.position || '',
              postal_code: row.postal_code || ''
            })
          });
          if (res.ok) successCount++;
        }
        fetchCustomers();
        showToast(`📊 CSVから ${successCount} 件の顧客をインポートしました！`);
      }
    });
  };

  return (
    <div className="container" style={{ position: 'relative' }}>
      <header style={{ marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>顧客マスタ管理</h1>
        <p style={{ color: 'var(--text-muted)' }}>クライアント企業の基本情報、および社内担当者の紐付けを管理します。</p>
      </header>

      {/* CSV Import */}
      <div className="glass-panel" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
        <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>一括データ操作</h3>
        <label className="btn btn-secondary" style={{ display: 'inline-block', cursor: 'pointer' }}>
          📂 CSVファイルをインポート
          <input type="file" accept=".csv" onChange={handleImportCSV} style={{ display: 'none' }} />
        </label>
      </div>

      <div className="grid-responsive" style={{ gridTemplateColumns: '1fr 2fr', alignItems: 'start', gap: '2rem' }}>
        {/* Registration Form */}
        <div className="glass-panel" style={{ position: 'sticky', top: '2rem' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>顧客の新規登録</h3>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="form-group">
              <label className="label">企業名 / 取引先名 <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input className="input" placeholder="株式会社〇〇" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="label">先方担当者の役職名</label>
              <input className="input" placeholder="代表取締役、部長 など" value={position} onChange={(e) => setPosition(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="label">電話番号</label>
              <input className="input" placeholder="03-XXXX-XXXX" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="label">メールアドレス</label>
              <input className="input" type="email" placeholder="client@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="label">郵便番号</label>
                <input className="input" placeholder="100-0001" value={postal_code} onChange={(e) => setPostalCode(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="label">住所</label>
                <input className="input" placeholder="東京都千代田区..." value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label className="label">社内メイン担当者</label>
              <input className="input" placeholder="スタッフ名" value={customerRep} onChange={(e) => setCustomerRep(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="label">取引状況</label>
              <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="見込み">見込み</option>
                <option value="契約中">契約中</option>
                <option value="休休中">休止中</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>顧客を登録する</button>
          </form>
        </div>

        {/* Customer List */}
        <div className="glass-panel">
          <h3 style={{ marginBottom: '1.5rem' }}>登録済みの顧客一覧 ({customers.length}社)</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {customers.map((customer) => (
              <div key={customer.id} className="card-item" style={{ padding: '1.25rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.25rem' }}>{customer.name}</h4>
                    {customer.position && (
                      <p style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 500, marginBottom: '0.5rem' }}>役職: {customer.position}</p>
                    )}
                  </div>
                  <span style={{ 
                    padding: '0.25rem 0.75rem', 
                    borderRadius: '20px', 
                    fontSize: '0.75rem', 
                    fontWeight: 700,
                    background: customer.status === '契約中' ? 'rgba(16, 185, 129, 0.15)' : customer.status === '見込み' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.05)',
                    color: customer.status === '契約中' ? '#10b981' : customer.status === '見込み' ? '#3b82f6' : 'var(--text-muted)'
                  }}>
                    {customer.status}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  <div>📞 {customer.phone || '未登録'}</div>
                  <div>✉️ {customer.email || '未登録'}</div>
                  {customer.postal_code && <div>📮 〒{customer.postal_code}</div>}
                  {customer.address && <div style={{ gridColumn: customer.postal_code ? 'auto' : 'span 2' }}>📍 {customer.address}</div>}
                  <div style={{ gridColumn: 'span 2', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
                    👤 社内担当: <span style={{ color: 'var(--text)', fontWeight: 500 }}>{customer.customer_rep || '未指定'}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => handleEditClick(customer)}>
                    ✏️ 修正
                  </button>
                  <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', color: 'var(--danger)' }} onClick={() => handleDelete(customer.id)}>
                    🗑️ 削除
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 修正用ポップアップ（モーダル） */}
      {editingCustomer && editForm && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          padding: '20px'
        }}>
          <div className="glass-panel" style={{
            width: '100%', maxWidth: '500px',
            maxHeight: 'calc(100vh - 60px)', // 👈 画面の高さに絶対に収める指定
            display: 'flex', flexDirection: 'column',
            padding: 0, overflow: 'hidden'
          }}>
            {/* 固定ヘッダー */}
            <div style={{ padding: '1.5rem 2rem 1rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <h3 style={{ margin: 0 }}>顧客情報の修正</h3>
            </div>

            {/* スクロールする入力エリア */}
            <form onSubmit={handleUpdateSubmit} style={{ 
              padding: '1rem 2rem 1.5rem 2rem', 
              overflowY: 'auto', // 👈 縦に長い場合はここがスクロールします
              flex: 1,
              display: 'flex', flexDirection: 'column', gap: '1.25rem'
            }}>
              <div className="form-group">
                <label className="label">企業名 / 取引先名</label>
                <input className="input" value={editForm.name} onChange={(e) => setEditForm({...editForm, name: e.target.value})} required />
              </div>
              <div className="form-group">
                <label className="label">先方担当者の役職名</label>
                <input className="input" value={editForm.position || ''} onChange={(e) => setEditForm({...editForm, position: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="label">電話番号</label>
                <input className="input" value={editForm.phone || ''} onChange={(e) => setEditForm({...editForm, phone: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="label">メールアドレス</label>
                <input className="input" type="email" value={editForm.email || ''} onChange={(e) => setEditForm({...editForm, email: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="label">社内メイン担当者</label>
                <input className="input" value={editForm.customer_rep || ''} onChange={(e) => setEditForm({...editForm, customer_rep: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="label">取引状況</label>
                <select className="select" value={editForm.status} onChange={(e) => setEditForm({...editForm, status: e.target.value})}>
                  <option value="見込み">見込み</option>
                  <option value="契約中">契約中</option>
                  <option value="休止中">休止中</option>
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="label">郵便番号</label>
                  <input className="input" value={editForm.postal_code || ''} onChange={(e) => setEditForm({...editForm, postal_code: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="label">住所</label>
                  <input className="input" value={editForm.address || ''} onChange={(e) => setEditForm({...editForm, address: e.target.value})} />
                </div>
              </div>
              
              {/* ボタンエリア（常に入力項目の最下部にくっつきます） */}
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>更新する</button>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setEditingCustomer(null)}>キャンセル</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 登録・更新完了ポップアップ（トースト） */}
      {toastMessage && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px',
          background: 'rgba(30, 41, 59, 0.9)',
          color: '#fff',
          padding: '1rem 2rem', borderRadius: '8px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.3)', zIndex: 2000,
          backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)',
          fontWeight: 600
        }}>
          {toastMessage}
        </div>
      )}
    </div>
  );
}