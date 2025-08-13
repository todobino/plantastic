
'use client';

import { useState } from 'react';
import {
  SidebarHeader,
  SidebarInput,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Search, PanelLeftClose } from 'lucide-react';
import { useSidebar } from '@/components/ui/sidebar';
import { Button } from './ui/button';

type ProjectSidebarProps = {
  currentProjectName: string;
  onProjectChange: (name: string) => void;
};

export default function ProjectSidebar({ currentProjectName, onProjectChange }: ProjectSidebarProps) {
  const [search, setSearch] = useState('');
  const { setOpen, toggleSidebar } = useSidebar();
  const projects = [
    { id: 'proj-1', name: 'Ganttastic Plan' },
    { id: 'proj-2', name: 'Marketing Campaign' },
    { id: 'proj-3', name: 'Website Redesign' },
    { id: 'proj-4', name: 'New Feature Launch' },
    { id: 'proj-5', name: 'Mobile App Development' },
  ];

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleProjectClick = (name: string) => {
    onProjectChange(name);
    setOpen(false); // Close sidebar on selection
  };

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
        <SidebarMenu>
          {filteredProjects.map((project) => (
            <SidebarMenuItem key={project.id}>
              <SidebarMenuButton
                isActive={project.name === currentProjectName}
                onClick={() => handleProjectClick(project.name)}
              >
                <span>{project.name}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
    </>
  );
}
