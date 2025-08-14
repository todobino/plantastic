
'use client';

import { GanttChartSquare, Plus, ChevronsUpDown, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useSidebar } from '@/components/ui/sidebar';


type GanttasticHeaderProps = {
  openSidebar: (view: 'TASK_EDITOR' | 'IMPORTER', task?: any) => void;
  projectName: string;
};

export default function GanttasticHeader({ openSidebar, projectName }: GanttasticHeaderProps) {
  const { toggleSidebar } = useSidebar();
  
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b bg-background px-4 md:px-6">
      <div className="flex items-center gap-3">
        <GanttChartSquare className="h-7 w-7 text-primary" />
        <h1 className="text-xl font-bold tracking-tight text-foreground font-headline">
          Ganttastic
        </h1>
        <Button variant="outline" className="flex items-center gap-2 shadow-sm" onClick={toggleSidebar}>
          <span className="text-lg font-medium">{projectName}</span>
          <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => openSidebar('IMPORTER')}>
            <Upload className="h-4 w-4" />
            Import
        </Button>
        <Button size="sm" onClick={() => alert('New Project functionality coming soon!')}>
          <Plus className="h-4 w-4" />
          Add Project
        </Button>

        <div className="hidden md:flex items-center gap-2">
           <Button asChild variant="secondary" size="sm">
            <Link href="/login">
              Login
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
