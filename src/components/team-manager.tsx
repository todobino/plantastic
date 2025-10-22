
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from './ui/scroll-area';
import { SheetHeader, SheetTitle, SheetFooter, SheetClose } from './ui/sheet';
import { Edit, Trash2, UserPlus, Check, UserCircle } from 'lucide-react';
import type { TeamMember, Task } from '@/types';
import { Dialog, DialogContent } from './ui/dialog';
import TeamMemberTasksDialog from './team-member-tasks-dialog';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';

interface TeamManagerProps {
    teamMembers: TeamMember[];
    setTeamMembers: (teamMembers: TeamMember[]) => void;
    tasks: Task[];
}

export default function TeamManager({ teamMembers, setTeamMembers, tasks }: TeamManagerProps) {
  const [newMemberName, setNewMemberName] = useState('');
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [isTaskDialogOpen, setTaskDialogOpen] = useState(false);

  const handleAddMember = () => {
    if (newMemberName.trim() === '') return;
    const newMember: TeamMember = {
      id: `member-${Date.now()}`,
      name: newMemberName.trim(),
    };
    setTeamMembers([...teamMembers, newMember]);
    setNewMemberName('');
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddMember();
    }
  }

  const handleEditClick = (e: React.MouseEvent, member: TeamMember) => {
    e.stopPropagation();
    setEditingMemberId(member.id);
    setEditingName(member.name);
  }

  const handleSaveEdit = () => {
    if (!editingMemberId || editingName.trim() === '') return;
    setTeamMembers(teamMembers.map(m => 
      m.id === editingMemberId ? { ...m, name: editingName.trim() } : m
    ));
    setEditingMemberId(null);
    setEditingName('');
  }

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      setEditingMemberId(null);
      setEditingName('');
    }
  }
  
  const handleDeleteMember = (e: React.MouseEvent, memberId: string) => {
    e.stopPropagation();
    setTeamMembers(teamMembers.filter(m => m.id !== memberId));
  }

  const handleMemberClick = (member: TeamMember) => {
    setSelectedMember(member);
    setTaskDialogOpen(true);
  }

  const getAssigneeInitials = (name?: string) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length > 1) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <>
      <SheetHeader>
        <SheetTitle>Manage Team</SheetTitle>
      </SheetHeader>
      <ScrollArea className="flex-grow p-4">
        <div className="space-y-4">
            <div className="flex w-full items-center space-x-2">
                <Input 
                    type="text" 
                    placeholder="Add member by name..."
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
                <Button type="button" onClick={handleAddMember}>
                    <UserPlus className="h-4 w-4 mr-2" /> Add
                </Button>
            </div>
            
            <div className="space-y-2 pt-4">
                {teamMembers.map(member => (
                    <div 
                        key={member.id} 
                        className="flex items-center justify-between p-2 rounded-md hover:bg-muted group cursor-pointer"
                        onClick={() => handleMemberClick(member)}
                    >
                        {editingMemberId === member.id ? (
                            <Input
                                type="text"
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                onKeyDown={handleEditKeyDown}
                                onBlur={handleSaveEdit}
                                autoFocus
                                className="h-8"
                                onClick={(e) => e.stopPropagation()}
                            />
                        ) : (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                                <AvatarFallback>
                                    <UserCircle className="h-5 w-5" />
                                </AvatarFallback>
                            </Avatar>
                            <p className="font-medium">{member.name}</p>
                          </div>
                        )}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                           {editingMemberId === member.id ? (
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleSaveEdit}>
                                    <Check className="h-4 w-4" />
                                </Button>
                           ) : (
                               <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => handleEditClick(e, member)}>
                                    <Edit className="h-4 w-4" />
                                </Button>

                           )}
                            <Button variant="destructive" size="icon" className="h-8 w-8" onClick={(e) => handleDeleteMember(e, member.id)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </ScrollArea>
       <SheetFooter>
        <SheetClose asChild>
            <Button variant="outline">Close</Button>
        </SheetClose>
      </SheetFooter>
      
      {selectedMember && (
        <Dialog open={isTaskDialogOpen} onOpenChange={setTaskDialogOpen}>
            <DialogContent className="max-w-4xl">
                <TeamMemberTasksDialog 
                    member={selectedMember} 
                    tasks={tasks.filter(t => t.assigneeId === selectedMember.id)}
                />
            </DialogContent>
        </Dialog>
      )}
    </>
  );
}
