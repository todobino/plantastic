
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
  { id: 'cat-1', name: 'Planning Phase', start: new Date(), end: addDays(new Date(), 7), dependencies: [], type: 'category', isExpanded: true, parentId: null },
  { id: 'task-1', name: 'Project Kick-off Meeting', description: 'Initial meeting with stakeholders to define project scope and goals.', start: new Date(), end: addDays(new Date(), 1), dependencies: [], color: '#3b82f6', type: 'task', parentId: 'cat-1' },
  { id: 'task-2', name: 'Requirement Gathering', description: 'Gathering detailed requirements from all stakeholders.', start: addDays(new Date(), 1), end: addDays(new Date(), 3), dependencies: ['task-1'], color: '#3b82f6', type: 'task', parentId: 'cat-1' },
  { id: 'task-3', name: 'UI/UX Design', description: 'Designing the user interface and user experience.', start: addDays(new Date(), 2), end: addDays(new Date(), 7), dependencies: ['task-2'], color: '#a855f7', type: 'task', parentId: 'cat-1' },
  { id: 'cat-2', name: 'Development Phase', start: addDays(new Date(), 8), end: addDays(new Date(), 20), dependencies: [], type: 'category', isExpanded: true, parentId: null },
  { id: 'task-4', name: 'Frontend Development', description: 'Building the client-side of the application.', start: addDays(new Date(), 8), end: addDays(new Date(), 18), dependencies: ['task-3'], color: '#10b981', type: 'task', parentId: 'cat-2' },
  { id: 'task-5', name: 'Backend Development', description: 'Building the server-side of the application.', start: addDays(new Date(), 8), end: addDays(new Date(), 20), dependencies: ['task-3'], color: '#10b981', type: 'task', parentId: 'cat-2' },
  { id: 'cat-3', name: 'Release Phase', start: addDays(new Date(), 21), end: addDays(new Date(), 27), dependencies: [], type: 'category', isExpanded: true, parentId: null },
  { id: 'task-6', name: 'Testing & QA', description: 'Testing the application for bugs and quality assurance.', start: addDays(new Date(), 21), end: addDays(new Date(), 25), dependencies: ['task-4', 'task-5'], color: '#f97316', type: 'task', parentId: 'cat-3' },
  { id: 'task-7', name: 'Deployment', description: 'Deploying the application to production.', start: addDays(new Date(), 26), end: addDays(new Date(), 27), dependencies: ['task-6'], color: '#ef4444', type: 'task', parentId: 'cat-3' },
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
  const [sidebarView, setSidebarView] = useState<'TASK_EDITOR' | 'IMPORTER'>('TASK_EDITOR');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [initialTaskType, setInitialTaskType] = useState<'task' | 'category'>('task');

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
    const newId = task.type === 'category' ? `cat-${Date.now()}` : `task-${Date.now()}`;
    const newTask: Task = { ...task, id: newId };
    setTasks(prev => [...prev, newTask]);
    setEditorDialogOpen(false);
  };

  const handleUpdateTask = useCallback((updatedTask: Task) => {
    setTasks(prev => {
      let newTasks = prev.map(task => (task.id === updatedTask.id ? updatedTask : task));
      newTasks = updateDependentTasks(updatedTask.id, newTasks);
      return newTasks;
    });
    // After any update, it's good practice to close the dialog if the task is the selected one
    if (selectedTask && selectedTask.id === updatedTask.id) {
       setEditorDialogOpen(false);
       setSelectedTask(null);
    }
  }, [updateDependentTasks, selectedTask]);


  const handleDeleteTask = (taskId: string) => {
    // Also remove this task from any other task's dependency list
    setTasks(prev => prev.filter(task => task.id !== taskId).map(t => ({
      ...t,
      dependencies: t.dependencies.filter(depId => depId !== taskId)
    })));
    setEditorDialogOpen(false);
    setSelectedTask(null);
  }
  
  const handleProjectUpdate = (updatedProject: Project) => {
    setProject(updatedProject);
  }

  const handleImportProject = (newProject: Project, newTasks: Task[]) => {
    setProject(newProject);
    setTasks(newTasks);
    setEditorDialogOpen(false);
  };

  const handleReorderTasks = (reorderedTasks: Task[]) => {
    setTasks(reorderedTasks);
  };

  const openEditorDialog = useCallback((view: 'TASK_EDITOR' | 'IMPORTER', task?: Task, type?: 'task' | 'category') => {
    setSidebarView(view);
    setSelectedTask(task || null);
    setInitialTaskType(type || (task ? task.type : 'task'));
    setEditorDialogOpen(true);
  }, []);
  
  const handleAddTaskClick = useCallback((type?: 'task' | 'category') => {
    openEditorDialog('TASK_EDITOR', undefined, type);
  }, [openEditorDialog]);
  
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
          <div className="flex-grow overflow-auto">
            <GanttasticChart
              tasks={tasks}
              setTasks={setTasks}
              project={project}
              onTaskClick={(task) => openEditorDialog('TASK_EDITOR', task)}
              onAddTaskClick={handleAddTaskClick}
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
                initialTaskType={initialTaskType}
                onAddTask={handleAddTask}
                onUpdateTask={handleUpdateTask}
                onDeleteTask={handleDeleteTask}
                onImportProject={handleImportProject}
                onClose={() => handleEditorDialogOpenChange(false)}
            />
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}
