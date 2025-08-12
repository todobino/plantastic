
'use client';

import { Tabs, TabsContent } from '@/components/ui/tabs';
import TaskEditor from './task-editor';
import SmartScheduler from './smart-scheduler';
import type { Task } from '@/types';

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
  return (
    <div className="p-4 h-full flex flex-col">
       <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold font-headline">
          {view === 'TASK_EDITOR' ? (selectedTask ? 'Edit Task' : 'New Task') : 'Smart Scheduler'}
        </h2>
      </div>
      <Tabs defaultValue={view} value={view} className="flex-grow flex flex-col">
        <TabsContent value="TASK_EDITOR" className="flex-grow">
          <TaskEditor
            tasks={tasks}
            selectedTask={selectedTask}
            onAddTask={onAddTask}
            onUpdateTask={onUpdateTask}
            onDeleteTask={onDeleteTask}
            onUpdateDependencies={onUpdateDependencies}
          />
        </TabsContent>
        <TabsContent value="SMART_SCHEDULER" className="flex-grow">
          <SmartScheduler tasks={tasks} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

    