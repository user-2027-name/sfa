'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';
import { toast } from 'react-hot-toast'; 

interface Employee {
  id: number;
  name: string;
  department: string;
  role: string;
  notification_webhook?: string;
}

interface Project {
  id: string;
  name: string;
  contract_type: string;
  status: string;
  amount: number | '';
  order_date: string;
  deadline: string;
  sales_rep_id: number | null;
  production_rep_id: number | null;
  customer_id: number | null;
  sales_rep_name: string;
  sales_rep_email?: string;
  production_rep_name: string;
  production_rep_email?: string;
  customer_name?: string;
  created_at?: string;
  discussion_date?: string;
  sales_webhook?: string;
  production_webhook?: string;
  notes?: string;
}

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  
  // Form states
  const [name, setName] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [contractType, setContractType] = useState('単発'); 
  const [status, setStatus] = useState('テレアポ');
  const [amount, setAmount] = useState<number | ''>('');
  const [orderDate, setOrderDate] = useState('');
  const [deadline, setDeadline] = useState('');
  const [salesRepId, setSalesRepId] = useState('');
  const [productionRepId, setProductionRepId] = useState('');
  const [discussionDate, setDiscussionDate] = useState('');
  const [salesWebhook, setSalesWebhook] = useState('');
  const [productionWebhook, setProductionWebhook] = useState('');
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'すべて' | '単発' | '月定額' | '年間契約'>('すべて');
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editForm, setEditForm] = useState<Partial<Project>>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [pRes, eRes, cRes] = await Promise.all([
        fetch('/api/projects'),
        fetch('/api/employees'),
        fetch('/api/customers')
      ]);
      setProjects(await pRes.json());
      setEmployees(await eRes.json());
      setCustomers(await cRes.json());
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !customerId) {
      alert('案件名と顧客の選択は必須です。');
      return;
    }

    setIsSubmitting(true); 

    const payload = {
      name,
      customer_id: Number(customerId),
      contract_type: contractType, 
      status,
      amount: amount === '' ? 0 : Number(amount),
      order_date: orderDate || new Date().toISOString().split('T')[0],
      deadline: deadline || new Date().toISOString().split('T')[0],
      sales_rep_id: salesRepId ? Number(salesRepId) : null,
      production_rep_id: productionRepId ? Number(productionRepId) : null,
      discussion_date: discussionDate || null,
      sales_webhook: salesWebhook || null,
      production_webhook: productionWebhook || null,
      notes: notes || null
    };

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        toast.success('新しい案件をスピーディに構築しました！', { position: 'top-center' }); 
        setName('');
        setCustomerId('');
        setContractType('単発');
        setStatus('テレアポ');
        setAmount('');
        setOrderDate('');
        setDeadline('');
        setSalesRepId('');
        setProductionRepId('');
        setDiscussionDate('');
        setSalesWebhook('');
        setProductionWebhook('');
        setNotes('');
        await fetchData();
      } else {
        toast.error('案件の登録に失敗しました', { position: 'top-center' });
      }
    } catch (err) {
      console.error(err);
      toast.error('通信エラーが発生しました', { position: 'top-center' });
    } finally {
      setIsSubmitting(false); 
    }
  };

  const handleEditClick = (project: Project) => {
    setEditingProject(project);
    setEditForm({ ...project });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;

    setIsUpdating(true); 

    try {
      const res = await fetch('/api/projects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editForm,
          id: editingProject.id
        })
      });
      if (res.ok) {
        toast.success('案件情報を正常に再構成しました', { position: 'top-center' }); 
        setEditingProject(null);
        await fetchData();
      } else {
        const errorData = await res.json();
        toast.error(`更新失敗: ${errorData.details || 'サーバーエラー'}`, { position: 'top-center' });
      }
    } catch (err) {
      console.error(err);
      toast.error('通信エラーが発生しました', { position: 'top-center' });
    } finally {
      setIsUpdating(false); 
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('この案件を削除してもよろしいですか？')) return;
    
    setDeletingId(id); 

    try {
      const res = await fetch(`/api/projects?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('案件を完全に消去しました', { position: 'top-center' });
        await fetchData();
      } else {
        toast.error('削除に失敗しました', { position: 'top-center' });
      }
    } catch (err) {
      console.error(err);
      toast.error('通信エラーが発生しました', { position: 'top-center' });
    } finally {
      setDeletingId(null); 
    }
  };

  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 💡 大文字の Papa.parse に修正し型エラーを完全に解消しました
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        let successCount = 0;
        for (const row of results.data as any[]) {
          let csvContractType = row['契約種別'] || '単発';
          if (csvContractType.includes('年間')) {
            csvContractType = '年間契約';
          }

          const payload = {
            name: row['案件名'],
            customer_id: Number(row['顧客ID']),
            contract_type: csvContractType,
            status: row['ステータス'] || 'テレアポ',
            amount: Number(row['金額'] || 0),
            order_date: row['受注日'] || new Date().toISOString().split('T')[0],
            deadline: row['納期'] || new Date().toISOString().split('T')[0],
            sales_rep_id: row['営業担当ID'] ? Number(row['営業担当ID']) : null,
            production_rep_id: row['制作担当ID'] ? Number(row['制作担当ID']) : null,
            discussion_date: row['商談日時'] || null,
            notes: row['備考'] || null
          };

          try {
            const res = await fetch('/api/projects', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });
            if (res.ok) successCount++;
          } catch (err) {
            console.error(err);
          }
        }
        toast.success(`${successCount} 件の案件をインポートしました`, { position: 'top-center' });
        fetchData();
      }
    });
  };

  const filteredProjects = projects.filter(p => {
    if (activeTab === 'すべて') return true;
    return p.contract_type === activeTab;
  });

  return (
    <div className="container" style={{ maxWidth: '100%' }}>
      <header style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>案件マスター管理</h1>
          <p style={{ color: 'var(--text-muted)' }}>新規案件の追加、一覧のフィルタリング、CSVインポートおよび編集を行えます。</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <label className="btn btn-secondary" style={{ cursor: 'pointer', margin: 0 }}>
            📥 CSVインポート
            <input type="file" accept=".csv" style={{ display: 'none' }} onChange={handleCSVImport} />
          </label>
        </div>
      </header>

      {/* 新規追加フォーム */}
      <div className="glass-panel" style={{ marginBottom: '3rem', padding: '2rem' }}>
        <h3 style={{ marginBottom: '1.5rem' }}>✨ 新規案件を登録</h3>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
            <div className="form-group">
              <label className="label">案件名 *</label>
              <input className="input" placeholder="例: Webサイトリニューアル" value={name} onChange={(e) => setName(e.target.value)} required disabled={isSubmitting} />
            </div>
            <div className="form-group">
              <label className="label">所属顧客 *</label>
              <select className="input" value={customerId} onChange={(e) => setCustomerId(e.target.value)} required disabled={isSubmitting}>
                <option value="">-- 顧客を選択 --</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label">契約種別</label>
              <select className="input" value={contractType} onChange={(e) => setContractType(e.target.value)} disabled={isSubmitting}>
                <option value="単発">単発案件</option>
                <option value="月定額">月額定額案件 (リカーリング)</option>
                <option value="年間契約">年間契約案件</option>
              </select>
            </div>
            <div className="form-group">
              <label className="label">初期ステータス</label>
              <select className="input" value={status} onChange={(e) => setStatus(e.target.value)} disabled={isSubmitting}>
                <option value="テレアポ">テレアポ</option>
                <option value="商談">商談</option>
                <option value="受注">受注</option>
                <option value="制作">制作</option>
                <option value="完了">完了</option>
                <option value="失注">失注</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
            <div className="form-group">
              <label className="label">契約金額 (税別)</label>
              <input type="number" className="input" placeholder="金額を半角数字で入力" value={amount} onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))} disabled={isSubmitting} />
            </div>
            <div className="form-group">
              <label className="label">営業受注日 (起算日)</label>
              <input type="date" className="input" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} disabled={isSubmitting} />
            </div>
            <div className="form-group">
              <label className="label">完了・納期期限</label>
              <input type="date" className="input" value={deadline} onChange={(e) => setDeadline(e.target.value)} disabled={isSubmitting} />
            </div>
            <div className="form-group">
              <label className="label">次回商談日時 (任意)</label>
              <input type="datetime-local" className="input" value={discussionDate} onChange={(e) => setDiscussionDate(e.target.value)} disabled={isSubmitting} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
            <div className="form-group">
              <label className="label">営業担当者</label>
              <select className="input" value={salesRepId} onChange={(e) => setSalesRepId(e.target.value)} disabled={isSubmitting}>
                <option value="">指定なし</option>
                {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name} ({emp.department})</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label">制作ディレクター / 担当</label>
              <select className="input" value={productionRepId} onChange={(e) => setProductionRepId(e.target.value)} disabled={isSubmitting}>
                <option value="">指定なし</option>
                {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name} ({emp.department})</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            <div className="form-group">
              <label className="label">営業用通知WebHook URL (独自設定用)</label>
              <input className="input" placeholder="https://chatwork.com/gateway/..." value={salesWebhook} onChange={(e) => setSalesWebhook(e.target.value)} disabled={isSubmitting} />
            </div>
            <div className="form-group">
              <label className="label">制作用通知WebHook URL (独自設定用)</label>
              <input className="input" placeholder="https://hooks.slack.com/services/..." value={productionWebhook} onChange={(e) => setProductionWebhook(e.target.value)} disabled={isSubmitting} />
            </div>
          </div>

          <div className="form-group">
            <label className="label">備考欄・引き継ぎメモ</label>
            <textarea className="input" style={{ height: '80px', paddingTop: '0.5rem' }} placeholder="案件に関する特記事項や詳細など" value={notes} onChange={(e) => setNotes(e.target.value)} disabled={isSubmitting} />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ marginTop: '0.5rem', alignSelf: 'flex-start', padding: '0.75rem 2rem', opacity: isSubmitting ? 0.6 : 1, cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
            disabled={isSubmitting || deletingId !== null}
          >
            {isSubmitting ? '⏳ 登録処理中...' : '➕ この内容で案件を新規構築'}
          </button>
        </form>
      </div>

      {/* タブと一覧 */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', overflowX: 'auto' }}>
        {(['すべて', '単発', '月定額', '年間契約'] as const).map(tab => (
          <button 
            key={tab} 
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '0.6rem 1.2rem',
              background: activeTab === tab ? 'var(--primary)' : 'transparent',
              color: activeTab === tab ? '#fff' : 'var(--text-muted)',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.9rem',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s'
            }}
          >
            {tab === 'すべて' ? '📁 全案件表示' : tab === '単発' ? '🎯 単発契約一覧' : tab === '月定額' ? '🔄 月定額一覧' : '📆 年間契約一覧'}
          </button>
        ))}
      </div>

      <div className="glass-panel" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1000px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              <th style={{ padding: '1rem' }}>案件名</th>
              <th style={{ padding: '1rem' }}>所属顧客</th>
              <th style={{ padding: '1rem' }}>契約タイプ</th>
              <th style={{ padding: '1rem' }}>現ステータス</th>
              <th style={{ padding: '1rem' }}>金額</th>
              <th style={{ padding: '1rem' }}>受注起算日</th>
              <th style={{ padding: '1rem' }}>期限・納期</th>
              <th style={{ padding: '1rem' }}>営業担当</th>
              <th style={{ padding: '1rem' }}>制作担当</th>
              <th style={{ padding: '1rem', textAlign: 'right' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredProjects.map(p => (
              <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', fontSize: '0.9rem' }} className="table-row-hover">
                <td style={{ padding: '1rem', fontWeight: 600 }}>
                  <Link href={`/projects/${p.id}`} style={{ color: 'var(--primary)', textDecoration: 'none' }}>{p.name}</Link>
                </td>
                <td style={{ padding: '1rem', color: 'var(--text-main)' }}>{p.customer_name || `未設定 (ID: ${p.customer_id})`}</td>
                <td style={{ padding: '1rem' }}>
                  <span style={{ 
                    padding: '0.25rem 0.6rem', 
                    borderRadius: '6px', 
                    fontSize: '0.75rem', 
                    fontWeight: 700,
                    background: p.contract_type === '月定額' ? 'rgba(168, 85, 247, 0.15)' : p.contract_type === '年間契約' ? 'rgba(236, 72, 153, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                    color: p.contract_type === '月定額' ? '#c084fc' : p.contract_type === '年間契約' ? '#f472b6' : '#60a5fa' 
                  }}>
                    {p.contract_type}
                  </span>
                </td>
                <td style={{ padding: '1rem' }}>
                  <span style={{ 
                    padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600,
                    background: p.status === '完了' ? 'rgba(16, 185, 129, 0.15)' : p.status === '失注' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                    color: p.status === '完了' ? '#34d399' : p.status === '失注' ? '#f87171' : '#fbbf24'
                  }}>
                    {p.status}
                  </span>
                </td>
                <td style={{ padding: '1rem', fontWeight: 700 }}>¥{(Number(p.amount || 0)).toLocaleString()}</td>
                <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>
                  {p.order_date ? p.order_date.substring(0, 10) : '---'}
                </td>
                <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>
                  {p.deadline ? p.deadline.substring(0, 10) : '---'}
                </td>
                <td style={{ padding: '1rem' }}>{p.sales_rep_name || '未指定'}</td>
                <td style={{ padding: '1rem' }}>{p.production_rep_name || '未指定'}</td>
                <td style={{ padding: '1rem', textAlign: 'right' }}>
                  <button className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', marginRight: '0.5rem' }} onClick={() => handleEditClick(p)} disabled={deletingId !== null}>編集</button>
                  <button 
                    className="btn" 
                    style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', opacity: deletingId !== null ? 0.5 : 1 }} 
                    onClick={() => handleDelete(p.id)}
                    disabled={deletingId !== null}
                  >
                    {deletingId === p.id ? '⏳...' : '削除'}
                  </button>
                </td>
              </tr>
            ))}
            {filteredProjects.length === 0 && (
              <tr>
                <td colSpan={10} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>該当する案件がありません。</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 編集用モーダル */}
      {editingProject && (
        <div style={{ position: 'fixed', top:0, left:0, width:'100vw', height:'100vh', background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex: 2000, padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '700px', padding: '2rem', maxHeight: '90vh', overflowY: 'auto', background: 'var(--bg-dark)', border: '1px solid var(--border)' }}>
            <h3 style={{ marginBottom: '1.5rem' }}>📝 案件情報を再構成</h3>
            <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="label">案件名</label>
                  <input className="input" value={editForm.name || ''} onChange={(e) => setEditForm({...editForm, name: e.target.value})} required disabled={isUpdating} />
                </div>
                <div className="form-group">
                  <label className="label">契約種別</label>
                  <select className="input" value={editForm.contract_type || '単発'} onChange={(e) => setEditForm({...editForm, contract_type: e.target.value})} disabled={isUpdating}>
                    <option value="単発">単発案件</option>
                    <option value="月定額">月額定額案件</option>
                    <option value="年間契約">年間契約案件</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="label">ステータス</label>
                  <select className="input" value={editForm.status || '商談'} onChange={(e) => setEditForm({...editForm, status: e.target.value})} disabled={isUpdating}>
                    <option value="テレアポ">テレアポ</option>
                    <option value="商談">商談</option>
                    <option value="受注">受注</option>
                    <option value="制作">制作</option>
                    <option value="完了">完了</option>
                    <option value="失注">失注</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">金額</label>
                  <input type="number" className="input" value={editForm.amount ?? ''} onChange={(e) => setEditForm({...editForm, amount: e.target.value === '' ? '' : Number(e.target.value)})} disabled={isUpdating} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="label">営業受注日</label>
                  <input type="date" className="input" value={editForm.order_date ? editForm.order_date.substring(0,10) : ''} onChange={(e) => setEditForm({...editForm, order_date: e.target.value})} disabled={isUpdating} />
                </div>
                <div className="form-group">
                  <label className="label">期限・納期</label>
                  <input type="date" className="input" value={editForm.deadline ? editForm.deadline.substring(0,10) : ''} onChange={(e) => setEditForm({...editForm, deadline: e.target.value})} disabled={isUpdating} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="label">営業担当者</label>
                  <select className="input" value={editForm.sales_rep_id ?? ''} onChange={(e) => setEditForm({...editForm, sales_rep_id: e.target.value ? Number(e.target.value) : null})} disabled={isUpdating}>
                    <option value="">指定なし</option>
                    {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">制作担当者</label>
                  <select className="input" value={editForm.production_rep_id ?? ''} onChange={(e) => setEditForm({...editForm, production_rep_id: e.target.value ? Number(e.target.value) : null})} disabled={isUpdating}>
                    <option value="">指定なし</option>
                    {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="label">営業用通知URL</label>
                  <input className="input" placeholder="営業WebHook..." value={editForm.sales_webhook || ''} onChange={(e) => setEditForm({...editForm, sales_webhook: e.target.value})} disabled={isUpdating} />
                </div>
                <div className="form-group">
                  <label className="label">制作用通知URL</label>
                  <input className="input" placeholder="制作WebHook..." value={editForm.production_webhook || ''} onChange={(e) => setEditForm({...editForm, production_webhook: e.target.value})} disabled={isUpdating} />
                </div>
              </div>

              <div className="form-group">
                <label className="label">備考 / メモ</label>
                <textarea className="input" style={{ height: '80px', paddingTop: '0.5rem' }} value={editForm.notes || ''} onChange={(e) => setEditForm({...editForm, notes: e.target.value})} disabled={isUpdating} />
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ flex: 1, opacity: isUpdating ? 0.6 : 1, cursor: isUpdating ? 'not-allowed' : 'pointer' }}
                  disabled={isUpdating}
                >
                  {isUpdating ? '⏳ 更新中...' : '保存する'}
                </button>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setEditingProject(null)} disabled={isUpdating}>キャンセル</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}