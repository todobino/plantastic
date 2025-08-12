
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
import { addDays, differenceInBusinessDays, startOfDay } from 'date-fns';

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

  const updateDependentTasks = (updatedTaskId: string, tasks: Task[]): Task[] => {
    const newTasks = [...tasks];
    const updatedTask = newTasks.find(t => t.id === updatedTaskId);
    if (!updatedTask) return newTasks;
  
    const tasksToUpdate = newTasks.filter(t => t.dependencies.includes(updatedTaskId));
  
    tasksToUpdate.forEach(taskToUpdate => {
      const parentTasks = taskToUpdate.dependencies
        .map(depId => newTasks.find(t => t.id === depId))
        .filter((t): t is Task => !!t);
  
      if (parentTasks.length > 0) {
        const latestParentEndDate = new Date(Math.max(...parentTasks.map(t => t.end.getTime())));
        const newStartDate = startOfDay(addDays(latestParentEndDate, 1));
        const duration = differenceInBusinessDays(taskToUpdate.end, taskToUpdate.start);
        
        const updatedChildTaskIndex = newTasks.findIndex(t => t.id === taskToUpdate.id);
        if (updatedChildTaskIndex !== -1) {
          newTasks[updatedChildTaskIndex].start = newStartDate;
          newTasks[updatedChildTaskIndex].end = addDays(newStartDate, duration >= 0 ? duration : 0);
          
          // Recursively update children of this task
          const result = updateDependentTasks(taskToUpdate.id, newTasks);
          // sync the changes from the recursive call
          result.forEach(updatedTaskFromResult => {
            const indexToUpdate = newTasks.findIndex(t => t.id === updatedTaskFromResult.id);
            if (indexToUpdate !== -1) {
              newTasks[indexToUpdate] = updatedTaskFromResult;
            }
          });
        }
      }
    });
  
    return newTasks;
  };
  

  const handleAddTask = (task: Omit<Task, 'id'>) => {
    const newTask: Task = { ...task, id: `task-${Date.now()}` };
    setTasks(prev => [...prev, newTask]);
    toast({ title: "Task Added", description: `"${newTask.name}" has been successfully added.` });
    setSidebarOpen(false);
  };

  const handleUpdateTask = (updatedTask: Task) => {
    setTasks(prev => {
      const newTasks = prev.map(task => (task.id === updatedTask.id ? updatedTask : task));
      return updateDependentTasks(updatedTask.id, newTasks);
    });
    toast({ title: "Task Updated", description: `"${updatedTask.name}" has been successfully updated.` });
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
          let tasksWithUpdatedDeps = [...prevTasks];

          // 1. Update the current task's dependencies
          const currentTaskIndex = tasksWithUpdatedDeps.findIndex(t => t.id === taskId);
          if (currentTaskIndex > -1) {
              const currentTask = { ...tasksWithUpdatedDeps[currentTaskIndex] };
              currentTask.dependencies = newDependencies;
              tasksWithUpdatedDeps[currentTaskIndex] = currentTask;
          }

          // 2. Remove the current task's ID from any task that is NO LONGER blocked by it
          prevTasks.forEach((task, index) => {
              if (task.dependencies.includes(taskId) && !newBlockedTasks.includes(task.id)) {
                  const updatedTask = { ...tasksWithUpdatedDeps[index] };
                  updatedTask.dependencies = updatedTask.dependencies.filter(dep => dep !== taskId);
                  tasksWithUpdatedDeps[index] = updatedTask;
              }
          });
          
          // 3. Add the current task's ID to any task that IS NOW blocked by it
          newBlockedTasks.forEach(blockedTaskId => {
              const blockedTaskIndex = tasksWithUpdatedDeps.findIndex(t => t.id === blockedTaskId);
              if (blockedTaskIndex > -1) {
                  const blockedTask = { ...tasksWithUpdatedDeps[blockedTaskIndex] };
                  if (!blockedTask.dependencies.includes(taskId)) {
                      blockedTask.dependencies.push(taskId);
                      tasksWithUpdatedDeps[blockedTaskIndex] = blockedTask;
                  }
              }
          });

          // 4. Recalculate dates for all affected tasks
          let finalTasks = updateDependentTasks(taskId, tasksWithUpdatedDeps);
          newBlockedTasks.forEach(blockedTaskId => {
            finalTasks = updateDependentTasks(blockedTaskId, finalTasks);
          });


          return finalTasks;
      });
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
