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
  const [stats, setStats] = useState({ projects: 0, customers: 0, employees: 0, totalRevenue: 0, totalForecast: 0 });
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [salesByMonth, setSalesByMonth] = useState<{ month: string, confirmed: number, forecast: number, annual: number }[]>([]);
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
        .reduce((acc: number, p: any) => acc + Number(p.amount || 0), 0);

      const totalFore = projects
        .filter((p: any) => p.status === 'テレアポ' || p.status === '商談')
        .reduce((acc: number, p: any) => acc + Number(p.amount || 0), 0);

      setStats({
        projects: projects.length,
        customers: customers.length,
        employees: employees.length,
        totalRevenue: totalRev,
        totalForecast: totalFore
      });

      // 💡 確定・見込みに加えて、年間契約（月割り）を保持するマップ構造
      const monthlyMap: Record<string, { confirmed: number, forecast: number, annual: number }> = {};
      
      // グラフ表示用のベースとなる直近6ヶ月のキーを予め生成して初期化（年間契約の按分が過去や未来に綺麗に分散できるようにするため）
      const current = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(current.getFullYear(), current.getMonth() - i, 1);
        const mKey = d.toISOString().substring(0, 7);
        monthlyMap[mKey] = { confirmed: 0, forecast: 0, annual: 0 };
      }

      projects.forEach((p: any) => {
        const projectAmount = Number(p.amount || 0);
        const baseMonth = p.order_date ? p.order_date.substring(0, 7) : new Date().toISOString().substring(0, 7);
        
        // 🌟 contract_type が '年間契約' の場合のみ12ヶ月に月割り（按分）して加算
        if (p.contract_type === '年間契約') {
          if (p.status === '失注') return; // 失注は除外
          
          const monthlyAmount = projectAmount / 12;
          const orderDate = p.order_date ? new Date(p.order_date) : new Date();
          
          for (let i = 0; i < 12; i++) {
            const targetDate = new Date(orderDate.getFullYear(), orderDate.getMonth() + i, 1);
            const targetMonth = targetDate.toISOString().substring(0, 7);
            
            // 直近6ヶ月の表示範囲内であれば按分金額を加算
            if (monthlyMap[targetMonth] !== undefined) {
              monthlyMap[targetMonth].annual += monthlyAmount;
            }
          }
        } else {
          // 通常案件（単発契約）は今まで通り受注月に全額計上
          if (!monthlyMap[baseMonth]) {
            monthlyMap[baseMonth] = { confirmed: 0, forecast: 0, annual: 0 };
          }
          
          if (p.status === '受注' || p.status === '制作' || p.status === '完了') {
            monthlyMap[baseMonth].confirmed += projectAmount;
          } else if (p.status === 'テレアポ' || p.status === '商談') {
            monthlyMap[baseMonth].forecast += projectAmount;
          }
        }
      });

      // マップから配列に変換し、直近6ヶ月分をソートして確定
      const sortedMonths = Object.entries(monthlyMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, data]) => ({
          month,
          confirmed: data.confirmed,
          forecast: data.forecast,
          annual: data.annual
        }))
        .slice(-6);

      setSalesByMonth(sortedMonths);

      const sMap: Record<string, number> = {};
      const funnelData = { tele: 0, negotiation: 0, order: 0 };
      
      projects.forEach((p: any) => {
        sMap[p.status] = (sMap[p.status] || 0) + 1;
        funnelData.tele++;
        if (p.status_negotiation_at) funnelData.negotiation++;
        if (p.status_order_at) funnelData.order++;
      });
      
      setStatusCounts(Object.entries(sMap).map(([status, count]) => ({ status, count })));
      setFunnel(funnelData);

      const wMap: Record<string, number> = {};
      projects.forEach((p: any) => {
        if (p.status !== '完了' && p.status !== '失注') {
          if (p.sales_rep_name) wMap[p.sales_rep_name] = (wMap[p.sales_rep_name] || 0) + 1;
          if (p.production_rep_name) wMap[p.production_rep_name] = (wMap[p.production_rep_name] || 0) + 1;
        }
      });
      setRepWorkload(Object.entries(wMap).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count })));

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
    csvContent += `累計成約額(確定),¥${stats.totalRevenue.toLocaleString()}\n`;
    csvContent += `見込み合計額,¥${stats.totalForecast.toLocaleString()}\n`;
    csvContent += `稼働中案件数,${stats.projects}\n`;
    csvContent += `登録顧客数,${stats.customers}\n`;
    csvContent += `アラート数,${alerts.length}\n\n`;
    
    csvContent += '月別売上推移,確定金額,見込み金額,年間契約(按分)\n';
    salesByMonth.forEach(s => {
      csvContent += `${s.month},${s.confirmed},${s.forecast},${s.annual}\n`;
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

  // 💡 3つの値（確定・見込み・年間契約）の中から最大値を算出してグラフの上限を動的決定
  const maxSale = Math.max(...salesByMonth.map(s => Math.max(s.confirmed, s.forecast, s.annual)), 1);

  return (
    <div className="container" style={{ maxWidth: '100%' }}>
      
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

      {/* サマリーカード行 */}
      <div className="grid-responsive desktop-stats-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', marginBottom: '3rem', gap: '1rem' }}>
        <div className="glass-panel" style={{ borderTop: '4px solid var(--primary)' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>累計成約額（確定）</p>
          <h2 style={{ fontSize: '1.6rem' }}>¥{(stats.totalRevenue / 10000).toLocaleString()} <span style={{ fontSize: '0.8rem', fontWeight: 400 }}>万</span></h2>
        </div>
        <div className="glass-panel" style={{ borderTop: '4px solid #a855f7' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>進行中の見込み総額</p>
          <h2 style={{ fontSize: '1.6rem' }}>¥{(stats.totalForecast / 10000).toLocaleString()} <span style={{ fontSize: '0.8rem', fontWeight: 400 }}>万</span></h2>
        </div>
        <div className="glass-panel" style={{ borderTop: '4px solid var(--accent)' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>すべての登録案件数</p>
          <h2 style={{ fontSize: '1.6rem' }}>{stats.projects} <span style={{ fontSize: '0.8rem', fontWeight: 400 }}>件</span></h2>
        </div>
        <div className="glass-panel" style={{ borderTop: '4px solid #ec4899' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>顧客数</p>
          <h2 style={{ fontSize: '1.6rem' }}>{stats.customers} <span style={{ fontSize: '0.8rem', fontWeight: 400 }}>社</span></h2>
        </div>
        <div className="glass-panel" style={{ borderTop: '4px solid #f59e0b' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>アラート</p>
          <h2 style={{ fontSize: '1.6rem', color: alerts.length > 0 ? 'var(--danger)' : 'var(--text)' }}>{alerts.length} <span style={{ fontSize: '0.8rem', fontWeight: 400 }}>件</span></h2>
        </div>
      </div>

      {/* グラフとステータス分布行 */}
      <div className="grid-responsive desktop-charts-row" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', marginBottom: '2rem', gap: '2rem' }}>
        <div className="glass-panel" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0 }}>売上推移（直近6ヶ月）</h3>
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span style={{ display: 'inline-block', width: '12px', height: '12px', background: 'var(--primary)', borderRadius: '3px' }}></span> 確定分
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#a855f7', borderRadius: '3px' }}></span> 見込み分
              </span>
              {/* 💡 凡例に「年間契約」を追加 */}
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span style={{ display: 'inline-block', width: '12px', height: '12px', background: 'var(--accent)', borderRadius: '3px' }}></span> 年間契約(按分)
              </span>
            </div>
          </div>
          
          <div style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            {/* 💡 バーが3本に増えたため、見切れを防ぐために最小幅(minWidth)を 460px から 540px に微調整 */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1.25rem', height: '260px', paddingBottom: '30px', paddingTop: '30px', width: '100%', minWidth: '540px', paddingLeft: '10px', paddingRight: '10px' }}>
              {salesByMonth.map((s, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
                  {/* 💡 バーを3本並列表示するために gap を調整 */}
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', width: '100%', height: '100%', justifyContent: 'center' }}>
                    
                    {/* 1. 確定分バー */}
                    <div style={{ 
                      width: '26%', 
                      height: `${(s.confirmed / maxSale) * 100}%`, 
                      background: 'linear-gradient(to top, var(--primary), #2563eb)',
                      borderRadius: '4px 4px 0 0',
                      position: 'relative',
                      boxShadow: '0 0 10px rgba(59, 130, 246, 0.1)'
                    }}>
                      {s.confirmed > 0 && (
                        <div style={{ position: 'absolute', top: '-22px', width: '100%', textAlign: 'center', fontSize: '0.6rem', fontWeight: 700, color: 'var(--primary)', whiteSpace: 'nowrap' }}>
                          ¥{(Math.round(s.confirmed) / 10000).toLocaleString()}万
                        </div>
                      )}
                    </div>

                    {/* 2. 見込み分バー */}
                    <div style={{ 
                      width: '26%', 
                      height: `${(s.forecast / maxSale) * 100}%`, 
                      background: 'linear-gradient(to top, #a855f7, #c084fc)',
                      borderRadius: '4px 4px 0 0',
                      position: 'relative',
                      boxShadow: '0 0 10px rgba(168, 85, 247, 0.1)'
                    }}>
                      {s.forecast > 0 && (
                        <div style={{ position: 'absolute', top: '-22px', width: '100%', textAlign: 'center', fontSize: '0.6rem', fontWeight: 700, color: '#a855f7', whiteSpace: 'nowrap' }}>
                          ¥{(Math.round(s.forecast) / 10000).toLocaleString()}万
                        </div>
                      )}
                    </div>

                    {/* 3. 🌟 年間契約バー（エメラルドグリーン基調のグラデーション） */}
                    <div style={{ 
                      width: '26%', 
                      height: `${(s.annual / maxSale) * 100}%`, 
                      background: 'linear-gradient(to top, var(--accent), #34d399)',
                      borderRadius: '4px 4px 0 0',
                      position: 'relative',
                      boxShadow: '0 0 10px rgba(16, 185, 129, 0.1)'
                    }}>
                      {s.annual > 0 && (
                        <div style={{ position: 'absolute', top: '-22px', width: '100%', textAlign: 'center', fontSize: '0.6rem', fontWeight: 700, color: 'var(--accent)', whiteSpace: 'nowrap' }}>
                          ¥{(Math.round(s.annual) / 10000).toLocaleString()}万
                        </div>
                      )}
                    </div>

                  </div>
                  <div style={{ marginTop: '1rem', fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)' }}>{s.month.split('-')[1]}月</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="glass-panel">
          <h3 style={{ marginBottom: '1.5rem' }}>案件ステータス分布</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {statusCounts.map((s, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 500 }}>{s.status}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{s.count} ({Math.round(s.count/(stats.projects || 1)*100)}%)</span>
                </div>
                <div style={{ height: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '5px' }}>
                  <div style={{ 
                    width: `${(s.count / (stats.projects || 1)) * 100}%`, 
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

      <div className="grid-responsive desktop-3column-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem', marginBottom: '2rem' }}>
        
        {/* 1カラム目: セールスファンネル */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>セールスファンネル（歩留まり）</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', alignItems: 'center', flex: 1, justifyContent: 'center' }}>
            <div style={{ width: '100%', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>全リード</div>
              <div style={{ padding: '0.4rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '6px', border: '1px solid var(--primary)', fontSize: '0.85rem', fontWeight: 700 }}>
                {funnel.tele} 件
              </div>
            </div>
            
            <div style={{ fontSize: '0.7rem', color: 'var(--primary)', lineHeight: 1 }}>⬇ {funnel.tele > 0 ? Math.round((funnel.negotiation / funnel.tele) * 100) : 0}%</div>
            
            <div style={{ width: '85%', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>商談化</div>
              <div style={{ padding: '0.4rem', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '6px', border: '1px solid #8b5cf6', fontSize: '0.85rem', fontWeight: 700 }}>
                {funnel.negotiation} 件
              </div>
            </div>

            <div style={{ fontSize: '0.7rem', color: '#8b5cf6', lineHeight: 1 }}>⬇ {funnel.negotiation > 0 ? Math.round((funnel.order / funnel.negotiation) * 100) : 0}%</div>

            <div style={{ width: '70%', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>受注</div>
              <div style={{ padding: '0.4rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '6px', border: '1px solid #10b981', fontSize: '0.85rem', fontWeight: 700 }}>
                {funnel.order} 件
              </div>
            </div>
            
            <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', fontWeight: 600, textAlign: 'center' }}>
              総合成約率: <span style={{ color: 'var(--accent)' }}>{funnel.tele > 0 ? ((funnel.order / funnel.tele) * 100).toFixed(1) : 0}%</span>
            </div>
          </div>
        </div>

        {/* 2カラム目: 緊急対応・遅延アラート */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: 'var(--danger)' }}>⚡</span> 緊急対応・遅延
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1, justifyContent: alerts.length === 0 ? 'center' : 'flex-start' }}>
            {alerts.slice(0, 4).map((alert, idx) => (
              <div key={idx} style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.1)', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{alert.projectName}</p>
                  <p style={{ fontSize: '0.7rem', color: 'var(--danger)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{alert.taskName} 遅延 ({alert.dueDate ? alert.dueDate.substring(5,10) : ''})</p>
                </div>
                <Link href={`/projects/${alert.projectId}`} className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.65rem', whiteSpace: 'nowrap' }}>工程へ</Link>
              </div>
            ))}
            {alerts.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1rem', margin: 0, fontSize: '0.85rem' }}>全ての工程が順調です ✨</p>}
          </div>
        </div>

        {/* 3カラム目: 担当者別 進行案件数 */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>担当者別 進行案件数</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, overflowY: 'auto', maxHeight: '290px' }}>
            {repWorkload.slice(0, 4).map((rw, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem', background: 'rgba(255,255,255,0.01)', borderRadius: '10px', borderLeft: rw.count >= 8 ? '4px solid #ef4444' : rw.count >= 5 ? '4px solid #f59e0b' : '4px solid transparent' }}>
                <div style={{ 
                  width: '28px', height: '28px', flexShrink: 0,
                  background: rw.count >= 8 ? '#ef4444' : rw.count >= 5 ? '#f59e0b' : 'var(--primary)', 
                  borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800, color: '#fff' 
                }}>
                  {i + 1}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {rw.name}
                    {rw.count >= 8 ? <span>💀</span> : rw.count >= 5 ? <span>⚠️</span> : null}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {rw.count} 案件担当中
                  </div>
                </div>
                <div style={{ 
                  padding: '0.1rem 0.5rem', flexShrink: 0,
                  background: rw.count >= 8 ? 'rgba(239, 68, 68, 0.15)' : rw.count >= 5 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.05)', 
                  color: rw.count >= 8 ? '#ef4444' : rw.count >= 5 ? '#f59e0b' : 'inherit',
                  borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700 
                }}>
                  {rw.count}
                </div>
              </div>
            ))}
            {repWorkload.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1rem', margin: 0, fontSize: '0.85rem' }}>現在稼働中の担当者はいません。</p>}
          </div>
        </div>

      </div>

      <style jsx global>{`
        @media (max-width: 992px) {
          .desktop-3column-row {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 768px) {
          header, .desktop-stats-row, .desktop-charts-row {
            grid-template-columns: 1fr !important;
          }
          header {
            text-align: center;
          }
          header .btn {
            width: 100% !important;
            margin-top: 1rem;
          }
        }
      `}</style>

      <footer style={{ marginTop: '3rem', padding: '2rem', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
        <button className="btn btn-secondary" onClick={handleRecurring} style={{ fontSize: '0.85rem', width: '100%', maxWidth: '400px' }}>
          🔄 定期案件の翌月工程を一括生成する
        </button>
      </footer>
    </div>
  );
}