'use client';

import { useState } from 'react';

export default function IntegrationPage() {
  const [url, setUrl] = useState('https://example.com');
  const [targetUrl, setTargetUrl] = useState('https://example.com');
  const [settings, setSettings] = useState<any>({});

  useState(() => {
    fetch('/api/settings').then(res => res.json()).then(data => setSettings(data));
  });

  const handleGo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setTargetUrl(url);
  };

  const updateSetting = (key: string, value: string) => {
    setSettings({ ...settings, [key]: value });
  };

  const saveSetting = async (key: string) => {
    if (!confirm('システム全体のデフォルト値を変更してもよろしいですか？')) return;

    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value: settings[key] })
    });
    
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || '設定の保存に失敗しました');
      // Revert local state to actual DB value
      fetch('/api/settings').then(res => res.json()).then(data => setSettings(data));
      return;
    }

    alert('設定を保存しました');
  };

  return (
    <div style={{ height: 'calc(100vh - 4rem)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ 
        padding: '1rem', 
        background: 'var(--bg-card)', 
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem'
      }}>
        <h3 style={{ margin: 0, fontSize: '1rem', whiteSpace: 'nowrap' }}>🛠️ 外部ツール表示</h3>
        <form onSubmit={handleGo} style={{ flex: 1, display: 'flex', gap: '0.5rem' }}>
          <input 
            className="input" 
            style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }} 
            value={url} 
            onChange={(e) => setUrl(e.target.value)}
            placeholder="表示したいURLを入力..."
          />
          <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }} disabled={!url.trim()}>表示</button>
          <a 
            href={targetUrl || '#'} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="btn btn-secondary" 
            style={{ 
              padding: '0.5rem 1rem', 
              fontSize: '0.8rem', 
              textDecoration: 'none',
              pointerEvents: targetUrl ? 'auto' : 'none',
              opacity: targetUrl ? 1 : 0.5
            }}
          >
            別タブで開く ↗
          </a>
        </form>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', maxWidth: '200px' }}>
          ※ セキュリティ設定(X-Frame-Options)により表示できないサイトがあります。
        </div>
      </div>

      <div style={{ flex: 1, background: '#fff', position: 'relative', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '2rem', background: 'var(--bg-dark)', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            ⚙️ システム設定（デフォルト値）
          </h2>
          <div className="glass-panel" style={{ maxWidth: '600px', padding: '1.5rem' }}>
            <div className="form-group">
              <label className="label">プロジェクトのデフォルト共有ドライブURL</label>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <input 
                  className="input" 
                  value={settings.default_shared_drive_url || ''} 
                  onChange={(e) => updateSetting('default_shared_drive_url', e.target.value)}
                  placeholder="https://drive.google.com/..."
                />
                <button className="btn btn-primary" onClick={() => saveSetting('default_shared_drive_url')}>保存</button>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                ※ 新規案件を登録する際、最初からこのURLが入力された状態になります。
              </p>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, position: 'relative' }}>
          {targetUrl ? (
            <iframe 
              src={targetUrl}
              style={{ 
                width: '100%', 
                height: '100%', 
                border: 'none',
                background: '#fff'
              }}
              title="External Tool"
            />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
              URLを入力して「表示」ボタンを押してください。
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
