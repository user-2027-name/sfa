/**
 * ProjSync 連携用ユーティリティ
 * 本来は外部API（ProjSync）からデータを取得しますが、
 * ここではモックデータを返す仕組みにしています。
 */

export interface ProjSyncProject {
  id: string;
  name: string;
  contract_type: string;
  status: string;
  amount: number;
  order_date: string;
  deadline: string;
}

export interface ProjSyncUser {
  id: number;
  name: string;
  department: string;
  role: string;
}

export interface ProjSyncTask {
  id: string;
  project_id: string;
  name: string;
  status: string;
  due_date: string;
  start_date: string;
  predecessor_id?: string;
}

export async function fetchProjectsFromProjSync(): Promise<ProjSyncProject[]> {
  // モックデータを返す例
  return [
    {
      id: 'PS-001',
      name: '次世代ECサイト開発',
      contract_type: '受注制作',
      status: '進行中',
      amount: 5000000,
      order_date: '2024-04-01',
      deadline: '2024-09-30'
    },
    {
      id: 'PS-002',
      name: 'アプリ保守運用(2024)',
      contract_type: '月額定額',
      status: '進行中',
      amount: 300000,
      order_date: '2024-01-01',
      deadline: '2024-12-31'
    }
  ];
}

export async function fetchUsersFromProjSync(): Promise<ProjSyncUser[]> {
  return [
    { id: 101, name: '田中 太郎', department: '開発部', role: 'エンジニア' },
    { id: 102, name: '佐藤 花子', department: '営業部', role: '営業者' }
  ];
}

export async function fetchTasksForProjectFromProjSync(projsyncProjectId: string): Promise<ProjSyncTask[]> {
  // 特定の案件に紐づくタスクのモックデータ
  if (projsyncProjectId === 'PS-001') {
    return [
      { id: 'T-101', project_id: 'PS-001', name: '要件定義', status: '完了', start_date: '2024-04-01', due_date: '2024-04-15' },
      { id: 'T-102', project_id: 'PS-001', name: '基本設計', status: '進行中', start_date: '2024-04-16', due_date: '2024-05-15', predecessor_id: 'T-101' },
      { id: 'T-103', project_id: 'PS-001', name: '詳細設計', status: '未着手', start_date: '2024-05-16', due_date: '2024-06-15', predecessor_id: 'T-102' }
    ];
  }
  return [];
}
