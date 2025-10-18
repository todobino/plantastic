
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from './ui/scroll-area';
import { SheetHeader, SheetTitle, SheetFooter } from './ui/sheet';
import { Edit, Trash2, UserPlus, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TeamMember {
    id: string;
    name: string;
}

const initialTeamMembers: TeamMember[] = [
    { id: '1', name: 'Alex Johnson' },
    { id: '2', name: 'Maria Garcia' },
    { id: '3', name: 'James Smith' },
];

export default function TeamManager() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(initialTeamMembers);
  const [newMemberName, setNewMemberName] = useState('');
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

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

  const handleEditClick = (member: TeamMember) => {
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
  
  const handleDeleteMember = (memberId: string) => {
    setTeamMembers(teamMembers.filter(m => m.id !== memberId));
  }

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
                    <div key={member.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted group">
                        {editingMemberId === member.id ? (
                            <Input
                                type="text"
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                onKeyDown={handleEditKeyDown}
                                onBlur={handleSaveEdit}
                                autoFocus
                                className="h-8"
                            />
                        ) : (
                            <p className="font-medium">{member.name}</p>
                        )}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                           {editingMemberId === member.id ? (
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleSaveEdit}>
                                    <Check className="h-4 w-4" />
                                </Button>
                           ) : (
                               <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditClick(member)}>
                                    <Edit className="h-4 w-4" />
                                </Button>

                           )}
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/20" onClick={() => handleDeleteMember(member.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </ScrollArea>
       <SheetFooter>
        <Button variant="outline">Close</Button>
      </SheetFooter>
    </>
  );
}
