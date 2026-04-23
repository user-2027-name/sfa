'use client';

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { KanbanProject, KanbanColumn as ColumnType } from '@/types/kanban';
import { KanbanCard } from './KanbanCard';

interface KanbanColumnProps {
  column: ColumnType;
  projects: KanbanProject[];
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({ column, projects }) => {
  const { setNodeRef } = useDroppable({
    id: column.id,
  });

  return (
    <div className="flex flex-col min-w-[320px] w-[320px] flex-shrink-0 h-full max-h-[calc(100vh-180px)]">
      <div className="flex items-center justify-between mb-4 px-1" style={{ paddingLeft: '12px' }}>
        <h3 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2.5" style={{ color: 'var(--text)' }}>
          <div className="w-1 h-3.5 bg-primary rounded-full" />
          {column.title}
          <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>({projects.length})</span>
        </h3>
      </div>

      <div
        ref={setNodeRef}
        className="flex-1 rounded-2xl overflow-y-auto scrollbar-hide min-h-[200px] border transition-colors duration-300"
        style={{ padding: '16px', background: 'var(--bg-card)', borderColor: 'var(--border)', opacity: 0.8 }}
      >
        <div className="flex flex-col gap-6">
          <SortableContext items={projects.map(p => p.id)} strategy={verticalListSortingStrategy}>
            {projects.map((project) => (
              <KanbanCard key={project.id} project={project} />
            ))}
          </SortableContext>
        </div>
      </div>
    </div>
  );
};
