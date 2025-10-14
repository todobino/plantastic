
'use client';

import { useState, useEffect } from 'react';
import {
  SidebarHeader,
  SidebarInput,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { Search, Plus, GripVertical, MoreHorizontal, Edit, Trash2, GanttChartSquare, UserCircle } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { DndContext, MouseSensor, TouchSensor, useSensor, useSensors, DragOverlay, closestCenter, type DragStartEvent, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { ThemeToggle } from './theme-toggle';
import { Dialog, DialogContent, DialogTrigger } from './ui/dialog';
import { AuthForm } from './auth-form';

type Project = {
  id: string;
  name: string;
};

type ProjectSidebarProps = {
  currentProjectName: string;
  onProjectChange: (name: string) => void;
  onNewProjectClick: () => void;
};

const initialProjects: Project[] = [
  { id: 'proj-1', name: 'Ganttastic Plan' },
  { id: 'proj-2', name: 'Marketing Campaign' },
  { id: 'proj-3', name: 'Website Redesign' },
  { id: 'proj-4', name: 'New Feature Launch' },
  { id: 'proj-5', name: 'Mobile App Development' },
];

function DraggableProject({ item, isActive, onClick }: { item: Project; isActive?: boolean; onClick?: () => void; }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };
    
    return (
        <div ref={setNodeRef} style={style} className={cn("touch-none", isDragging && "opacity-0")}>
            <ProjectItem item={item} isActive={isActive} onClick={onClick} dragAttributes={attributes} dragListeners={listeners} />
        </div>
    );
}

function ProjectItem({ item, isActive, onClick, isOverlay = false, dragAttributes, dragListeners }: { item: Project; isActive?: boolean; onClick?: () => void; isOverlay?: boolean; dragAttributes?: any; dragListeners?: any; }) {
    return (
        <div
            onClick={onClick}
            data-active={isActive}
            className={cn(
                "peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none ring-sidebar-ring transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-has-[[data-sidebar=menu-action]]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground",
                "h-8 text-sm",
                "justify-start items-center w-full group/item cursor-pointer", 
                isOverlay && "shadow-xl ring-1 ring-border cursor-grabbing"
            )}
        >
            <span {...dragListeners} {...dragAttributes} className={cn("cursor-grab p-1", isOverlay && "cursor-grabbing")}>
                <GripVertical className="h-5 w-5 text-muted-foreground" />
            </span>
            <span className="flex-grow ml-1 truncate">{item.name}</span>
            {!isOverlay && (
                 <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto opacity-0 group-hover/item:opacity-100" onClick={(e) => e.stopPropagation()}>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48 p-1" onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-col gap-1">
                            <Button variant="ghost" size="sm" className="justify-start gap-2" onClick={() => alert(`Editing ${item.name}`)}>
                                <Edit className="h-4 w-4" /> Edit
                            </Button>
                             <Button variant="ghost" size="sm" className="justify-start gap-2 text-destructive hover:text-destructive" onClick={() => alert(`Deleting ${item.name}`)}>
                                <Trash2 className="h-4 w-4" /> Delete
                            </Button>
                        </div>
                    </PopoverContent>
                </Popover>
            )}
        </div>
    )
}


export default function ProjectSidebar({ currentProjectName, onProjectChange, onNewProjectClick }: ProjectSidebarProps) {
  const [search, setSearch] = useState('');
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [isLoginOpen, setLoginOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);
  
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 120, tolerance: 5 },
    })
  );

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleProjectClick = (name: string) => {
    onProjectChange(name);
  };
  
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const project = projects.find(p => p.id === active.id);
    if (project) {
        setActiveProject(project);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
        setProjects((items) => {
            const oldIndex = items.findIndex((item) => item.id === active.id);
            const newIndex = items.findIndex((item) => item.id === over.id);
            return arrayMove(items, oldIndex, newIndex);
        });
    }
    setActiveProject(null);
  }

  return (
    <TooltipProvider>
      <SidebarHeader className="p-2 border-b">
        <div className="flex items-center gap-2">
          <GanttChartSquare className="h-6 w-6 text-primary" />
          <h1 className="text-lg font-bold tracking-tight text-foreground font-headline">
            Ganttastic
          </h1>
        </div>
      </SidebarHeader>

      <SidebarContent className="flex-grow p-4">
        <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold tracking-tight">Projects</h2>
            <Button size="sm" variant="secondary" onClick={onNewProjectClick}>
                <Plus className="h-4 w-4 mr-2" />
                New
            </Button>
        </div>
        <div className="relative mb-4">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <SidebarInput
            placeholder="Search projects..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {isClient ? (
          <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            modifiers={[restrictToVerticalAxis]}
          >
            <SortableContext items={filteredProjects.map(p => p.id)} strategy={verticalListSortingStrategy}>
              <SidebarMenu>
                {filteredProjects.map((project) => (
                  <SidebarMenuItem 
                      key={project.id}
                  >
                    <DraggableProject 
                      item={project} 
                      isActive={project.name === currentProjectName}
                      onClick={() => handleProjectClick(project.name)}
                    />
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SortableContext>
            <DragOverlay dropAnimation={null}>
                {activeProject ? <ProjectItem item={activeProject} isOverlay /> : null}
            </DragOverlay>
          </DndContext>
        ) : (
            <SidebarMenu>
              {filteredProjects.map((project) => (
                <SidebarMenuItem key={project.id}>
                    <ProjectItem 
                      item={project} 
                      isActive={project.name === currentProjectName}
                      onClick={() => handleProjectClick(project.name)}
                    />
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4 mt-auto border-t">
        <div className="flex items-center gap-2">
            <Dialog open={isLoginOpen} onOpenChange={setLoginOpen}>
            <DialogTrigger asChild>
                <Button variant="secondary" className="w-full justify-start">
                <UserCircle className="mr-2"/>
                Login
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <AuthForm />
            </DialogContent>
            </Dialog>
            <ThemeToggle />
        </div>
      </SidebarFooter>
    </TooltipProvider>
  );
}
