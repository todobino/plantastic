'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Task } from '@/types';
import {
  SidebarProvider,
  Sidebar,
  SidebarInset,
  SidebarContent,
} from '@/components/ui/sidebar';
import GanttasticHeader from './ganttastic-header';
import GanttasticChart from './ganttastic-chart';
import GanttasticSidebarContent from './ganttastic-sidebar-content';
import { useToast } from '@/hooks/use-toast';
import { addDays } from 'date-fns';

const initialTasks: Task[] = [
  { id: 'task-1', name: 'Project Kick-off Meeting', start: new Date(), end: addDays(new Date(), 1), progress: 100, dependencies: [] },
  { id: 'task-2', name: 'Requirement Gathering', start: addDays(new Date(), 1), end: addDays(new Date(), 3), progress: 75, dependencies: ['task-1'] },
  { id: 'task-3', name: 'UI/UX Design', start: addDays(new Date(), 2), end: addDays(new Date(), 7), progress: 50, dependencies: ['task-2'] },
  { id: 'task-4', name: 'Frontend Development', start: addDays(new Date(), 8), end: addDays(new Date(), 18), progress: 20, dependencies: ['task-3'] },
  { id: 'task-5', name: 'Backend Development', start: addDays(new Date(), 8), end: addDays(new Date(), 20), progress: 30, dependencies: ['task-3'] },
  { id: 'task-6', name: 'Testing & QA', start: addDays(new Date(), 21), end: addDays(new Date(), 25), progress: 0, dependencies: ['task-4', 'task-5'] },
  { id: 'task-7', name: 'Deployment', start: addDays(new Date(), 26), end: addDays(new Date(), 27), progress: 0, dependencies: ['task-6'] },
];

export default function GanttasticApp() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarView, setSidebarView] = useState<'TASK_EDITOR' | 'SMART_SCHEDULER'>('TASK_EDITOR');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    try {
      const savedTasks = localStorage.getItem('ganttastic-tasks');
      if (savedTasks) {
        const parsedTasks = JSON.parse(savedTasks).map((task: any) => ({
          ...task,
          start: new Date(task.start),
          end: new Date(task.end),
        }));
        setTasks(parsedTasks);
      } else {
        setTasks(initialTasks);
      }
    } catch (error) {
      console.error("Failed to load tasks from localStorage", error);
      setTasks(initialTasks);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('ganttastic-tasks', JSON.stringify(tasks));
    } catch (error) {
      console.error("Failed to save tasks to localStorage", error);
    }
  }, [tasks]);

  const handleAddTask = (task: Omit<Task, 'id'>) => {
    const newTask: Task = { ...task, id: `task-${Date.now()}` };
    setTasks(prev => [...prev, newTask]);
    toast({ title: "Task Added", description: `"${newTask.name}" has been successfully added.` });
    setSidebarOpen(false);
  };

  const handleUpdateTask = (updatedTask: Task) => {
    setTasks(prev => prev.map(task => (task.id === updatedTask.id ? updatedTask : task)));
    toast({ title: "Task Updated", description: `"${updatedTask.name}" has been successfully updated.` });
    setSidebarOpen(false);
    setSelectedTask(null);
  };

  const handleDeleteTask = (taskId: string) => {
    const taskToDelete = tasks.find(t => t.id === taskId);
    setTasks(prev => prev.filter(task => task.id !== taskId));
    toast({ title: "Task Deleted", description: `"${taskToDelete?.name}" has been deleted.`, variant: "destructive" });
    setSidebarOpen(false);
    setSelectedTask(null);
  }

  const openSidebar = useCallback((view: 'TASK_EDITOR' | 'SMART_SCHEDULER', task?: Task) => {
    setSidebarView(view);
    setSelectedTask(task || null);
    setSidebarOpen(true);
  }, []);

  return (
    <SidebarProvider open={isSidebarOpen} onOpenChange={setSidebarOpen}>
      <Sidebar side="right" className="transition-all duration-300" collapsible="icon">
        <SidebarContent>
          <GanttasticSidebarContent
            view={sidebarView}
            tasks={tasks}
            selectedTask={selectedTask}
            onAddTask={handleAddTask}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
            onClose={() => setSidebarOpen(false)}
          />
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <div className="flex h-screen flex-col">
          <GanttasticHeader openSidebar={openSidebar} />
          <div className="flex-grow overflow-auto p-4 md:p-6">
            <GanttasticChart tasks={tasks} onTaskClick={(task) => openSidebar('TASK_EDITOR', task)} />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
