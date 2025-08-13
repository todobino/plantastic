
'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TaskEditor from './task-editor';
import SmartScheduler from './smart-scheduler';
import type { Task } from '@/types';
import { DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';

type GanttasticSidebarContentProps = {
  view: 'TASK_EDITOR' | 'SMART_SCHEDULER';
  tasks: Task[];
  selectedTask: Task | null;
  onAddTask: (task: Omit<Task, 'id' | 'dependencies'> & { dependencies: string[] }) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onUpdateDependencies: (taskId: string, newDependencies: string[], newBlockedTasks: string[]) => void;
  onClose: () => void;
};

export default function GanttasticSidebarContent({
  view,
  tasks,
  selectedTask,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onUpdateDependencies,
  onClose
}: GanttasticSidebarContentProps) {
    
  const getTitle = () => {
    if (view === 'SMART_SCHEDULER') return 'Smart Scheduler';
    return selectedTask ? 'Edit Task' : 'New Task';
  }
  
  const getDescription = () => {
    if (view === 'SMART_SCHEDULER') return 'Let AI optimize your project schedule.';
    return selectedTask ? 'Update the details for this task.' : 'Add a new task to your project.';
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{getTitle()}</DialogTitle>
        <DialogDescription>
            {getDescription()}
        </DialogDescription>
      </DialogHeader>
      <div className="flex-grow flex flex-col py-4 min-h-0">
          {view === 'TASK_EDITOR' ? (
              <TaskEditor
                tasks={tasks}
                selectedTask={selectedTask}
                onAddTask={onAddTask}
                onUpdateTask={onUpdateTask}
                onDeleteTask={onDeleteTask}
                onUpdateDependencies={onUpdateDependencies}
              />
          ) : (
              <SmartScheduler tasks={tasks} />
          )}
      </div>
    </>
  );
}
