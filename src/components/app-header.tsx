
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { GanttChart, List, Users, LogOut, UserCircle, Briefcase, PawPrint, Leaf, Gamepad2, Film, Book, Home, Plane, Music, Code, Utensils, PartyPopper, Building, Rocket, BrainCircuit, type LucideIcon, Kanban } from 'lucide-react';
import ProjectEditor from './project-editor';
import type { Project } from '@/types';
import { useAuth, useUser } from '@/firebase/provider';
import { AuthForm } from './auth-form';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { cn } from '@/lib/utils';


type AppHeaderProps = {
  project: Project;
  onProjectUpdate: (project: Project) => void;
  view: 'timeline' | 'list' | 'team' | 'board';
  onViewChange: (view: 'timeline' | 'list' | 'team' | 'board') => void;
};

const icons: Record<string, LucideIcon> = {
    Briefcase, PawPrint, Leaf, Gamepad2, Film, Book, Home, Plane, Music, Code, Utensils, PartyPopper, Building, Rocket, BrainCircuit
};

export default function AppHeader({
  project,
  onProjectUpdate,
  view,
  onViewChange,
}: AppHeaderProps) {
  const [isLoginOpen, setLoginOpen] = useState(false);
  const { user } = useUser();
  const auth = useAuth();
  
  const IconComponent = project.icon ? icons[project.icon] || Briefcase : Briefcase;


  const handleLogout = () => {
    if (auth) {
        auth.signOut();
    }
  }

  return (
    <div className="flex flex-row items-center justify-between border-b bg-background z-10 py-2 px-4">
      <div className="flex items-center gap-4">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" className="group text-lg font-extrabold font-headline hover:bg-accent gap-2">
              <IconComponent className="h-6 w-6" />
              {project.name}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="max-w-md p-0">
            <ProjectEditor project={project} onProjectUpdate={onProjectUpdate} />
          </SheetContent>
        </Sheet>
        <Tabs value={view} onValueChange={(v) => onViewChange(v as 'timeline' | 'list' | 'team' | 'board')}>
          <TabsList>
            <TabsTrigger value="timeline">
              <GanttChart className="h-4 w-4 mr-2" />
              Timeline
            </TabsTrigger>
            <TabsTrigger value="list">
              <List className="h-4 w-4 mr-2" />
              List
            </TabsTrigger>
             <TabsTrigger value="board">
              <Kanban className="h-4 w-4 mr-2" />
              Board
            </TabsTrigger>
            <TabsTrigger value="team">
              <Users className="h-4 w-4 mr-2" />
              Team
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div className="flex items-center gap-2">
        {user ? (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="justify-start gap-2">
                        <Avatar className="h-8 w-8">
                            <AvatarImage src={user.photoURL || ''} alt={user.displayName || user.email || 'User'}/>
                            <AvatarFallback>
                                <UserCircle />
                            </AvatarFallback>
                        </Avatar>
                        <span className="truncate hidden sm:inline">{user.displayName || user.email}</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-48">
                    <DropdownMenuItem onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Log out</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        ) : (
          <Sheet open={isLoginOpen} onOpenChange={setLoginOpen}>
              <SheetTrigger asChild>
                  <Button>
                  <UserCircle className="mr-2 h-4 w-4"/>
                  Login
                  </Button>
              </SheetTrigger>
              <SheetContent className="max-w-md p-0">
                  <AuthForm onSuccess={() => setLoginOpen(false)} />
              </SheetContent>
          </Sheet>
        )}
      </div>
    </div>
  );
}
