
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
import { Search } from 'lucide-react';
import { useSidebar } from '@/components/ui/sidebar';

type ProjectSidebarProps = {
  currentProjectName: string;
  onProjectChange: (name: string) => void;
};

export default function ProjectSidebar({ currentProjectName, onProjectChange }: ProjectSidebarProps) {
  const [search, setSearch] = useState('');
  const { setOpen } = useSidebar();
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
      <SidebarContent>
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
