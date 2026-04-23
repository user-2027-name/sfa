'use client';

import { useState, useEffect } from 'react';

interface Customer {
  id: number;
  name: string;
  email?: string;
  last_sent_at?: string;
}

export default function MailPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomers, setSelectedCustomers] = useState<Customer[]>([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [fromName, setFromName] = useState('システム管理者');
  const [fromEmail, setFromEmail] = useState('noreply@example.com');
  const [history, setHistory] = useState<any[]>([]);
  const [viewingHistory, setViewingHistory] = useState<any | null>(null);
  const [sending, setSending] = useState(false);
  const [attachments, setAttachments] = useState<{ name: string, url: string }[]>([]);
  const [showAddAttachment, setShowAddAttachment] = useState(false);
  const [newAttachmentName, setNewAttachmentName] = useState('');
  const [newAttachmentUrl, setNewAttachmentUrl] = useState('');

  useEffect(() => {
    fetchCustomers();
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/mail/history');
      const data = await res.json();
      if (Array.isArray(data)) {
        setHistory(data);
      } else {
        console.error('Mail history data is not an array:', data);
        setHistory([]);
      }
    } catch (err) {
      console.error('Failed to fetch mail history:', err);
      setHistory([]);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await fetch('/api/customers');
      const data = await res.json();
      if (Array.isArray(data)) {
        setCustomers(data.filter((c: Customer) => c.email));
      } else {
        console.error('Customer data is not an array:', data);
        setCustomers([]);
      }
    } catch (err) {
      console.error('Failed to fetch customers:', err);
      setCustomers([]);
    }
  };

  const toggleSelect = (customer: Customer) => {
    if (selectedCustomers.some(c => c.id === customer.id)) {
      setSelectedCustomers(selectedCustomers.filter(c => c.id !== customer.id));
    } else {
      setSelectedCustomers([...selectedCustomers, customer]);
    }
  };

  const templates = [
    { name: '【選択なし】', subject: '', body: '' },
    { 
      name: '新規ご挨拶', 
      subject: '新サービスのご案内', 
      body: `{name}\n\n平素より大変お世話になっております。\n株式会社◯◯の△△でございます。\n\nこの度、弊社の新サービスがリリースされましたのでご案内させていただきます。\n詳細は以下のURLよりご確認いただけます。\n\n今後ともよろしくお願い申し上げます。` 
    },
    { 
      name: '受注お礼', 
      subject: 'この度はご依頼いただきありがとうございました', 
      body: `{name}\n\nいつもお世話になっております。\n株式会社◯◯の△△です。\n\n本日は、本案件のご発注をいただき誠にありがとうございました。\n今後のスケジュール等につきましては、追って工程管理システムより共有させていただきます。\n\n引き続き、何卒よろしくお願いいたします。` 
    },
    { 
      name: '納期・進捗連絡', 
      subject: '現在の制作進捗状況につきまして', 
      body: `{name}\n\nお世話になっております。\nプロジェクトの進捗状況をお知らせいたします。\n\n現在、第2フェーズまで順調に進行しております。\n次回の工程完了予定は [日付] となっております。\n\nご確認のほどよろしくお願いいたします。` 
    }
  ];

  const applyTemplate = (name: string) => {
    const t = templates.find(temp => temp.name === name);
    if (!t) return;
    setSubject(t.subject);
    setBody(t.body);
  };

  const handleSend = async () => {
    if (selectedCustomers.length === 0) return alert('送信先を選択してください');
    if (!subject || !body) return alert('件名と本文を入力してください');

    setSending(true);
    try {
      const res = await fetch('/api/mail/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          fromName,
          fromEmail,
          recipients: selectedCustomers.map(c => ({ name: c.name, email: c.email })),
          subject,
          body,
          attachments
        }),
      });

      if (res.ok) {
        alert('個別送信（擬似）が完了しました。サーバーログで一人ひとりに宛てた送付記録を確認できます。');
        setSubject('');
        setBody('');
        setAttachments([]);
        setSelectedCustomers([]);
        fetchHistory();
      }
    } catch (err) {
      alert('送信に失敗しました');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="container">
      <h1 style={{ marginBottom: '2rem' }}>✉ メール一括送信</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
        {/* Selection Area */}
        <div className="glass-panel">
          <h3 style={{ marginBottom: '1.5rem' }}>送信先選択</h3>
          <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-secondary" style={{ flex: 1, fontSize: '0.75rem' }} onClick={() => setSelectedCustomers([...customers])}>全選択</button>
            <button className="btn btn-secondary" style={{ flex: 1, fontSize: '0.75rem' }} onClick={() => setSelectedCustomers([])}>解除</button>
          </div>
          <div style={{ maxHeight: '500px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {customers.map(c => (
              <label key={c.id} style={{ 
                display: 'flex', alignItems: 'center', gap: '1rem', 
                padding: '0.75rem', borderRadius: '8px', 
                background: selectedCustomers.some(sc => sc.id === c.id) ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                cursor: 'pointer', transition: '0.2s',
                border: selectedCustomers.some(sc => sc.id === c.id) ? '1px solid var(--primary)' : '1px solid transparent'
              }}>
                <input type="checkbox" checked={selectedCustomers.some(sc => sc.id === c.id)} onChange={() => toggleSelect(c)} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{c.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.email}</div>
                  {c.last_sent_at && (
                    <div style={{ 
                      marginTop: '0.25rem', 
                      fontSize: '0.65rem', 
                      color: '#10b981', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.3rem' 
                    }}>
                      <span style={{ 
                        background: 'rgba(16, 185, 129, 0.15)', 
                        padding: '0.1rem 0.4rem', 
                        borderRadius: '4px',
                        fontWeight: 700
                      }}>
                        ✉️ 送信履歴あり
                      </span>
                      <span>({new Date(c.last_sent_at).toLocaleDateString()})</span>
                    </div>
                  )}
                </div>
              </label>
            ))}
            {customers.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>メールアドレスが登録されている顧客がいません。</p>}
          </div>
        </div>

        {/* Writing Area */}
        <div className="glass-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: 0 }}>送信内容</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>定型文:</span>
              <select 
                className="select" 
                style={{ width: 'auto', padding: '0.4rem 1rem', fontSize: '0.8rem' }}
                onChange={(e) => applyTemplate(e.target.value)}
              >
                {templates.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
              </select>
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="label">送信者名</label>
              <input className="input" style={{ fontSize: '0.875rem' }} value={fromName} onChange={(e) => setFromName(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="label">送信元メールアドレス</label>
              <input type="email" className="input" style={{ fontSize: '0.875rem' }} value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} />
            </div>
          </div>

          <p style={{ fontSize: '0.8rem', color: 'var(--primary)', marginBottom: '1rem', padding: '0.5rem', background: 'rgba(37, 99, 235, 0.1)', borderRadius: '4px' }}>
            💡 ヒント: 本文中に <strong>{'{name}'}</strong> と入力すると、顧客名（◯◯ 様）に自動置換されます。
          </p>
          <div className="form-group">
            <label className="label">件名</label>
            <input className="input" placeholder="キャンペーンのお知らせ" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="label">本文</label>
            <textarea 
              className="input" 
              style={{ minHeight: '350px', resize: 'vertical' }}
              placeholder={`{name}\nいつもお世話になっております...`}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>添付ファイル (Google Drive)</span>
              <button 
                className="btn btn-secondary" 
                style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
                onClick={() => setShowAddAttachment(true)}
              >
                + ファイルを追加
              </button>
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
              {attachments.map((file, idx) => (
                <div key={idx} style={{ 
                  background: 'rgba(59, 130, 246, 0.1)', 
                  border: '1px solid rgba(59, 130, 246, 0.3)', 
                  borderRadius: '6px', padding: '0.4rem 0.8rem', 
                  fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' 
                }}>
                  <span style={{ color: 'var(--primary)' }}>📄</span>
                  <span style={{ fontWeight: 600 }}>{file.name}</span>
                  <button 
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0 0.2rem' }}
                    onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))}
                  >
                    ×
                  </button>
                </div>
              ))}
              {attachments.length === 0 && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>添付ファイルはありません</p>}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>宛先件数: {selectedCustomers.length} 件</span>
            <button className="btn btn-primary" style={{ padding: '0.75rem 2rem' }} onClick={handleSend} disabled={sending}>
              {sending ? '送信完了を待機中...' : 'メールを個別送信する'}
            </button>
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{ marginTop: '2rem' }}>
        <h3 style={{ marginBottom: '1.5rem' }}>最近の送信履歴</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>送信日時</th>
              <th>送信者</th>
              <th>件名</th>
              <th>宛先数</th>
            </tr>
          </thead>
          <tbody>
            {history.map((h) => (
              <tr key={h.id} onClick={() => setViewingHistory(h)} style={{ cursor: 'pointer' }}>
                <td style={{ fontSize: '0.8rem' }}>{new Date(h.sent_at).toLocaleString()}</td>
                <td>
                  <div style={{ fontSize: '0.8rem' }}>{h.from_name}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{h.from_email}</div>
                </td>
                <td style={{ fontWeight: 600 }}>{h.subject}</td>
                <td>
                  <span style={{ padding: '0.2rem 0.5rem', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '4px', fontSize: '0.8rem' }}>
                    {h.recipient_count} 件
                  </span>
                </td>
              </tr>
            ))}
            {history.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>履歴がありません。</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* History Detail Modal */}
      {viewingHistory && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, backdropFilter: 'blur(8px)'
        }}>
          <div className="glass-panel" style={{ width: '90%', maxWidth: '700px', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
              <h3>メール送信詳細</h3>
              <button className="btn btn-secondary" onClick={() => setViewingHistory(null)}>閉じる</button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="label">送信日時</label>
                <div style={{ fontSize: '0.9rem' }}>{new Date(viewingHistory.sent_at).toLocaleString()}</div>
              </div>
              <div>
                <label className="label">件名</label>
                <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{viewingHistory.subject}</div>
              </div>
              <div>
                <label className="label">本文内容</label>
                <div style={{ 
                  background: 'rgba(0,0,0,0.2)', 
                  padding: '1.5rem', 
                  borderRadius: '8px', 
                  whiteSpace: 'pre-wrap',
                  fontSize: '0.9rem',
                  lineHeight: '1.6',
                  color: '#e2e8f0',
                  border: '1px solid var(--border)'
                }}>
                  {viewingHistory.body}
                </div>
              </div>
              <div style={{ textAlign: 'right', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                宛先合計: {viewingHistory.recipient_count} 件
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Drive Attachment Modal */}
      {showAddAttachment && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1100, backdropFilter: 'blur(8px)'
        }}>
          <div className="glass-panel" style={{ width: '400px' }}>
            <h3 style={{ marginBottom: '1.5rem' }}>Driveファイルの追加</h3>
            <div className="form-group">
              <label className="label">表示名 (例: お見積書.pdf)</label>
              <input 
                className="input" 
                value={newAttachmentName} 
                onChange={(e) => setNewAttachmentName(e.target.value)} 
                placeholder="ファイル名を入力" 
              />
            </div>
            <div className="form-group">
              <label className="label">Google Driveの共有URL</label>
              <input 
                className="input" 
                value={newAttachmentUrl} 
                onChange={(e) => setNewAttachmentUrl(e.target.value)} 
                placeholder="https://drive.google.com/..." 
              />
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button 
                className="btn btn-secondary" 
                style={{ flex: 1 }} 
                onClick={() => {
                  setShowAddAttachment(false);
                  setNewAttachmentName('');
                  setNewAttachmentUrl('');
                }}
              >
                キャンセル
              </button>
              <button 
                className="btn btn-primary" 
                style={{ flex: 1 }}
                onClick={() => {
                  if (!newAttachmentName || !newAttachmentUrl) return alert('名称とURLを入力してください');
                  setAttachments([...attachments, { name: newAttachmentName, url: newAttachmentUrl }]);
                  setShowAddAttachment(false);
                  setNewAttachmentName('');
                  setNewAttachmentUrl('');
                }}
              >
                追加する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
