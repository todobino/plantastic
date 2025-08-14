
'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Task, Project } from '@/types';
import { Sidebar, SidebarInset } from '@/components/ui/sidebar';
import GanttasticHeader from './ganttastic-header';
import GanttasticChart from './ganttastic-chart';
import GanttasticSidebarContent from './ganttastic-sidebar-content';
import { addDays, differenceInDays, startOfDay } from 'date-fns';
import ProjectSidebar from './project-sidebar';
import { Dialog, DialogContent } from './ui/dialog';

const getInitialTasks = (): Task[] => [
  { id: 'task-1', name: 'Project Kick-off Meeting', description: 'Initial meeting with stakeholders to define project scope and goals.', start: new Date(), end: addDays(new Date(), 1), progress: 100, dependencies: [] },
  { id: 'task-2', name: 'Requirement Gathering', description: 'Gathering detailed requirements from all stakeholders.', start: addDays(new Date(), 1), end: addDays(new Date(), 3), progress: 75, dependencies: ['task-1'] },
  { id: 'task-3', name: 'UI/UX Design', description: 'Designing the user interface and user experience.', start: addDays(new Date(), 2), end: addDays(new Date(), 7), progress: 50, dependencies: ['task-2'] },
  { id: 'task-4', name: 'Frontend Development', description: 'Building the client-side of the application.', start: addDays(new Date(), 8), end: addDays(new Date(), 18), progress: 20, dependencies: ['task-3'] },
  { id: 'task-5', name: 'Backend Development', description: 'Building the server-side of the application.', start: addDays(new Date(), 8), end: addDays(new Date(), 20), progress: 30, dependencies: ['task-3'] },
  { id: 'task-6', name: 'Testing & QA', description: 'Testing the application for bugs and quality assurance.', start: addDays(new Date(), 21), end: addDays(new Date(), 25), progress: 0, dependencies: ['task-4', 'task-5'] },
  { id: 'task-7', name: 'Deployment', description: 'Deploying the application to production.', start: addDays(new Date(), 26), end: addDays(new Date(), 27), progress: 0, dependencies: ['task-6'] },
];

const getInitialProject = (): Project => ({
  id: 'proj-1',
  name: 'Ganttastic Plan',
  description: 'A sample project plan for the Ganttastic application.',
});


