
'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { Task, TeamMember } from '@/types';
import TaskEditor from './task-editor';
import CategoryEditor from './category-editor';
import MilestoneEditor from './milestone-editor';

type TaskDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | { type: 'task' | 'category' | 'milestone' } | null;
  tasks: Task[];
  teamMembers: TeamMember[];
  onTaskUpsert: (taskData: Omit<Task, 'id'> | Task) => void;
  onTaskDelete: (taskId: string) => void;
};

export default function TaskDialog({ open, onOpenChange, task, tasks, teamMembers, onTaskUpsert, onTaskDelete }: TaskDialogProps) {
  if (!task) return null;
  
  const isEditing = 'id' in task;
  const { type } = task;
  
  const getTitle = () => {
    if (type === 'task') return isEditing ? 'Edit Task' : 'New Task';
    if (type === 'category') return isEditing ? 'Edit Category' : 'New Category';
    if (type === 'milestone') return isEditing ? 'Edit Milestone' : 'New Milestone';
    return '';
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
        </DialogHeader>
        
        {type === 'task' && (
          <TaskEditor
            tasks={tasks}
            selectedTask={isEditing ? task : null}
            onUpsert={onTaskUpsert}
            onDelete={onTaskDelete}
            teamMembers={teamMembers}
          />
        )}
        
        {type === 'category' && (
          <CategoryEditor
            selectedCategory={isEditing ? task : null}
            onAddCategory={(cat) => onTaskUpsert({ ...cat, type: 'category' })}
            onUpdateCategory={onTaskUpsert}
            onDeleteCategory={onTaskDelete}
          />
        )}

        {type === 'milestone' && (
            <MilestoneEditor
              tasks={tasks}
              selectedMilestone={isEditing ? task : null}
              onUpsert={onTaskUpsert}
              onDelete={onTaskDelete}
            />
        )}
      </DialogContent>
    </Dialog>
  );
}
