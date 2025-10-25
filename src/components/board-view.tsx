
'use client';

import { useMemo, useState } from 'react';
import type { Task, TeamMember } from '@/types';
import { DndContext, useSensor, useSensors, MouseSensor, TouchSensor, type DragStartEvent, type DragEndEvent, useDraggable, useDroppable, DragOverlay, closestCorners } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from './ui/avatar';
import { UserCircle } from 'lucide-react';
import { cn, hexToRgba } from '@/lib/utils';
import { ScrollArea, ScrollBar } from './ui/scroll-area';


type BoardViewProps = {
  tasks: Task[];
  teamMembers: TeamMember[];
  onTaskClick: (task: Task) => void;
  onTaskUpdate: (task: Task) => void;
};

function TaskCard({ task, teamMembers, onTaskClick, isOverlay, isDragging }: { task: Task; teamMembers: TeamMember[], onTaskClick: (task: Task) => void; isOverlay?: boolean, isDragging?: boolean }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: task.id,
    data: { task },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  };
  
  const assignee = teamMembers.find(m => m.id === task.assigneeId);
  const getAssigneeInitials = (name?: string) => {
    if (!name) return '?';
    const parts = name.split(' ');
    return parts.length > 1 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : name.substring(0, 2).toUpperCase();
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn("mb-2 bg-card touch-none", isOverlay && "shadow-lg", isDragging && "opacity-30")}
      onClick={() => onTaskClick(task)}
    >
      <CardContent className="p-3">
        <p className="font-semibold text-sm mb-2">{task.name}</p>
        <div className="flex justify-end">
          {assignee && (
            <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs">
                    {getAssigneeInitials(assignee.name)}
                </AvatarFallback>
            </Avatar>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function CategoryColumn({ category, tasks, teamMembers, onTaskClick, activeId }: { category: Task | { id: string, name: string, color?: string }; tasks: Task[]; teamMembers: TeamMember[]; onTaskClick: (task: Task) => void; activeId: string | null; }) {
  const { setNodeRef, isOver } = useDroppable({
    id: category.id,
  });

  return (
    <div className="w-72 flex-shrink-0">
        <Card className="flex flex-col h-full" style={{backgroundColor: category.color ? hexToRgba(category.color, 0.05) : 'transparent'}}>
            <CardHeader className="p-3 border-b" style={{borderColor: category.color ? hexToRgba(category.color, 0.2) : 'hsl(var(--border))' }}>
                <CardTitle className="text-base flex items-center gap-2">
                    {category.color && <div className="h-3 w-3 rounded-full" style={{backgroundColor: category.color}} />}
                    {category.name}
                    <span className="text-sm font-normal text-muted-foreground ml-2">{tasks.length}</span>
                </CardTitle>
            </CardHeader>
            <ScrollArea className="flex-grow">
                <CardContent ref={setNodeRef} className={cn("p-3 min-h-[100px] transition-colors", isOver && "bg-accent")}>
                    {tasks.map(task => (
                    <TaskCard key={task.id} task={task} teamMembers={teamMembers} onTaskClick={onTaskClick} isDragging={activeId === task.id} />
                    ))}
                </CardContent>
            </ScrollArea>
        </Card>
    </div>
  );
}


export default function BoardView({ tasks, teamMembers, onTaskClick, onTaskUpdate }: BoardViewProps) {
    const [activeTask, setActiveTask] = useState<Task | null>(null);

    const { categories, tasksByCategoryId } = useMemo(() => {
        const categories = tasks.filter(t => t.type === 'category');
        const tasksByCategoryId = new Map<string, Task[]>();

        tasks.forEach(task => {
            if (task.type === 'task') {
                const parentId = task.parentId || 'uncategorized';
                if (!tasksByCategoryId.has(parentId)) {
                    tasksByCategoryId.set(parentId, []);
                }
                tasksByCategoryId.get(parentId)!.push(task);
            }
        });
        
        if (tasksByCategoryId.has('uncategorized')) {
            categories.push({ id: 'uncategorized', name: 'Uncategorized', type: 'category', dependencies: [] });
        }
        
        return { categories, tasksByCategoryId };
    }, [tasks]);

    const sensors = useSensors(
        useSensor(MouseSensor, {
          activationConstraint: {
            distance: 8,
          },
        }),
        useSensor(TouchSensor, {
          activationConstraint: {
            delay: 100,
            tolerance: 5,
          },
        })
    );
    
    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        const task = (active.data.current as any)?.task as Task;
        setActiveTask(task);
    }

    const handleDragEnd = (event: DragEndEvent) => {
        setActiveTask(null);
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const task = (active.data.current as any)?.task as Task;
            if (task) {
                const newParentId = over.id === 'uncategorized' ? null : over.id as string;
                if (task.parentId !== newParentId) {
                    onTaskUpdate({ ...task, parentId: newParentId });
                }
            }
        }
    };


  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} collisionDetection={closestCorners}>
        <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-4 p-4 h-full">
                {categories.map(category => (
                    <CategoryColumn
                        key={category.id}
                        category={category}
                        tasks={tasksByCategoryId.get(category.id) || []}
                        teamMembers={teamMembers}
                        onTaskClick={onTaskClick}
                        activeId={activeTask?.id || null}
                    />
                ))}
            </div>
            <ScrollBar orientation="horizontal" />
        </ScrollArea>
        <DragOverlay>
            {activeTask ? (
                <TaskCard task={activeTask} teamMembers={teamMembers} onTaskClick={() => {}} isOverlay />
            ) : null}
        </DragOverlay>
    </DndContext>
  );
}
