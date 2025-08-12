
'use client';

import { Tabs, TabsContent } from '@/components/ui/tabs';
import TaskEditor from './task-editor';
import SmartScheduler from './smart-scheduler';
import type { Task } from '@/types';
import { Button } from './ui/button';
import { X } from 'lucide-react';

type GanttasticSidebarContentProps = {
  view: 'TASK_EDITOR' | 'SMART_SCHEDULER';
  tasks: Task[];
  selectedTask: Task | null;
  onAddTask: (task: Omit<Task, 'id'>) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onClose: () => void;
};

export default function GanttasticSidebarContent({
  view,
  tasks,
  selectedTask,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
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
        {/* The TabsList can be hidden if we control the view from outside */}
        {/* <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="TASK_EDITOR">Task Editor</TabsTrigger>
          <TabsTrigger value="SMART_SCHEDULER">Smart Scheduler</TabsTrigger>
        </TabsList> */}
        <TabsContent value="TASK_EDITOR" className="flex-grow">
          <TaskEditor
            tasks={tasks}
            selectedTask={selectedTask}
            onAddTask={onAddTask}
            onUpdateTask={onUpdateTask}
            onDeleteTask={onDeleteTask}
          />
        </TabsContent>
        <TabsContent value="SMART_SCHEDULER" className="flex-grow">
          <SmartScheduler tasks={tasks} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
