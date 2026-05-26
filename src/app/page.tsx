'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Alert {
  type: 'due' | 'idle';
  projectId: string;
  projectName: string;
  taskName?: string;
  dueDate?: string;
}

export default function Home() {
  const [stats, setStats] = useState({ projects: 0, customers: 0, employees: 0, totalRevenue: 0 });
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [salesByMonth, setSalesByMonth] = useState<{ month: string, amount: number }[]>([]);
  const [statusCounts, setStatusCounts] = useState<{ status: string, count: number }[]>([]);
  const [funnel, setFunnel] = useState({ tele: 0, negotiation: 0, order: 0 });
  const [repWorkload, setRepWorkload] = useState<{ name: string, count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [pRes, cRes, eRes] = await Promise.all([
        fetch('/api/projects'),
        fetch('/api/customers'),
        fetch('/api/employees')
      ]);

      const projects = await pRes.json();
      const customers = await cRes.json();
      const employees = await eRes.json();

      const totalRev = projects
        .filter((p: any) => p.status === '受注' || p.status === '制作' || p.status === '完了')
        .reduce((acc: number, p: any) => acc + (p.amount || 0), 0);

      setStats({
        projects: projects.length,
        customers: customers.length,
        employees: employees.length,
        totalRevenue: totalRev
      });

      // Sales by Month
      const salesMap: Record<string, number> = {};
      projects.forEach((p: any) => {
        const month = p.order_date.substring(0, 7);
        salesMap[month] = (salesMap[month] || 0) + (p.amount || 0);
      });
      setSalesByMonth(Object.entries(salesMap).sort().map(([month, amount]) => ({ month, amount })).slice(-6));

      // Status Counts
      const sMap: Record<string, number> = {};
      const funnelData = { tele: 0, negotiation: 0, order: 0 };
      
      projects.forEach((p: any) => {
        // Status counts for pie/bar chart
        sMap[p.status] = (sMap[p.status] || 0) + 1;
        
        // Funnel counts based on reached milestones
        funnelData.tele++; // Total entry
        if (p.status_negotiation_at) funnelData.negotiation++;
        if (p.status_order_at) funnelData.order++;
      });
      
      setStatusCounts(Object.entries(sMap).map(([status, count]) => ({ status, count })));
      setFunnel(funnelData);

      // Workload Aggregation (Both Sales and Production)
      const wMap: Record<string, number> = {};
      projects.forEach((p: any) => {
        // Only count ongoing/active projects (not Completed or Lost)
        if (p.status !== '完了' && p.status !== '失注') {
          if (p.sales_rep_name) wMap[p.sales_rep_name] = (wMap[p.sales_rep_name] || 0) + 1;
          if (p.production_rep_name) wMap[p.production_rep_name] = (wMap[p.production_rep_name] || 0) + 1;
        }
      });
      setRepWorkload(Object.entries(wMap).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count })));

      // Alerts
      const newAlerts: Alert[] = [];
      const today = new Date().toISOString().split('T')[0];
      for (const project of projects.slice(0, 10)) {
        const tRes = await fetch(`/api/tasks?projectId=${project.id}`);
        const tasks = await tRes.json();
        for (const task of tasks) {
          if (task.status !== '完了' && task.due_date < today) {
            newAlerts.push({ type: 'due', projectId: project.id, projectName: project.name, taskName: task.name, dueDate: task.due_date });
          }
        }
      }
      setAlerts(newAlerts);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRecurring = async () => {
    if (!confirm('月額定額案件の翌月分工程を自動生成しますか？')) return;
    const res = await fetch('/api/recurring', { method: 'POST' });
    if (res.ok) {
      alert('リカーリング生成が完了しました。');
      fetchDashboardData();
    }
  };

  const handleExportDashboard = () => {
    let csvContent = '項目,値\n';
    csvContent += `累計成約額,¥${stats.totalRevenue.toLocaleString()}\n`;
    csvContent += `稼働中案件数,${stats.projects}\n`;
    csvContent += `登録顧客数,${stats.customers}\n`;
    csvContent += `アラート数,${alerts.length}\n\n`;
    
    csvContent += '月別売上推移,金額\n';
    salesByMonth.forEach(s => {
      csvContent += `${s.month},${s.amount}\n`;
    });
    
    csvContent += '\n案件ステータス分布,件数\n';
    statusCounts.forEach(s => {
      csvContent += `${s.status},${s.count}\n`;
    });

    csvContent += '\n担当者別稼働状況,案件数\n';
    repWorkload.forEach(r => {
      csvContent += `${r.name},${r.count}\n`;
    });

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `dashboard_report_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh', fontSize: '1.2rem', color: 'var(--primary)' }}>Analyzing System Data...</div>;

  const maxSale = Math.max(...salesByMonth.map(s => s.amount), 1);

  return (
    <div className="container">
      <header className="grid-responsive" style={{ marginBottom: '3rem', gridTemplateColumns: '1fr auto', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>分析ダッシュボード</h1>
          <p style={{ color: 'var(--text-muted)' }}>システムの稼働状況と主要な経営指標を各セクションから抽出しています。</p>
        </div>
        <div>
          <button className="btn btn-secondary" onClick={handleExportDashboard} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', justifyContent: 'center' }}>
            📊 レポートを出力
          </button>
        </div>
      </header>

      {/* Main Stats Row */}
      <div className="grid-responsive" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '3rem' }}>
        <div className="glass-panel" style={{ borderTop: '4px solid var(--primary)' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>累計成約額</p>
          <h2 style={{ fontSize: '2rem' }}>¥{(stats.totalRevenue / 10000).toLocaleString()} <span style={{ fontSize: '0.8rem', fontWeight: 400 }}>万</span></h2>
        </div>
        <div className="glass-panel" style={{ borderTop: '4px solid var(--accent)' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>稼働中案件</p>
          <h2 style={{ fontSize: '2rem' }}>{stats.projects} <span style={{ fontSize: '0.8rem', fontWeight: 400 }}>件</span></h2>
        </div>
        <div className="glass-panel" style={{ borderTop: '4px solid #ec4899' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>顧客数</p>
          <h2 style={{ fontSize: '2rem' }}>{stats.customers} <span style={{ fontSize: '0.8rem', fontWeight: 400 }}>社</span></h2>
        </div>
        <div className="glass-panel" style={{ borderTop: '4px solid #f59e0b' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>アラート</p>
          <h2 style={{ fontSize: '2rem', color: alerts.length > 0 ? 'var(--danger)' : 'var(--text)' }}>{alerts.length} <span style={{ fontSize: '0.8rem', fontWeight: 400 }}>件</span></h2>
        </div>
      </div>

      <div className="grid-responsive" style={{ gridTemplateColumns: '2fr 1fr', marginBottom: '2rem' }}>
        {/* Sales visualization */}
        <div className="glass-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h3>売上推移（直近6ヶ月）</h3>
            <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>受注ベース</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1.5rem', height: '250px', paddingBottom: '30px', paddingTop: '20px' }}>
            {salesByMonth.map((s, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
                <div style={{ 
                  width: '100%', 
                  height: `${(s.amount / maxSale) * 100}%`, 
                  background: 'linear-gradient(to top, var(--primary), var(--accent))',
                  borderRadius: '6px',
                  position: 'relative',
                  boxShadow: '0 0 20px rgba(59, 130, 246, 0.2)'
                }}>
                  <div style={{ position: 'absolute', top: '-25px', width: '100%', textAlign: 'center', fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)' }}>
                    ¥{(s.amount / 10000).toFixed(0)}w
                  </div>
                </div>
                <div style={{ marginTop: '1rem', fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)' }}>{s.month.split('-')[1]}月</div>
              </div>
            ))}
          </div>
        </div>

        {/* Status Distribution */}
        <div className="glass-panel">
          <h3 style={{ marginBottom: '1.5rem' }}>案件ステータス分布</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {statusCounts.map((s, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 500 }}>{s.status}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{s.count} ({Math.round(s.count/stats.projects*100)}%)</span>
                </div>
                <div style={{ height: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '5px' }}>
                  <div style={{ 
                    width: `${(s.count / stats.projects) * 100}%`, 
                    height: '100%', 
                    background: s.status === '完了' ? '#3b82f6' : s.status === '受注' ? '#10b981' : s.status === '失注' ? '#ef4444' : '#f59e0b',
                    borderRadius: '5px',
                    boxShadow: '0 0 10px rgba(255,255,255,0.05)'
                  }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid-responsive" style={{ gridTemplateColumns: 'minmax(0, 1fr) 2fr', marginBottom: '2rem' }}>
        {/* Sales Funnel Analysis */}
        <div className="glass-panel">
          <h3 style={{ marginBottom: '1.5rem' }}>セールスファンネル（歩留まり）</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem', alignItems: 'center' }}>
            <div style={{ width: '100%', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>全リード</div>
              <div style={{ padding: '0.5rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '6px', border: '1px solid var(--primary)', fontSize: '0.9rem', fontWeight: 700 }}>
                {funnel.tele} 件
              </div>
            </div>
            
            <div style={{ fontSize: '0.75rem', color: 'var(--primary)' }}>⬇ {funnel.tele > 0 ? Math.round((funnel.negotiation / funnel.tele) * 100) : 0}%</div>
            
            <div style={{ width: '85%', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>商談化</div>
              <div style={{ padding: '0.5rem', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '6px', border: '1px solid #8b5cf6', fontSize: '0.9rem', fontWeight: 700 }}>
                {funnel.negotiation} 件
              </div>
            </div>

            <div style={{ fontSize: '0.75rem', color: '#8b5cf6' }}>⬇ {funnel.negotiation > 0 ? Math.round((funnel.order / funnel.negotiation) * 100) : 0}%</div>

            <div style={{ width: '70%', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>受注</div>
              <div style={{ padding: '0.5rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '6px', border: '1px solid #10b981', fontSize: '0.9rem', fontWeight: 700 }}>
                {funnel.order} 件
              </div>
            </div>
            
            <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', fontWeight: 600 }}>
              総合成約率: <span style={{ color: 'var(--accent)' }}>{funnel.tele > 0 ? ((funnel.order / funnel.tele) * 100).toFixed(1) : 0}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid-responsive" style={{ gridTemplateColumns: '1fr 1fr' }}>
        {/* Urgent Alerts */}
        <div className="glass-panel">
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: 'var(--danger)' }}>⚡</span> 緊急対応・遅延
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {alerts.slice(0, 4).map((alert, idx) => (
              <div key={idx} style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.1)', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.2rem' }}>{alert.projectName}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--danger)' }}>{alert.taskName} が期限切れ ({alert.dueDate})</p>
                </div>
                <Link href={`/projects/${alert.projectId}`} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.7rem' }}>工程へ</Link>
              </div>
            ))}
            {alerts.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>全ての工程が順調です ✨</p>}
          </div>
        </div>

        {/* Rep Ranking / Workload */}
        <div className="glass-panel">
          <h3 style={{ marginBottom: '1.5rem' }}>担当者別 進行案件数</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {repWorkload.slice(0, 10).map((rw, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', borderLeft: rw.count >= 8 ? '4px solid #ef4444' : rw.count >= 5 ? '4px solid #f59e0b' : '4px solid transparent' }}>
                <div style={{ 
                  width: '40px', height: '40px', 
                  background: rw.count >= 8 ? '#ef4444' : rw.count >= 5 ? '#f59e0b' : 'var(--primary)', 
                  borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff' 
                }}>
                  {i + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {rw.name}
                    {rw.count >= 8 ? <span>💀</span> : rw.count >= 5 ? <span>⚠️</span> : null}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: rw.count >= 8 ? '#ef4444' : rw.count >= 5 ? '#f59e0b' : 'var(--text-muted)', fontWeight: rw.count >= 5 ? 700 : 400 }}>
                    {rw.count} 案件を担当中
                  </div>
                </div>
                <div style={{ 
                  padding: '0.25rem 0.75rem', 
                  background: rw.count >= 8 ? 'rgba(239, 68, 68, 0.2)' : rw.count >= 5 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.05)', 
                  color: rw.count >= 8 ? '#ef4444' : rw.count >= 5 ? '#f59e0b' : 'inherit',
                  borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700 
                }}>
                  {rw.count}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <footer style={{ marginTop: '3rem', padding: '2rem', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
        <button className="btn btn-secondary" onClick={handleRecurring} style={{ fontSize: '0.85rem' }}>
          🔄 定期案件の翌月工程を一括生成する
        </button>
      </footer>
    </div>
  );
}
