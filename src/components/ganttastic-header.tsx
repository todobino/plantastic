'use client';

import { GanttChartSquare, Sparkles, Plus, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

type GanttasticHeaderProps = {
  openSidebar: (view: 'TASK_EDITOR' | 'SMART_SCHEDULER') => void;
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
        <Button variant="outline" size="sm" onClick={() => openSidebar('SMART_SCHEDULER')}>
          <Sparkles />
          Smart Schedule
        </Button>
        <Button size="sm" onClick={() => openSidebar('TASK_EDITOR')} className="bg-accent hover:bg-accent/90">
          <Plus />
          Add Task
        </Button>
        <div className="hidden md:flex items-center gap-2 ml-4">
           <Button asChild variant="ghost" size="sm">
            <Link href="/login">
              <LogIn />
              Login
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