export default function GanttasticApp() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [project, setProject] = useState<Project>(getInitialProject());
  const [isEditorDialogOpen, setEditorDialogOpen] = useState(false);
  const [sidebarView, setSidebarView] = useState<'TASK_EDITOR' | 'SMART_SCHEDULER'>('TASK_EDITOR');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  useEffect(() => {
    setIsMounted(true);
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
        setTasks(getInitialTasks());
      }
      
      const savedProject = localStorage.getItem('ganttastic-project');
      if (savedProject) {
        setProject(JSON.parse(savedProject));
      }

    } catch (error) {
      console.error("Failed to load data from localStorage", error);
      setTasks(getInitialTasks());
      setProject(getInitialProject());
    }
  }, []);

  useEffect(() => {
    if (isMounted) {
        try {
            localStorage.setItem('ganttastic-tasks', JSON.stringify(tasks));
            localStorage.setItem('ganttastic-project', JSON.stringify(project));
        } catch (error) {
            console.error("Failed to save data to localStorage", error);
        }
    }
  }, [tasks, project, isMounted]);

  const updateDependentTasks = useCallback((updatedTaskId: string, tasksToUpdate: Task[]): Task[] => {
    const newTasks = [...tasksToUpdate];
    const updatedTask = newTasks.find(t => t.id === updatedTaskId);
    if (!updatedTask) return newTasks;
  
    const queue: string[] = [updatedTaskId];
    const visited = new Set<string>();

    while(queue.length > 0) {
      const currentTaskId = queue.shift()!;
      if(visited.has(currentTaskId)) continue;
      visited.add(currentTaskId);

      const tasksThatDependOnCurrent = newTasks.filter(t => t.dependencies.includes(currentTaskId));

      tasksThatDependOnCurrent.forEach(dependentTask => {
        const parentTasks = dependentTask.dependencies
          .map(depId => newTasks.find(t => t.id === depId))
          .filter((t): t is Task => !!t);
        
        if (parentTasks.length > 0) {
          const latestParentEndDate = new Date(Math.max(...parentTasks.map(t => t.end.getTime())));
          const newStartDate = startOfDay(addDays(latestParentEndDate, 1));
          
          const duration = Math.max(0, differenceInDays(dependentTask.end, dependentTask.start));
          const newEndDate = addDays(newStartDate, duration);
          
          const taskIndex = newTasks.findIndex(t => t.id === dependentTask.id);
          if (taskIndex !== -1) {
             if (newTasks[taskIndex].start.getTime() !== newStartDate.getTime() || newTasks[taskIndex].end.getTime() !== newEndDate.getTime()) {
                newTasks[taskIndex].start = newStartDate;
                newTasks[taskIndex].end = newEndDate;
                queue.push(dependentTask.id);
             }
          }
        }
      });
    }
    
    return newTasks;
  }, []);
  

  const handleAddTask = (task: Omit<Task, 'id'>) => {
    const newTask: Task = { ...task, id: `task-${Date.now()}` };
    setTasks(prev => [...prev, newTask]);
    console.log(`Task Added: "${newTask.name}" has been successfully added.`);
    setEditorDialogOpen(false);
  };

  const handleUpdateTask = useCallback((updatedTask: Task) => {
    setTasks(prev => {
      let newTasks = prev.map(task => (task.id === updatedTask.id ? updatedTask : task));
      newTasks = updateDependentTasks(updatedTask.id, newTasks);
      return newTasks;
    });
    console.log(`Task Updated: "${updatedTask.name}" has been successfully updated.`);
  }, [updateDependentTasks]);


  const handleDeleteTask = (taskId: string) => {
    const taskToDelete = tasks.find(t => t.id === taskId);
    // Also remove this task from any other task's dependency list
    setTasks(prev => prev.filter(task => task.id !== taskId).map(t => ({
      ...t,
      dependencies: t.dependencies.filter(depId => depId !== taskId)
    })));
    console.log(`Task Deleted: "${taskToDelete?.name}" has been deleted.`);
    setEditorDialogOpen(false);
    setSelectedTask(null);
  }

  const handleUpdateDependencies = useCallback((taskId: string, newDependencies: string[], newBlockedTasks: string[]) => {
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
      console.log("Dependencies Updated: Task dates have been adjusted automatically.");
  }, [updateDependentTasks]);
  
  const handleProjectUpdate = (updatedProject: Project) => {
    setProject(updatedProject);
    console.log(`Project Updated: "${updatedProject.name}" has been successfully updated.`);
  }

  const handleReorderTasks = (reorderedTasks: Task[]) => {
    setTasks(reorderedTasks);
    console.log("Tasks Reordered: The task order has been updated.");
  };

  const openEditorDialog = useCallback((view: 'TASK_EDITOR' | 'SMART_SCHEDULER', task?: Task) => {
    setSidebarView(view);
    setSelectedTask(task || null);
    setEditorDialogOpen(true);
  }, []);
  
  const handleEditorDialogOpenChange = (open: boolean) => {
    setEditorDialogOpen(open);
    if (!open) {
      setSelectedTask(null);
    }
  }
  
  if (!isMounted) {
    return null; // or a loading spinner
  }

  return (
    <div className="flex h-screen flex-col">
      <GanttasticHeader openSidebar={openEditorDialog} projectName={project.name} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar side="left" collapsible="icon">
          <ProjectSidebar currentProjectName={project.name} onProjectChange={(name) => setProject({...project, name})} />
        </Sidebar>

        <SidebarInset>
          <div className="flex-grow overflow-auto p-4 md:p-6">
            <GanttasticChart
              tasks={tasks}
              project={project}
              onTaskClick={(task) => openEditorDialog('TASK_EDITOR', task)}
              onAddTaskClick={() => openEditorDialog('TASK_EDITOR')}
              onProjectUpdate={handleProjectUpdate}
              onReorderTasks={handleReorderTasks}
              onTaskUpdate={handleUpdateTask}
            />
          </div>
        </SidebarInset>
        
        <Dialog open={isEditorDialogOpen} onOpenChange={handleEditorDialogOpenChange}>
          <DialogContent className="max-w-2xl h-[90vh] flex flex-col">
            <GanttasticSidebarContent
                view={sidebarView}
                tasks={tasks}
                selectedTask={selectedTask}
                onAddTask={handleAddTask}
                onUpdateTask={handleUpdateTask}
                onDeleteTask={handleDeleteTask}
                onUpdateDependencies={handleUpdateDependencies}
                onClose={() => handleEditorDialogOpenChange(false)}
            />
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}
