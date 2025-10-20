
'use client';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GanttChart, List, Users, Download } from 'lucide-react';
import ProjectEditor from './project-editor';
import type { Project } from '@/types';

type AppHeaderProps = {
  project: Project;
  onProjectUpdate: (project: Project) => void;
  view: 'timeline' | 'list' | 'team';
  onViewChange: (view: 'timeline' | 'list' | 'team') => void;
  onNewProjectClick: () => void;
};

export default function AppHeader({
  project,
  onProjectUpdate,
  view,
  onViewChange,
  onNewProjectClick,
}: AppHeaderProps) {
  return (
    <div className="flex flex-row items-center justify-between border-b bg-background z-10 py-2 px-4">
      <div className="flex items-center gap-4">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" className="group text-lg font-semibold font-headline">
              {project.name}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="max-w-md p-0">
            <ProjectEditor project={project} onProjectUpdate={onProjectUpdate} />
          </SheetContent>
        </Sheet>
        <Tabs value={view} onValueChange={(v) => onViewChange(v as 'timeline' | 'list' | 'team')}>
          <TabsList>
            <TabsTrigger value="timeline">
              <GanttChart className="h-4 w-4 mr-2" />
              Timeline
            </TabsTrigger>
            <TabsTrigger value="list">
              <List className="h-4 w-4 mr-2" />
              List
            </TabsTrigger>
            <TabsTrigger value="team">
              <Users className="h-4 w-4 mr-2" />
              Team
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={onNewProjectClick}>
            <Download className="h-4 w-4 mr-2" />
            Import/Export
        </Button>
      </div>
    </div>
  );
}
