'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Customer {
  id: number;
  name: string;
  phone: string;
  email: string;
  status: string;
  customer_rep: string;
  address: string;
  position?: string;
  postal_code?: string;
}

interface Project {
  id: string;
  name: string;
  status: string;
  order_date: string;
  amount: number;
}

interface MailLog {
  id: number;
  subject: string;
  sent_at: string;
  sender_name: string;
}

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const customerId = resolvedParams.id;
  const router = useRouter();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [mailLogs, setMailLogs] = useState<MailLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [customerId]);

  const fetchData = async () => {
    try {
      const [cRes, pRes, mRes] = await Promise.all([
        fetch(`/api/customers?id=${customerId}`),
        fetch(`/api/projects?customerId=${customerId}`),
        fetch(`/api/mail/history?customerId=${customerId}`)
      ]);

      if (cRes.ok) setCustomer(await cRes.json());
      if (pRes.ok) setProjects(await pRes.json());
      if (mRes.ok) setMailLogs(await mRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="container">データを読み込み中...</div>;
  if (!customer) return <div className="container">顧客が見つかりませんでした。</div>;

  return (
    <div className="container" style={{ maxWidth: '1200px' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button className="btn btn-secondary" onClick={() => router.back()} style={{ padding: '0.4rem 0.8rem' }}>← 戻る</button>
        <h1 style={{ margin: 0 }}>顧客詳細: {customer.name}</h1>
      </div>

      <div className="grid-responsive" style={{ gridTemplateColumns: '1fr 2.5fr' }}>
        {/* Left Col: Basic Info */}
        <div className="glass-panel">
          <h3 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>🏢 基本情報</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label className="label">顧客名</label>
              <div style={{ fontWeight: 700 }}>{customer.name}</div>
            </div>
            <div>
              <label className="label">先方担当者</label>
              <div>👤 {customer.customer_rep || '未設定'} {customer.position && `（${customer.position}）`}</div>
            </div>
            <div>
              <label className="label">取引状況</label>
              <span style={{ 
                padding: '0.2rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700,
                background: customer.status === '契約中' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                color: customer.status === '契約中' ? '#10b981' : '#3b82f6'
              }}>
                {customer.status}
              </span>
            </div>
            <div>
              <label className="label">電話番号</label>
              <div>📞 {customer.phone || '-'}</div>
            </div>
            <div>
              <label className="label">メールアドレス</label>
              <div>✉ {customer.email || '-'}</div>
            </div>
            <div>
              <label className="label">住所</label>
              <div style={{ fontSize: '0.85rem' }}>
                📍 {customer.postal_code ? `〒${customer.postal_code} ` : ''}{customer.address || '-'}
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: History */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Projects History */}
          <div className="glass-panel">
            <h3 style={{ marginBottom: '1.5rem' }}>📋 案件履歴 ({projects.length})</h3>
            <div className="table-wrapper" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>案件名</th>
                    <th style={{ width: '100px' }}>登録日</th>
                    <th>受注日</th>
                    <th>金額</th>
                    <th>ステータス</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map(p => (
                    <tr key={p.id}>
                      <td>
                        <Link href={`/projects/${p.id}`} style={{ fontWeight: 600, color: 'var(--primary)', textDecoration: 'none' }}>
                          {p.name}
                        </Link>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>ID: {p.id}</div>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{(p as any).created_at ? (p as any).created_at.split(' ')[0] : '-'}</td>
                      <td style={{ fontSize: '0.85rem' }}>{p.order_date}</td>
                      <td style={{ fontSize: '0.85rem' }}>¥{p.amount.toLocaleString()}</td>
                      <td>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: p.status === '完了' ? 'var(--accent)' : 'inherit' }}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {projects.length === 0 && (
                    <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>案件履歴はありません</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mail History */}
          <div className="glass-panel">
            <h3 style={{ marginBottom: '1.5rem' }}>✉ メール送信履歴 ({mailLogs.length})</h3>
            <div className="table-wrapper" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>件名</th>
                    <th>送信日時</th>
                    <th>送信者</th>
                  </tr>
                </thead>
                <tbody>
                  {mailLogs.map(log => (
                    <tr key={log.id}>
                      <td style={{ fontWeight: 500, fontSize: '0.9rem' }}>{log.subject}</td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{log.sent_at}</td>
                      <td style={{ fontSize: '0.8rem' }}>{log.sender_name}</td>
                    </tr>
                  ))}
                  {mailLogs.length === 0 && (
                    <tr><td colSpan={3} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>メール履歴はありません</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
