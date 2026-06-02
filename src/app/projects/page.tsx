'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';
import { toast } from 'react-hot-toast'; // 👈 共通トースト用ライブラリ

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
  const [status, setStatus] = useState('商談');
  const [amount, setAmount] = useState<number | ''>('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [deadline, setDeadline] = useState('');
  const [discussionDate, setDiscussionDate] = useState('');
  const [salesRepId, setSalesRepId] = useState('');
  const [productionRepId, setProductionRepId] = useState('');
  const [notifyExternal, setNotifyExternal] = useState(false);
  const [salesWebhook, setSalesWebhook] = useState('');
  const [productionWebhook, setProductionWebhook] = useState('');
  const [notes, setNotes] = useState('');
  const [templateId, setTemplateId] = useState('standard');
  const [sharedDriveUrl, setSharedDriveUrl] = useState('');
  const [globalWebhookUrl, setGlobalWebhookUrl] = useState('');

  // Search & Filter state
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterSalesRep, setFilterSalesRep] = useState('');

  // Autocomplete states
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);

  // Edit Modal states
  const [editingProject, setEditingProject] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<any>(null);

  const getCalendarUrl = (title: string, date: string, details: string = '', invitees: string[] = []) => {
    if (!date) return '#';
    const formattedDate = date.replace(/-/g, '');
    const end = new Date(date);
    end.setDate(end.getDate() + 1);
    const formattedEnd = end.toISOString().split('T')[0].replace(/-/g, '');
    const validEmails = invitees.filter(email => email && email.includes('@'));
    const addParam = validEmails.length > 0 ? `&add=${validEmails.join(',')}` : '';
    const baseUrl = 'https://www.google.com/calendar/render?action=TEMPLATE';
    return `${baseUrl}&text=${encodeURIComponent(title)}&dates=${formattedDate}/${formattedEnd}&details=${encodeURIComponent(details)}${addParam}&sf=true&output=xml`;
  };

  useEffect(() => {
    fetchProjects();
    fetchEmployees();
    fetchCustomers();
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const res = await fetch('/api/settings');
    const data = await res.json();
    if (data.default_shared_drive_url) {
      setSharedDriveUrl(data.default_shared_drive_url);
    }
    if (data.shared_webhook_url) {
      setGlobalWebhookUrl(data.shared_webhook_url);
    }
  };

  const fetchProjects = async () => {
    const res = await fetch('/api/projects');
    const data = await res.json();
    setProjects(data);
  };

  const fetchEmployees = async () => {
    const res = await fetch('/api/employees');
    const data = await res.json();
    setEmployees(data);
  };

  const fetchCustomers = async () => {
    const res = await fetch('/api/customers');
    const data = await res.json();
    setCustomers(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        customer_id: customerId || null,
        contract_type: contractType,
        status,
        amount: amount === '' ? 0 : amount,
        order_date: orderDate,
        deadline,
        sales_rep_id: salesRepId || null,
        production_rep_id: productionRepId || null,
        notify_external: notifyExternal,
        sales_webhook: salesWebhook,
        production_webhook: productionWebhook,
        notes,
        template_id: templateId,
        shared_drive_url: sharedDriveUrl,
        discussion_date: discussionDate
      }),
    });
    if (res.ok) {
      toast.success('案件を新しく登録しました！');
      setName('');
      setCustomerId('');
      setCustomerSearch('');
      setContractType('単発');
      setAmount('');
      setDeadline('');
      setDiscussionDate('');
      setTemplateId('standard');
      setSalesWebhook('');
      setProductionWebhook('');
      setNotes('');
      setSharedDriveUrl('');
      fetchSettings();
      fetchProjects();
    } else {
      toast.error('案件の登録に失敗しました');
    }
  };

  const handleExport = () => {
    const csv = Papa.unparse(projects);
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `projects_${new Date().toISOString().slice(0,10)}.csv`);
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
        const res = await fetch('/api/projects/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(results.data),
        });
        if (res.ok) {
          toast.success('インポートに成功しました！');
          fetchProjects();
        } else {
          toast.error('インポートに失敗しました');
        }
      }
    });
  };

  const startEdit = (project: any) => {
    setEditingProject(project);
    setEditForm({ 
      ...project,
      id: project.id 
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm || !editForm.id) {
      toast.error('エラー: 更新対象の案件IDが見つかりません');
      return;
    }

    // 👈 「完了」確認時のブラウザconfirmを撤廃し、トースト警告を出して処理を進める形に変更
    if (editForm.status === '完了' && editingProject?.status !== '完了') {
      const tRes = await fetch(`/api/tasks?projectId=${encodeURIComponent(editForm.id)}`);
      const tasks = await tRes.json();
      const unfinished = tasks.filter((t: any) => t.status !== '完了');
      if (unfinished.length > 0) {
        toast('⚠️ 未完了のタスクが残った状態で完了に更新します。', { icon: 'ℹ️' });
      }
    }

    const res = await fetch('/api/projects', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    });

    if (res.ok) {
      toast.success('案件情報を更新しました');
      setEditingProject(null);
      fetchProjects();
    } else {
      const errorData = await res.json();
      toast.error(`更新に失敗しました: ${errorData.details || '不明なエラー'}`);
    }
  };

  const handleSalesRepChange = (id: string) => {
    setSalesRepId(id);
    const emp = employees.find(e => e.id.toString() === id);
    if (emp?.notification_webhook) {
      setNotifyExternal(true);
      setSalesWebhook(emp.notification_webhook);
    }
  };

  const handleProductionRepChange = (id: string) => {
    setProductionRepId(id);
    const emp = employees.find(e => e.id.toString() === id);
    if (emp?.notification_webhook) {
      setNotifyExternal(true);
      setProductionWebhook(emp.notification_webhook);
    }
  };

  // 👈 削除時の確認ポップアップも撤廃し、即時実行してトースト通知する形に一本化
  const handleDelete = async (id: string, name: string) => {
    const res = await fetch(`/api/projects?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success(`案件「${name}」を削除しました`);
      fetchProjects();
    } else {
      const errorData = await res.json();
      toast.error(`削除に失敗しました: ${errorData.details || '不明なエラー'}`);
    }
  };

  const filteredProjects = projects.filter(p => {
    const matchesKeyword = p.name.toLowerCase().includes(searchKeyword.toLowerCase()) || 
                          (p.customer_name || '').toLowerCase().includes(searchKeyword.toLowerCase());
    const matchesSales = !filterSalesRep || p.sales_rep_id === Number(filterSalesRep);
    return matchesKeyword && matchesSales;
  });

  const teleAppointmentProjects = filteredProjects.filter(p => p.status === 'テレアポ');
  const negotiationProjects = filteredProjects.filter(p => p.status === '商談');
  const contractedProjects = filteredProjects.filter(p => p.status === '受注');
  const productionProjects = filteredProjects.filter(p => p.status === '制作');
  const completedProjects = filteredProjects.filter(p => p.status === '完了' || p.status === '失注');

  const ProjectTable = ({ data, title, showGlobalActions = false }: { data: any[], title: string, showGlobalActions?: boolean }) => (
    <div className="glass-panel" style={{ marginBottom: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}>
          <span style={{ width: '8px', height: '1.5rem', background: title.includes('進行') ? 'var(--primary)' : 'var(--text-muted)', borderRadius: '4px' }}></span>
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
            <th style={{ width: '130px' }}>案件ID</th>
            <th>発注元 / 案件名</th>
            <th>見積額（税込）</th>
            <th>日程（受/期/談）</th>
            <th>登録日</th>
            <th>担当者</th>
            <th>ステータス</th>
            <th style={{ width: '120px' }}>操作</th>
          </tr>
        </thead>
        <tbody>
          {data.map((project) => (
              <tr key={project.id} className="table-row">
                <td style={{ fontWeight: 600 }}>
                  <Link href={`/projects/${project.id}`} style={{ color: 'var(--primary)', textDecoration: 'none' }}>
                    {project.id}
                  </Link>
                  {project.status !== '完了' && project.status !== '失注' && (
                    (() => {
                      const today = new Date().toISOString().split('T')[0];
                      const isRisk = project.deadline && project.deadline <= today;
                      if (isRisk) return <span style={{ marginLeft: '0.5rem', padding: '0.1rem 0.4rem', background: 'var(--danger)', color: 'white', fontSize: '0.65rem', borderRadius: '4px', fontWeight: 800 }}>納期遅延</span>;
                      
                      const threeDaysLater = new Date();
                      threeDaysLater.setDate(threeDaysLater.getDate() + 3);
                      const riskDate = threeDaysLater.toISOString().split('T')[0];
                      if (project.deadline && project.deadline <= riskDate) return <span style={{ marginLeft: '0.5rem', padding: '0.1rem 0.4rem', background: '#f59e0b', color: 'white', fontSize: '0.65rem', borderRadius: '4px', fontWeight: 800 }}>遅延リスク</span>;
                      
                      return null;
                    })()
                  )}
                </td>
              <td>
                <Link href={`/customers/${project.customer_id}`} style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textDecoration: 'none' }}>
                  {project.customer_name || '未設定'}
                </Link>
                <div style={{ fontWeight: 600 }}>{project.name}</div>
              </td>
              <td style={{ fontSize: '0.9rem' }}>{project.amount !== '' ? `¥${Number(project.amount).toLocaleString()}` : '-'}</td>
              <td style={{ fontSize: '0.8rem' }}>
                <div>受: {project.order_date}</div>
                <div style={{ color: 'var(--text-muted)' }}>期: {project.deadline || '-'}</div>
                {project.discussion_date && <div style={{ color: 'var(--primary)' }}>談: {project.discussion_date}</div>}
              </td>
              <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {project.created_at ? project.created_at.split(' ')[0] : '-'}
              </td>
              <td style={{ fontSize: '0.8rem' }}>
                <div title="営業">営: {project.sales_rep_name || '-'}</div>
                <div title="制作" style={{ color: 'var(--text-muted)' }}>制: {project.production_rep_name || '-'}</div>
              </td>
              <td>
                <span style={{ 
                  padding: '0.25rem 0.6rem', 
                  borderRadius: '20px', 
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  background: project.status === '完了' ? 'rgba(16, 185, 129, 0.2)' : 
                              project.status === '失注' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                  color: project.status === '完了' ? '#10b981' : 
                        project.status === '失注' ? '#ef4444' : '#3b82f6'
                }}>
                  {project.status}
                </span>
              </td>
              <td>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  <button 
                    className="btn btn-secondary" 
                    style={{ padding: '0.3rem 0.6rem', fontSize: '0.85rem' }} 
                    onClick={() => {
                      const url = getCalendarUrl(`【納期】${project.name}`, project.deadline || '', `案件URL: ${window.location.origin}/projects/${project.id}`, [project.sales_rep_email || '', project.production_rep_email || '']);
                      window.open(url, 'GoogleCalendar', 'width=800,height=700,menubar=no,toolbar=no,location=no,status=no');
                    }}
                  >
                    📅
                  </button>
                  <button 
                    className="btn btn-secondary" 
                    style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem' }} 
                    onClick={() => startEdit(project)}
                  >
                    ✏️ 更新
                  </button>
                  <button 
                    className="btn btn-danger" 
                    style={{ padding: '0.3rem 0.5rem', fontSize: '0.7rem' }} 
                    onClick={() => handleDelete(project.id, project.name)}
                  >
                    🗑️
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>対象の案件はありません</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
    </div>
  );

  return (
    <div className="container" style={{ maxWidth: '1400px' }}>
      <h1 style={{ marginBottom: '2rem' }}>案件管理システム</h1>

      {/* Registration Form */}
      <div className="glass-panel" style={{ marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1.5rem' }}>新規案件登録（ID自動採番）</h3>
        <form onSubmit={handleSubmit} className="grid-responsive" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="label">案件名</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="label">初期ステータス</label>
            <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="テレアポ">テレアポ</option>
              <option value="商談">商談</option>
              <option value="受注">受注</option>
              <option value="制作">制作</option>
              <option value="失注">失注</option>
            </select>
          </div>
          <div className="form-group">
            <label className="label">契約種別</label>
            <select className="select" value={contractType} onChange={(e) => setContractType(e.target.value)}>
              <option value="単発">単発 (S)</option>
              <option value="月額定額">月額定額 (R)</option>
            </select>
          </div>

          <div className="form-group" style={{ gridColumn: 'span 2', position: 'relative' }}>
            <label className="label">発注元顧客</label>
            <input 
              className="input" 
              placeholder="顧客名を入力して検索..." 
              value={customerSearch} 
              onChange={(e) => {
                setCustomerSearch(e.target.value);
                setShowCustomerSuggestions(true);
              }}
              onFocus={() => setShowCustomerSuggestions(true)}
            />
            {showCustomerSuggestions && customerSearch && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, width: '100%', 
                background: 'var(--bg-sidebar)', border: '1px solid var(--border)',
                borderRadius: '8px', zIndex: 10, maxHeight: '200px', overflowY: 'auto',
                boxShadow: '0 10px 30px rgba(0,0,0,0.2)', backdropFilter: 'blur(10px)'
              }}>
                {customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase())).map(c => (
                  <div 
                    key={c.id} 
                    style={{ padding: '0.75rem 1rem', cursor: 'pointer', borderBottom: '1px solid var(--border)', color: 'var(--text-main)' }}
                    className="suggestion-item"
                    onClick={() => {
                      setCustomerId(c.id.toString());
                      setCustomerSearch(c.name);
                      setShowCustomerSuggestions(false);
                    }}
                  >
                    {c.name}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="form-group">
            <label className="label">工程テンプレート</label>
            <select className="select" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
              <option value="standard">標準（受注・制作・納品）</option>
              <option value="web">WEB制作（要件・デザ・実装・テスト）</option>
              <option value="sales">営業・商談（リード・アポ・クロージング）</option>
              <option value="maintenance">保守・運用（月次点検・報告）</option>
            </select>
          </div>
          <div className="form-group">
            <label className="label">受注予定日/受注日 📅</label>
            <input type="date" className="input" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} required />
          </div>

          <div className="form-group">
            <label className="label">見積額（税込）</label>
            <input 
              type="text" 
              className="input" 
              placeholder="0" 
              value={amount} 
              onChange={(e) => {
                const val = e.target.value;
                if (val === '') {
                  setAmount('');
                } else {
                  const sanitized = val.replace(/\D/g, '').replace(/^0+/, '');
                  setAmount(sanitized === '' ? 0 : Number(sanitized));
                }
              }} 
            />
          </div>
          <div className="form-group">
            <label className="label">納期 📅</label>
            <input type="date" className="input" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="label">商談予定日 📅</label>
            <input type="date" className="input" value={discussionDate} onChange={(e) => setDiscussionDate(e.target.value)} />
          </div>
          <div className="form-group" style={{ visibility: 'hidden' }}></div>

          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="label">営業担当者</label>
            <select className="select" value={salesRepId} onChange={(e) => handleSalesRepChange(e.target.value)}>
              <option value="">選択してください</option>
              {employees.filter(e => e.role === '営業' || e.role === '兼務').map(e => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="label">制作担当者</label>
            <select className="select" value={productionRepId} onChange={(e) => handleProductionRepChange(e.target.value)}>
              <option value="">選択してください</option>
              {employees.filter(e => e.role === '制作' || e.role === '兼務').map(e => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ gridColumn: 'span 4', display: 'flex', alignItems: 'center', gap: '1rem', paddingTop: '1rem' }}>
            <input type="checkbox" checked={notifyExternal} onChange={(e) => setNotifyExternal(e.target.checked)} id="notify" />
            <label htmlFor="notify" style={{ cursor: 'pointer', fontSize: '0.875rem' }}>
              外部通知（Google Chat等）を有効にする
              {globalWebhookUrl && <span style={{ color: 'var(--primary)', marginLeft: '1rem' }}>(共通Webhookが設定されています)</span>}
            </label>
          </div>

          {notifyExternal && !globalWebhookUrl && (
            <>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="label">営業用通知Webhook URL</label>
                <input className="input" placeholder="営業担当チャットへ..." value={salesWebhook} onChange={(e) => setSalesWebhook(e.target.value)} />
              </div>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="label">制作用通知Webhook URL</label>
                <input className="input" placeholder="制作担当チャットへ..." value={productionWebhook} onChange={(e) => setProductionWebhook(e.target.value)} />
              </div>
            </>
          )}

          <div className="form-group" style={{ gridColumn: 'span 4' }}>
            <label className="label">備考 / メモ</label>
            <textarea className="input" style={{ height: '80px', paddingTop: '0.5rem' }} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="案件に関する補足事項..." />
          </div>

          <div className="form-group" style={{ gridColumn: 'span 4' }}>
            <label className="label">📂 Google 共有ドライブ URL</label>
            <input className="input" placeholder="https://drive.google.com/..." value={sharedDriveUrl} onChange={(e) => setSharedDriveUrl(e.target.value)} />
          </div>
          
          <div style={{ gridColumn: 'span 4', textAlign: 'right', marginTop: '1.5rem' }}>
            <button type="submit" className="btn btn-primary" style={{ padding: '0.8rem 2.5rem', fontSize: '1.1rem', display: 'inline-flex', alignItems: 'center', gap: '0.75rem', boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)' }}>
              <span style={{ fontSize: '1.3rem' }}>🚀</span> 案件を登録する
            </button>
          </div>
        </form>
      </div>

      {/* Search & Filter Bar & Global Settings */}
      <div className="glass-panel" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '2rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.2rem opacity: 0.5' }}>🔍</span>
            <input 
              className="input" 
              placeholder="プロジェクト名・顧客名で検索..." 
              value={searchKeyword} 
              onChange={(e) => setSearchKeyword(e.target.value)} 
              style={{ border: 'none', background: 'transparent', fontSize: '1rem', padding: '0.5rem 0', width: '100%' }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <label className="label" style={{ margin: 0, whiteSpace: 'nowrap' }}>担当営業:</label>
            <select className="select" style={{ width: '150px' }} value={filterSalesRep} onChange={(e) => setFilterSalesRep(e.target.value)}>
              <option value="">すべて</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border)', marginTop: '1rem', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
            <label className="label" style={{ margin: 0, whiteSpace: 'nowrap', fontSize: '0.8rem' }}>📢 共通通知Webhook:</label>
            <input 
              className="input" 
              placeholder="未設定（環境変数またはこちらで設定）" 
              value={globalWebhookUrl} 
              onChange={(e) => setGlobalWebhookUrl(e.target.value)} 
              style={{ fontSize: '0.8rem', height: '32px' }}
            />
            <button 
              className="btn btn-secondary" 
              style={{ fontSize: '0.7rem', height: '32px', whiteSpace: 'nowrap' }}
              onClick={async () => {
                const res = await fetch('/api/settings', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ key: 'shared_webhook_url', value: globalWebhookUrl })
                });
                if (res.ok) {
                  toast.success('共通Webhook設定を保存しました');
                  fetchSettings();
                }
              }}
            >
              設定保存
            </button>
          </div>
          <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '2rem' }}>
            ※ここに設定すると、全案件の通知がこのURLに統一されます。
          </p>
        </div>
      </div>

      {/* Status-based Sections */}
      <ProjectTable data={teleAppointmentProjects} title="テレアポ中の案件" showGlobalActions={true} />
      <ProjectTable data={negotiationProjects} title="商談中の案件" />
      <ProjectTable data={contractedProjects} title="受注済みの案件" />
      <ProjectTable data={productionProjects} title="制作中の案件" />
      <ProjectTable data={completedProjects} title="完了・失注した案件" />

      {/* Edit Modal */}
      {editingProject && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, backdropFilter: 'blur(4px)'
        }}>
          <div className="glass-panel" style={{ width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ marginBottom: '1.5rem' }}>
              案件情報の更新 <span style={{ color: 'var(--primary)', marginLeft: '0.5rem', fontSize: '0.9rem' }}>[ {editForm.id} ]</span>
            </h3>
            <form onSubmit={handleUpdate}>
              <div className="form-group">
                <label className="label">案件名</label>
                <input className="input" value={editForm.name} onChange={(e) => setEditForm({...editForm, name: e.target.value})} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group" style={{ position: 'relative' }}>
                  <label className="label">顧客名</label>
                  <input 
                    className="input" 
                    value={editForm.customer_name || ''} 
                    onChange={(e) => {
                      setEditForm({...editForm, customer_name: e.target.value});
                      setShowCustomerSuggestions(true);
                    }}
                  />
                  {showCustomerSuggestions && editForm.customer_name && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, width: '100%', 
                      background: 'rgba(30,30,40,0.95)', border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px', zIndex: 10, maxHeight: '200px', overflowY: 'auto',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)'
                    }}>
                      {customers.filter(c => c.name.toLowerCase().includes(editForm.customer_name.toLowerCase())).map(c => (
                        <div 
                          key={c.id} 
                          style={{ padding: '0.75rem 1rem', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                          onClick={() => {
                            setEditForm({...editForm, customer_id: c.id, customer_name: c.name});
                            setShowCustomerSuggestions(false);
                          }}
                        >
                          {c.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label className="label">ステータス</label>
                  <select className="select" value={editForm.status} onChange={(e) => setEditForm({...editForm, status: e.target.value})}>
                    <option value="テレアポ">テレアポ</option>
                    <option value="商談">商談</option>
                    <option value="受注">受注</option>
                    <option value="制作">制作</option>
                    <option value="完了">完了</option>
                    <option value="失注">失注</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="label">見積額（税込）</label>
                  <input 
                    type="text" 
                    className="input" 
                    placeholder="0"
                    value={editForm.amount === null || editForm.amount === undefined ? '' : editForm.amount} 
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') {
                        setEditForm({...editForm, amount: ''});
                      } else {
                        const sanitized = val.replace(/\D/g, '').replace(/^0+/, '');
                        setEditForm({...editForm, amount: sanitized === '' ? 0 : Number(sanitized)});
                      }
                    }} 
                  />
                </div>
                <div className="form-group">
                  <label className="label">商談予定日 📅</label>
                  <input 
                    type="date" 
                    className="input" 
                    value={editForm.discussion_date || ''} 
                    onChange={(e) => setEditForm({...editForm, discussion_date: e.target.value})} 
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="label">受注日</label>
                  <input type="date" className="input" value={editForm.order_date} onChange={(e) => setEditForm({...editForm, order_date: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="label">納期</label>
                  <input type="date" className="input" value={editForm.deadline} onChange={(e) => setEditForm({...editForm, deadline: e.target.value})} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>保存する</button>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setEditingProject(null)}>キャンセル</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}