export type ColumnId = 'テレアポ' | '商談' | '受注' | '制作' | '完了' | '失注';

export interface KanbanProject {
  id: string;
  name: string;
  customerName: string;
  deadline: string;
  progress: number;
  assignee: {
    name: string;
    avatar?: string;
    initials: string;
  };
  status: ColumnId;
}

export interface KanbanColumn {
  id: ColumnId;
  title: string;
}
