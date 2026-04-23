'use client';

import React, { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { KanbanProject, KanbanColumn as ColumnType, ColumnId } from '@/types/kanban';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';
import { useEffect } from 'react';

const COLUMNS: ColumnType[] = [
  { id: 'テレアポ', title: 'テレアポ (Tele-appt)' },
  { id: '商談', title: '商談 (Leads)' },
  { id: '受注', title: '受注 (Contracted)' },
  { id: '制作', title: '制作 (Production)' },
  { id: '完了', title: '完了 (Completed)' },
  { id: '失注', title: '失注 (Lost)' },
];

export default function KanbanBoard() {
  const [projects, setProjects] = useState<KanbanProject[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetch('/api/projects');
        const data = await res.json();
        const mapped = data.map((p: any) => ({
          id: p.id,
          name: p.name,
          customerName: p.customer_name || '未設定',
          deadline: p.deadline || '未定',
          progress: p.total_tasks > 0 ? Math.round((p.completed_tasks / p.total_tasks) * 100) : 0,
          assignee: {
            name: p.production_rep_name || p.sales_rep_name || '未割当',
            initials: (p.production_rep_name || p.sales_rep_name || '?').substring(0, 2).toUpperCase(),
          },
          status: p.status,
        }));
        setProjects(mapped);
      } catch (error) {
        console.error('Failed to fetch projects:', error);
      }
    };
    fetchProjects();
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const getProjectsByStatus = (status: ColumnId) => {
    return projects.filter((p) => p.status === status);
  };

  const findProject = (id: string) => {
    return projects.find((p) => p.id === id);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeProject = findProject(activeId);
    if (!activeProject) return;

    // Check if over a column or another project
    const isOverColumn = COLUMNS.some(col => col.id === overId);
    
    if (isOverColumn) {
      if (activeProject.status !== overId) {
        setProjects((prev) => 
          prev.map(p => p.id === activeId ? { ...p, status: overId as ColumnId } : p)
        );
      }
    } else {
      const overProject = findProject(overId);
      if (overProject && activeProject.status !== overProject.status) {
        setProjects((prev) => 
          prev.map(p => p.id === activeId ? { ...p, status: overProject.status } : p)
        );
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) {
      setActiveId(null);
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeProject = findProject(activeId);
    if (!activeProject) return;

    // Persist new status
    if (activeProject.status !== activeProject.status) { // This check logic is handled during DragOver, but we should verify the final status
       // Actually activeProject.status is ALREADY the new status because handleDragOver updates the state
    }

    try {
      await fetch('/api/projects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: activeId, status: activeProject.status }),
      });
    } catch (error) {
      console.error('Failed to update project status:', error);
    }

    if (activeId !== overId) {
      const activeIndex = projects.findIndex(p => p.id === activeId);
      const overIndex = projects.findIndex(p => p.id === overId);
      
      if (overIndex !== -1) {
        setProjects((items) => arrayMove(items, activeIndex, overIndex));
      }
    }

    setActiveId(null);
  };

  return (
    <div className="w-full overflow-hidden">
      <DndContext
        id="kanban-board"
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-6 h-full items-start overflow-x-auto pb-8 scrollbar-hide">
          {COLUMNS.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              projects={getProjectsByStatus(column.id)}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={{
          sideEffects: defaultDropAnimationSideEffects({
            styles: {
              active: {
                opacity: '0.5',
              },
            },
          }),
        }}>
          {activeId ? (
            <div className="scale-105 rotate-2">
              <KanbanCard project={findProject(activeId)!} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
