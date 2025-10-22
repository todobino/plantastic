
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GanttChart, List, Users, LogOut, UserCircle } from 'lucide-react';
import ProjectEditor from './project-editor';
import type { Project } from '@/types';
import { useAuth, useUser } from '@/firebase/provider';
import { Dialog, DialogContent, DialogTrigger } from './ui/dialog';
import { AuthForm } from './auth-form';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';


type AppHeaderProps = {
  project: Project;
  onProjectUpdate: (project: Project) => void;
  view: 'timeline' | 'list' | 'team';
  onViewChange: (view: 'timeline' | 'list' | 'team') => void;
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
            <Button className="group text-lg font-semibold font-headline">
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
          <Dialog open={isLoginOpen} onOpenChange={setLoginOpen}>
              <DialogTrigger asChild>
                  <Button variant="outline">
                  <UserCircle className="mr-2 h-4 w-4"/>
                  Login
                  </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                  <AuthForm onSuccess={() => setLoginOpen(false)} />
              </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}
