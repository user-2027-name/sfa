import KanbanBoard from '@/components/kanban/KanbanBoard';

export const metadata = {
  title: '案件管理カンバン | SFA統合管理システム',
  description: '案件の進捗状況を視覚的に管理します。',
};

export default function KanbanPage() {
  return (
    <div className="container">
      <header style={{ marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>案件管理カンバン</h1>
        <p style={{ color: 'var(--text-muted)' }}>案件の進捗状況を視覚的に管理し、ドラッグ＆ドロップで即座に更新できます。</p>
      </header>
      
      <div style={{ marginTop: '2rem' }}>
        <KanbanBoard />
      </div>
    </div>
  );
}
