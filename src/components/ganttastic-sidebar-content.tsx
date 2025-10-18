
'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TaskEditor from './task-editor';
import CategoryEditor from './category-editor';
import Importer from './importer';
import type { Task, Project } from '@/types';
import { DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';

type GanttasticSidebarContentProps = {
  view: 'TASK_EDITOR' | 'CATEGORY_EDITOR' | 'IMPORTER';
  tasks: Task[];
  selectedTask: Task | null;
  onAddTask: (task: Omit<Task, 'id' | 'type'>) => void;
  onAddCategory?: (category: Pick<Task, 'name' | 'color' | 'dependencies'>) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onImportProject: (project: Project, tasks: Task[]) => void;
  onClose: () => void;
};

export default function GanttasticSidebarContent({
  view,
  tasks,
  selectedTask,
  onAddTask,
  onAddCategory,
  onUpdateTask,
  onDeleteTask,
  onImportProject,
  onClose
}: GanttasticSidebarContentProps) {
    
  const getTitle = () => {
    switch (view) {
      case 'IMPORTER':
        return 'Create New Project';
      case 'TASK_EDITOR':
        return selectedTask ? 'Edit Task' : 'New Task';
      case 'CATEGORY_EDITOR':
        return selectedTask ? 'Edit Category' : 'New Category';
    }
  }
  
  const getDescription = () => {
     switch (view) {
      case 'IMPORTER':
        return '';
      case 'TASK_EDITOR':
        return selectedTask ? 'Update the details for this task.' : 'Add a new task to your project.';
      case 'CATEGORY_EDITOR':
        return selectedTask ? 'Update the details for this category.' : 'Add a new category to your project.';
    }
  }

  const renderContent = () => {
    switch (view) {
        case 'TASK_EDITOR':
            return (
                <TaskEditor
                    tasks={tasks}
                    selectedTask={selectedTask}
                    onAddTask={onAddTask}
                    onUpdateTask={onUpdateTask}
                    onDeleteTask={onDeleteTask}
                />
            );
        case 'CATEGORY_EDITOR':
            return (
                <CategoryEditor
                    selectedCategory={selectedTask}
                    onAddCategory={onAddCategory!}
                    onUpdateCategory={onUpdateTask}
                    onDeleteCategory={onDeleteTask}
                />
            );
        case 'IMPORTER':
            return (
                <Importer onImport={onImportProject} onClose={onClose} />
            );
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{getTitle()}</DialogTitle>
      </DialogHeader>
      {renderContent()}
    </>
  );
}
