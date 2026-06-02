'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SessionProvider, signOut, useSession } from 'next-auth/react';
import { Toaster } from 'react-hot-toast';
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
        <Toaster position="top-center" reverseOrder={false} />

        <div className="app-layout">
          {!isLoginPage && (
            /* ⚠️ インラインスタイルを「サイドバー専用クラス」としてcss命令（最下部に記述）に分離し、PCとスマホの競合を完全解消 */
            <aside className="sidebar responsive-sidebar">
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
              <div className="sidebar-footer-btn-group" style={{ marginTop: 'auto', paddingTop: '2rem' }}>
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
              <div className="sidebar-footer-btn-group" style={{ marginTop: '1rem', paddingBottom: '1rem' }}>
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

        {/* ⚠️ PC（デスクトップ）のレイアウト・見切れ対策を100%保護しながら、スマホ時にメニューが画面を覆い隠さないようにする専用制御 */}
        <style jsx global>{`
          /* デスクトップ（PC）の既存デザインと見切れスクロール対策をそのまま固定 */
          @media (min-width: 769px) {
            .responsive-sidebar {
              height: 100vh !important;
              display: flex !important;
              flex-direction: column !important;
              overflow-y: auto !important;
            }
          }
          
          /* モバイル（スマホ）環境のみに適用するリセット */
          @media (max-width: 768px) {
            .responsive-sidebar {
              height: auto !important; /* 👈 画面全体を覆い隠すバグ（100vh）を解除 */
              display: block !important;
              position: sticky !important;
              top: 0;
              width: 100% !important;
              padding: 0.75rem !important;
              overflow-x: auto !important; /* 横スクロールを許可 */
              white-space: nowrap !important;
            }
            .sidebar-nav {
              display: inline-flex !important;
              flex-direction: row !important;
              gap: 0.5rem !important;
            }
            .nav-link {
              margin-bottom: 0 !important;
              display: inline-flex !important;
            }
            /* スマホの時は、サイドバーの下に固定されていたボタンを下部への引きずり込みを防止し非表示またはコンパクト化 */
            .sidebar-footer-btn-group {
              display: inline-flex !important;
              margin-top: 0 !important;
              padding-top: 0 !important;
              padding-bottom: 0 !important;
              margin-left: 0.5rem !important;
              vertical-align: middle;
            }
            .sidebar-footer-btn-group button {
              padding: 0.5rem 1rem !important;
              white-space: nowrap !important;
            }
          }
        `}</style>
      </body>
    </html>
    </SessionProvider>
  );
}