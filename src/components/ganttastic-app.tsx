
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
import { addDays, differenceInBusinessDays } from 'date-fns';

const initialTasks: Task[] = [
  { id: 'task-1', name: 'Project Kick-off Meeting', description: 'Initial meeting with stakeholders to define project scope and goals.', start: new Date(), end: addDays(new Date(), 1), progress: 100, dependencies: [] },
  { id: 'task-2', name: 'Requirement Gathering', description: 'Gathering detailed requirements from all stakeholders.', start: addDays(new Date(), 1), end: addDays(new Date(), 3), progress: 75, dependencies: ['task-1'] },
  { id: 'task-3', name: 'UI/UX Design', description: 'Designing the user interface and user experience.', start: addDays(new Date(), 2), end: addDays(new Date(), 7), progress: 50, dependencies: ['task-2'] },
  { id: 'task-4', name: 'Frontend Development', description: 'Building the client-side of the application.', start: addDays(new Date(), 8), end: addDays(new Date(), 18), progress: 20, dependencies: ['task-3'] },
  { id: 'task-5', name: 'Backend Development', description: 'Building the server-side of the application.', start: addDays(new Date(), 8), end: addDays(new Date(), 20), progress: 30, dependencies: ['task-3'] },
  { id: 'task-6', name: 'Testing & QA', description: 'Testing the application for bugs and quality assurance.', start: addDays(new Date(), 21), end: addDays(new Date(), 25), progress: 0, dependencies: ['task-4', 'task-5'] },
  { id: 'task-7', name: 'Deployment', description: 'Deploying the application to production.', start: addDays(new Date(), 26), end: addDays(new Date(), 27), progress: 0, dependencies: ['task-6'] },
];

export default function GanttasticApp() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projectName, setProjectName] = useState('Ganttastic Plan');
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
    // Keep sidebar open for dependency updates
    // setSidebarOpen(false);
    // setSelectedTask(null);
  };

  const handleDeleteTask = (taskId: string) => {
    const taskToDelete = tasks.find(t => t.id === taskId);
    // Also remove this task from any other task's dependency list
    setTasks(prev => prev.filter(task => task.id !== taskId).map(t => ({
      ...t,
      dependencies: t.dependencies.filter(depId => depId !== taskId)
    })));
    toast({ title: "Task Deleted", description: `"${taskToDelete?.name}" has been deleted.`, variant: "destructive" });
    setSidebarOpen(false);
    setSelectedTask(null);
  }

  const handleUpdateDependencies = (taskId: string, newDependencies: string[], newBlockedTasks: string[]) => {
      setTasks(prevTasks => {
          let newTasks = [...prevTasks];

          // 1. Update the current task's dependencies and dates
          const currentTaskIndex = newTasks.findIndex(t => t.id === taskId);
          if (currentTaskIndex > -1) {
              const currentTask = { ...newTasks[currentTaskIndex] };
              currentTask.dependencies = newDependencies;

              // Auto-adjust start date based on the latest dependency
              if (newDependencies.length > 0) {
                  const parentTasks = newDependencies.map(depId => newTasks.find(t => t.id === depId)).filter(Boolean) as Task[];
                  if (parentTasks.length > 0) {
                      const latestParentEndDate = new Date(Math.max(...parentTasks.map(t => t.end.getTime())));
                      const newStartDate = addDays(latestParentEndDate, 1);
                      const duration = differenceInBusinessDays(currentTask.end, currentTask.start);
                      currentTask.start = newStartDate;
                      currentTask.end = addDays(newStartDate, duration >= 0 ? duration : 0);
                  }
              }
              newTasks[currentTaskIndex] = currentTask;
          }

          // 2. Manage "Blocks" relationship
          // First, remove the current task's ID from any task that is NO LONGER blocked by it
          prevTasks.forEach((task, index) => {
              if (task.id === taskId) return;
              const wasBlocked = task.dependencies.includes(taskId);
              const isStillBlocked = newBlockedTasks.includes(task.id);
              if (wasBlocked && !isStillBlocked) {
                  const updatedTask = { ...newTasks[index] };
                  updatedTask.dependencies = updatedTask.dependencies.filter(dep => dep !== taskId);
                  newTasks[index] = updatedTask;
              }
          });
          
          // Second, add the current task's ID to any task that IS NOW blocked by it and update its dates
          newBlockedTasks.forEach(blockedTaskId => {
              const blockedTaskIndex = newTasks.findIndex(t => t.id === blockedTaskId);
              if (blockedTaskIndex > -1) {
                  const blockedTask = { ...newTasks[blockedTaskIndex] };
                  if (!blockedTask.dependencies.includes(taskId)) {
                      blockedTask.dependencies.push(taskId);

                      // Also update the start date of the newly blocked task
                      const currentTask = newTasks[currentTaskIndex];
                      if(currentTask) {
                        const newStartDate = addDays(currentTask.end, 1);
                        const duration = differenceInBusinessDays(blockedTask.end, blockedTask.start);
                        blockedTask.start = newStartDate;
                        blockedTask.end = addDays(newStartDate, duration >= 0 ? duration : 0);
                      }
                      newTasks[blockedTaskIndex] = blockedTask;
                  }
              }
          });

          return newTasks;
      });
      // We don't close the sidebar here so the user can see the changes.
      toast({ title: "Dependencies Updated", description: "Task dates have been adjusted automatically." });
  };


  const openSidebar = useCallback((view: 'TASK_EDITOR' | 'SMART_SCHEDULER', task?: Task) => {
    setSidebarView(view);
    setSelectedTask(task || null);
    setSidebarOpen(true);
  }, []);
  
  const handleSidebarOpenChange = (open: boolean) => {
    setSidebarOpen(open);
    if (!open) {
      setSelectedTask(null);
    }
  }

  return (
    <SidebarProvider open={isSidebarOpen} onOpenChange={handleSidebarOpenChange}>
      <Sidebar side="right">
        <SidebarContent>
          <GanttasticSidebarContent
            view={sidebarView}
            tasks={tasks}
            selectedTask={selectedTask}
            onAddTask={handleAddTask}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
            onUpdateDependencies={handleUpdateDependencies}
            onClose={() => handleSidebarOpenChange(false)}
          />
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <div className="flex h-screen flex-col">
          <GanttasticHeader openSidebar={openSidebar} />
          <div className="flex-grow overflow-auto p-4 md:p-6">
            <GanttasticChart
              tasks={tasks}
              onTaskClick={(task) => openSidebar('TASK_EDITOR', task)}
              projectName={projectName}
            />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
