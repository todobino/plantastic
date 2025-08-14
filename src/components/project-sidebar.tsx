
'use client';

import { useState, DragEvent } from 'react';
import {
  SidebarHeader,
  SidebarInput,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { Search, PanelLeftClose, GripVertical } from 'lucide-react';
import { useSidebar } from '@/components/ui/sidebar';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

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

export default function ProjectSidebar({ currentProjectName, onProjectChange }: ProjectSidebarProps) {
  const [search, setSearch] = useState('');
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [draggedProjectId, setDraggedProjectId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const { setOpen, toggleSidebar } = useSidebar();
  

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleProjectClick = (name: string) => {
    onProjectChange(name);
    setOpen(false); // Close sidebar on selection
  };

  const handleDragStart = (e: DragEvent<HTMLSpanElement>, projectId: string) => {
    e.stopPropagation();
    setDraggedProjectId(projectId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', projectId);
    
    // Create a custom drag image that looks like the menu item
    const target = (e.target as HTMLElement).closest('[data-sidebar="menu-item"]');
    if (target) {
        const clone = target.cloneNode(true) as HTMLElement;
        clone.style.position = 'absolute';
        clone.style.left = '-9999px';
        clone.style.width = `${target.clientWidth}px`;
        clone.classList.add('dragging-clone');
        document.body.appendChild(clone);
        e.dataTransfer.setDragImage(clone, e.clientX - target.getBoundingClientRect().left, e.clientY - target.getBoundingClientRect().top);

        setTimeout(() => {
          document.body.removeChild(clone);
        }, 0);
    }
  };

  const handleDragEnter = (e: DragEvent<HTMLLIElement>, targetId: string) => {
    e.preventDefault();
    if (draggedProjectId && targetId !== draggedProjectId) {
      setDropTargetId(targetId);
    }
  };
  
  const handleDragLeave = (e: DragEvent<HTMLLIElement>) => {
    e.preventDefault();
  }

  const handleDragOver = (e: DragEvent<HTMLLIElement>) => {
    e.preventDefault(); // This is necessary to allow dropping
    e.dataTransfer.dropEffect = 'move';
  };
  

  const handleDrop = (e: DragEvent<HTMLLIElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedProjectId) return;

    // If we drop on the original item, do nothing
    if (draggedProjectId === dropTargetId) {
        setDraggedProjectId(null);
        setDropTargetId(null);
        return;
    }

    const draggedIndex = projects.findIndex(p => p.id === draggedProjectId);
    // Find drop index, if dropping outside a target, append to end
    const dropIndex = dropTargetId ? projects.findIndex(p => p.id === dropTargetId) : projects.length -1;

    if (draggedIndex === -1) return;
    
    const reorderedProjects = [...projects];
    const [draggedItem] = reorderedProjects.splice(draggedIndex, 1);
    reorderedProjects.splice(dropIndex, 0, draggedItem);
    
    setProjects(reorderedProjects);
    setDraggedProjectId(null);
    setDropTargetId(null);
  };
  
  const handleDragEnd = () => {
    setDraggedProjectId(null);
    setDropTargetId(null);
  }

  return (
    <>
      <SidebarHeader>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">My Projects</h2>
          <Button variant="ghost" size="icon" onClick={toggleSidebar}>
            <PanelLeftClose />
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
      <SidebarContent className="px-2" onDrop={handleDrop} onDragOver={e => e.preventDefault()}>
        <SidebarMenu>
          {filteredProjects.map((project, index) => {
            const isBeingDragged = draggedProjectId === project.id;
            const isDropTarget = dropTargetId === project.id;

            let transformStyle = {};
            if (isDropTarget && draggedProjectId && draggedProjectId !== project.id) {
                const draggedIndex = projects.findIndex(p => p.id === draggedProjectId);
                if (draggedIndex !== -1 && index !== draggedIndex) {
                    transformStyle = {
                        transform: `translateY(${draggedIndex < index ? '-100%' : '100%'})`,
                    };
                }
            }
             if (isBeingDragged) {
                const dropIndex = dropTargetId ? projects.findIndex(p => p.id === dropTargetId) : -1;
                 if (dropIndex !== -1) {
                     const draggedIndex = projects.findIndex(p => p.id === draggedProjectId);
                     if (draggedIndex < dropIndex) {
                        transformStyle = {
                             transform: `translateY(${dropIndex - draggedIndex}00%)`,
                        };
                     } else {
                         transformStyle = {
                             transform: `translateY(-${draggedIndex - dropIndex}00%)`,
                         };
                     }
                 }
            }


            return (
              <SidebarMenuItem 
                key={project.id}
                onDragEnter={(e) => handleDragEnter(e, project.id)}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
                onDragLeave={handleDragLeave}
                className={cn(
                  "transition-transform duration-200 ease-in-out",
                  isBeingDragged && "opacity-30",
                )}
                style={transformStyle}
              >
                <SidebarMenuButton
                  isActive={project.name === currentProjectName}
                  onClick={() => handleProjectClick(project.name)}
                  className="justify-start items-center"
                >
                  <span
                      draggable
                      onDragStart={(e) => handleDragStart(e, project.id)}
                      onDragEnd={handleDragEnd}
                      className="cursor-grab p-1"
                      onClick={(e) => e.stopPropagation()} // prevent button click when grabbing
                  >
                    <GripVertical className="h-5 w-5 text-muted-foreground" />
                  </span>
                  <span className="flex-grow ml-1">{project.name}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
    </>
  );
}
