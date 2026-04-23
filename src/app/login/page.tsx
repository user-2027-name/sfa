'use client';

import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function LoginForm() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  return (
    <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', textAlign: 'center', padding: '3rem' }}>
      <h1 style={{ marginBottom: '1rem', fontSize: '1.5rem' }}>SFA Integration</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2.5rem', fontSize: '0.9rem' }}>
        ims-hirosaki.com の Google アカウントで<br />ログインしてください
      </p>

      {error && (
        <div style={{ 
          padding: '1rem', 
          background: 'rgba(239, 68, 68, 0.1)', 
          border: '1px solid var(--danger)', 
          borderRadius: '8px', 
          color: 'var(--danger)', 
          fontSize: '0.8rem', 
          marginBottom: '1.5rem' 
        }}>
          {error === 'AccessDenied' 
            ? 'アクセスが拒否されました。ドメインまたは従業員登録を確認してください。' 
            : 'ログイン中にエラーが発生しました。'}
        </div>
      )}

      <button 
        onClick={() => signIn('google', { callbackUrl: '/' })}
        className="btn btn-primary" 
        style={{ width: '100%', justifyContent: 'center', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}
      >
        <img src="https://authjs.dev/img/providers/google.svg" alt="Google" style={{ width: '20px' }} />
        Googleでログイン
      </button>

      <p style={{ marginTop: '2rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        ※ログインには従業員マスタへのメールアドレス登録が必要です。
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'var(--bg-gradient)' 
    }}>
      <Suspense fallback={<div className="glass-panel" style={{ padding: '2rem' }}>読み込み中...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
