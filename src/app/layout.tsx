'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SessionProvider, signOut, useSession } from 'next-auth/react';
import { Toaster } from 'react-hot-toast'; // 👈 トーストライブラリをインポート
import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [theme, setTheme] = useState('dark');
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  };

  return (
    <SessionProvider>
      <html lang="ja">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        {/* 👈 アプリ全体でトーストポップアップを表示するための受け皿を設置（指示以外のデザイン変更はナシ） */}
        <Toaster position="top-right" reverseOrder={false} />

        <div className="app-layout">
          {!isLoginPage && (
            <aside 
              className="sidebar"
              style={{
                height: '100vh',
                display: 'flex',
                flexDirection: 'column',
                overflowY: 'auto'
              }}
            >
            <h2 style={{ marginBottom: '2rem', fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)' }}>SFA Integration</h2>
            <nav className="sidebar-nav">
              <Link href="/" className="nav-link">📊 ダッシュボード</Link>
              <Link href="/kanban" className="nav-link">📋 案件カンバン</Link>
              <div className="nav-divider"></div>
              <Link href="/projects" className="nav-link">案件管理</Link>
              <Link href="/customers" className="nav-link">顧客マスタ</Link>
              <Link href="/employees" className="nav-link">従業員マスタ</Link>
              <Link href="/mail" className="nav-link">✉ メール送信</Link>
              <div className="nav-divider"></div>
              <Link href="/integration" className="nav-link">🛠️ 外部連携</Link>
            </nav>
            <div style={{ marginTop: 'auto', paddingTop: '2rem' }}>
              <button 
                onClick={toggleTheme}
                style={{ 
                  width: '100%', 
                  padding: '0.75rem', 
                  borderRadius: '12px', 
                  background: 'var(--glass)', 
                  border: '1px solid var(--border)',
                  color: 'var(--text-main)',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                {theme === 'dark' ? '☀️ ライトモードへ' : '🌙 ダークモードへ'}
              </button>
            </div>
            <div style={{ marginTop: '1rem', paddingBottom: '1rem' }}>
              <button 
                onClick={() => signOut({ callbackUrl: '/login' })}
                style={{ 
                  width: '100%', 
                  padding: '0.75rem', 
                  borderRadius: '12px', 
                  background: 'rgba(239, 68, 68, 0.1)', 
                  border: '1px solid rgba(239, 68, 68, 0.1)',
                  color: 'var(--danger)',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                🚪 ログアウト
              </button>
            </div>
          </aside>
          )}
          <main className="main-content">
            {children}
          </main>
        </div>
      </body>
    </html>
    </SessionProvider>
  );
}