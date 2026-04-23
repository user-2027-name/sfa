'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Calendar, User } from 'lucide-react';
import { KanbanProject } from '@/types/kanban';

interface KanbanCardProps {
  project: KanbanProject;
}

export const KanbanCard: React.FC<KanbanCardProps> = ({ project }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: project.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Check if deadline is within 48 hours
  const isUrgent = React.useMemo(() => {
    if (!project.deadline) return false;
    const deadlineDate = new Date(project.deadline);
    const now = new Date();
    const diff = deadlineDate.getTime() - now.getTime();
    const hours = diff / (1000 * 60 * 60);
    return hours > 0 && hours <= 48;
  }, [project.deadline]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`
        glass-panel group relative p-5 rounded-2xl cursor-grab active:cursor-grabbing
        transition-all duration-300
        ${isDragging ? 'opacity-40 scale-[1.02] shadow-2xl z-50 ring-2 ring-primary/40' : 'hover:-translate-y-1 hover:shadow-lg'}
        ${isUrgent ? 'border-t-4 border-t-red-500' : 'border-t-4 border-t-primary/40'}
      `}
    >
      <div className="flex justify-between items-center mb-4">
        <span className="text-[10px] font-bold text-primary tracking-widest bg-primary/5 px-2 py-0.5 rounded border border-primary/20 uppercase">
          {project.id}
        </span>
      </div>

      <h4 className="text-sm font-bold mb-1.5 group-hover:text-primary transition-colors" style={{ color: 'var(--text)' }}>
        {project.name}
      </h4>
      
      <p className="text-[11px] mb-6 whitespace-nowrap overflow-hidden text-ellipsis font-medium" style={{ color: 'var(--text-muted)' }}>
        {project.customerName}
      </p>

      {/* Progress Section */}
      <div className="space-y-2 mb-6">
        <div className="flex justify-between items-center">
          <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Progress</span>
          <span className="text-[9px] text-primary font-black">{project.progress}%</span>
        </div>
        <div className="w-full h-1.5 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${project.progress}%` }}
          />
        </div>
      </div>

      <div className="flex justify-between items-center pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2.5">
          <Calendar size={13} className={isUrgent ? 'text-red-500' : 'text-primary/60'} />
          <span className={`text-[10px] font-medium ${isUrgent ? 'text-red-500 font-bold' : ''}`} style={{ color: isUrgent ? '' : 'var(--text-muted)' }}>
            {project.deadline}
          </span>
        </div>

        <div className="flex items-center">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold uppercase" style={{ background: 'var(--bg-muted)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
            {project.assignee.initials}
          </div>
        </div>
      </div>
    </div>
  );
};
