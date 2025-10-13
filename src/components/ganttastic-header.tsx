
'use client';

import { useState } from 'react';
import { GanttChartSquare, Plus, UserCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from './theme-toggle';
import { Dialog, DialogContent, DialogTrigger } from './ui/dialog';
import { AuthForm } from './auth-form';


type GanttasticHeaderProps = {
  onNewProjectClick: () => void;
};

export default function GanttasticHeader({ onNewProjectClick }: GanttasticHeaderProps) {
  const [isLoginOpen, setLoginOpen] = useState(false);
  
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b bg-background px-4 md:px-6">
      <div className="flex items-center gap-2">
        <Dialog open={isLoginOpen} onOpenChange={setLoginOpen}>
          <DialogTrigger asChild>
            <Button variant="secondary" size="sm">
              <UserCircle />
              Login
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <AuthForm />
          </DialogContent>
        </Dialog>
        <ThemeToggle />
      </div>

      <div className="flex items-center gap-3">
        <GanttChartSquare className="h-6 w-6 text-primary" />
        <h1 className="text-xl font-bold tracking-tight text-foreground font-headline">
          Ganttastic
        </h1>
      </div>

      <div className="flex items-center gap-2">
        <Button size="sm" onClick={onNewProjectClick}>
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </div>
    </header>
  );
}
