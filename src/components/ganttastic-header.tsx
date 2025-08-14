
'use client';

import { GanttChartSquare, Plus, ChevronsUpDown, Upload, UserCircle, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useSidebar } from '@/components/ui/sidebar';
import { ThemeToggle } from './theme-toggle';


type GanttasticHeaderProps = {
  openSidebar: (view: 'TASK_EDITOR' | 'IMPORTER', task?: any) => void;
};

export default function GanttasticHeader({ openSidebar }: GanttasticHeaderProps) {
  const { toggleSidebar } = useSidebar();
  
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b bg-background px-4 md:px-6">
      <div className="flex items-center gap-2">
         <Button asChild variant="secondary" size="sm">
          <Link href="/login">
            <UserCircle />
            Login
          </Link>
        </Button>
        <ThemeToggle />
      </div>

      <div className="flex items-center gap-3">
        <GanttChartSquare className="h-6 w-6 text-primary" />
        <h1 className="text-xl font-bold tracking-tight text-foreground font-headline">
          I Gantt Even!
        </h1>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => openSidebar('IMPORTER')}>
            <Upload className="h-4 w-4" />
            Import
        </Button>
        <Button size="sm" onClick={() => alert('New Project functionality coming soon!')}>
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </div>
    </header>
  );
}
