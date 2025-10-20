
'use client';

import { useState, useMemo } from 'react';
import type { TeamMember, Task } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserPlus, Edit, Trash2, Check, Search } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import TeamMemberTasksDialog from './team-member-tasks-dialog';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent } from './ui/dialog';

interface TeamViewProps {
  teamMembers: TeamMember[];
  setTeamMembers: (teamMembers: TeamMember[]) => void;
  tasks: Task[];
}

export default function TeamView({ teamMembers, setTeamMembers, tasks }: TeamViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(teamMembers[0] || null);

  const filteredTeamMembers = useMemo(() => 
    teamMembers.filter(member => 
      member.name.toLowerCase().includes(searchTerm.toLowerCase())
    ), [teamMembers, searchTerm]);

  const handleAddMember = () => {
    if (searchTerm.trim() === '') return;
    const newMember: TeamMember = {
      id: `member-${Date.now()}`,
      name: searchTerm.trim(),
      photoURL: `https://i.pravatar.cc/150?u=${Date.now()}`
    };
    setTeamMembers([...teamMembers, newMember]);
    setSearchTerm('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredTeamMembers.length === 0 && searchTerm.trim() !== '') {
        handleAddMember();
      }
    }
  }

  const handleEditClick = (e: React.MouseEvent, member: TeamMember) => {
    e.stopPropagation();
    setEditingMemberId(member.id);
    setEditingName(member.name);
  }

  const handleSaveEdit = (e: React.MouseEvent | React.FocusEvent, memberId: string) => {
    e.stopPropagation();
    if (editingName.trim() === '') {
        setEditingMemberId(null);
        return;
    };
    setTeamMembers(teamMembers.map(m => 
      m.id === memberId ? { ...m, name: editingName.trim() } : m
    ));
    setEditingMemberId(null);
    setEditingName('');
  }

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, memberId: string) => {
    if (e.key === 'Enter') {
      handleSaveEdit(e, memberId);
    } else if (e.key === 'Escape') {
      setEditingMemberId(null);
      setEditingName('');
    }
  }
  
  const handleDeleteMember = (e: React.MouseEvent, memberId: string) => {
    e.stopPropagation();
    setTeamMembers(teamMembers.filter(m => m.id !== memberId));
    if (selectedMember?.id === memberId) {
      const newSelectedMember = teamMembers.filter(m => m.id !== memberId)[0] || null;
      setSelectedMember(newSelectedMember);
    }
  }

  const handleMemberClick = (member: TeamMember) => {
    setSelectedMember(member);
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
    <div className="flex w-full h-full">
      <div className="w-[300px] border-r flex flex-col">
        <div className="p-4 border-b">
            <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                    type="text" 
                    placeholder="Search or add member..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="pl-8"
                />
            </div>
            {filteredTeamMembers.length === 0 && searchTerm.trim() !== '' && (
              <Button type="button" onClick={handleAddMember} size="sm" className="w-full mt-2">
                  <UserPlus className="h-4 w-4 mr-2" /> Add "{searchTerm}"
              </Button>
            )}
        </div>
        <ScrollArea className="flex-grow">
          <div className="space-y-1 p-2">
            {filteredTeamMembers.map(member => (
              <div 
                  key={member.id} 
                  className={cn("flex items-center justify-between p-2 rounded-md hover:bg-muted group cursor-pointer",
                    selectedMember?.id === member.id && "bg-muted"
                  )}
                  onClick={() => handleMemberClick(member)}
              >
                  {editingMemberId === member.id ? (
                      <Input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => handleEditKeyDown(e, member.id)}
                          onBlur={(e) => handleSaveEdit(e, member.id)}
                          autoFocus
                          className="h-8"
                          onClick={(e) => e.stopPropagation()}
                      />
                  ) : (
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                          <AvatarImage src={member.photoURL} alt={member.name} />
                          <AvatarFallback>{getAssigneeInitials(member.name)}</AvatarFallback>
                      </Avatar>
                      <p className="font-medium text-sm">{member.name}</p>
                    </div>
                  )}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                     {editingMemberId === member.id ? (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => handleSaveEdit(e, member.id)}>
                              <Check className="h-4 w-4" />
                          </Button>
                     ) : (
                         <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => handleEditClick(e, member)}>
                              <Edit className="h-4 w-4" />
                          </Button>

                     )}
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={(e) => handleDeleteMember(e, member.id)}>
                          <Trash2 className="h-4 w-4" />
                      </Button>
                  </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
      <div className="flex-1 p-4 lg:p-6">
        {selectedMember ? (
          <TeamMemberTasksDialog 
            member={selectedMember} 
            tasks={tasks.filter(t => t.assigneeId === selectedMember.id)}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p>Select a team member to see their tasks.</p>
          </div>
        )}
      </div>
    </div>
  );
}
