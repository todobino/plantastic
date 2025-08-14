
'use client';

import { useState } from 'react';
import {
  SidebarHeader,
  SidebarInput,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { Search, Plus, GripVertical } from 'lucide-react';
import { useSidebar } from '@/components/ui/sidebar';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { DndContext, MouseSensor, TouchSensor, useSensor, useSensors, DragOverlay, closestCenter, type DragStartEvent, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';

type Project = {
  id: string;
  name: string;
};

type ProjectSidebarProps = {
  currentProjectName: string;
  onProjectChange: (name: string) => void;
};

const initialProjects: Project[] = [
  { id: 'proj-1', name: 'Ganttastic Plan' },
  { id: 'proj-2', name: 'Marketing Campaign' },
  { id: 'proj-3', name: 'Website Redesign' },
  { id: 'proj-4', name: 'New Feature Launch' },
  { id: 'proj-5', name: 'Mobile App Development' },
];

function DraggableProject({ item }: { item: Project }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };
    
    return (
        <div ref={setNodeRef} style={style} className={cn("touch-none", isDragging && "opacity-0")}>
            <SidebarMenuButton
                className="justify-start items-center w-full"
            >
                <span {...attributes} {...listeners} className="cursor-grab p-1">
                    <GripVertical className="h-5 w-5 text-muted-foreground" />
                </span>
                <span className="flex-grow ml-1 truncate">{item.name}</span>
            </SidebarMenuButton>
        </div>
    );
}

function ProjectItem({ item, isActive, onClick, isOverlay = false }: { item: Project; isActive?: boolean; onClick?: () => void; isOverlay?: boolean}) {
    return (
        <SidebarMenuButton
            isActive={isActive}
            onClick={onClick}
            className={cn("justify-start items-center w-full", isOverlay && "shadow-xl ring-1 ring-border cursor-grabbing")}
        >
            <span className={cn("cursor-grab p-1", isOverlay && "cursor-grabbing")}>
                <GripVertical className="h-5 w-5 text-muted-foreground" />
            </span>
            <span className="flex-grow ml-1 truncate">{item.name}</span>
        </SidebarMenuButton>
    )
}


export default function ProjectSidebar({ currentProjectName, onProjectChange }: ProjectSidebarProps) {
  const [search, setSearch] = useState('');
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const { setOpen, toggleSidebar } = useSidebar();
  
  const sensors = useSensors(
    useSensor(MouseSensor, {
      // Require the mouse to move by 6 pixels before starting a drag
      activationConstraint: { distance: 6 },
    }),
    useSensor(TouchSensor, {
      // Press delay of 120ms, with a tolerance of 5px of movement
      activationConstraint: { delay: 120, tolerance: 5 },
    })
  );

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleProjectClick = (name: string) => {
    onProjectChange(name);
    setOpen(false); // Close sidebar on selection
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
    <>
      <SidebarHeader>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">My Projects</h2>
           <Button size="sm" onClick={() => alert('New Project functionality coming soon!')}>
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <SidebarInput
            placeholder="Search projects..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </SidebarHeader>
      <SidebarContent className="px-2">
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
                    onClick={() => handleProjectClick(project.name)}
                >
                  <DraggableProject item={project} />
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SortableContext>
          <DragOverlay dropAnimation={null}>
              {activeProject ? <ProjectItem item={activeProject} isOverlay /> : null}
          </DragOverlay>
        </DndContext>
      </SidebarContent>
    </>
  );
}
