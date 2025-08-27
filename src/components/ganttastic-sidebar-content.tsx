
'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TaskEditor from './task-editor';
import Importer from './importer';
import type { Task, Project } from '@/types';
import { DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';

type GanttasticSidebarContentProps = {
  view: 'TASK_EDITOR' | 'IMPORTER' | 'NEW_PROJECT';
  tasks: Task[];
  selectedTask: Task | null;
  initialTaskType: 'task' | 'category';
  onAddTask: (task: Omit<Task, 'id' | 'dependencies'> & { dependencies: string[] }) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onImportProject: (project: Project, tasks: Task[]) => void;
  onClose: () => void;
};

export default function GanttasticSidebarContent({
  view,
  tasks,
  selectedTask,
  initialTaskType,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onImportProject,
  onClose
}: GanttasticSidebarContentProps) {
    
  const getTitle = () => {
    if (view === 'IMPORTER' || view === 'NEW_PROJECT') return 'Create New Project';
    if (selectedTask) return selectedTask.type === 'category' ? 'Edit Category' : 'Edit Task';
    return initialTaskType === 'category' ? 'New Category' : 'New Task';
  }
  
  const getDescription = () => {
    if (view === 'IMPORTER') return 'Import project data from a CSV or text file.';
    if (view === 'NEW_PROJECT') return 'Create a new project manually or import from a file.';
    if (selectedTask) return `Update the details for this ${selectedTask.type}.`;
    return `Add a new ${initialTaskType} to your project.`;
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
                initialTaskType={initialTaskType}
                onAddTask={onAddTask}
                onUpdateTask={onUpdateTask}
                onDeleteTask={onDeleteTask}
              />
          ) : (
              <Importer onImport={onImportProject} onClose={onClose} />
          )}
      </div>
    </>
  );
}
