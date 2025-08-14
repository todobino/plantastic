
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

  const handleDragStart = (e: DragEvent<HTMLLIElement>, projectId: string) => {
    setDraggedProjectId(projectId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', projectId); // Necessary for Firefox
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
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: DragEvent<HTMLLIElement>) => {
    e.preventDefault();
    if (!draggedProjectId || !dropTargetId || draggedProjectId === dropTargetId) {
      return;
    }

    const draggedIndex = projects.findIndex(p => p.id === draggedProjectId);
    const dropIndex = projects.findIndex(p => p.id === dropTargetId);

    if (draggedIndex === -1 || dropIndex === -1) return;
    
    const reorderedProjects = [...projects];
    const [draggedItem] = reorderedProjects.splice(draggedIndex, 1);
    reorderedProjects.splice(dropIndex, 0, draggedItem);
    
    setProjects(reorderedProjects);
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
      <SidebarContent className="px-2">
        <SidebarMenu onDragOver={handleDragOver}>
          {filteredProjects.map((project) => (
            <SidebarMenuItem 
              key={project.id}
              draggable
              onDragStart={(e) => handleDragStart(e, project.id)}
              onDragEnd={handleDragEnd}
              onDragEnter={(e) => handleDragEnter(e, project.id)}
              onDrop={handleDrop}
              className={cn(
                "transition-all duration-200 ease-in-out",
                draggedProjectId === project.id && "opacity-50 scale-105",
                dropTargetId === project.id && draggedProjectId !== project.id && "transform -translate-y-8"
              )}
            >
              <SidebarMenuButton
                isActive={project.name === currentProjectName}
                onClick={() => handleProjectClick(project.name)}
                className="justify-start"
              >
                <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab mr-2" />
                <span>{project.name}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
    </>
  );
}
