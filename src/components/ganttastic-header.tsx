'use client';

import { GanttChartSquare, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type GanttasticHeaderProps = {
  openSidebar: (view: 'TASK_EDITOR' | 'SMART_SCHEDULER', task?: any) => void;
};

export default function GanttasticHeader({ openSidebar }: GanttasticHeaderProps) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b bg-card px-4 md:px-6">
      <div className="flex items-center gap-3">
        <GanttChartSquare className="h-7 w-7 text-primary" />
        <h1 className="text-xl font-bold tracking-tight text-foreground font-headline">
          Ganttastic
        </h1>
      </div>
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm">
              Add New
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openSidebar('TASK_EDITOR')}>
              Add new task
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => alert('New Project functionality coming soon!')}>
              Add new project
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

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
