'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast'; // 👈 トースト通知を100%復活

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

  // 👈 【新設】連打防止用のローディング管理状態
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

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

    setIsSubmitting(true); // 👈 登録処理開始（ボタンをロック）

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
        toast.success('顧客を新しく登録しました！', { position: 'top-center' }); // 👈 トースト発火
        setName('');
        setCustomerRep('');
        setEmail('');
        setPhone('');
        setStatus('検討中');
        setContractType('未定'); 
        setAddress('');
        await fetchCustomers();
      } else {
        toast.error('登録に失敗しました', { position: 'top-center' });
      }
    } catch (err) {
      console.error(err);
      toast.error('通信エラーが発生しました', { position: 'top-center' });
    } finally {
      setIsSubmitting(false); // 👈 処理終了（ボタンロック解除）
    }
  };

  const handleEditClick = (customer: Customer) => {
    setEditingCustomer(customer);
    setEditForm({ ...customer });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;

    setIsUpdating(true); // 👈 更新処理開始（ボタンをロック）

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
        toast.success('顧客情報を更新しました', { position: 'top-center' }); // 👈 トースト発火
        setEditingCustomer(null);
        await fetchCustomers();
      } else {
        toast.error('更新に失敗しました', { position: 'top-center' });
      }
    } catch (err) {
      console.error(err);
      toast.error('通信エラーが発生しました', { position: 'top-center' });
    } finally {
      setIsUpdating(false); // 👈 処理終了（ボタンロック解除）
    }
  };

  const handleDelete = async (id: number, customerName: string) => {
    try {
      const res = await fetch(`/api/projects?customerId=${id}`);
      if (!res.ok) throw new Error('案件データの確認に失敗しました');
      
      const relatedProjects = await res.json();
      
      if (relatedProjects && relatedProjects.length > 0) {
        alert(`⚠️ 削除できません\n\n顧客「${customerName}」には、まだ紐づいている案件が ${relatedProjects.length} 件残っています。\n先に「案件管理」画面から対象の案件を削除するか、所属顧客を変更してください。`);
        return;
      }

      if (!confirm(`顧客「${customerName}」を削除してもよろしいですか？`)) return;

      const deleteRes = await fetch(`/api/customers?id=${id}`, { method: 'DELETE' });
      if (deleteRes.ok) {
        toast.success(`顧客「${customerName}」を削除しました`, { position: 'top-center' });
        fetchCustomers();
      } else {
        toast.error('顧客の削除に失敗しました。', { position: 'top-center' });
      }
    } catch (err) {
      console.error(err);
      toast.error('通信エラーが発生しました。', { position: 'top-center' });
    }
  };

  const activeCustomers = customers.filter(c => c.status === '契約中');
  const leadCustomers = customers.filter(c => c.status !== '契約中');

  const CustomerTable = ({ data, title, icon }: { data: Customer[], title: string, icon: string }) => (
    <div className="glass-panel" style={{ marginBottom: '2.5rem', overflowX: 'auto' }}>
      <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span>{icon}</span> {title} ({data.length}件)
      </h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            <th style={{ padding: '1rem', width: '60px' }}>ID</th>
            <th style={{ padding: '1rem' }}>顧客名</th>
            <th style={{ padding: '1rem' }}>担当者名</th>
            <th style={{ padding: '1rem' }}>メールアドレス</th>
            <th style={{ padding: '1rem' }}>電話番号</th>
            <th style={{ padding: '1rem' }}>取引状況</th>
            <th style={{ padding: '1rem' }}>契約種別</th> 
            <th style={{ padding: '1rem', width: '120px' }}>登録日</th> 
            <th style={{ padding: '1rem', textAlign: 'right', width: '140px' }}>操作</th>
          </tr>
        </thead>
        <tbody>
          {data.map(c => (
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
              <td style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                {c.created_at ? c.created_at.substring(0, 10) : '---'}
              </td>
              <td style={{ padding: '1rem', textAlign: 'right' }}>
                <button className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', marginRight: '0.5rem' }} onClick={() => handleEditClick(c)}>編集</button>
                <button className="btn" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' }} onClick={() => handleDelete(c.id, c.name)}>削除</button>
              </td>
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan={9} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>対象の顧客データがありません。</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="container" style={{ maxWidth: '100%' }}>
      <header style={{ marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>顧客マスタデータベース</h1>
        <p style={{ color: 'var(--text-muted)' }}>取引状況ごとに表示を完全に分離し、各顧客の契約種別を詳細に可視化します。</p>
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

          {/* 👈 【修正】処理中はボタン文言を変更し、disabledでクリック不可能にする */}
          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ alignSelf: 'flex-start', padding: '0.75rem 2rem', opacity: isSubmitting ? 0.6 : 1, cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
            disabled={isSubmitting}
          >
            {isSubmitting ? '⏳ 登録処理中...' : '👥 顧客データベースに登録'}
          </button>
        </form>
      </div>

      <CustomerTable data={activeCustomers} title="現在契約中の顧客マスタ" icon="🎉" />
      <CustomerTable data={leadCustomers} title="検討中（見込み）および解約の顧客一覧" icon="🔍" />

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
                {/* 👈 【修正】編集用モーダルの保存ボタンも同様にブロック制御 */}
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ flex: 1, opacity: isUpdating ? 0.6 : 1, cursor: isUpdating ? 'not-allowed' : 'pointer' }}
                  disabled={isUpdating}
                >
                  {isUpdating ? '⏳ 更新中...' : '更新する'}
                </button>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setEditingCustomer(null)} disabled={isUpdating}>キャンセル</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}